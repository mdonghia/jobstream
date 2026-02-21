import { requireAuth } from "@/lib/auth-utils"
import { FileText } from "lucide-react"

export default async function QuotesPage() {
  await requireAuth()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-[#0A2540]">Quotes</h1>

      <div className="flex flex-col items-center justify-center mt-24">
        <FileText className="size-16 text-[#8898AA]" />
        <h2 className="mt-4 text-lg font-semibold text-[#0A2540]">
          No quotes yet
        </h2>
        <p className="mt-2 text-[#425466] text-center max-w-md">
          Create your first quote to send a professional estimate to a customer.
        </p>
        <button className="mt-6 px-4 py-2 bg-[#635BFF] text-white rounded-lg hover:bg-[#635BFF]/90 transition-colors">
          New Quote
        </button>
      </div>
    </div>
  )
}
