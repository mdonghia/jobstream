"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"

// =============================================================================
// Types
// =============================================================================

type GetCommunicationsParams = {
  type?: string
  direction?: string
  status?: string
  customerId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  perPage?: number
}

// =============================================================================
// 1. getCommunications - List communication log entries with filters
// =============================================================================

export async function getCommunications(params: GetCommunicationsParams = {}) {
  try {
    const user = await requireAuth()
    const {
      type,
      direction,
      status,
      customerId,
      dateFrom,
      dateTo,
      search,
      page = 1,
      perPage = 25,
    } = params

    const where: any = { organizationId: user.organizationId }

    if (type && type !== "ALL") {
      where.type = type
    }

    if (direction && direction !== "ALL") {
      where.direction = direction
    }

    if (status && status !== "ALL") {
      where.status = status
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(dateTo)
    }

    if (search && search.trim()) {
      where.OR = [
        { recipientAddress: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { customer: { firstName: { contains: search, mode: "insensitive" } } },
        { customer: { lastName: { contains: search, mode: "insensitive" } } },
      ]
    }

    const skip = (page - 1) * perPage

    const [total, communications] = await Promise.all([
      prisma.communicationLog.count({ where }),
      prisma.communicationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
        },
      }),
    ])

    return {
      communications,
      total,
      page,
      totalPages: Math.ceil(total / perPage),
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getCommunications error:", error)
    return { error: "Failed to fetch communications" }
  }
}

// =============================================================================
// 2. sendManualSMS - Send an SMS to a customer
// =============================================================================

export async function sendManualSMS(data: { customerId: string; content: string }) {
  try {
    const user = await requireAuth()

    if (!data.content || !data.content.trim()) {
      return { error: "Message content is required" }
    }

    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, organizationId: user.organizationId },
    })

    if (!customer) return { error: "Customer not found" }
    if (!customer.phone) return { error: "Customer does not have a phone number" }

    let smsStatus: "SENT" | "FAILED" | "QUEUED" = "QUEUED"
    let twilioMessageSid: string | null = null

    // Try sending via Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const twilio = await import("twilio")
        const client = twilio.default(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        )

        const message = await client.messages.create({
          body: data.content.trim(),
          from: process.env.TWILIO_PHONE_NUMBER,
          to: customer.phone,
        })

        twilioMessageSid = message.sid
        smsStatus = "SENT"
      } catch (e) {
        console.error("Failed to send SMS via Twilio:", e)
        smsStatus = "FAILED"
      }
    } else {
      console.log(`[SMS] Would send to ${customer.phone}: ${data.content.trim()}`)
      smsStatus = "QUEUED" // Log as queued when not configured (dev mode)
    }

    // Create communication log entry
    const log = await prisma.communicationLog.create({
      data: {
        organizationId: user.organizationId,
        customerId: data.customerId,
        type: "SMS",
        direction: "OUTBOUND",
        recipientAddress: customer.phone,
        content: data.content.trim(),
        status: smsStatus,
        triggeredBy: "manual",
        twilioMessageSid,
      },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    })

    return { communication: log }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("sendManualSMS error:", error)
    return { error: "Failed to send SMS" }
  }
}

// =============================================================================
// 3. sendManualEmail - Send an email to a customer
// =============================================================================

export async function sendManualEmail(data: {
  customerId: string
  subject: string
  content: string
}) {
  try {
    const user = await requireAuth()

    if (!data.subject || !data.subject.trim()) {
      return { error: "Subject is required" }
    }
    if (!data.content || !data.content.trim()) {
      return { error: "Email content is required" }
    }

    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, organizationId: user.organizationId },
    })

    if (!customer) return { error: "Customer not found" }
    if (!customer.email) return { error: "Customer does not have an email address" }

    let emailStatus: "SENT" | "FAILED" | "QUEUED" = "QUEUED"
    let sendgridMessageId: string | null = null

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true },
    })

    // Try sending via SendGrid
    if (process.env.SENDGRID_API_KEY) {
      try {
        const sgMail = await import("@sendgrid/mail")
        sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)

        const [response] = await sgMail.default.send({
          to: customer.email,
          from: {
            email: process.env.SENDGRID_FROM_EMAIL || "noreply@jobstream.app",
            name: org?.name || "JobStream",
          },
          subject: data.subject.trim(),
          html: `
            <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
              ${data.content.trim().replace(/\n/g, "<br>")}
            </div>
          `,
        })

        sendgridMessageId = response?.headers?.["x-message-id"] || null
        emailStatus = "SENT"
      } catch (e) {
        console.error("Failed to send email via SendGrid:", e)
        emailStatus = "FAILED"
      }
    } else {
      console.log(`[Email] Would send to ${customer.email}: ${data.subject.trim()}`)
      emailStatus = "QUEUED" // Log as queued when not configured (dev mode)
    }

    // Create communication log entry
    const log = await prisma.communicationLog.create({
      data: {
        organizationId: user.organizationId,
        customerId: data.customerId,
        type: "EMAIL",
        direction: "OUTBOUND",
        recipientAddress: customer.email,
        subject: data.subject.trim(),
        content: data.content.trim(),
        status: emailStatus,
        triggeredBy: "manual",
        sendgridMessageId,
      },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    })

    return { communication: log }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("sendManualEmail error:", error)
    return { error: "Failed to send email" }
  }
}
