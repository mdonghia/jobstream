"use server"

import { hash, compare } from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
import { prisma } from "@/lib/db"
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

export async function getServices() {
  try {
    const user = await requireAuth()

    const services = await prisma.service.findMany({
      where: { organizationId: user.organizationId },
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
