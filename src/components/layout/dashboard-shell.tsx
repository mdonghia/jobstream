"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { MobileNav } from "./mobile-nav"

interface DashboardShellProps {
  children: React.ReactNode
  user: {
    firstName: string
    lastName: string
    email: string
    role: string
    avatar: string | null
  }
  orgName: string
}

export function DashboardShell({ children, user, orgName }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const isTechnician = user.role === "TECHNICIAN"

  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      {/* Desktop sidebar -- hidden for technicians */}
      {!isTechnician && (
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          orgName={orgName}
          user={user}
        />
      )}

      {/* Mobile nav -- hidden for technicians */}
      {!isTechnician && (
        <MobileNav
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          orgName={orgName}
          user={user}
        />
      )}

      {/* Main content area -- no sidebar offset for technicians */}
      <div
        className={cn(
          "transition-all duration-200",
          !isTechnician && (sidebarCollapsed ? "lg:ml-16" : "lg:ml-60")
        )}
      >
        <Topbar
          user={user}
          onMenuClick={() => setMobileNavOpen(true)}
          hideSidebarToggle={isTechnician}
        />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
