import { Suspense } from "react"
import { requireAuth } from "@/lib/auth-utils"
import { ReviewsPage } from "@/components/reviews/reviews-page"

export default async function ReviewsRoute() {
  await requireAuth()

  // Load initial data for both tabs server-side
  let initialGoogleStats: any = undefined
  let initialGoogleReviews: any[] = []
  let initialGoogleTotal = 0
  let initialRequestStats: any = undefined
  let initialRequests: any[] = []
  let initialRequestTotal = 0

  try {
    const mod = await import("@/actions/reviews").catch(() => null)
    if (mod) {
      const [googleStats, googleReviews, requestStats, requests] = await Promise.all([
        mod.getGoogleReviewStats?.() || null,
        mod.getGoogleReviews?.("all", 1, 25) || null,
        mod.getReviewRequestStats?.("last_7_days") || null,
        mod.getReviewRequests?.("last_7_days", 1, 25) || null,
      ])

      if (googleStats && !("error" in googleStats)) {
        initialGoogleStats = googleStats
      }
      if (googleReviews && !("error" in googleReviews)) {
        initialGoogleReviews = googleReviews.reviews.map((r: any) => ({
          ...r,
          reviewDate: r.reviewDate instanceof Date ? r.reviewDate.toISOString() : r.reviewDate,
          ownerReplyDate: r.ownerReplyDate
            ? r.ownerReplyDate instanceof Date ? r.ownerReplyDate.toISOString() : r.ownerReplyDate
            : null,
          reviewedAt: r.reviewedAt
            ? r.reviewedAt instanceof Date ? r.reviewedAt.toISOString() : r.reviewedAt
            : null,
        }))
        initialGoogleTotal = googleReviews.total
      }
      if (requestStats && !("error" in requestStats)) {
        initialRequestStats = requestStats
      }
      if (requests && !("error" in requests)) {
        initialRequests = requests.requests.map((r: any) => ({
          ...r,
          sentAt: r.sentAt instanceof Date ? r.sentAt.toISOString() : r.sentAt,
          clickedAt: r.clickedAt
            ? r.clickedAt instanceof Date ? r.clickedAt.toISOString() : r.clickedAt
            : null,
        }))
        initialRequestTotal = requests.total
      }
    }
  } catch {
    // Server actions not yet available -- render with empty data
  }

  return (
    <Suspense>
      <ReviewsPage
        initialGoogleStats={initialGoogleStats}
        initialGoogleReviews={initialGoogleReviews}
        initialGoogleTotal={initialGoogleTotal}
        initialRequestStats={initialRequestStats}
        initialRequests={initialRequests}
        initialRequestTotal={initialRequestTotal}
      />
    </Suspense>
  )
}
