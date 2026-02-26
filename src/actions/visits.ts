"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { logActivityEvent, ActivityEventTypes } from "@/lib/activity-logger"
import { calculateNextOccurrence } from "@/lib/recurrence"

// =============================================================================
// 1. createVisit - Create a new visit on a job
// =============================================================================

export async function createVisit(data: {
  jobId: string
  purpose?: "DIAGNOSTIC" | "SERVICE" | "FOLLOW_UP" | "MAINTENANCE"
  status?: "UNSCHEDULED" | "ANYTIME" | "SCHEDULED"
  scheduledStart?: string | Date
  scheduledEnd?: string | Date
  arrivalWindowMinutes?: number
  notes?: string
  assignedUserIds?: string[]
}) {
  try {
    const user = await requireAuth()

    // Verify job belongs to user's org
    const job = await prisma.job.findFirst({
      where: { id: data.jobId, organizationId: user.organizationId },
    })
    if (!job) return { error: "Job not found" }

    // Auto-calculate visitNumber (count existing visits on job + 1)
    const existingCount = await prisma.visit.count({
      where: { jobId: data.jobId },
    })
    const visitNumber = existingCount + 1

    const visit = await prisma.$transaction(async (tx) => {
      const newVisit = await tx.visit.create({
        data: {
          jobId: data.jobId,
          organizationId: user.organizationId,
          visitNumber,
          purpose: data.purpose || "SERVICE",
          status: data.status || "UNSCHEDULED",
          scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : null,
          scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : null,
          arrivalWindowMinutes: data.arrivalWindowMinutes ?? null,
          notes: data.notes || null,
        },
      })

      // Create VisitAssignments if assignedUserIds provided
      if (data.assignedUserIds && data.assignedUserIds.length > 0) {
        await tx.visitAssignment.createMany({
          data: data.assignedUserIds.map((userId) => ({
            visitId: newVisit.id,
            userId,
            organizationId: user.organizationId,
          })),
        })
      }

      return newVisit
    })

    return { visitId: visit.id }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("createVisit error:", error)
    return { error: "Failed to create visit" }
  }
}

// =============================================================================
// 2. updateVisitStatus - Change visit status (workflow transitions)
// =============================================================================

