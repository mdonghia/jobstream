"use server"

import { hash, compare } from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
import { prisma } from "@/lib/db"
import { Prisma } from "@/generated/prisma/client"
import { requireAuth, requireRole } from "@/lib/auth-utils"
import {
  organizationSettingsSchema,
  inviteTeamMemberSchema,
  profileSchema,
  changePasswordSchema,
  serviceSchema,
} from "@/lib/validations"
import { z } from "zod"

// =============================================================================
// 1. getOrganizationSettings - Get all org settings
// =============================================================================

export async function getOrganizationSettings() {
  try {
    const user = await requireAuth()

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    })

    if (!organization) {
      return { error: "Organization not found" }
    }

    return { organization }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("getOrganizationSettings error:", error)
    return { error: "Failed to fetch organization settings" }
  }
}

// =============================================================================
// 2. updateOrganizationSettings - Update org settings (OWNER/ADMIN only)
// =============================================================================

export async function updateOrganizationSettings(
  data: z.infer<typeof organizationSettingsSchema>
) {
  try {
    const user = await requireRole(["OWNER", "ADMIN"])

    const result = organizationSettingsSchema.safeParse(data)
    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    const organization = await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        name: result.data.name,
        email: result.data.email,
        phone: result.data.phone || null,
        website: result.data.website || null,
        address: result.data.address || null,
        city: result.data.city || null,
        state: result.data.state || null,
        zip: result.data.zip || null,
        timezone: result.data.timezone,
        taxRate: result.data.taxRate,
        currency: result.data.currency,
        invoicePrefix: result.data.invoicePrefix,
        quotePrefix: result.data.quotePrefix,
        jobPrefix: result.data.jobPrefix,
        invoiceDueDays: result.data.invoiceDueDays,
        quoteValidDays: result.data.quoteValidDays,
      },
    })

    return { organization }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("updateOrganizationSettings error:", error)
    return { error: "Failed to update organization settings" }
  }
}

// =============================================================================
// 2b. updateWorkflowSettings - Update workflow automation settings (OWNER/ADMIN)
// =============================================================================

export async function updateWorkflowSettings(data: {
  autoConvertQuoteToJob: boolean
}) {
  try {
    const user = await requireRole(["OWNER", "ADMIN"])

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        autoConvertQuoteToJob: data.autoConvertQuoteToJob,
      },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("updateWorkflowSettings error:", error)
    return { error: "Failed to update workflow settings" }
  }
}

// =============================================================================
// 3. getTeamMembers - List team members for the org
// =============================================================================

export async function getTeamMembers() {
  try {
    const user = await requireAuth()

    const members = await prisma.user.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        color: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
    })

    return { members }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("getTeamMembers error:", error)
    return { error: "Failed to fetch team members" }
  }
}

// =============================================================================
// 4. inviteTeamMember - Create a new team member (OWNER/ADMIN only)
// =============================================================================

