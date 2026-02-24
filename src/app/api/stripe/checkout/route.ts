import { NextRequest, NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json(
        { error: "Online payments not configured" },
        { status: 400 }
      )
    }

    const { invoiceToken } = await req.json()
    if (!invoiceToken) {
      return NextResponse.json(
        { error: "Missing invoice token" },
        { status: 400 }
      )
    }

    const invoice = await prisma.invoice.findFirst({
      where: { accessToken: invoiceToken },
      include: {
        organization: {
          select: {
            stripeAccountId: true,
            stripeOnboarded: true,
            paymentOnlineEnabled: true,
            currency: true,
            slug: true,
          },
        },
        lineItems: { orderBy: { sortOrder: "asc" } },
        customer: { select: { email: true, firstName: true, lastName: true } },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    if (
      !invoice.organization.stripeAccountId ||
      !invoice.organization.stripeOnboarded ||
      !invoice.organization.paymentOnlineEnabled
    ) {
      return NextResponse.json(
        { error: "Online payments not available for this business" },
        { status: 400 }
      )
    }

    const amountDue = Number(invoice.amountDue)
    if (amountDue <= 0) {
      return NextResponse.json(
        { error: "No amount due on this invoice" },
        { status: 400 }
      )
    }

    // Create Stripe Checkout session on the connected account
    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: invoice.organization.currency.toLowerCase(),
              product_data: {
                name: `Invoice ${invoice.invoiceNumber}`,
                description: `Payment for invoice ${invoice.invoiceNumber}`,
              },
              unit_amount: Math.round(amountDue * 100),
            },
            quantity: 1,
          },
        ],
        customer_email: invoice.customer.email || undefined,
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${invoice.organization.slug}/invoices/${invoiceToken}?paid=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${invoice.organization.slug}/invoices/${invoiceToken}`,
        metadata: {
          invoiceId: invoice.id,
          organizationId: invoice.organizationId,
          invoiceToken,
        },
      },
      {
        stripeAccount: invoice.organization.stripeAccountId,
      }
    )

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error("Stripe Checkout error:", error)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
