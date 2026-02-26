"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/actions/notifications"
import { toast } from "sonner"

// =============================================================================
// Types
// =============================================================================

type Notification = {
  id: string
  title: string
  message: string
  linkUrl: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

// =============================================================================
// Helpers
// =============================================================================

function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return "Just now"
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// =============================================================================
// Component
// =============================================================================

export function NotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch notifications from server
  const fetchNotifications = useCallback(async () => {
    try {
      const result = await getNotifications()
      if ("error" in result) return
      // Serialize to plain objects (strip Date objects, Decimal, etc.)
      const serialized = JSON.parse(JSON.stringify(result.notifications))
      setNotifications(serialized)
      setUnreadCount(result.unreadCount)
    } catch {
      // Silently fail on polling -- user does not need to see this
    }
  }, [])

  // Fetch on mount + poll every 30 seconds
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Also refresh when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen, fetchNotifications])

  // Handle clicking a single notification
  async function handleNotificationClick(notification: Notification) {
    if (!notification.isRead) {
      const result = await markNotificationRead(notification.id)
      if (result && "error" in result) {
        toast.error("Failed to mark notification as read")
        return
      }
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, isRead: true } : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }

    // Navigate if linkUrl is set
    if (notification.linkUrl) {
      setIsOpen(false)
      router.push(notification.linkUrl)
    }
  }

  // Handle dismissing (removing) a single notification
  async function handleDismiss(e: React.MouseEvent, notification: Notification) {
    e.stopPropagation()
    if (!notification.isRead) {
      const result = await markNotificationRead(notification.id)
      if (result && "error" in result) {
        toast.error("Failed to dismiss notification")
        return
      }
    }
    // Remove from local list so the next one surfaces
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
    if (!notification.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }

  // Visible notifications: show up to 3
  const visibleNotifications = notifications.slice(0, 3)

  // Handle "Mark All Read"
  async function handleMarkAllRead() {
    setIsLoading(true)
    try {
      const result = await markAllNotificationsRead()
      if (result && "error" in result) {
        toast.error("Failed to mark all as read")
        return
      }
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
      toast.success("All notifications marked as read")
    } catch {
      toast.error("Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#425466] relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-[#E25950]" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[380px] p-0 border-[#E3E8EE]"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E3E8EE]">
          <h3 className="text-sm font-semibold text-[#0A2540]">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isLoading}
              className="flex items-center gap-1 text-xs font-medium text-[#635BFF] hover:text-[#635BFF]/80 transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark All Read
            </button>
          )}
        </div>

        {/* Notification List */}
        {visibleNotifications.length > 0 ? (
          <div className="py-1">
            {visibleNotifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[#F6F8FA] transition-colors border-b border-[#E3E8EE] last:border-b-0 ${
                  !notification.isRead ? "bg-[#635BFF]/[0.04]" : ""
                }`}
              >
                {/* Read/unread indicator */}
                <div className="flex-shrink-0 mt-1.5">
                  {notification.isRead ? (
                    <div className="w-2 h-2 rounded-full bg-transparent" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-[#635BFF]" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm leading-snug truncate ${
                        notification.isRead
                          ? "font-medium text-[#425466]"
                          : "font-semibold text-[#0A2540]"
                      }`}
                    >
                      {notification.title}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[11px] text-[#8898AA] whitespace-nowrap">
                        {timeAgo(notification.createdAt)}
                      </span>
                      <button
                        onClick={(e) => handleDismiss(e, notification)}
                        className="p-0.5 rounded hover:bg-gray-200 text-[#8898AA] hover:text-[#425466] transition-colors"
                        aria-label="Dismiss notification"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-[#8898AA] mt-0.5 line-clamp-2 leading-relaxed">
                    {notification.message}
                  </p>
                  {notification.linkUrl && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] text-[#635BFF] font-medium mt-1">
                      View details
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 px-4">
            <div className="w-10 h-10 rounded-full bg-[#F6F8FA] flex items-center justify-center mb-3">
              <Bell className="w-5 h-5 text-[#8898AA]" />
            </div>
            <p className="text-sm font-medium text-[#425466]">
              No notifications
            </p>
            <p className="text-xs text-[#8898AA] mt-1">
              You&apos;re all caught up!
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
