import { requireAuth } from "@/lib/auth-utils"
import { Mail, MousePointerClick, CalendarCheck, Megaphone } from "lucide-react"

export default async function CampaignsPage() {
  await requireAuth()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#0A2540]">Campaigns</h1>
        <p className="text-sm text-[#425466] mt-1">
          Email marketing campaigns
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-[#E3E8EE] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#635BFF]/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-[#635BFF]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#0A2540]">0</p>
              <p className="text-sm text-[#425466]">Emails Sent</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#E3E8EE] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#635BFF]/10 flex items-center justify-center">
              <MousePointerClick className="w-5 h-5 text-[#635BFF]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#0A2540]">0</p>
              <p className="text-sm text-[#425466]">Emails Opened</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#E3E8EE] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#635BFF]/10 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5 text-[#635BFF]" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#0A2540]">0</p>
              <p className="text-sm text-[#425466]">Visits Scheduled</p>
            </div>
          </div>
        </div>
      </div>

      {/* Coming soon placeholder */}
      <div className="rounded-lg border border-[#E3E8EE] bg-white p-12 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-[#635BFF]/10 flex items-center justify-center mb-4">
          <Megaphone className="w-7 h-7 text-[#635BFF]" />
        </div>
        <h2 className="text-lg font-semibold text-[#0A2540] mb-2">
          Campaigns Coming Soon
        </h2>
        <p className="text-sm text-[#425466] max-w-md mx-auto mb-6">
          Create and manage email marketing campaigns to stay in touch with your
          customers, promote services, and drive repeat business.
        </p>
        <button
          disabled
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#635BFF] text-white text-sm font-medium opacity-50 cursor-not-allowed"
        >
          <Megaphone className="w-4 h-4" />
          Create Campaign
        </button>
      </div>
    </div>
  )
}
