import { Suspense } from "react"
import { requireAuth } from "@/lib/auth-utils"
import { ReviewsPage } from "@/components/reviews/reviews-page"

export default async function ReviewsRoute() {
  await requireAuth()

  // Try to load initial data from server actions (when available)
  let initialReviews: any[] = []
  let initialSummary = undefined

  try {
    const mod = await import("@/actions/reviews").catch(() => null)
    if (mod?.getReviews) {
      const result = await mod.getReviews({})
      if (result && !("error" in result)) {
        initialReviews = (result.reviews ?? []).map((r: any) => ({
          ...r,
          customerName: r.customer
            ? `${r.customer.firstName} ${r.customer.lastName}`
            : null,
          reviewDate:
            r.reviewDate instanceof Date
              ? r.reviewDate.toISOString()
              : r.reviewDate,
          respondedAt:
            r.respondedAt instanceof Date
              ? r.respondedAt.toISOString()
              : r.respondedAt,
          createdAt:
            r.createdAt instanceof Date
              ? r.createdAt.toISOString()
              : r.createdAt,
        }))
        if (result.summary) {
          initialSummary = result.summary
        }
      }
    }
  } catch {
    // Server actions not yet available -- render with empty data
  }

  return (
    <Suspense>
      <ReviewsPage
        initialReviews={initialReviews}
        initialSummary={initialSummary}
      />
    </Suspense>
  )
}
