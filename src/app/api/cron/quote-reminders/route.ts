import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { isNotificationEnabled } from "@/lib/notification-check"

/**
 * Cron endpoint to send automated follow-up reminders for pending quotes.
 * Runs daily at 2:00 PM UTC (10 AM ET) via Vercel Cron.
 *
 * For each organization with quoteRemindersEnabled = true:
 * 1. Finds quotes that are SENT, not yet expired, and due for a reminder
 * 2. Sends reminder emails/SMS at configured intervals (default: 3, 7, 14 days after sent)
 * 3. Logs each reminder to CommunicationLog
 *
 * GET /api/cron/quote-reminders
 */
export async function GET(request: NextRequest) {
  // Verify the cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Find all organizations that have quote reminders enabled
    const orgs = await prisma.organization.findMany({
      where: { quoteRemindersEnabled: true },
      select: {
        id: true,
        name: true,
        slug: true,
        quoteReminderDays: true,
      },
    })

    if (orgs.length === 0) {
      return NextResponse.json({
        message: "No organizations with quote reminders enabled",
        processed: 0,
      })
    }

    const now = new Date()
    let totalReminders = 0
    const results: {
      orgId: string
      name: string
      reminders: number
      status: string
    }[] = []

    // Process orgs sequentially to avoid overwhelming email/SMS APIs
    for (const org of orgs) {
      try {
        // Parse the reminder day intervals (e.g., "3,7,14" -> [3, 7, 14])
        const reminderIntervals = org.quoteReminderDays
          .split(",")
          .map((d) => parseInt(d.trim(), 10))
          .filter((d) => !isNaN(d) && d > 0)
          .sort((a, b) => a - b)

        if (reminderIntervals.length === 0) {
          results.push({
            orgId: org.id,
            name: org.name,
            reminders: 0,
            status: "skipped: no valid reminder intervals",
          })
          continue
        }

        const maxReminders = reminderIntervals.length

        // Find quotes that are sent, not yet expired, and eligible for reminders
        const quotes = await prisma.quote.findMany({
          where: {
            organizationId: org.id,
            status: "SENT",
            validUntil: { gt: now },
            sentAt: { not: null },
            reminderCount: { lt: maxReminders },
            customer: { isArchived: false },
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

        for (const quote of quotes) {
          // Calculate how many days since the quote was sent
          const daysSinceSent = Math.floor(
            (now.getTime() - new Date(quote.sentAt!).getTime()) /
              (1000 * 60 * 60 * 24)
          )

          // Determine the next reminder interval based on how many reminders sent
          const nextInterval = reminderIntervals[quote.reminderCount]

          // Only send if enough days have passed for this reminder level
          if (nextInterval === undefined || daysSinceSent < nextInterval) {
            continue
          }

          // Build portal URL for the customer to view/approve
          const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${org.slug}/quotes/${quote.accessToken}`
          const quoteTotal = Number(quote.total).toFixed(2)
          const validUntilFormatted = new Date(
            quote.validUntil
          ).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })

          // --- Send Email Reminder ---
          const emailEnabled = await isNotificationEnabled(
            org.id,
            "v2_quote_reminder",
            "email"
          )
          if (
            emailEnabled &&
            quote.customer.email &&
            process.env.SENDGRID_API_KEY
          ) {
            try {
              const sgMail = await import("@sendgrid/mail")
              sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)
              await sgMail.default.send({
                to: quote.customer.email,
                from: {
                  email:
                    process.env.SENDGRID_FROM_EMAIL || "noreply@jobstream.app",
                  name: org.name || "JobStream",
                },
                subject: `Reminder: Quote #${quote.quoteNumber} from ${org.name}`,
                html: `<div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
              <h2>Hi ${quote.customer.firstName},</h2>
              <p>We sent you a quote <strong>#${quote.quoteNumber}</strong> for <strong>$${quoteTotal}</strong> ${daysSinceSent} day${daysSinceSent === 1 ? "" : "s"} ago. We'd love to help you get started!</p>
              <p>Please review and let us know if you have any questions.</p>
              <a href="${portalUrl}" style="display: inline-block; background: #635BFF; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">View Quote</a>
              <p style="color: #8898AA; font-size: 12px;">This quote is valid until ${validUntilFormatted}.</p>
            </div>`,
              })
            } catch (e) {
              console.error(
                `Failed to send reminder email for quote ${quote.quoteNumber}:`,
                e
              )
            }

            // Log the email reminder
            await prisma.communicationLog.create({
              data: {
                organizationId: org.id,
                customerId: quote.customer.id,
                type: "EMAIL",
                direction: "OUTBOUND",
                recipientAddress: quote.customer.email,
                subject: `Reminder: Quote #${quote.quoteNumber} from ${org.name}`,
                content: `Auto-reminder #${quote.reminderCount + 1}: Quote #${quote.quoteNumber} for $${quoteTotal} sent ${daysSinceSent} days ago.`,
                status: process.env.SENDGRID_API_KEY ? "SENT" : "QUEUED",
                triggeredBy: "auto_reminder",
              },
            })
          } else if (emailEnabled && quote.customer.email) {
            // Dev mode: log what would be sent
            console.log(
              `[DEV] Auto-reminder email would be sent to ${quote.customer.email} for quote ${quote.quoteNumber}`
            )
            await prisma.communicationLog.create({
              data: {
                organizationId: org.id,
                customerId: quote.customer.id,
                type: "EMAIL",
                direction: "OUTBOUND",
                recipientAddress: quote.customer.email,
                subject: `Reminder: Quote #${quote.quoteNumber} from ${org.name}`,
                content: `Auto-reminder #${quote.reminderCount + 1}: Quote #${quote.quoteNumber} for $${quoteTotal} sent ${daysSinceSent} days ago.`,
                status: "QUEUED",
                triggeredBy: "auto_reminder",
              },
            })
          }

          // --- Send SMS Reminder ---
          const smsEnabled = await isNotificationEnabled(
            org.id,
            "v2_quote_reminder",
            "sms"
          )
          if (smsEnabled && quote.customer.phone) {
            const smsBody = `Hi ${quote.customer.firstName}, Quote #${quote.quoteNumber} for $${quoteTotal} from ${org.name} is still waiting for your review. View it here: ${portalUrl}`
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
                let toPhone = quote.customer.phone.replace(/\D/g, "")
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
                  `Failed to send reminder SMS for quote ${quote.quoteNumber}:`,
                  e
                )
                smsStatus = "FAILED"
              }
            } else {
              console.log(
                `[DEV] Auto-reminder SMS would be sent to ${quote.customer.phone}: ${smsBody}`
              )
            }

            // Log the SMS reminder
            await prisma.communicationLog.create({
              data: {
                organizationId: org.id,
                customerId: quote.customer.id,
                type: "SMS",
                direction: "OUTBOUND",
                recipientAddress: quote.customer.phone,
                content: smsBody,
                status: smsStatus,
                triggeredBy: "auto_reminder",
                twilioMessageSid,
              },
            })
          }

          // Update the quote reminder tracking fields
          await prisma.quote.update({
            where: { id: quote.id },
            data: {
              lastReminderSentAt: now,
              reminderCount: { increment: 1 },
            },
          })

          orgReminders++
        }

        totalReminders += orgReminders
        results.push({
          orgId: org.id,
          name: org.name,
          reminders: orgReminders,
          status: "ok",
        })
      } catch (e) {
        console.error(`Cron quote-reminders failed for org ${org.id}:`, e)
        results.push({
          orgId: org.id,
          name: org.name,
          reminders: 0,
          status: "error",
        })
      }
    }

    return NextResponse.json({
      message: `Processed ${orgs.length} organization(s), sent ${totalReminders} quote reminder(s)`,
      totalReminders,
      results,
    })
  } catch (error) {
    console.error("Cron quote-reminders error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