export async function updateVisitStatus(
  visitId: string,
  newStatus: "UNSCHEDULED" | "ANYTIME" | "SCHEDULED" | "EN_ROUTE" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
  data?: { completionNotes?: string }
) {
  try {
    const user = await requireAuth()

    const visit = await prisma.visit.findFirst({
      where: { id: visitId, organizationId: user.organizationId },
    })
    if (!visit) return { error: "Visit not found" }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      UNSCHEDULED: ["ANYTIME", "SCHEDULED", "CANCELLED"],
      ANYTIME: ["UNSCHEDULED", "SCHEDULED", "EN_ROUTE", "CANCELLED"],
      SCHEDULED: ["UNSCHEDULED", "ANYTIME", "EN_ROUTE", "CANCELLED"],
      EN_ROUTE: ["IN_PROGRESS", "CANCELLED"],
      IN_PROGRESS: ["COMPLETED", "CANCELLED"],
      COMPLETED: [], // Can't transition from completed
      CANCELLED: ["UNSCHEDULED"], // Reopen
    }

    if (!validTransitions[visit.status]?.includes(newStatus)) {
      return { error: `Cannot transition from ${visit.status} to ${newStatus}` }
    }

    const updateData: any = { status: newStatus }

    if (newStatus === "IN_PROGRESS") {
      updateData.actualStart = new Date()
    } else if (newStatus === "COMPLETED") {
      updateData.actualEnd = new Date()
      if (data?.completionNotes) {
        updateData.completionNotes = data.completionNotes
      }
    }

    await prisma.visit.update({
      where: { id: visitId },
      data: updateData,
    })

    // -----------------------------------------------------------------------
    // Bug B fix: Sync parent Job.status to match visit status during dual-write
    // -----------------------------------------------------------------------
    if (newStatus === "EN_ROUTE" || newStatus === "IN_PROGRESS") {
      try {
        await prisma.job.update({
          where: { id: visit.jobId },
          data: { status: "IN_PROGRESS" },
        })
      } catch (e) {
        console.error("Failed to sync Job.status to IN_PROGRESS:", e)
      }
    }

    // -----------------------------------------------------------------------
    // Bug A fix: Recurring visit cycling when a visit is COMPLETED
    // -----------------------------------------------------------------------
    if (newStatus === "COMPLETED") {
      // Check if all visits on this job are now completed, and sync Job.status
      try {
        const allVisits = await prisma.visit.findMany({
          where: { jobId: visit.jobId },
          select: { status: true },
        })
        const allCompleted = allVisits.every(
          (v) => v.status === "COMPLETED" || v.status === "CANCELLED"
        )
        if (allCompleted) {
          await prisma.job.update({
            where: { id: visit.jobId },
            data: { status: "COMPLETED" },
          })
        }
      } catch (e) {
        console.error("Failed to sync Job.status to COMPLETED:", e)
      }

      // Create next recurring visit if the parent job is recurring
      try {
        const job = await prisma.job.findFirst({
          where: { id: visit.jobId },
          select: {
            id: true,
            isRecurring: true,
            recurrenceRule: true,
            recurrenceEndDate: true,
            parentJobId: true,
            scheduledStart: true,
            scheduledEnd: true,
          },
        })

        if (job && job.isRecurring && !job.parentJobId && job.recurrenceRule) {
          // Get the completed visit's scheduled dates to calculate next occurrence
          const completedVisit = await prisma.visit.findFirst({
            where: { id: visitId },
            select: {
              scheduledStart: true,
              scheduledEnd: true,
              arrivalWindowMinutes: true,
              assignments: { select: { userId: true } },
            },
          })

          if (completedVisit?.scheduledStart && completedVisit?.scheduledEnd) {
            const duration =
              completedVisit.scheduledEnd.getTime() -
              completedVisit.scheduledStart.getTime()
            const nextStart = calculateNextOccurrence(
              completedVisit.scheduledStart,
              job.recurrenceRule
            )

            // Check if the series is past its end date
            const seriesDone =
              job.recurrenceEndDate && nextStart > job.recurrenceEndDate

            if (!seriesDone) {
              const nextEnd = new Date(nextStart.getTime() + duration)

              // Count existing visits for next visitNumber
              const lastVisit = await prisma.visit.findFirst({
                where: { jobId: job.id },
                orderBy: { visitNumber: "desc" },
                select: { visitNumber: true },
              })
              const nextVisitNumber = (lastVisit?.visitNumber ?? 0) + 1

              await prisma.$transaction(async (tx) => {
                const newVisit = await tx.visit.create({
                  data: {
                    jobId: job.id,
                    organizationId: user.organizationId,
                    visitNumber: nextVisitNumber,
                    purpose: "MAINTENANCE",
                    status: "SCHEDULED",
                    scheduledStart: nextStart,
                    scheduledEnd: nextEnd,
                    arrivalWindowMinutes:
                      completedVisit.arrivalWindowMinutes ?? null,
                  },
                })

                // Copy assignments from the completed visit
                if (
                  completedVisit.assignments &&
                  completedVisit.assignments.length > 0
                ) {
                  await tx.visitAssignment.createMany({
                    data: completedVisit.assignments.map((a) => ({
                      visitId: newVisit.id,
                      userId: a.userId,
                      organizationId: user.organizationId,
                    })),
                  })
                }

                // Log activity event
                await logActivityEvent({
                  organizationId: user.organizationId,
                  jobId: job.id,
                  visitId: newVisit.id,
                  userId: user.id,
                  eventType: ActivityEventTypes.VISIT_CREATED,
                  title: `Visit #${nextVisitNumber} auto-created from recurring schedule`,
                  description: `Next occurrence scheduled for ${nextStart.toISOString()}`,
                  metadata: {
                    visitNumber: nextVisitNumber,
                    scheduledStart: nextStart.toISOString(),
                    scheduledEnd: nextEnd.toISOString(),
                    source: "recurring_auto",
                  },
                })
              })
            }
          }
        }
      } catch (e) {
        // Don't fail the status update if recurring cycling fails
        console.error("Recurring visit cycling failed:", e)
      }
    }

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("updateVisitStatus error:", error)
    return { error: "Failed to update visit status" }
  }
}

// =============================================================================
// 3. completeVisit - Shortcut to complete a visit
// =============================================================================

