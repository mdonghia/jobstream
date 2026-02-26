"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Calendar,
  Briefcase,
  Receipt,
  Star,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Megaphone,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Customers", icon: Users, href: "/customers" },
  { label: "Jobs", icon: Briefcase, href: "/jobs" },
  { label: "Schedule", icon: Calendar, href: "/schedule" },
  { label: "Invoices", icon: Receipt, href: "/invoices" },
  { label: "Reports", icon: BarChart3, href: "/reports" },
]

// Conditional items -- shown only when Marketing Suite is enabled in org settings
const conditionalItems = [
  { label: "Reviews", icon: Star, href: "/reviews" },
  { label: "Campaigns", icon: Megaphone, href: "/campaigns" },
]

const bottomItems = [
  { label: "Settings", icon: Settings, href: "/settings" },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  orgName: string
  orgFavicon?: string | null
  user: {
    role: string
  }
  marketingSuiteEnabled?: boolean
}

export function Sidebar({ collapsed, onToggle, orgName, orgFavicon, user, marketingSuiteEnabled = false }: SidebarProps) {
  // Technicians don't see the sidebar -- they get the pipeline view (Phase 8)
  if (user.role === "TECHNICIAN") return null

  const pathname = usePathname()
  const orgInitial = orgName.charAt(0).toUpperCase()

  // Only show marketing items (Reviews, Campaigns) when the Marketing Suite is enabled
  const visibleConditionalItems = marketingSuiteEnabled ? conditionalItems : []

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
            {orgFavicon ? (
              <img src={orgFavicon} alt={orgName} className="w-7 h-7 rounded-md object-cover flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-md bg-[#635BFF] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">{orgInitial}</span>
              </div>
            )}
            <span className="text-sm font-semibold text-[#0A2540] truncate">
              {orgName}
            </span>
          </Link>
        )}
        {collapsed && (
          <Link href="/">
            {orgFavicon ? (
              <img src={orgFavicon} alt={orgName} className="w-7 h-7 rounded-md object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-md bg-[#635BFF] flex items-center justify-center">
                <span className="text-white text-sm font-bold">{orgInitial}</span>
              </div>
            )}
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
        {[...navItems, ...visibleConditionalItems].map((item) => {
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
