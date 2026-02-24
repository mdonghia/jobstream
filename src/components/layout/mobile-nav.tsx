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
} from "lucide-react"

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Customers", icon: Users, href: "/customers" },
  { label: "Quotes", icon: FileText, href: "/quotes" },
  { label: "Jobs", icon: Briefcase, href: "/jobs" },
  { label: "Schedule", icon: Calendar, href: "/schedule" },
  { label: "Invoices", icon: Receipt, href: "/invoices" },
  { label: "Payments", icon: CreditCard, href: "/payments" },
  { label: "Time Tracking", icon: Clock, href: "/time-tracking" },
  { label: "Bookings", icon: CalendarPlus, href: "/bookings" },
  { label: "Reviews", icon: Star, href: "/reviews" },
  { label: "Reports", icon: BarChart3, href: "/reports" },
  { label: "Communications", icon: MessageSquare, href: "/communications" },
  { label: "Settings", icon: Settings, href: "/settings" },
]

interface MobileNavProps {
  open: boolean
  onClose: () => void
  orgName: string
}

export function MobileNav({ open, onClose, orgName }: MobileNavProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

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

        <nav className="py-2 px-2 space-y-0.5">
          {navItems.map((item) => {
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
      </SheetContent>
    </Sheet>
  )
}