export async function completeVisit(
  visitId: string,
  data?: { completionNotes?: string }
) {
  try {
    const user = await requireAuth()

    const visit = await prisma.visit.findFirst({
      where: { id: visitId, organizationId: user.organizationId },
    })
    if (!visit) return { error: "Visit not found" }

    // Verify visit is IN_PROGRESS first
    if (visit.status !== "IN_PROGRESS") {
      return { error: "Visit must be in progress to complete" }
    }

    return updateVisitStatus(visitId, "COMPLETED", data)
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("completeVisit error:", error)
    return { error: "Failed to complete visit" }
  }
}

// =============================================================================
// 4. rescheduleVisit - Update visit schedule
// =============================================================================

export async function rescheduleVisit(
  visitId: string,
  scheduledStart: string | Date,
  scheduledEnd?: string | Date | null,
  options?: { anytime?: boolean; skipNotification?: boolean }
) {
  try {
    const user = await requireAuth()

    const visit = await prisma.visit.findFirst({
      where: { id: visitId, organizationId: user.organizationId },
      include: {
        job: {
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            property: true,
          },
        },
      },
    })
    if (!visit) return { error: "Visit not found" }

    const newStartDate = new Date(scheduledStart)
    const newEndDate = scheduledEnd ? new Date(scheduledEnd) : null
    const newStatus = options?.anytime ? "ANYTIME" : "SCHEDULED"

    await prisma.visit.update({
      where: { id: visitId },
      data: {
        scheduledStart: newStartDate,
        scheduledEnd: newEndDate,
        status: newStatus,
      },
    })

    // -----------------------------------------------------------------------
    // Bug C fix: Send reschedule notification email to the customer
    // -----------------------------------------------------------------------
    if (options?.skipNotification) {
      return { success: true }
    }

    try {
      const { isNotificationEnabled } = await import("@/lib/notification-check")

      if (
        await isNotificationEnabled(
          user.organizationId,
          "JOB_RESCHEDULED",
          "email"
        )
      ) {
        const customer = visit.job.customer
        if (customer.email && process.env.SENDGRID_API_KEY) {
          const org = await prisma.organization.findUnique({
            where: { id: user.organizationId },
            select: { name: true, defaultArrivalWindow: true },
          })

          const orgName = org?.name || "JobStream"

          const formattedDate = newStartDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
          const formattedTime = newStartDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })

          // Use arrival window for display if configured
          const { formatArrivalTime } = await import("@/lib/format-helpers")
          const arrivalWindow =
            visit.arrivalWindowMinutes ?? org?.defaultArrivalWindow ?? 0
          const arrivalTimeText =
            arrivalWindow > 0
              ? formatArrivalTime(newStartDate, arrivalWindow)
              : `at ${formattedTime}`

          const subject = `Your appointment has been updated - ${orgName}`

          const sgMail = await import("@sendgrid/mail")
          sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)
          await sgMail.default.send({
            to: customer.email,
            from: {
              email:
                process.env.SENDGRID_FROM_EMAIL || "noreply@jobstream.app",
              name: orgName,
            },
            subject,
            html: `
              <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
                <h2>Hi ${customer.firstName},</h2>
                <p>Your appointment for <strong>${visit.job.title}</strong> (Visit #${visit.visitNumber}) has been rescheduled to <strong>${formattedDate}</strong> <strong>${arrivalTimeText}</strong>.</p>
                <p>If you have any questions or need to make changes, please don't hesitate to contact us.</p>
                <p>We look forward to seeing you!</p>
                <br />
                <p style="color: #666;">- ${orgName}</p>
              </div>
            `,
          })

          // Log the communication
          await prisma.communicationLog.create({
            data: {
              organizationId: user.organizationId,
              customerId: customer.id,
              type: "EMAIL",
              direction: "OUTBOUND",
              recipientAddress: customer.email,
              subject,
              content: `Visit #${visit.visitNumber} rescheduled for ${customer.firstName} ${customer.lastName} to ${formattedDate} ${arrivalTimeText}`,
              status: "SENT",
              triggeredBy: "visit_rescheduled",
            },
          })
        }
      }
    } catch (e) {
      // Don't fail the reschedule if notification fails
      console.error("Failed to send visit reschedule notification:", e)
    }

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("rescheduleVisit error:", error)
    return { error: "Failed to reschedule visit" }
  }
}

