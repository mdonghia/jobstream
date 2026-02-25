import { prisma } from "@/lib/db"

// =============================================================================
// Standard event types for the activity feed
// =============================================================================

export const ActivityEventTypes = {
  JOB_CREATED: "job_created",
  VISIT_CREATED: "visit_created",
  VISIT_SCHEDULED: "visit_scheduled",
  VISIT_RESCHEDULED: "visit_rescheduled",
  VISIT_STATUS_CHANGED: "visit_status_changed",
  VISIT_COMPLETED: "visit_completed",
  VISIT_CANCELLED: "visit_cancelled",
  VISIT_ON_MY_WAY: "visit_on_my_way",
  VISIT_ASSIGNED: "visit_assigned",
  QUOTE_CREATED: "quote_created",
  QUOTE_SENT: "quote_sent",
  QUOTE_APPROVED: "quote_approved",
  QUOTE_DECLINED: "quote_declined",
  INVOICE_CREATED: "invoice_created",
  INVOICE_SENT: "invoice_sent",
  INVOICE_PAID: "invoice_paid",
  PAYMENT_RECEIVED: "payment_received",
  NOTE_ADDED: "note_added",
  ATTACHMENT_ADDED: "attachment_added",
} as const

// =============================================================================
// Types
// =============================================================================

type LogEventParams = {
  organizationId: string
  jobId: string
  visitId?: string
  userId?: string
  eventType: string
  title: string
  description?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
}

// =============================================================================
// logActivityEvent - Fire-and-forget activity logging
// =============================================================================

/**
 * Log an activity event to the ActivityEvent table.
 *
 * This is a thin wrapper around prisma.activityEvent.create designed to be
 * fire-and-forget safe: it catches and logs any errors internally so callers
 * never need to worry about the write failing.
 *
 * Call this from server actions after a meaningful state change (e.g. job
 * created, visit completed, note added) to populate the activity feed.
 */
export async function logActivityEvent(params: LogEventParams): Promise<void> {
  try {
    await prisma.activityEvent.create({
      data: {
        organizationId: params.organizationId,
        jobId: params.jobId,
        visitId: params.visitId ?? null,
        userId: params.userId ?? null,
        eventType: params.eventType,
        title: params.title,
        description: params.description ?? null,
        metadata: params.metadata ?? undefined,
      },
    })
  } catch (error) {
    // Fire-and-forget: log the error but never throw so callers are unaffected
    console.error("logActivityEvent failed:", error)
  }
}
