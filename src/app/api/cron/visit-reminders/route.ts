import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { isNotificationEnabled } from "@/lib/notification-check"

/**
 * Cron endpoint to send visit reminder notifications.
 * Runs daily via Vercel Cron (recommended: early morning, e.g. 8 AM ET).
 *
 * 1. Finds all visits scheduled for tomorrow with status = SCHEDULED
 * 2. Checks customer notification preferences per organization
 * 3. Sends reminder SMS and/or email to the customer
 * 4. Creates CommunicationLog records for sent notifications
 *
 * GET /api/cron/visit-reminders
 */
export async function GET(request: NextRequest) {
  // Verify the cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Calculate tomorrow's date range (00:00:00 to 23:59:59)
    const now = new Date()
    const tomorrowStart = new Date(now)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)
    tomorrowStart.setHours(0, 0, 0, 0)

    const tomorrowEnd = new Date(tomorrowStart)
    tomorrowEnd.setHours(23, 59, 59, 999)

    // Find all visits scheduled for tomorrow that are still in SCHEDULED status
    const visits = await prisma.visit.findMany({
      where: {
        status: "SCHEDULED",
        scheduledStart: {
          gte: tomorrowStart,
          lte: tomorrowEnd,
        },
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            customerId: true,
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
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    if (visits.length === 0) {
      return NextResponse.json({
        message: "No visits scheduled for tomorrow",
        processed: 0,
        emailsSent: 0,
        smsSent: 0,
      })
    }

    let emailsSent = 0
    let smsSent = 0
    let skipped = 0
    const errors: string[] = []

    for (const visit of visits) {
      try {
        const customer = visit.job.customer
        const orgId = visit.organizationId
        const orgName = visit.organization.name
        const serviceTitle = visit.job.title

        // Format the appointment time for the reminder message
        const appointmentTime = visit.scheduledStart
          ? new Date(visit.scheduledStart).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
          : "a scheduled time"

        const reminderMessage = `Reminder: Your appointment for ${serviceTitle} is scheduled for tomorrow at ${appointmentTime}.`

        // --- Send Email Reminder ---
        const emailEnabled = await isNotificationEnabled(
          orgId,
          "visit_reminder",
          "email"
        )

        if (emailEnabled && customer.email) {
          let emailStatus: "SENT" | "QUEUED" | "FAILED" = "QUEUED"

          if (process.env.SENDGRID_API_KEY) {
            try {
              const sgMail = await import("@sendgrid/mail")
              sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)
              await sgMail.default.send({
                to: customer.email,
                from: {
                  email:
                    process.env.SENDGRID_FROM_EMAIL || "noreply@jobstream.app",
                  name: orgName || "JobStream",
                },
                subject: `Appointment Reminder: ${serviceTitle} - Tomorrow at ${appointmentTime}`,
                html: `<div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
                  <h2>Hi ${customer.firstName},</h2>
                  <p>${reminderMessage}</p>
                  <p>If you need to reschedule or have any questions, please contact us.</p>
                  <p style="color: #8898AA; font-size: 12px;">This is an automated reminder from ${orgName}.</p>
                </div>`,
              })
              emailStatus = "SENT"
              emailsSent++
            } catch (e) {
              console.error(
                `Failed to send visit reminder email for visit ${visit.id}:`,
                e
              )
              emailStatus = "FAILED"
            }
          } else {
            // Dev mode: log what would be sent
            console.log(
              `[DEV] Visit reminder email would be sent to ${customer.email} for visit ${visit.id}`
            )
          }

          // Log the email communication
          await prisma.communicationLog.create({
            data: {
              organizationId: orgId,
              customerId: customer.id,
              type: "EMAIL",
              direction: "OUTBOUND",
              recipientAddress: customer.email,
              subject: `Appointment Reminder: ${serviceTitle} - Tomorrow at ${appointmentTime}`,
              content: reminderMessage,
              status: emailStatus,
              triggeredBy: "visit_reminder_cron",
            },
          })
        }

        // --- Send SMS Reminder ---
        const smsEnabled = await isNotificationEnabled(
          orgId,
          "visit_reminder",
          "sms"
        )

        if (smsEnabled && customer.phone) {
          const smsBody = `${reminderMessage} - ${orgName}`
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
              let toPhone = customer.phone.replace(/\D/g, "")
              if (toPhone.length === 10) toPhone = "1" + toPhone
              if (!toPhone.startsWith("+")) toPhone = "+" + toPhone

              const message = await client.messages.create({
                body: smsBody,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: toPhone,
              })

              twilioMessageSid = message.sid
              smsStatus = "SENT"
              smsSent++
            } catch (e) {
              console.error(
                `Failed to send visit reminder SMS for visit ${visit.id}:`,
                e
              )
              smsStatus = "FAILED"
            }
          } else {
            // Dev mode: log what would be sent
            console.log(
              `[DEV] Visit reminder SMS would be sent to ${customer.phone}: ${smsBody}`
            )
          }

          // Log the SMS communication
          await prisma.communicationLog.create({
            data: {
              organizationId: orgId,
              customerId: customer.id,
              type: "SMS",
              direction: "OUTBOUND",
              recipientAddress: customer.phone,
              content: smsBody,
              status: smsStatus,
              triggeredBy: "visit_reminder_cron",
              twilioMessageSid,
            },
          })
        }

        // If neither channel was enabled or customer had no contact info, skip
        if (
          (!emailEnabled || !customer.email) &&
          (!smsEnabled || !customer.phone)
        ) {
          skipped++
        }
      } catch (e: any) {
        console.error(`Failed to process visit reminder for visit ${visit.id}:`, e)
        errors.push(`Visit ${visit.id}: ${e?.message || "Unknown error"}`)
      }
    }

    return NextResponse.json({
      message: `Processed ${visits.length} visit(s) scheduled for tomorrow`,
      processed: visits.length,
      emailsSent,
      smsSent,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Cron visit-reminders error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