// =============================================================================
// 5. assignVisit - Update visit assignments
// =============================================================================

export async function assignVisit(visitId: string, userIds: string[]) {
  try {
    const user = await requireAuth()

    const visit = await prisma.visit.findFirst({
      where: { id: visitId, organizationId: user.organizationId },
    })
    if (!visit) return { error: "Visit not found" }

    await prisma.$transaction([
      prisma.visitAssignment.deleteMany({ where: { visitId } }),
      prisma.visitAssignment.createMany({
        data: userIds.map((userId) => ({
          visitId,
          userId,
          organizationId: user.organizationId,
        })),
      }),
    ])

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("assignVisit error:", error)
    return { error: "Failed to assign visit" }
  }
}

// =============================================================================
// 6. getCalendarVisits - Get visits for calendar view
// =============================================================================

export async function getCalendarVisits(params: {
  start: string
  end: string
  userIds?: string[]
}) {
  try {
    const user = await requireAuth()

    const rangeStart = new Date(params.start)
    const rangeEnd = new Date(params.end)

    const where: any = {
      organizationId: user.organizationId,
      job: { customer: { isArchived: false } },
      status: { not: "CANCELLED" },
      scheduledStart: { gte: rangeStart, lte: rangeEnd },
    }

    if (params.userIds && params.userIds.length > 0) {
      where.assignments = { some: { userId: { in: params.userIds } } }
    }

    const visits = await prisma.visit.findMany({
      where,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            jobNumber: true,
            priority: true,
            customer: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, color: true },
            },
          },
        },
      },
      orderBy: { scheduledStart: "asc" },
    })

    return { visits }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getCalendarVisits error:", error)
    return { error: "Failed to fetch calendar visits" }
  }
}

// =============================================================================
// 6b. getUnscheduledVisits - Get visits with status UNSCHEDULED
// =============================================================================

