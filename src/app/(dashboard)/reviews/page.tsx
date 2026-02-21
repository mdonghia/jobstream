import { requireAuth } from "@/lib/auth-utils"
import { Star } from "lucide-react"

export default async function ReviewsPage() {
  await requireAuth()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-[#0A2540]">Reviews</h1>

      <div className="flex flex-col items-center justify-center mt-24">
        <Star className="size-16 text-[#8898AA]" />
        <h2 className="mt-4 text-lg font-semibold text-[#0A2540]">
          No reviews yet
        </h2>
        <p className="mt-2 text-[#425466] text-center max-w-md">
          Send review requests to your customers after completing jobs.
        </p>
      </div>
    </div>
  )
}
