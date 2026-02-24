import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { isNotificationEnabled } from "@/lib/notification-check"

/**
 * Cron endpoint to send automated invoice payment reminders.
 * Runs daily at 1:00 PM UTC (9 AM ET) via Vercel Cron.
 *
 * For each organization with invoiceRemindersEnabled = true:
 * 1. Finds overdue invoices (SENT, VIEWED, or PARTIALLY_PAID with dueDate < now)
 * 2. Updates their status to OVERDUE
 * 3. Sends reminder emails/SMS at configured intervals (default: 3, 7, 14 days past due)
 * 4. Logs each reminder to CommunicationLog
 *
 * GET /api/cron/invoice-reminders
 */
export async function GET(request: NextRequest) {
  // Verify the cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Find all organizations that have invoice reminders enabled
    const orgs = await prisma.organization.findMany({
      where: { invoiceRemindersEnabled: true },
      select: {
        id: true,
        name: true,
        slug: true,
        invoiceReminderDays: true,
      },
    })

    if (orgs.length === 0) {
      return NextResponse.json({
        message: "No organizations with invoice reminders enabled",
        processed: 0,
      })
    }

    const now = new Date()
    let totalReminders = 0
    let totalOverdueUpdated = 0
    const results: {
      orgId: string
      name: string
      reminders: number
      overdueUpdated: number
      status: string
    }[] = []

    // Process orgs sequentially to avoid overwhelming email/SMS APIs
    for (const org of orgs) {
      try {
        // Parse the reminder day intervals (e.g., "3,7,14" -> [3, 7, 14])
        const reminderIntervals = org.invoiceReminderDays
          .split(",")
          .map((d) => parseInt(d.trim(), 10))
          .filter((d) => !isNaN(d) && d > 0)
          .sort((a, b) => a - b)

        if (reminderIntervals.length === 0) {
          results.push({
            orgId: org.id,
            name: org.name,
            reminders: 0,
            overdueUpdated: 0,
            status: "skipped: no valid reminder intervals",
          })
          continue
        }

        const maxReminders = reminderIntervals.length

        // Find invoices that are past due and still outstanding
        const invoices = await prisma.invoice.findMany({
          where: {
            organizationId: org.id,
            status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] },
            dueDate: { lt: now },
            reminderCount: { lt: maxReminders },
          },
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        })

        let orgReminders = 0
        let orgOverdueUpdated = 0

        for (const invoice of invoices) {
          // Update status to OVERDUE if it's currently SENT or VIEWED
          if (invoice.status === "SENT" || invoice.status === "VIEWED") {
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: { status: "OVERDUE" },
            })
            orgOverdueUpdated++
          }

          // Calculate how many days overdue this invoice is
          const daysOverdue = Math.floor(
            (now.getTime() - new Date(invoice.dueDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )

          // Determine the next reminder interval based on how many reminders sent
          // reminderCount = 0 -> check intervals[0] (e.g., 3 days)
          // reminderCount = 1 -> check intervals[1] (e.g., 7 days)
          // reminderCount = 2 -> check intervals[2] (e.g., 14 days)
          const nextInterval = reminderIntervals[invoice.reminderCount]

          // Only send if enough days have passed for this reminder level
          if (nextInterval === undefined || daysOverdue < nextInterval) {
            continue
          }

          // Build portal URL for the customer to view/pay
          const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${org.slug}/invoices/${invoice.accessToken}`
          const amountDue = Number(invoice.amountDue).toFixed(2)

          // --- Send Email Reminder ---
          const emailEnabled = await isNotificationEnabled(
            org.id,
            "invoice_reminder",
            "email"
          )
          if (
            emailEnabled &&
            invoice.customer.email &&
            process.env.SENDGRID_API_KEY
          ) {
            try {
              const sgMail = await import("@sendgrid/mail")
              sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)
              await sgMail.default.send({
                to: invoice.customer.email,
                from: {
                  email:
                    process.env.SENDGRID_FROM_EMAIL || "noreply@jobstream.app",
                  name: org.name || "JobStream",
                },
                subject: `Reminder: Invoice #${invoice.invoiceNumber} from ${org.name} is past due`,
                html: `<div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
              <h2>Hi ${invoice.customer.firstName},</h2>
              <p>This is a friendly reminder that invoice <strong>#${invoice.invoiceNumber}</strong> for <strong>$${amountDue}</strong> is ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} past due.</p>
              <p>Please take a moment to review and submit payment.</p>
              <a href="${portalUrl}" style="display: inline-block; background: #635BFF; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">View & Pay Invoice</a>
              <p style="color: #8898AA; font-size: 12px;">If you've already submitted payment, please disregard this message.</p>
            </div>`,
              })
            } catch (e) {
              console.error(
                `Failed to send reminder email for invoice ${invoice.invoiceNumber}:`,
                e
              )
            }

            // Log the email reminder
            await prisma.communicationLog.create({
              data: {
                organizationId: org.id,
                customerId: invoice.customer.id,
                type: "EMAIL",
                direction: "OUTBOUND",
                recipientAddress: invoice.customer.email,
                subject: `Reminder: Invoice #${invoice.invoiceNumber} from ${org.name} is past due`,
                content: `Auto-reminder #${invoice.reminderCount + 1}: Invoice #${invoice.invoiceNumber} for $${amountDue} is ${daysOverdue} days past due.`,
                status: process.env.SENDGRID_API_KEY ? "SENT" : "QUEUED",
                triggeredBy: "auto_reminder",
              },
            })
          } else if (emailEnabled && invoice.customer.email) {
            // Dev mode: log what would be sent
            console.log(
              `[DEV] Auto-reminder email would be sent to ${invoice.customer.email} for invoice ${invoice.invoiceNumber}`
            )
            await prisma.communicationLog.create({
              data: {
                organizationId: org.id,
                customerId: invoice.customer.id,
                type: "EMAIL",
                direction: "OUTBOUND",
                recipientAddress: invoice.customer.email,
                subject: `Reminder: Invoice #${invoice.invoiceNumber} from ${org.name} is past due`,
                content: `Auto-reminder #${invoice.reminderCount + 1}: Invoice #${invoice.invoiceNumber} for $${amountDue} is ${daysOverdue} days past due.`,
                status: "QUEUED",
                triggeredBy: "auto_reminder",
              },
            })
          }

          // --- Send SMS Reminder ---
          const smsEnabled = await isNotificationEnabled(
            org.id,
            "invoice_reminder",
            "sms"
          )
          if (smsEnabled && invoice.customer.phone) {
            const smsBody = `Hi ${invoice.customer.firstName}, Invoice #${invoice.invoiceNumber} for $${amountDue} from ${org.name} is past due. Pay here: ${portalUrl}`
            let twilioMessageSid: string | null = null
            let smsStatus: "SENT" | "FAILED" | "QUEUED" = "QUEUED"

            if (
              process.env.TWILIO_ACCOUNT_SID &&
              process.env.TWILIO_AUTH_TOKEN &&
              process.env.TWILIO_PHONE_NUMBER
            ) {
              try {
                const twilio = await import("twilio")
                const client = twilio.default(
                  process.env.TWILIO_ACCOUNT_SID,
                  process.env.TWILIO_AUTH_TOKEN
                )

                // Format phone number to E.164 (+1XXXXXXXXXX)
                let toPhone = invoice.customer.phone.replace(/\D/g, "")
                if (toPhone.length === 10) toPhone = "1" + toPhone
                if (!toPhone.startsWith("+")) toPhone = "+" + toPhone

                const message = await client.messages.create({
                  body: smsBody,
                  from: process.env.TWILIO_PHONE_NUMBER,
                  to: toPhone,
                })

                twilioMessageSid = message.sid
                smsStatus = "SENT"
              } catch (e) {
                console.error(
                  `Failed to send reminder SMS for invoice ${invoice.invoiceNumber}:`,
                  e
                )
                smsStatus = "FAILED"
              }
            } else {
              console.log(
                `[DEV] Auto-reminder SMS would be sent to ${invoice.customer.phone}: ${smsBody}`
              )
            }

            // Log the SMS reminder
            await prisma.communicationLog.create({
              data: {
                organizationId: org.id,
                customerId: invoice.customer.id,
                type: "SMS",
                direction: "OUTBOUND",
                recipientAddress: invoice.customer.phone,
                content: smsBody,
                status: smsStatus,
                triggeredBy: "auto_reminder",
                twilioMessageSid,
              },
            })
          }

          // Update the invoice reminder tracking fields
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              lastReminderSentAt: now,
              reminderCount: { increment: 1 },
            },
          })

          orgReminders++
        }

        totalReminders += orgReminders
        totalOverdueUpdated += orgOverdueUpdated
        results.push({
          orgId: org.id,
          name: org.name,
          reminders: orgReminders,
          overdueUpdated: orgOverdueUpdated,
          status: "ok",
        })
      } catch (e) {
        console.error(`Cron invoice-reminders failed for org ${org.id}:`, e)
        results.push({
          orgId: org.id,
          name: org.name,
          reminders: 0,
          overdueUpdated: 0,
          status: "error",
        })
      }
    }

    return NextResponse.json({
      message: `Processed ${orgs.length} organization(s), sent ${totalReminders} reminder(s), marked ${totalOverdueUpdated} invoice(s) as overdue`,
      totalReminders,
      totalOverdueUpdated,
      results,
    })
  } catch (error) {
    console.error("Cron invoice-reminders error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