export async function getUnscheduledVisits(params?: { userIds?: string[] }) {
  try {
    const user = await requireAuth()

    const where: any = {
      organizationId: user.organizationId,
      job: { customer: { isArchived: false } },
      status: "UNSCHEDULED",
    }

    if (params?.userIds && params.userIds.length > 0) {
      where.assignments = { some: { userId: { in: params.userIds } } }
    }

    const visits = await prisma.visit.findMany({
      where,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            jobNumber: true,
            priority: true,
            customer: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, color: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return { visits }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getUnscheduledVisits error:", error)
    return { error: "Failed to fetch unscheduled visits" }
  }
}

// =============================================================================
// 7. sendOnMyWayForVisit - Send "On My Way" notification for a visit
// =============================================================================

export async function sendOnMyWayForVisit(visitId: string) {
  try {
    const user = await requireAuth()

    // Find visit with job, customer, property, and assignments
    const visit = await prisma.visit.findFirst({
      where: { id: visitId, organizationId: user.organizationId },
      include: {
        job: {
          include: {
            customer: true,
            property: true,
          },
        },
        assignments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    })
    if (!visit) return { error: "Visit not found" }

    // Check visit is SCHEDULED or ANYTIME
    if (visit.status !== "SCHEDULED" && visit.status !== "ANYTIME") {
      return { error: "Visit must be scheduled to send 'On My Way'" }
    }

    // Check if already sent recently (within 30 minutes)
    if (visit.onMyWaySentAt) {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
      if (visit.onMyWaySentAt > thirtyMinutesAgo) {
        return { error: "Already sent recently" }
      }
    }

    // Look up org settings
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        name: true,
        slug: true,
        defaultArrivalWindow: true,
        onMyWayNotificationEnabled: true,
      },
    })

    const now = new Date()
    let smsSent = false
    let emailSent = false
    const warnings: string[] = []

    // Only send notifications if the org has it enabled
    if (org?.onMyWayNotificationEnabled) {
      const customer = visit.job.customer
      const techName = user.firstName || "Your technician"
      const orgName = org.name || "JobStream"

      // Build address string from property if available
      const property = visit.job.property
      const address = property
        ? `${property.addressLine1}${property.addressLine2 ? ", " + property.addressLine2 : ""}, ${property.city}, ${property.state} ${property.zip}`
        : null

      const smsMessage = address
        ? `Hi ${customer.firstName}, ${techName} from ${orgName} is on the way! Visit #${visit.visitNumber} for ${visit.job.title} at ${address}. See you soon!`
        : `Hi ${customer.firstName}, ${techName} from ${orgName} is on the way! Visit #${visit.visitNumber} for ${visit.job.title}. See you soon!`

      // Check notification preferences
      const { isNotificationEnabled } = await import("@/lib/notification-check")

      // Send SMS if customer has phone and Twilio is configured
      if (await isNotificationEnabled(user.organizationId, "JOB_ON_MY_WAY", "sms")) {
        if (customer.phone && process.env.TWILIO_ACCOUNT_SID) {
          try {
            const twilio = await import("twilio")
            const client = twilio.default(
              process.env.TWILIO_ACCOUNT_SID,
              process.env.TWILIO_AUTH_TOKEN
            )
            let toPhone = customer.phone.replace(/\D/g, "")
            if (toPhone.length === 10) toPhone = "1" + toPhone
            if (!toPhone.startsWith("+")) toPhone = "+" + toPhone

            await client.messages.create({
              body: smsMessage,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: toPhone,
            })

            smsSent = true

            // Log SMS communication
            await prisma.communicationLog.create({
              data: {
                organizationId: user.organizationId,
                customerId: customer.id,
                type: "SMS",
                direction: "OUTBOUND",
                recipientAddress: customer.phone,
                content: smsMessage,
                status: "SENT",
                triggeredBy: "on_my_way_visit",
              },
            })
          } catch (e: any) {
            console.error("Failed to send On My Way SMS for visit:", e)
            warnings.push(`SMS failed: ${e?.message || "Unknown error"}`)
          }
        }
      }

      // Send email if customer has email and SendGrid is configured
      if (await isNotificationEnabled(user.organizationId, "JOB_ON_MY_WAY", "email")) {
        if (customer.email && process.env.SENDGRID_API_KEY) {
          try {
            const sgMail = await import("@sendgrid/mail")
            sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)

            const subject = `${techName} from ${orgName} is on the way!`

            const addressHtml = address
              ? ` at <strong>${address}</strong>`
              : ""

            await sgMail.default.send({
              to: customer.email,
              from: {
                email: process.env.SENDGRID_FROM_EMAIL || "noreply@jobstream.app",
                name: orgName,
              },
              subject,
              html: `
                <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
                  <h2>Hi ${customer.firstName},</h2>
                  <p><strong>${techName}</strong> from <strong>${orgName}</strong> is on the way to you!</p>
                  <p>They'll be performing <strong>${visit.job.title}</strong> (Visit #${visit.visitNumber})${addressHtml}.</p>
                  <p>If you have any questions, please don't hesitate to contact us.</p>
                  <br />
                  <p style="color: #666;">- ${orgName}</p>
                </div>
              `,
            })

            emailSent = true

            // Log email communication
            await prisma.communicationLog.create({
              data: {
                organizationId: user.organizationId,
                customerId: customer.id,
                type: "EMAIL",
                direction: "OUTBOUND",
                recipientAddress: customer.email,
                subject,
                content: `On My Way notification sent to ${customer.firstName} ${customer.lastName}. ${techName} on the way for ${visit.job.title} (Visit #${visit.visitNumber})${address ? " at " + address : ""}.`,
                status: "SENT",
                triggeredBy: "on_my_way_visit",
              },
            })
          } catch (e: any) {
            console.error("Failed to send On My Way email for visit:", e)
            warnings.push(`Email failed: ${e?.message || "Unknown error"}`)
          }
        }
      }

      // Warn if customer has no contact info at all
      if (!customer.phone && !customer.email) {
        warnings.push("Customer has no contact information. No notification was sent.")
      }
    }

    // Update visit: set onMyWaySentAt, transition to EN_ROUTE
    await prisma.visit.update({
      where: { id: visitId },
      data: {
        onMyWaySentAt: now,
        status: "EN_ROUTE",
        actualStart: visit.actualStart || now,
      },
    })

    // Bug B fix: Sync parent Job.status to IN_PROGRESS and set onMyWaySentAt
    try {
      await prisma.job.update({
        where: { id: visit.jobId },
        data: {
          status: "IN_PROGRESS",
          onMyWaySentAt: now,
        },
      })
    } catch (e) {
      console.error("Failed to sync Job.status from sendOnMyWayForVisit:", e)
    }

    return { success: true, smsSent, emailSent, warnings }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("sendOnMyWayForVisit error:", error)
    return { error: "Failed to send On My Way notification" }
  }
}

