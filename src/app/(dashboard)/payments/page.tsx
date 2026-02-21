import { requireAuth } from "@/lib/auth-utils"
import { CreditCard } from "lucide-react"

export default async function PaymentsPage() {
  await requireAuth()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-[#0A2540]">Payments</h1>

      <div className="flex flex-col items-center justify-center mt-24">
        <CreditCard className="size-16 text-[#8898AA]" />
        <h2 className="mt-4 text-lg font-semibold text-[#0A2540]">
          No payments yet
        </h2>
        <p className="mt-2 text-[#425466] text-center max-w-md">
          Payments will appear here once you start collecting from invoices.
        </p>
      </div>
    </div>
  )
}
