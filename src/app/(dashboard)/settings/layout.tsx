"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const settingsLinks = [
  { href: "/settings/general", label: "General" },
  { href: "/settings/team", label: "Team Members" },
  { href: "/settings/services", label: "Services" },
  { href: "/settings/checklists", label: "Checklists" },
  { href: "/settings/payments", label: "Payments" },
  { href: "/settings/communications", label: "Communications" },
  { href: "/settings/booking", label: "Booking Widget" },
  { href: "/settings/reviews", label: "Reviews" },
  { href: "/settings/service-plans", label: "Service Plans" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/report-issue", label: "Report Issue" },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold text-[#0A2540]">Settings</h1>

      {/* Mobile: horizontal scrollable nav */}
      <nav className="mt-4 -mx-4 px-4 overflow-x-auto lg:hidden">
        <div className="flex gap-1 min-w-max pb-2">
          {settingsLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#635BFF] text-white"
                    : "bg-[#F6F8FA] text-[#425466] hover:bg-gray-200"
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="mt-6 flex gap-8">
        {/* Desktop: vertical sidebar nav */}
        <nav className="hidden lg:block w-56 flex-shrink-0">
          <ul className="space-y-1">
            {settingsLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#635BFF]/10 text-[#635BFF]"
                        : "text-[#425466] hover:bg-gray-100"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
