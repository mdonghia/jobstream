"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"

// =============================================================================
// 1. getNotifications - Get notifications for the current user
// =============================================================================

export async function getNotifications() {
  try {
    const user = await requireAuth()

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          organizationId: user.organizationId,
          userId: user.id,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.count({
        where: {
          organizationId: user.organizationId,
          userId: user.id,
          isRead: false,
        },
      }),
    ])

    return {
      notifications,
      unreadCount,
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getNotifications error:", error)
    return { error: "Failed to fetch notifications" }
  }
}

// =============================================================================
// 2. markNotificationRead - Mark a single notification as read
// =============================================================================

export async function markNotificationRead(id: string) {
  try {
    const user = await requireAuth()

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        userId: user.id,
      },
    })

    if (!notification) return { error: "Notification not found" }

    if (notification.isRead) return { success: true }

    await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("markNotificationRead error:", error)
    return { error: "Failed to mark notification as read" }
  }
}

// =============================================================================
// 3. markAllNotificationsRead - Mark all user's notifications as read
// =============================================================================

export async function markAllNotificationsRead() {
  try {
    const user = await requireAuth()

    await prisma.notification.updateMany({
      where: {
        organizationId: user.organizationId,
        userId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("markAllNotificationsRead error:", error)
    return { error: "Failed to mark notifications as read" }
  }
}

// =============================================================================
// 4. createNotification - Internal helper to create a notification
// =============================================================================

export async function createNotification(data: {
  userId: string
  title: string
  message: string
  linkUrl?: string
}) {
  try {
    const user = await requireAuth()

    if (!data.userId || !data.title || !data.message) {
      return { error: "userId, title, and message are required" }
    }

    // Verify the target user belongs to the same organization
    const targetUser = await prisma.user.findFirst({
      where: { id: data.userId, organizationId: user.organizationId },
      select: { id: true, notificationsEnabled: true },
    })

    if (!targetUser) return { error: "User not found" }

    // Skip creation if the target user has disabled in-app notifications
    if (!targetUser.notificationsEnabled) return { skipped: true }

    const notification = await prisma.notification.create({
      data: {
        organizationId: user.organizationId,
        userId: data.userId,
        title: data.title,
        message: data.message,
        linkUrl: data.linkUrl || null,
      },
    })

    return { notification }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("createNotification error:", error)
    return { error: "Failed to create notification" }
  }
}
