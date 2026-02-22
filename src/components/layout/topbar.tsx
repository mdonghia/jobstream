"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  Plus,
  Menu,
  User as UserIcon,
  Settings,
  LogOut,
} from "lucide-react"
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

const quickActions = [
  { label: "New Customer", href: "/customers?action=new" },
  { label: "New Quote", href: "/quotes/new" },
  { label: "New Job", href: "/jobs/new" },
  { label: "New Invoice", href: "/invoices/new" },
]

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/customers": "Customers",
  "/quotes": "Quotes",
  "/schedule": "Schedule",
  "/jobs": "Jobs",
  "/invoices": "Invoices",
  "/payments": "Payments",
  "/time-tracking": "Time Tracking",
  "/bookings": "Bookings",
  "/reviews": "Reviews",
  "/reports": "Reports",
  "/communications": "Communications",
  "/settings": "Settings",
  "/settings/general": "Business Information",
  "/settings/team": "Team Members",
  "/settings/services": "Services",
  "/settings/payments": "Payment Settings",
  "/settings/communications": "Communication Settings",
  "/settings/booking": "Booking Widget",
  "/settings/reviews": "Review Settings",
  "/settings/billing": "Billing",
  "/profile": "Profile",
}

interface TopbarProps {
  user: {
    firstName: string
    lastName: string
    email: string
    role: string
    avatar: string | null
  }
  onMenuClick: () => void
}

export function Topbar({ user, onMenuClick }: TopbarProps) {
  const pathname = usePathname()

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
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 text-[#425466]"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-[#0A2540]">
          {getPageTitle()}
        </h1>
      </div>

      {/* Right side: quick actions, notifications, user menu */}
      <div className="flex items-center gap-2">
        {/* Quick Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-[#E3E8EE]"
              aria-label="Quick actions"
            >
              <Plus className="w-4 h-4 text-[#425466]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {quickActions.map((action) => (
              <DropdownMenuItem key={action.href} asChild>
                <Link href={action.href}>{action.label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

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
              <p className="text-xs text-[#8898AA]">{user.role}</p>
            </div>
            <DropdownMenuSeparator />
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
