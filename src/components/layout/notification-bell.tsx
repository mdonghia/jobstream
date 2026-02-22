"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
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
      setNotifications(serialized.slice(0, 10))
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
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E25950] px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
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
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[#0A2540]">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#635BFF] px-1.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
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
        {notifications.length > 0 ? (
          <ScrollArea className="max-h-[400px]">
            <div className="py-1">
              {notifications.map((notification) => (
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
                      <span className="text-[11px] text-[#8898AA] whitespace-nowrap flex-shrink-0">
                        {timeAgo(notification.createdAt)}
                      </span>
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
          </ScrollArea>
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