export async function inviteTeamMember(
  data: z.infer<typeof inviteTeamMemberSchema>
) {
  try {
    const user = await requireRole(["OWNER", "ADMIN"])

    const result = inviteTeamMemberSchema.safeParse(data)
    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    // Check if email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email: result.data.email },
    })

    if (existingUser) {
      return { error: "A user with this email already exists" }
    }

    // Generate a random password (the user will reset it via the link)
    const randomPassword =
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2)
    const passwordHash = await hash(randomPassword, 12)

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        organizationId: user.organizationId,
        email: result.data.email,
        passwordHash,
        firstName: result.data.firstName,
        lastName: result.data.lastName,
        role: result.data.role,
        color: result.data.color || "#635BFF",
      },
    })

    // Generate a password reset token so the invited user can set their password
    // Same pattern as forgotPassword in auth.ts
    await prisma.passwordResetToken.deleteMany({
      where: { userId: newUser.id },
    })

    const token = uuidv4()
    const tokenHash = await hash(token, 12)

    await prisma.passwordResetToken.create({
      data: {
        userId: newUser.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days for invite
      },
    })

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`

    // Send email via SendGrid if configured, otherwise log for dev
    if (process.env.SENDGRID_API_KEY) {
      try {
        const sgMail = await import("@sendgrid/mail")
        sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)
        await sgMail.default.send({
          to: newUser.email,
          from: {
            email: process.env.SENDGRID_FROM_EMAIL || "noreply@jobstream.app",
            name: process.env.SENDGRID_FROM_NAME || "JobStream",
          },
          subject: "You've been invited to JobStream",
          html: `
            <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
              <h2>Welcome to JobStream!</h2>
              <p>${user.firstName} ${user.lastName} has invited you to join their team. Click the link below to set your password and get started.</p>
              <a href="${resetUrl}" style="display: inline-block; background: #635BFF; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Set Your Password</a>
              <p style="color: #8898AA; font-size: 12px; margin-top: 24px;">This link expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
          `,
        })
      } catch (e) {
        console.error("Failed to send invite email:", e)
      }
    } else {
      console.log(`[DEV] Team member invite link: ${resetUrl}`)
    }

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("inviteTeamMember error:", error)
    return { error: "Failed to invite team member" }
  }
}

// =============================================================================
// 5. updateTeamMemberRole - Change a team member's role (OWNER only)
// =============================================================================

export async function updateTeamMemberRole(userId: string, role: string) {
  try {
    const user = await requireRole(["OWNER"])

    // Cannot change your own role
    if (userId === user.id) {
      return { error: "You cannot change your own role" }
    }

    // Cannot assign OWNER role
    if (role === "OWNER") {
      return { error: "Cannot assign the Owner role to another user" }
    }

    // Validate role value
    if (!["ADMIN", "TECHNICIAN"].includes(role)) {
      return { error: "Invalid role" }
    }

    // Verify the target user belongs to this organization
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: user.organizationId,
      },
    })

    if (!targetUser) {
      return { error: "User not found" }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
    })

    return { user: updatedUser }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("updateTeamMemberRole error:", error)
    return { error: "Failed to update team member role" }
  }
}

// =============================================================================
// 6a. deactivateTeamMember - Deactivate a team member (OWNER/ADMIN only)
// =============================================================================

export async function deactivateTeamMember(userId: string) {
  try {
    const user = await requireRole(["OWNER", "ADMIN"])

    // Cannot deactivate yourself
    if (userId === user.id) {
      return { error: "You cannot deactivate your own account" }
    }

    // Verify the target user belongs to this organization
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: user.organizationId,
      },
    })

    if (!targetUser) {
      return { error: "User not found" }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    })

    return { user: updatedUser }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("deactivateTeamMember error:", error)
    return { error: "Failed to deactivate team member" }
  }
}

// =============================================================================
// 6b. activateTeamMember - Activate a team member (OWNER/ADMIN only)
// =============================================================================

export async function activateTeamMember(userId: string) {
  try {
    const user = await requireRole(["OWNER", "ADMIN"])

    // Cannot activate yourself (already active if you're here)
    if (userId === user.id) {
      return { error: "You cannot change your own active status" }
    }

    // Verify the target user belongs to this organization
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId: user.organizationId,
      },
    })

    if (!targetUser) {
      return { error: "User not found" }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    })

    return { user: updatedUser }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("activateTeamMember error:", error)
    return { error: "Failed to activate team member" }
  }
}

// =============================================================================
// 7. updateProfile - Update current user's profile
// =============================================================================

export async function updateProfile(data: z.infer<typeof profileSchema>) {
  try {
    const user = await requireAuth()

    const result = profileSchema.safeParse(data)
    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    // If changing email, check it's not already taken by another user
    if (result.data.email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: result.data.email },
      })

      if (existingUser && existingUser.id !== user.id) {
        return { error: "A user with this email already exists" }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: result.data.firstName,
        lastName: result.data.lastName,
        email: result.data.email,
        phone: result.data.phone || null,
      },
    })

    return { user: updatedUser }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("updateProfile error:", error)
    return { error: "Failed to update profile" }
  }
}

// =============================================================================
// 8. changePassword - Change current user's password
// =============================================================================

export async function changePassword(
  data: z.infer<typeof changePasswordSchema>
) {
  try {
    const user = await requireAuth()

    const result = changePasswordSchema.safeParse(data)
    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    // Get the user's current password hash from the database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    })

    if (!dbUser) {
      return { error: "User not found" }
    }

    // Verify the current password
    const isCurrentPasswordValid = await compare(
      result.data.currentPassword,
      dbUser.passwordHash
    )

    if (!isCurrentPasswordValid) {
      return { error: "Current password is incorrect" }
    }

    // Hash and save the new password
    const newPasswordHash = await hash(result.data.newPassword, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("changePassword error:", error)
    return { error: "Failed to change password" }
  }
}

// =============================================================================
// 9. getServices - List services for the org
// =============================================================================

export async function getServices(
  typeFilter: "service" | "material" | "all" = "all"
) {
  try {
    const user = await requireAuth()

    const where: any = { organizationId: user.organizationId }
    if (typeFilter === "service" || typeFilter === "material") {
      where.type = typeFilter
    }

    const services = await prisma.service.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })

    return { services }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("getServices error:", error)
    return { error: "Failed to fetch services" }
  }
}

// =============================================================================
// 10. createService - Create a service
// =============================================================================

export async function createService(data: z.infer<typeof serviceSchema>) {
  try {
    const user = await requireAuth()

    const result = serviceSchema.safeParse(data)
    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    // Get the current max sortOrder to place the new service at the end
    const maxSortOrder = await prisma.service.aggregate({
      where: { organizationId: user.organizationId },
      _max: { sortOrder: true },
    })

    const nextSortOrder = (maxSortOrder._max.sortOrder ?? 0) + 1

    const service = await prisma.service.create({
      data: {
        organizationId: user.organizationId,
        name: result.data.name,
        description: result.data.description || null,
        category: result.data.category || null,
        defaultPrice: result.data.defaultPrice,
        unit: result.data.unit,
        taxable: result.data.taxable,
        isActive: result.data.isActive,
        sortOrder: nextSortOrder,
        costPrice: result.data.costPrice ?? null,
        type: result.data.type ?? "service",
        estimatedMinutes: result.data.estimatedMinutes ?? null,
        sku: result.data.sku ?? null,
      },
    })

    return { service }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("createService error:", error)
    return { error: "Failed to create service" }
  }
}

// =============================================================================
// 11. updateService - Update a service
// =============================================================================

export async function updateService(
  id: string,
  data: Partial<z.infer<typeof serviceSchema>>
) {
  try {
    const user = await requireAuth()

    // Verify the service belongs to this organization
    const existing = await prisma.service.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    })

    if (!existing) {
      return { error: "Service not found" }
    }

    // Validate only the provided fields
    const partialSchema = serviceSchema.partial()
    const result = partialSchema.safeParse(data)
    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    const service = await prisma.service.update({
      where: { id },
      data: result.data,
    })

    return { service }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("updateService error:", error)
    return { error: "Failed to update service" }
  }
}

// =============================================================================
// 12. deleteService - Delete a service (only if not used in line items)
// =============================================================================

export async function deleteService(id: string) {
  try {
    const user = await requireAuth()

    // Verify the service belongs to this organization
    const existing = await prisma.service.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        quoteLineItems: { select: { id: true }, take: 1 },
        invoiceLineItems: { select: { id: true }, take: 1 },
        jobLineItems: { select: { id: true }, take: 1 },
      },
    })

    if (!existing) {
      return { error: "Service not found" }
    }

    // Prevent deletion if the service is used in any line items
    if (existing.quoteLineItems.length > 0) {
      return {
        error:
          "Cannot delete this service because it is used in existing quotes. Deactivate it instead.",
      }
    }
    if (existing.invoiceLineItems.length > 0) {
      return {
        error:
          "Cannot delete this service because it is used in existing invoices. Deactivate it instead.",
      }
    }
    if (existing.jobLineItems.length > 0) {
      return {
        error:
          "Cannot delete this service because it is used in existing jobs. Deactivate it instead.",
      }
    }

    await prisma.service.delete({
      where: { id },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("deleteService error:", error)
    return { error: "Failed to delete service" }
  }
}

// =============================================================================
// 13. reorderServices - Update sortOrder for services
// =============================================================================

export async function reorderServices(ids: string[]) {
  try {
    const user = await requireAuth()

    // Update each service's sortOrder within a transaction
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.service.updateMany({
          where: {
            id,
            organizationId: user.organizationId,
          },
          data: { sortOrder: index },
        })
      )
    )

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("reorderServices error:", error)
    return { error: "Failed to reorder services" }
  }
}

// =============================================================================
// 14. renameServiceCategory - Rename a category across all services
// =============================================================================

export async function renameServiceCategory(oldName: string, newName: string) {
  try {
    const user = await requireAuth()

    const trimmedOld = oldName.trim()
    const trimmedNew = newName.trim()

    if (!trimmedOld || !trimmedNew) {
      return { error: "Category name cannot be empty" }
    }

    if (trimmedOld === trimmedNew) {
      return { error: "New name is the same as the current name" }
    }

    const result = await prisma.service.updateMany({
      where: {
        organizationId: user.organizationId,
        category: trimmedOld,
      },
      data: { category: trimmedNew },
    })

    return { updated: result.count }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("renameServiceCategory error:", error)
    return { error: "Failed to rename category" }
  }
}

// =============================================================================
// 15. deleteServiceCategory - Remove a category from all services
// =============================================================================

export async function deleteServiceCategory(name: string) {
  try {
    const user = await requireAuth()

    const trimmed = name.trim()
    if (!trimmed) {
      return { error: "Category name cannot be empty" }
    }

    const result = await prisma.service.updateMany({
      where: {
        organizationId: user.organizationId,
        category: trimmed,
      },
      data: { category: null },
    })

    return { updated: result.count }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("deleteServiceCategory error:", error)
    return { error: "Failed to delete category" }
  }
}

// =============================================================================
// 16. getPaymentSettings - Fetch Stripe + online payment settings
// =============================================================================

export async function getPaymentSettings() {
  try {
    const user = await requireAuth()

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        stripeAccountId: true,
        stripeOnboarded: true,
        paymentOnlineEnabled: true,
      },
    })

    if (!org) return { error: "Organization not found" }

    return { settings: org }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getPaymentSettings error:", error)
    return { error: "Failed to fetch payment settings" }
  }
}

// =============================================================================
// 15. updatePaymentSettings - Toggle online payments (OWNER/ADMIN)
// =============================================================================

export async function updatePaymentSettings(data: {
  paymentOnlineEnabled: boolean
}) {
  try {
    const user = await requireRole(["OWNER", "ADMIN"])

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: { paymentOnlineEnabled: data.paymentOnlineEnabled },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("updatePaymentSettings error:", error)
    return { error: "Failed to update payment settings" }
  }
}

// =============================================================================
// 16. disconnectStripeAccount - Remove Stripe connection (OWNER only)
// =============================================================================

export async function disconnectStripeAccount() {
  try {
    const user = await requireRole(["OWNER"])

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        stripeAccountId: null,
        stripeOnboarded: false,
        paymentOnlineEnabled: false,
      },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("disconnectStripeAccount error:", error)
    return { error: "Failed to disconnect Stripe" }
  }
}

// =============================================================================
// 16b. verifyStripeConnection - Check Stripe account status live
// =============================================================================

export async function verifyStripeConnection() {
  try {
    const user = await requireAuth()

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { stripeAccountId: true },
    })

    if (!org) return { error: "Organization not found" }
    if (!org.stripeAccountId) {
      return { connected: false, stripeAccountId: null, message: "No Stripe account connected" }
    }

    const { getStripe } = await import("@/lib/stripe")
    const stripe = getStripe()
    if (!stripe) {
      return { error: "Stripe is not configured on the server" }
    }

    const account = await stripe.accounts.retrieve(org.stripeAccountId)
    const isOnboarded = !!(
      account.details_submitted || (account.charges_enabled && account.payouts_enabled)
    )

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: { stripeOnboarded: isOnboarded },
    })

    return {
      connected: isOnboarded,
      stripeAccountId: org.stripeAccountId,
      message: isOnboarded
        ? "Stripe account is connected and active"
        : "Stripe onboarding is not yet complete. Please finish the setup in the Stripe tab.",
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("verifyStripeConnection error:", error)
    return { error: "Failed to verify Stripe connection" }
  }
}

// =============================================================================
// 17. getCommunicationSettings - Fetch comms settings + automation rules
// =============================================================================

export async function getCommunicationSettings() {
  try {
    const user = await requireAuth()

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        commSmsEnabled: true,
        commEmailEnabled: true,
      },
    })

    if (!org) return { error: "Organization not found" }

    const rules = await prisma.automationRule.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "asc" },
    })

    // Serialize dates for client components
    const serializedRules = JSON.parse(JSON.stringify(rules))

    return { settings: org, rules: serializedRules }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getCommunicationSettings error:", error)
    return { error: "Failed to fetch communication settings" }
  }
}

// =============================================================================
// 18. updateCommunicationSettings - Toggle SMS/email channels (OWNER/ADMIN)
// =============================================================================

export async function updateCommunicationSettings(data: {
  commSmsEnabled: boolean
  commEmailEnabled: boolean
}) {
  try {
    const user = await requireRole(["OWNER", "ADMIN"])

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        commSmsEnabled: data.commSmsEnabled,
        commEmailEnabled: data.commEmailEnabled,
      },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("updateCommunicationSettings error:", error)
    return { error: "Failed to update communication settings" }
  }
}

// =============================================================================
// 19. createAutomationRule - Add a new automation rule (OWNER/ADMIN)
// =============================================================================

export async function createAutomationRule(data: {
  name: string
  trigger: string
  channel: string
  templateSubject?: string
  templateContent: string
  delayMinutes: number
  isActive: boolean
}) {
  try {
    const user = await requireRole(["OWNER", "ADMIN"])

    if (!data.name.trim()) return { error: "Rule name is required" }
    if (!data.templateContent.trim())
      return { error: "Template content is required" }

    const rule = await prisma.automationRule.create({
      data: {
        organizationId: user.organizationId,
        name: data.name.trim(),
        trigger: data.trigger as any,
        channel: data.channel as any,
        templateSubject: data.templateSubject?.trim() || null,
        templateContent: data.templateContent.trim(),
        delayMinutes: data.delayMinutes,
        isActive: data.isActive,
      },
    })

    return { rule: JSON.parse(JSON.stringify(rule)) }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("createAutomationRule error:", error)
    return { error: "Failed to create automation rule" }
  }
}

// =============================================================================
// 20. updateAutomationRule - Edit an existing automation rule (OWNER/ADMIN)
// =============================================================================

export async function updateAutomationRule(
  id: string,
  data: {
    name?: string
    trigger?: string
    channel?: string
    templateSubject?: string | null
    templateContent?: string
    delayMinutes?: number
    isActive?: boolean
  }
) {
  try {
    const user = await requireRole(["OWNER", "ADMIN"])

    // Verify the rule belongs to this organization
    const existing = await prisma.automationRule.findFirst({
      where: { id, organizationId: user.organizationId },
    })

    if (!existing) return { error: "Automation rule not found" }

    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.trigger !== undefined) updateData.trigger = data.trigger as any
    if (data.channel !== undefined) updateData.channel = data.channel as any
    if (data.templateSubject !== undefined)
      updateData.templateSubject = data.templateSubject?.trim() || null
    if (data.templateContent !== undefined)
      updateData.templateContent = data.templateContent.trim()
    if (data.delayMinutes !== undefined)
      updateData.delayMinutes = data.delayMinutes
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const rule = await prisma.automationRule.update({
      where: { id },
      data: updateData,
    })

    return { rule: JSON.parse(JSON.stringify(rule)) }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("updateAutomationRule error:", error)
    return { error: "Failed to update automation rule" }
  }
}

// =============================================================================
// 21. deleteAutomationRule - Remove an automation rule (OWNER/ADMIN)
// =============================================================================

export async function deleteAutomationRule(id: string) {
  try {
    const user = await requireRole(["OWNER", "ADMIN"])

    // Verify the rule belongs to this organization
    const existing = await prisma.automationRule.findFirst({
      where: { id, organizationId: user.organizationId },
    })

    if (!existing) return { error: "Automation rule not found" }

    await prisma.automationRule.delete({ where: { id } })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("deleteAutomationRule error:", error)
    return { error: "Failed to delete automation rule" }
  }
}

// =============================================================================
// 22. getBookingSettings - Fetch booking widget settings + available services
// =============================================================================

export async function getBookingSettings() {
  try {
    const user = await requireAuth()

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        bookingEnabled: true,
        bookingServices: true,
        bookingSlotDuration: true,
        bookingBufferMinutes: true,
        bookingMaxAdvanceDays: true,
        slug: true,
      },
    })

    if (!org) return { error: "Organization not found" }

    // Fetch active services for the checklist
    const services = await prisma.service.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true,
      },
      select: { id: true, name: true, defaultPrice: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })

    // Serialize Decimal values for client components
    const serializedServices = JSON.parse(JSON.stringify(services))

    return {
      settings: {
        bookingEnabled: org.bookingEnabled,
        bookingServices: org.bookingServices as string[] | null,
        bookingSlotDuration: org.bookingSlotDuration,
        bookingBufferMinutes: org.bookingBufferMinutes,
        bookingMaxAdvanceDays: org.bookingMaxAdvanceDays,
        slug: org.slug,
      },
      services: serializedServices,
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getBookingSettings error:", error)
    return { error: "Failed to fetch booking settings" }
  }
}

// =============================================================================
// 23. updateBookingSettings - Save booking widget settings (OWNER/ADMIN)
// =============================================================================

export async function updateBookingSettings(data: {
  bookingEnabled: boolean
  bookingServices: string[] | null
  bookingSlotDuration: number
  bookingBufferMinutes?: number
  bookingMaxAdvanceDays?: number
}) {
  try {
    const user = await requireRole(["OWNER", "ADMIN"])

    const updateData: any = {
      bookingEnabled: data.bookingEnabled,
      bookingServices:
        data.bookingServices === null
          ? Prisma.DbNull
          : data.bookingServices,
      bookingSlotDuration: data.bookingSlotDuration,
    }

    if (data.bookingBufferMinutes !== undefined) {
      updateData.bookingBufferMinutes = data.bookingBufferMinutes
    }
    if (data.bookingMaxAdvanceDays !== undefined) {
      updateData.bookingMaxAdvanceDays = data.bookingMaxAdvanceDays
    }

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: updateData,
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("updateBookingSettings error:", error)
    return { error: "Failed to update booking settings" }
  }
}

// =============================================================================
// 24. getReviewSettings - Fetch review platform URLs + auto-request settings
// =============================================================================

export async function getReviewSettings() {
  try {
    const user = await requireAuth()

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        name: true,
        reviewGoogleUrl: true,
        reviewYelpUrl: true,
        reviewFacebookUrl: true,
        reviewAutoRequest: true,
        reviewRequestDelay: true,
        googlePlaceId: true,
        googleBusinessName: true,
        googleBusinessAddr: true,
      },
    })

    if (!org) return { error: "Organization not found" }

    return {
      settings: {
        ...org,
        googleConnected: !!org.googlePlaceId,
      },
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getReviewSettings error:", error)
    return { error: "Failed to fetch review settings" }
  }
}

// =============================================================================
// 25. updateReviewSettings - Save review platform URLs + auto-request config
// =============================================================================

export async function updateReviewSettings(data: {
  reviewGoogleUrl?: string | null
  reviewYelpUrl?: string | null
  reviewFacebookUrl?: string | null
  reviewAutoRequest: boolean
  reviewRequestDelay: number
}) {
  try {
    const user = await requireRole(["OWNER", "ADMIN"])

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        reviewGoogleUrl: data.reviewGoogleUrl?.trim() || null,
        reviewYelpUrl: data.reviewYelpUrl?.trim() || null,
        reviewFacebookUrl: data.reviewFacebookUrl?.trim() || null,
        reviewAutoRequest: data.reviewAutoRequest,
        reviewRequestDelay: data.reviewRequestDelay,
      },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("updateReviewSettings error:", error)
    return { error: "Failed to update review settings" }
  }
}

// =============================================================================
// 26. searchGoogleBusiness - Search for a business on Google Places
// =============================================================================

export async function searchGoogleBusiness(query: string) {
  try {
    await requireRole(["OWNER", "ADMIN"])

    const { searchGooglePlaces } = await import("@/lib/google-reviews")
    return await searchGooglePlaces(query)
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("searchGoogleBusiness error:", error)
    return { error: "Failed to search for business" }
  }
}

// =============================================================================
// 27. connectGoogleBusiness - Connect a Google Place by ID
// =============================================================================

export async function connectGoogleBusiness(
  placeId: string,
  businessName: string,
  businessAddress: string,
) {
  try {
    const user = await requireRole(["OWNER", "ADMIN"])

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        googlePlaceId: placeId,
        googleBusinessName: businessName,
        googleBusinessAddr: businessAddress,
        googleLastSyncAt: null,
        // Also auto-populate the Google review URL for review request emails
        reviewGoogleUrl: `https://search.google.com/local/writereview?placeid=${placeId}`,
      },
    })

    // Trigger an initial sync of reviews
    const { fetchAndSyncGoogleReviews } = await import("@/lib/google-reviews")
    await fetchAndSyncGoogleReviews(user.organizationId)

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("connectGoogleBusiness error:", error)
    return { error: "Failed to connect Google Business" }
  }
}

