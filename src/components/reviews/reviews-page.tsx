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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
        <p className="text-muted-foreground">
          Monitor your online reputation and track review request performance.
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="google">
            <Star className="mr-1.5 h-4 w-4" />
            Google Reviews
          </TabsTrigger>
          <TabsTrigger value="requests">
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
    </div>
  )
}
