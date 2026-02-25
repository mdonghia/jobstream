"use server"

import { prisma } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth-utils"

// =============================================================================
// Types
// =============================================================================

export type NotificationSettingUpdate = {
  triggerKey: string
  emailEnabled: boolean
  smsEnabled: boolean
  inAppEnabled: boolean
}

// =============================================================================
// 1. getNotificationSettingsV2 -- Returns all v2 notification settings for the org
// =============================================================================

export async function getNotificationSettingsV2() {
  try {
    const user = await requireAuth()
    if (!["OWNER", "ADMIN"].includes(user.role)) {
      return { error: "Only owners and admins can manage notification settings" }
    }

    const prefs = await prisma.notificationPreference.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        triggerKey: true,
        emailEnabled: true,
        smsEnabled: true,
        inAppEnabled: true,
      },
    })

    return { preferences: prefs }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getNotificationSettingsV2 error:", error)
    return { error: "Failed to fetch notification settings" }
  }
}

// =============================================================================
// 2. updateNotificationSettingV2 -- Upsert a single notification type's settings
// =============================================================================

export async function updateNotificationSettingV2(update: NotificationSettingUpdate) {
  try {
    const user = await requireRole(["OWNER", "ADMIN"])

    await prisma.notificationPreference.upsert({
      where: {
        organizationId_triggerKey: {
          organizationId: user.organizationId,
          triggerKey: update.triggerKey,
        },
      },
      create: {
        organizationId: user.organizationId,
        triggerKey: update.triggerKey,
        emailEnabled: update.emailEnabled,
        smsEnabled: update.smsEnabled,
        inAppEnabled: update.inAppEnabled,
      },
      update: {
        emailEnabled: update.emailEnabled,
        smsEnabled: update.smsEnabled,
        inAppEnabled: update.inAppEnabled,
      },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("updateNotificationSettingV2 error:", error)
    return { error: "Failed to update notification setting" }
  }
}

// =============================================================================
// 3. bulkUpdateNotificationSettingsV2 -- Upsert multiple notification settings
// =============================================================================

export async function bulkUpdateNotificationSettingsV2(updates: NotificationSettingUpdate[]) {
  try {
    const user = await requireRole(["OWNER", "ADMIN"])

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
            inAppEnabled: u.inAppEnabled,
          },
          update: {
            emailEnabled: u.emailEnabled,
            smsEnabled: u.smsEnabled,
            inAppEnabled: u.inAppEnabled,
          },
        })
      )
    )

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("bulkUpdateNotificationSettingsV2 error:", error)
    return { error: "Failed to update notification settings" }
  }
}