// =============================================================================
// 28. disconnectGoogle - Remove Google Business connection
// =============================================================================

export async function disconnectGoogle() {
  try {
    const user = await requireRole(["OWNER", "ADMIN"])

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        googlePlaceId: null,
        googleBusinessName: null,
        googleBusinessAddr: null,
        googleLastSyncAt: null,
      },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("disconnectGoogle error:", error)
    return { error: "Failed to disconnect Google" }
  }
}

// =============================================================================
// Notification Preferences
// =============================================================================

export async function getNotificationPreferences() {
  try {
    const user = await requireAuth()
    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return { error: "Only owners and admins can manage notification preferences" }
    }

    const prefs = await prisma.notificationPreference.findMany({
      where: { organizationId: user.organizationId },
    })

    return { preferences: prefs }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getNotificationPreferences error:", error)
    return { error: "Failed to fetch notification preferences" }
  }
}

export async function updateNotificationPreferences(
  updates: Array<{ triggerKey: string; emailEnabled: boolean; smsEnabled: boolean }>
) {
  try {
    const user = await requireAuth()
    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return { error: "Only owners and admins can manage notification preferences" }
    }

    // Upsert each preference
    await Promise.all(
      updates.map((u) =>
        prisma.notificationPreference.upsert({
          where: {
            organizationId_triggerKey: {
              organizationId: user.organizationId,
              triggerKey: u.triggerKey,
            },
          },
          create: {
            organizationId: user.organizationId,
            triggerKey: u.triggerKey,
            emailEnabled: u.emailEnabled,
            smsEnabled: u.smsEnabled,
          },
          update: {
            emailEnabled: u.emailEnabled,
            smsEnabled: u.smsEnabled,
          },
        })
      )
    )

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("updateNotificationPreferences error:", error)
    return { error: "Failed to update notification preferences" }
  }
}
