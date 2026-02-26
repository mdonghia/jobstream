import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { isNotificationEnabled } from "@/lib/notification-check"

/**
 * Cron endpoint to mark overdue invoices.
 * Runs daily via Vercel Cron.
 *
 * 1. Finds all invoices with status SENT or VIEWED where dueDate < now
 * 2. Updates their status to OVERDUE
 * 3. Optionally sends admin notifications for each newly overdue invoice
 *
 * GET /api/cron/invoice-overdue
 */
export async function GET(request: NextRequest) {
  // Verify the cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()

    // Find all invoices that are past due but still in SENT or VIEWED status
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ["SENT", "VIEWED"] },
        dueDate: { lt: now },
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (overdueInvoices.length === 0) {
      return NextResponse.json({
        message: "No invoices to mark as overdue",
        updated: 0,
        notified: 0,
      })
    }

    let updated = 0
    let notified = 0
    const errors: string[] = []

    for (const invoice of overdueInvoices) {
      try {
        // Update the invoice status to OVERDUE
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: "OVERDUE" },
        })
        updated++

        // Optionally send admin notification via email
        const emailEnabled = await isNotificationEnabled(
          invoice.organizationId,
          "invoice_overdue",
          "email"
        )

        if (emailEnabled && process.env.SENDGRID_API_KEY) {
          // Send notification to the org admin (using the org name as context)
          // In a real setup this would go to the admin email; for now we log it
          const amountDue = Number(invoice.amountDue).toFixed(2)
          const daysOverdue = Math.floor(
            (now.getTime() - new Date(invoice.dueDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )

          try {
            const sgMail = await import("@sendgrid/mail")
            sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)

            // Look up the org owner/admin email for notification
            const adminUser = await prisma.user.findFirst({
              where: {
                organizationId: invoice.organizationId,
                role: { in: ["OWNER", "ADMIN"] },
              },
              select: { email: true, firstName: true },
            })

            if (adminUser?.email) {
              await sgMail.default.send({
                to: adminUser.email,
                from: {
                  email:
                    process.env.SENDGRID_FROM_EMAIL || "noreply@jobstream.app",
                  name: "JobStream",
                },
                subject: `Invoice #${invoice.invoiceNumber} is now overdue`,
                html: `<div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
                  <h2>Invoice Overdue Notification</h2>
                  <p>Invoice <strong>#${invoice.invoiceNumber}</strong> for <strong>$${amountDue}</strong> to ${invoice.customer.firstName} ${invoice.customer.lastName} is now <strong>${daysOverdue} day${daysOverdue === 1 ? "" : "s"}</strong> past due.</p>
                  <p>The invoice status has been automatically updated to <strong>OVERDUE</strong>.</p>
                  <p style="color: #8898AA; font-size: 12px;">This is an automated notification from JobStream.</p>
                </div>`,
              })
              notified++
            }
          } catch (e) {
            console.error(
              `Failed to send overdue notification for invoice ${invoice.invoiceNumber}:`,
              e
            )
          }
        } else if (emailEnabled) {
          // Dev mode: log what would be sent
          console.log(
            `[DEV] Overdue notification would be sent for invoice ${invoice.invoiceNumber} (org: ${invoice.organization.name})`
          )
        }
      } catch (e: any) {
        console.error(
          `Failed to process overdue invoice ${invoice.id}:`,
          e
        )
        errors.push(`Invoice ${invoice.id}: ${e?.message || "Unknown error"}`)
      }
    }

    return NextResponse.json({
      message: `Marked ${updated} invoice(s) as overdue, sent ${notified} admin notification(s)`,
      updated,
      notified,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Cron invoice-overdue error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
