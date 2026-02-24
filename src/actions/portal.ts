"use server"

import { prisma } from "@/lib/db"
import crypto from "crypto"

// =============================================================================
// 1. sendPortalLoginCode - Send a 6-digit verification code to customer email
// =============================================================================

export async function sendPortalLoginCode(email: string, orgSlug: string) {
  try {
    // Find org by slug
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, name: true, portalEnabled: true },
    })

    if (!org) return { error: "Organization not found" }
    if (!org.portalEnabled) return { error: "Customer portal is not enabled for this organization" }

    // Find customer by email (case insensitive) + org
    const customer = await prisma.customer.findFirst({
      where: {
        organizationId: org.id,
        email: { equals: email, mode: "insensitive" },
      },
    })

    if (!customer) return { error: "No account found with this email" }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Upsert PortalSession -- find existing unverified session or create new
    const existingSession = await prisma.portalSession.findFirst({
      where: { customerId: customer.id, organizationId: org.id },
      orderBy: { createdAt: "desc" },
    })

    if (existingSession) {
      await prisma.portalSession.update({
        where: { id: existingSession.id },
        data: {
          verificationCode: code,
          codeExpiresAt,
          isVerified: false,
          sessionToken: null,
          sessionExpiresAt: null,
        },
      })
    } else {
      await prisma.portalSession.create({
        data: {
          organizationId: org.id,
          customerId: customer.id,
          verificationCode: code,
          codeExpiresAt,
        },
      })
    }

    // Send email with code via SendGrid (if configured, else log to console)
    if (process.env.SENDGRID_API_KEY) {
      try {
        const sgMail = await import("@sendgrid/mail")
        sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)

        await sgMail.default.send({
          to: email,
          from: {
            email: process.env.SENDGRID_FROM_EMAIL || "noreply@jobstream.app",
            name: org.name,
          },
          subject: `Your ${org.name} Portal Login Code`,
          html: `
            <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
              <h2 style="color: #0A2540;">Your Login Code</h2>
              <p style="color: #425466; font-size: 16px;">
                Use the following code to log in to your ${org.name} customer portal:
              </p>
              <div style="background: #F6F8FA; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0A2540;">${code}</span>
              </div>
              <p style="color: #8898AA; font-size: 14px;">
                This code expires in 10 minutes. If you did not request this, please ignore this email.
              </p>
            </div>
          `,
        })
      } catch (e) {
        console.error("Failed to send portal login code via SendGrid:", e)
      }
    } else {
      console.log(`[Portal Login Code] Email: ${email}, Code: ${code}`)
    }

    return { success: true }
  } catch (error: unknown) {
    console.error("sendPortalLoginCode error:", error)
    return { error: "Failed to send login code" }
  }
}

// =============================================================================
// 2. verifyPortalCode - Verify the 6-digit code and create a session
// =============================================================================

export async function verifyPortalCode(email: string, code: string, orgSlug: string) {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true },
    })

    if (!org) return { error: "Organization not found" }

    const customer = await prisma.customer.findFirst({
      where: {
        organizationId: org.id,
        email: { equals: email, mode: "insensitive" },
      },
    })

    if (!customer) return { error: "No account found with this email" }

    // Find valid portal session with matching code
    const session = await prisma.portalSession.findFirst({
      where: {
        customerId: customer.id,
        organizationId: org.id,
        verificationCode: code,
        codeExpiresAt: { gt: new Date() },
        isVerified: false,
      },
    })

    if (!session) return { error: "Invalid or expired code" }

    // Generate session token
    const sessionToken = crypto.randomUUID()
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Update session
    await prisma.portalSession.update({
      where: { id: session.id },
      data: {
        sessionToken,
        sessionExpiresAt,
        isVerified: true,
      },
    })

    return { success: true, sessionToken }
  } catch (error: unknown) {
    console.error("verifyPortalCode error:", error)
    return { error: "Failed to verify code" }
  }
}

// =============================================================================
// 3. getPortalSession - Validate a session token and return customer data
// =============================================================================

export async function getPortalSession(orgSlug: string, sessionToken: string) {
  try {
    const session = await prisma.portalSession.findFirst({
      where: {
        sessionToken,
        isVerified: true,
        sessionExpiresAt: { gt: new Date() },
      },
      include: {
        customer: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            phone: true,
            email: true,
          },
        },
      },
    })

    if (!session) return null
    if (session.organization.slug !== orgSlug) return null

    return {
      customer: session.customer,
      organization: session.organization,
    }
  } catch (error: unknown) {
    console.error("getPortalSession error:", error)
    return null
  }
}

// =============================================================================
// 4. getPortalDashboard - Get dashboard data for a customer
// =============================================================================

