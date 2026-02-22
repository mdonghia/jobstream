"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  Briefcase,
  Receipt,
  CreditCard,
  Clock,
  CalendarPlus,
  Star,
  BarChart3,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Customers", icon: Users, href: "/customers" },
  { label: "Quotes", icon: FileText, href: "/quotes" },
  { label: "Schedule", icon: Calendar, href: "/schedule" },
  { label: "Jobs", icon: Briefcase, href: "/jobs" },
  { label: "Invoices", icon: Receipt, href: "/invoices" },
  { label: "Payments", icon: CreditCard, href: "/payments" },
  { label: "Time Tracking", icon: Clock, href: "/time-tracking" },
  { label: "Bookings", icon: CalendarPlus, href: "/bookings" },
  { label: "Reviews", icon: Star, href: "/reviews" },
  { label: "Reports", icon: BarChart3, href: "/reports" },
  { label: "Communications", icon: MessageSquare, href: "/communications" },
]

const bottomItems = [
  { label: "Settings", icon: Settings, href: "/settings" },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  orgName: string
}

export function Sidebar({ collapsed, onToggle, orgName }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen bg-[#F6F8FA] border-r border-[#E3E8EE] transition-all duration-200 fixed left-0 top-0 z-30",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo / Org name */}
      <div className={cn(
        "flex items-center h-14 border-b border-[#E3E8EE] px-4",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-md bg-[#635BFF] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">J</span>
            </div>
            <span className="text-sm font-semibold text-[#0A2540] truncate">
              {orgName}
            </span>
          </Link>
        )}
        {collapsed && (
          <Link href="/">
            <div className="w-7 h-7 rounded-md bg-[#635BFF] flex items-center justify-center">
              <span className="text-white text-sm font-bold">J</span>
            </div>
          </Link>
        )}
        <button
          onClick={onToggle}
          className={cn(
            "p-1 rounded-md hover:bg-gray-200 text-[#8898AA] transition-colors",
            collapsed && "hidden"
          )}
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center justify-center w-full h-9 rounded-md transition-colors",
                      active
                        ? "bg-[#635BFF]/10 text-[#635BFF]"
                        : "text-[#425466] hover:bg-gray-200/60"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 h-9 rounded-md text-sm transition-colors",
                active
                  ? "bg-[#635BFF]/10 text-[#635BFF] font-medium"
                  : "text-[#425466] hover:bg-gray-200/60"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom items */}
      <div className="border-t border-[#E3E8EE] py-2 px-2 space-y-0.5">
        {collapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggle}
                className="flex items-center justify-center w-full h-9 rounded-md text-[#8898AA] hover:bg-gray-200/60 transition-colors mb-1"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        )}

        {bottomItems.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center justify-center w-full h-9 rounded-md transition-colors",
                      active
                        ? "bg-[#635BFF]/10 text-[#635BFF]"
                        : "text-[#425466] hover:bg-gray-200/60"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 h-9 rounded-md text-sm transition-colors",
                active
                  ? "bg-[#635BFF]/10 text-[#635BFF] font-medium"
                  : "text-[#425466] hover:bg-gray-200/60"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
