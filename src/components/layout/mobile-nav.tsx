"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  LayoutDashboard,
  Users,
  Calendar,
  Briefcase,
  Receipt,
  Star,
  BarChart3,
  Settings,
  Megaphone,
} from "lucide-react"

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Jobs", icon: Briefcase, href: "/jobs" },
  { label: "Customers", icon: Users, href: "/customers" },
  { label: "Schedule", icon: Calendar, href: "/schedule" },
  { label: "Invoices", icon: Receipt, href: "/invoices" },
  { label: "Reports", icon: BarChart3, href: "/reports" },
]

// Conditional items -- shown only when Marketing Suite is enabled
const conditionalItems = [
  { label: "Reviews", icon: Star, href: "/reviews" },
  { label: "Campaigns", icon: Megaphone, href: "/campaigns" },
]

const bottomItems = [
  { label: "Settings", icon: Settings, href: "/settings" },
]

interface MobileNavProps {
  open: boolean
  onClose: () => void
  orgName: string
  user: {
    role: string
  }
  marketingSuiteEnabled?: boolean
}

export function MobileNav({ open, onClose, orgName, user, marketingSuiteEnabled = false }: MobileNavProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  // Technicians don't see the mobile nav -- they get the pipeline view (Phase 8)
  if (user.role === "TECHNICIAN") return null

  // Only show marketing items (Reviews, Campaigns) when the Marketing Suite is enabled
  const visibleConditionalItems = marketingSuiteEnabled ? conditionalItems : []
  const allNavItems = [...navItems, ...visibleConditionalItems]

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
        <SheetHeader className="border-b border-[#E3E8EE] px-4 h-14 flex flex-row items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#635BFF] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">J</span>
          </div>
          <SheetTitle className="text-sm font-semibold text-[#0A2540] truncate">
            {orgName}
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 py-2 px-2 space-y-0.5">
          {allNavItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 h-9 rounded-md text-sm transition-colors",
                  active
                    ? "bg-[#635BFF]/10 text-[#635BFF] font-medium"
                    : "text-[#425466] hover:bg-gray-200/60"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[#E3E8EE] py-2 px-2 space-y-0.5">
          {bottomItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 h-9 rounded-md text-sm transition-colors",
                  active
                    ? "bg-[#635BFF]/10 text-[#635BFF] font-medium"
                    : "text-[#425466] hover:bg-gray-200/60"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
