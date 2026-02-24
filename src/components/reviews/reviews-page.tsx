"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GoogleReviewsTab } from "@/components/reviews/google-reviews-tab"
import { ReviewRequestsTab } from "@/components/reviews/review-requests-tab"
import { Star, Mail } from "lucide-react"

type Props = {
  initialGoogleStats?: any
  initialGoogleReviews?: any[]
  initialGoogleTotal?: number
  initialRequestStats?: any
  initialRequests?: any[]
  initialRequestTotal?: number
}

export function ReviewsPage({
  initialGoogleStats,
  initialGoogleReviews,
  initialGoogleTotal,
  initialRequestStats,
  initialRequests,
  initialRequestTotal,
}: Props) {
  // Default to Review Requests tab if Google is not connected
  const isGoogleConnected = initialGoogleStats?.isConnected || false
  const defaultTab = isGoogleConnected ? "google" : "requests"

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#0A2540]">Reviews</h1>
          <p className="text-sm text-[#8898AA] mt-0.5">
            Monitor your online reputation and track review request performance.
          </p>
        </div>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="bg-transparent rounded-none w-full justify-start h-auto p-0 gap-1 border-b border-[#E3E8EE] overflow-x-auto overflow-y-hidden mb-4">
          <TabsTrigger value="google" className="rounded-none border-b-2 border-transparent px-3 py-2 h-auto flex-none -mb-px after:hidden text-sm font-medium text-[#8898AA] hover:text-[#425466] data-[state=active]:border-[#635BFF] data-[state=active]:text-[#0A2540] data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Star className="mr-1.5 h-4 w-4" />
            Google Reviews
          </TabsTrigger>
          <TabsTrigger value="requests" className="rounded-none border-b-2 border-transparent px-3 py-2 h-auto flex-none -mb-px after:hidden text-sm font-medium text-[#8898AA] hover:text-[#425466] data-[state=active]:border-[#635BFF] data-[state=active]:text-[#0A2540] data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            <Mail className="mr-1.5 h-4 w-4" />
            Review Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="google">
          <GoogleReviewsTab
            initialStats={initialGoogleStats}
            initialReviews={initialGoogleReviews}
            initialTotal={initialGoogleTotal}
          />
        </TabsContent>

        <TabsContent value="requests">
          <ReviewRequestsTab
            initialStats={initialRequestStats}
            initialRequests={initialRequests}
            initialTotal={initialRequestTotal}
          />
        </TabsContent>
      </Tabs>
    </>
  )
}