export async function getPortalDashboard(customerId: string, orgId: string) {
  try {
    const now = new Date()

    const [upcomingJobs, unpaidInvoices, pendingQuotes] = await Promise.all([
      // Upcoming jobs: scheduled in the future, not cancelled, limit 5
      prisma.job.findMany({
        where: {
          customerId,
          organizationId: orgId,
          scheduledStart: { gt: now },
          status: { not: "CANCELLED" },
        },
        orderBy: { scheduledStart: "asc" },
        take: 5,
        include: {
          lineItems: true,
        },
      }),

      // Unpaid invoices
      prisma.invoice.findMany({
        where: {
          customerId,
          organizationId: orgId,
          status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] },
        },
        orderBy: { dueDate: "asc" },
        include: {
          lineItems: true,
        },
      }),

      // Pending quotes
      prisma.quote.findMany({
        where: {
          customerId,
          organizationId: orgId,
          status: "SENT",
        },
        orderBy: { createdAt: "desc" },
        include: {
          lineItems: true,
        },
      }),
    ])

    // Serialize to handle Decimal types
    return JSON.parse(JSON.stringify({
      upcomingJobs,
      unpaidInvoices,
      pendingQuotes,
    }))
  } catch (error: unknown) {
    console.error("getPortalDashboard error:", error)
    return { upcomingJobs: [], unpaidInvoices: [], pendingQuotes: [] }
  }
}

// =============================================================================
// 5. getPortalJobs - Get all jobs for a customer
// =============================================================================

export async function getPortalJobs(customerId: string, orgId: string) {
  try {
    const jobs = await prisma.job.findMany({
      where: {
        customerId,
        organizationId: orgId,
      },
      orderBy: { scheduledStart: "desc" },
      include: {
        lineItems: true,
      },
    })

    return JSON.parse(JSON.stringify(jobs))
  } catch (error: unknown) {
    console.error("getPortalJobs error:", error)
    return []
  }
}

// =============================================================================
// 6. getPortalInvoices - Get all invoices for a customer
// =============================================================================

export async function getPortalInvoices(customerId: string, orgId: string) {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        customerId,
        organizationId: orgId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        lineItems: true,
        payments: true,
      },
    })

    return JSON.parse(JSON.stringify(invoices))
  } catch (error: unknown) {
    console.error("getPortalInvoices error:", error)
    return []
  }
}

// =============================================================================
// 7. getPortalQuotes - Get all quotes for a customer
// =============================================================================

export async function getPortalQuotes(customerId: string, orgId: string) {
  try {
    const quotes = await prisma.quote.findMany({
      where: {
        customerId,
        organizationId: orgId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        lineItems: true,
      },
    })

    return JSON.parse(JSON.stringify(quotes))
  } catch (error: unknown) {
    console.error("getPortalQuotes error:", error)
    return []
  }
}

// =============================================================================
// 8. sendPortalMessage - Send a message from the customer
// =============================================================================

export async function sendPortalMessage(customerId: string, orgId: string, content: string) {
  try {
    if (!content || !content.trim()) {
      return { error: "Message cannot be empty" }
    }

    // Get customer name for notification
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, organizationId: orgId },
      select: { firstName: true, lastName: true },
    })

    if (!customer) return { error: "Customer not found" }

    // Create the message
    await prisma.portalMessage.create({
      data: {
        organizationId: orgId,
        customerId,
        content: content.trim(),
      },
    })

    // Create notification for org owner
    const owner = await prisma.user.findFirst({
      where: { organizationId: orgId, role: "OWNER" },
      select: { id: true },
    })

    if (owner) {
      await prisma.notification.create({
        data: {
          organizationId: orgId,
          userId: owner.id,
          title: "New Portal Message",
          message: `New message from ${customer.firstName} ${customer.lastName}`,
          linkUrl: "/customers",
        },
      })
    }

    return { success: true }
  } catch (error: unknown) {
    console.error("sendPortalMessage error:", error)
    return { error: "Failed to send message" }
  }
}

// =============================================================================
// 9. getPortalMessages - Get all messages for a customer
// =============================================================================

export async function getPortalMessages(customerId: string, orgId: string) {
  try {
    const messages = await prisma.portalMessage.findMany({
      where: {
        customerId,
        organizationId: orgId,
      },
      orderBy: { createdAt: "desc" },
    })

    return JSON.parse(JSON.stringify(messages))
  } catch (error: unknown) {
    console.error("getPortalMessages error:", error)
    return []
  }
}

// =============================================================================
// 10. updatePortalProfile - Update customer profile fields
// =============================================================================

export async function updatePortalProfile(
  customerId: string,
  data: { firstName: string; lastName: string; email: string; phone: string }
) {
  try {
    if (!data.firstName?.trim() || !data.lastName?.trim()) {
      return { error: "First name and last name are required" }
    }

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
      },
    })

    return { success: true }
  } catch (error: unknown) {
    console.error("updatePortalProfile error:", error)
    return { error: "Failed to update profile" }
  }
}

// =============================================================================
// 11. logoutPortal - Just return success (cookie clearing is done client-side)
// =============================================================================

export async function logoutPortal() {
  return { success: true }
}
