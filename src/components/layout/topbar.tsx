"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  Menu,
  User as UserIcon,
  Settings,
  HelpCircle,
  LogOut,
  ArrowLeftRight,
} from "lucide-react"
import { toast } from "sonner"
import { NotificationBell } from "@/components/layout/notification-bell"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"
import { updatePreferredView } from "@/actions/settings"

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/jobs": "Jobs",
  "/customers": "Customers",
  "/schedule": "Schedule",
  "/invoices": "Invoices",
  "/reports": "Reports",
  "/reviews": "Reviews",
  "/settings": "Settings",
  "/settings/general": "Business Information",
  "/settings/team": "Team Members",
  "/settings/services": "Services",
  "/settings/payments": "Payment Settings",
  "/settings/communications": "Notification Settings",
  "/settings/booking": "Booking Widget",
  "/settings/reviews": "Review Settings",
  "/settings/marketing": "Marketing Suite",
  "/settings/billing": "Billing",
  "/campaigns": "Campaigns",
  "/profile": "Profile",
}

interface TopbarProps {
  user: {
    firstName: string
    lastName: string
    email: string
    role: string
    avatar: string | null
    preferredView?: string
  }
  onMenuClick: () => void
  hideSidebarToggle?: boolean
}

export function Topbar({ user, onMenuClick, hideSidebarToggle }: TopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [switchingView, setSwitchingView] = useState(false)

  // Determine if the user can switch views (only OWNER and ADMIN)
  const canSwitchView = user.role === "OWNER" || user.role === "ADMIN"
  const currentView = user.preferredView ?? "admin"
  const isInTechView = currentView === "tech"

  async function handleSwitchView() {
    const newView = isInTechView ? "admin" : "tech"
    setSwitchingView(true)
    try {
      const result = await updatePreferredView(newView)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success(
          newView === "tech"
            ? "Switched to Technician View"
            : "Switched to Admin View"
        )
        // Navigate to the dashboard and refresh to apply the view change
        router.push("/")
        router.refresh()
      }
    } catch {
      toast.error("Failed to switch view")
    } finally {
      setSwitchingView(false)
    }
  }

  function getPageTitle() {
    // Check exact match first
    if (pageTitles[pathname]) return pageTitles[pathname]
    // Check if starts with a known path
    for (const [path, title] of Object.entries(pageTitles)) {
      if (path !== "/" && pathname.startsWith(path)) return title
    }
    return "Dashboard"
  }

  return (
    <header className="h-14 border-b border-[#E3E8EE] bg-white flex items-center justify-between px-4 lg:px-6">
      {/* Left side: hamburger + page title */}
      <div className="flex items-center gap-3">
        {!hideSidebarToggle && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 text-[#425466]"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-lg font-semibold text-[#0A2540]">
          {getPageTitle()}
        </h1>
      </div>

      {/* Right side: notifications, user menu */}
      <div className="flex items-center gap-2">
        {/* Notifications bell */}
        <NotificationBell />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1 rounded-md hover:bg-gray-100 transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user.avatar || undefined} />
                <AvatarFallback className="bg-[#635BFF] text-white text-xs">
                  {getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-[#0A2540] font-medium hidden sm:inline">
                {user.firstName}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-[#0A2540]">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-[#8898AA]">
                {user.role}{isInTechView ? " (Tech View)" : ""}
              </p>
            </div>
            <DropdownMenuSeparator />
            {canSwitchView && (
              <DropdownMenuItem
                onClick={handleSwitchView}
                disabled={switchingView}
                className="flex items-center gap-2"
              >
                <ArrowLeftRight className="w-4 h-4" />
                {isInTechView ? "Switch to Admin View" : "Switch to Tech View"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href="/help"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <HelpCircle className="w-4 h-4" />
                Help Center
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 text-red-600 focus:text-red-600"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
