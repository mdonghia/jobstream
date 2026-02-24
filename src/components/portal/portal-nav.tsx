"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface PortalNavProps {
  slug: string
  customerName: string
  orgName: string
  orgLogo: string | null
}

const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Jobs", path: "/jobs" },
  { label: "Invoices", path: "/invoices" },
  { label: "Quotes", path: "/quotes" },
  { label: "Messages", path: "/messages" },
  { label: "Profile", path: "/profile" },
]

export function PortalNav({ slug, customerName, orgName, orgLogo }: PortalNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  function handleLogout() {
    // Clear the session cookie
    document.cookie = `portal_session_${slug}=; path=/portal/${slug}; max-age=0; SameSite=Lax`
    router.push(`/portal/${slug}/login`)
  }

  return (
    <header className="bg-white border-b border-[#E3E8EE]">
      <div className="max-w-5xl mx-auto px-4">
        {/* Top bar: logo + customer info */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            {orgLogo ? (
              <img
                src={orgLogo}
                alt={orgName}
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-[#635BFF] flex items-center justify-center text-white font-bold text-sm">
                {orgName.charAt(0)}
              </div>
            )}
            <span className="text-lg font-semibold text-[#0A2540]">
              {orgName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#425466]">{customerName}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-[#8898AA] hover:text-[#0A2540] transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {navItems.map((item) => {
            const href = `/portal/${slug}${item.path}`
            const isActive = pathname === href || pathname.startsWith(href + "/")

            return (
              <Link
                key={item.path}
                href={href}
                className={cn(
                  "px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "border-[#635BFF] text-[#635BFF]"
                    : "border-transparent text-[#8898AA] hover:text-[#425466] hover:border-[#E3E8EE]"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
