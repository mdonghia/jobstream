import { requireAuth } from "@/lib/auth-utils"
import { Check } from "lucide-react"

export default async function SettingsBillingPage() {
  await requireAuth()

  const features = [
    "Unlimited customers & properties",
    "Quotes, jobs & invoicing",
    "Team management & scheduling",
    "Online booking widget",
    "Automated communications",
    "Customer portal",
    "Reports & analytics",
    "Payment processing",
  ]

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#0A2540]">Plan & Billing</h2>
      <p className="mt-1 text-sm text-[#425466]">
        Manage your subscription and billing details.
      </p>

      <div className="mt-6 max-w-lg rounded-lg border border-[#E3E8EE] bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#0A2540]">
              JobStream Pro
            </h3>
            <p className="mt-0.5 text-sm text-[#425466]">
              Full-featured field service management
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-200">
            Free during beta
          </span>
        </div>

        <div className="mt-6 border-t border-[#E3E8EE] pt-6">
          <p className="text-xs font-semibold uppercase text-[#8898AA]">
            Includes
          </p>
          <ul className="mt-3 space-y-2.5">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#635BFF]/10">
                  <Check className="h-3 w-3 text-[#635BFF]" />
                </div>
                <span className="text-sm text-[#425466]">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 border-t border-[#E3E8EE] pt-6">
          <p className="text-sm text-[#425466]">
            Have questions about pricing?{" "}
            <a
              href="mailto:support@jobstream.app"
              className="font-medium text-[#635BFF] hover:text-[#5851ea]"
            >
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
