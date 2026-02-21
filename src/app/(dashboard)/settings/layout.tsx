"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const settingsLinks = [
  { href: "/settings/general", label: "General" },
  { href: "/settings/team", label: "Team Members" },
  { href: "/settings/services", label: "Services" },
  { href: "/settings/payments", label: "Payments" },
  { href: "/settings/communications", label: "Communications" },
  { href: "/settings/booking", label: "Booking Widget" },
  { href: "/settings/reviews", label: "Reviews" },
  { href: "/settings/billing", label: "Billing" },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-[#0A2540]">Settings</h1>

      <div className="mt-6 flex gap-8">
        <nav className="w-56 flex-shrink-0">
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
