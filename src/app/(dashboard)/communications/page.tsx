import { requireAuth } from "@/lib/auth-utils"
import { MessageSquare } from "lucide-react"

export default async function CommunicationsPage() {
  await requireAuth()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-[#0A2540]">
        Communications
      </h1>

      <div className="flex flex-col items-center justify-center mt-24">
        <MessageSquare className="size-16 text-[#8898AA]" />
        <h2 className="mt-4 text-lg font-semibold text-[#0A2540]">
          No communications yet
        </h2>
        <p className="mt-2 text-[#425466] text-center max-w-md">
          SMS and email communications with your customers will appear here.
        </p>
      </div>
    </div>
  )
}