// =============================================================================
// 8. getVisit - Get single visit with all relations
// =============================================================================

export async function getVisit(visitId: string) {
  try {
    const user = await requireAuth()

    const visit = await prisma.visit.findFirst({
      where: { id: visitId, organizationId: user.organizationId },
      include: {
        job: {
          include: {
            customer: {
              include: { properties: true },
            },
            property: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatar: true, color: true },
            },
          },
        },
        lineItems: { orderBy: { sortOrder: "asc" } },
      },
    })

    if (!visit) return { error: "Visit not found" }

    return {
      visit: {
        ...visit,
        lineItems: visit.lineItems.map((li) => ({
          ...li,
          quantity: Number(li.quantity),
          unitPrice: Number(li.unitPrice),
          total: Number(li.total),
        })),
      },
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getVisit error:", error)
    return { error: "Failed to fetch visit" }
  }
}

// =============================================================================
// 9a. createVisitFromApprovedQuote - Internal helper (no auth) for v2 flow
// When a quote with a jobId is approved, create a new Visit on the existing Job
// =============================================================================

export async function createVisitFromApprovedQuote(
  organizationId: string,
  quoteId: string,
  jobId: string
): Promise<{ visitId: string } | { error: string }> {
  try {
    // Look up the quote's line items
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, organizationId },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
      },
    })
    if (!quote) return { error: "Quote not found" }

    // Get the job to verify it exists and belongs to the org
    const job = await prisma.job.findFirst({
      where: { id: jobId, organizationId },
    })
    if (!job) return { error: "Job not found" }

    // Determine which line items to copy:
    // If the quote has a selectedOptionId, only copy line items from that option.
    // Otherwise, copy all line items with quoteOptionId = null.
    let lineItemsToCopy = quote.lineItems
    if (quote.selectedOptionId) {
      lineItemsToCopy = quote.lineItems.filter(
        (li) => li.quoteOptionId === quote.selectedOptionId
      )
    } else {
      lineItemsToCopy = quote.lineItems.filter(
        (li) => li.quoteOptionId === null
      )
    }

    // Count existing visits on the job for visitNumber
    const existingCount = await prisma.visit.count({
      where: { jobId },
    })
    const visitNumber = existingCount + 1

    // Create the Visit and copy line items in a transaction
    const visit = await prisma.$transaction(async (tx) => {
      const newVisit = await tx.visit.create({
        data: {
          jobId,
          organizationId,
          visitNumber,
          purpose: "SERVICE",
          status: "UNSCHEDULED",
        },
      })

      // Copy quote line items to JobLineItems linked to the new visit
      if (lineItemsToCopy.length > 0) {
        await tx.jobLineItem.createMany({
          data: lineItemsToCopy.map((li) => ({
            jobId,
            visitId: newVisit.id,
            serviceId: li.serviceId,
            name: li.name,
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            total: li.total,
            taxable: li.taxable,
            sortOrder: li.sortOrder,
          })),
        })
      }

      return newVisit
    })

    return { visitId: visit.id }
  } catch (error: any) {
    console.error("createVisitFromApprovedQuote error:", error)
    return { error: "Failed to create visit from approved quote" }
  }
}

// =============================================================================
// 9b. getTechVisits - Get visits assigned to the current user for a date
// =============================================================================

