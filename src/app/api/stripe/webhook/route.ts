import { NextRequest, NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 400 })
    }

    const body = await req.text()
    const sig = req.headers.get("stripe-signature")

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any
      const invoiceId = session.metadata?.invoiceId

      if (invoiceId) {
        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
        })

        if (invoice) {
          const amountPaid = (session.amount_total || 0) / 100
          const newAmountPaid = Number(invoice.amountPaid) + amountPaid
          const newAmountDue = Math.max(
            0,
            Number(invoice.total) - newAmountPaid
          )
          const isPaid = newAmountDue <= 0

          await prisma.$transaction([
            prisma.payment.create({
              data: {
                organizationId: invoice.organizationId,
                invoiceId: invoice.id,
                amount: amountPaid,
                method: "CARD",
                status: "COMPLETED",
                reference: `stripe:${session.payment_intent || session.id}`,
                processedAt: new Date(),
              },
            }),
            prisma.invoice.update({
              where: { id: invoiceId },
              data: {
                amountPaid: newAmountPaid,
                amountDue: newAmountDue,
                status: isPaid ? "PAID" : "PARTIALLY_PAID",
                paidAt: isPaid ? new Date() : undefined,
              },
            }),
          ])

          // Create notification for the org owner
          const orgOwner = await prisma.user.findFirst({
            where: { organizationId: invoice.organizationId, role: "OWNER" },
            select: { id: true },
          })

          if (orgOwner) {
            await prisma.notification.create({
              data: {
                organizationId: invoice.organizationId,
                userId: orgOwner.id,
                title: "Payment Received",
                message: `Online payment of $${amountPaid.toFixed(2)} received for invoice ${invoice.invoiceNumber}`,
                linkUrl: `/invoices/${invoice.id}`,
              },
            })
          }
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Webhook handler error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}