export async function getTechVisits(params: { date: string; tomorrow?: boolean }) {
  try {
    const user = await requireAuth()

    const targetDate = new Date(params.date)
    const dayStart = new Date(targetDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(targetDate)
    dayEnd.setHours(23, 59, 59, 999)

    // If tomorrow flag is set, shift to next day
    if (params.tomorrow) {
      dayStart.setDate(dayStart.getDate() + 1)
      dayEnd.setDate(dayEnd.getDate() + 1)
    }

    const visits = await prisma.visit.findMany({
      where: {
        organizationId: user.organizationId,
        job: { customer: { isArchived: false } },
        assignments: { some: { userId: user.id } },
        status: { notIn: ["CANCELLED", "COMPLETED"] },
        OR: [
          // SCHEDULED / ANYTIME visits with scheduledStart in range
          {
            status: { in: ["SCHEDULED", "ANYTIME", "EN_ROUTE", "IN_PROGRESS"] },
            scheduledStart: { gte: dayStart, lte: dayEnd },
          },
          // UNSCHEDULED visits (no date set) -- include all
          {
            status: "UNSCHEDULED",
          },
        ],
      },
      include: {
        job: {
          include: {
            customer: {
              select: { id: true, firstName: true, lastName: true, phone: true, email: true },
            },
            property: true,
            checklistItems: { orderBy: { sortOrder: "asc" } },
            lineItems: { orderBy: { sortOrder: "asc" } },
            attachments: { orderBy: { createdAt: "desc" } },
          },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatar: true, color: true },
            },
          },
        },
      },
      orderBy: [
        { scheduledStart: "asc" },
      ],
    })

    // Sort: EN_ROUTE/IN_PROGRESS first, then SCHEDULED (by time), then ANYTIME, then UNSCHEDULED
    const sortOrder: Record<string, number> = {
      EN_ROUTE: 0,
      IN_PROGRESS: 0,
      SCHEDULED: 1,
      ANYTIME: 2,
      UNSCHEDULED: 3,
    }

    const sortedVisits = visits.sort((a, b) => {
      const aOrder = sortOrder[a.status] ?? 3
      const bOrder = sortOrder[b.status] ?? 3
      if (aOrder !== bOrder) return aOrder - bOrder
      // Within the same status group, sort by scheduledStart ascending
      const aTime = a.scheduledStart?.getTime() ?? Infinity
      const bTime = b.scheduledStart?.getTime() ?? Infinity
      return aTime - bTime
    })

    return {
      visits: sortedVisits.map((v) => ({
        ...v,
        job: {
          ...v.job,
          lineItems: v.job.lineItems.map((li) => ({
            ...li,
            quantity: Number(li.quantity),
            unitPrice: Number(li.unitPrice),
            total: Number(li.total),
          })),
        },
      })),
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getTechVisits error:", error)
    return { error: "Failed to fetch tech visits" }
  }
}

// =============================================================================
// 10. unscheduleVisit - Remove schedule from a visit
// =============================================================================

export async function unscheduleVisit(visitId: string) {
  try {
    const user = await requireAuth()

    const visit = await prisma.visit.findFirst({
      where: { id: visitId, organizationId: user.organizationId },
    })
    if (!visit) return { error: "Visit not found" }

    // Only allow unscheduling from SCHEDULED or ANYTIME
    if (visit.status !== "SCHEDULED" && visit.status !== "ANYTIME") {
      return { error: "Visit must be scheduled or anytime to unschedule" }
    }

    await prisma.visit.update({
      where: { id: visitId },
      data: {
        status: "UNSCHEDULED",
        scheduledStart: null,
        scheduledEnd: null,
      },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("unscheduleVisit error:", error)
    return { error: "Failed to unschedule visit" }
  }
}

// =============================================================================
// 11. updateVisitPurpose - Change visit type/purpose
// =============================================================================

export async function updateVisitPurpose(
  visitId: string,
  purpose: "DIAGNOSTIC" | "SERVICE" | "FOLLOW_UP" | "MAINTENANCE"
) {
  try {
    const user = await requireAuth()

    const visit = await prisma.visit.findFirst({
      where: { id: visitId, organizationId: user.organizationId },
    })
    if (!visit) return { error: "Visit not found" }

    await prisma.visit.update({
      where: { id: visitId },
      data: { purpose },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("updateVisitPurpose error:", error)
    return { error: "Failed to update visit purpose" }
  }
}

// =============================================================================
// 12. updateVisitNotes - Update visit notes
// =============================================================================

export async function updateVisitNotes(visitId: string, notes: string) {
  try {
    const user = await requireAuth()

    const visit = await prisma.visit.findFirst({
      where: { id: visitId, organizationId: user.organizationId },
    })
    if (!visit) return { error: "Visit not found" }

    await prisma.visit.update({
      where: { id: visitId },
      data: { notes: notes.trim() || null },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("updateVisitNotes error:", error)
    return { error: "Failed to update visit notes" }
  }
}

// calculateNextOccurrence imported from @/lib/recurrence
