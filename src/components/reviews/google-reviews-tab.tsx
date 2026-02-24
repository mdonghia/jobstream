"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Star,
  MessageSquare,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react"

type ReviewFilter = "all" | "new" | "reviewed" | "responded"

type ReviewItem = {
  id: string
  externalId: string | null
  rating: number
  reviewerName: string
  reviewerPhoto: string | null
  content: string | null
  reviewDate: string
  hasOwnerReply: boolean
  ownerReplyText: string | null
  ownerReplyDate: string | null
  reviewedAt: string | null
  reviewUrl: string | null
}

type ReviewStats = {
  averageRating: number
  totalReviews: number
  newCount: number
  isConnected: boolean
  lastSyncAt: string | null
}

type Props = {
  initialStats?: ReviewStats
  initialReviews?: ReviewItem[]
  initialTotal?: number
}

const FILTER_LABELS: Record<ReviewFilter, string> = {
  all: "All Reviews",
  new: "New",
  reviewed: "Reviewed",
  responded: "Responded",
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-muted text-muted"
          }`}
        />
      ))}
    </div>
  )
}

function ReviewStatusBadge({ review }: { review: ReviewItem }) {
  if (review.hasOwnerReply) {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200">
        Responded
      </Badge>
    )
  }
  if (review.reviewedAt) {
    return <Badge variant="secondary">Reviewed</Badge>
  }
  return (
    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-200">
      New
    </Badge>
  )
}

export function GoogleReviewsTab({ initialStats, initialReviews, initialTotal }: Props) {
  const defaultStats: ReviewStats = {
    averageRating: 0,
    totalReviews: 0,
    newCount: 0,
    isConnected: false,
    lastSyncAt: null,
  }

  const [filter, setFilter] = useState<ReviewFilter>("all")
  const [stats, setStats] = useState<ReviewStats>(initialStats || defaultStats)
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews || [])
  const [total, setTotal] = useState(initialTotal || 0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [isSyncing, setIsSyncing] = useState(false)

  const perPage = 25

  const loadData = useCallback(async (f: ReviewFilter, p: number) => {
    startTransition(async () => {
      try {
        const mod = await import("@/actions/reviews")

        const [statsResult, reviewsResult] = await Promise.all([
          mod.getGoogleReviewStats(),
          mod.getGoogleReviews(f, p, perPage),
        ])

        if (statsResult && !("error" in statsResult)) {
          setStats(statsResult)
        }
        if (reviewsResult && !("error" in reviewsResult)) {
          setReviews(
            reviewsResult.reviews.map((r: any) => ({
              ...r,
              reviewDate: r.reviewDate instanceof Date ? r.reviewDate.toISOString() : r.reviewDate,
              ownerReplyDate: r.ownerReplyDate
                ? r.ownerReplyDate instanceof Date
                  ? r.ownerReplyDate.toISOString()
                  : r.ownerReplyDate
                : null,
              reviewedAt: r.reviewedAt
                ? r.reviewedAt instanceof Date
                  ? r.reviewedAt.toISOString()
                  : r.reviewedAt
                : null,
            })),
          )
          setTotal(reviewsResult.total)
          setTotalPages(reviewsResult.totalPages)
        }
      } catch (e) {
        console.error("Failed to load Google reviews:", e)
      }
    })
  }, [])

  useEffect(() => {
    loadData(filter, page)
  }, [filter, page, loadData])

  async function handleSync() {
    setIsSyncing(true)
    try {
      const mod = await import("@/actions/reviews")
      await mod.syncGoogleReviews()
      await loadData(filter, page)
    } catch (e) {
      console.error("Sync failed:", e)
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleMarkReviewed(reviewId: string) {
    try {
      const mod = await import("@/actions/reviews")
      const result = await mod.markReviewReviewed(reviewId)
      if (result && !("error" in result)) {
        // Update local state
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId ? { ...r, reviewedAt: new Date().toISOString() } : r,
          ),
        )
        setStats((prev) => ({
          ...prev,
          newCount: Math.max(0, prev.newCount - 1),
        }))
      }
    } catch (e) {
      console.error("Failed to mark review as reviewed:", e)
    }
  }

  function toggleExpanded(reviewId: string) {
    setExpandedReviews((prev) => {
      const next = new Set(prev)
      if (next.has(reviewId)) {
        next.delete(reviewId)
      } else {
        next.add(reviewId)
      }
      return next
    })
  }

  function formatDate(iso: string) {
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  // Not connected state
  if (!stats.isConnected && reviews.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Star className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Connect Google Business Profile</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            Connect your Google Business Profile to see your real Google reviews here.
            You&apos;ll be able to track new reviews, mark them as handled, and click
            through to respond on Google.
          </p>
          <Button asChild>
            <a href="/settings/reviews">
              <Settings className="mr-2 h-4 w-4" />
              Go to Review Settings
            </a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-50 p-2.5 dark:bg-yellow-950">
                <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Google Rating</p>
                <p className="text-2xl font-bold">
                  {stats.averageRating > 0 ? `${stats.averageRating} / 5.0` : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2.5 dark:bg-blue-950">
                <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold">{stats.totalReviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-50 p-2.5 dark:bg-orange-950">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Needs Attention</p>
                <p className="text-2xl font-bold">
                  {stats.newCount > 0 ? `${stats.newCount} new` : "None"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <Select value={filter} onValueChange={(v) => { setFilter(v as ReviewFilter); setPage(1) }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(FILTER_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {stats.isConnected && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Refresh from Google"}
          </Button>
        )}
      </div>

      {/* Reviews list */}
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {isPending
                ? "Loading reviews..."
                : filter === "all"
                  ? "No reviews yet. Reviews will appear here after connecting Google Business Profile and syncing."
                  : `No ${FILTER_LABELS[filter].toLowerCase()} reviews.`}
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => {
            const isExpanded = expandedReviews.has(review.id)
            const contentTruncated = review.content && review.content.length > 200

            return (
              <Card key={review.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Header: stars, name, date */}
                      <div className="flex items-center gap-3 mb-2">
                        <StarRating rating={review.rating} />
                        <span className="font-medium text-sm">{review.reviewerName}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(review.reviewDate)}
                        </span>
                      </div>

                      {/* Review content */}
                      {review.content && (
                        <div className="mb-3">
                          <p className="text-sm text-foreground/80 leading-relaxed">
                            &ldquo;
                            {contentTruncated && !isExpanded
                              ? review.content.slice(0, 200) + "..."
                              : review.content}
                            &rdquo;
                          </p>
                          {contentTruncated && (
                            <button
                              className="text-xs text-primary hover:underline mt-1"
                              onClick={() => toggleExpanded(review.id)}
                            >
                              {isExpanded ? "Show less" : "Read more"}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Owner reply */}
                      {review.hasOwnerReply && review.ownerReplyText && (
                        <div className="ml-4 pl-3 border-l-2 border-muted mb-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Owner reply
                            {review.ownerReplyDate && (
                              <> &middot; {formatDate(review.ownerReplyDate)}</>
                            )}
                          </p>
                          <p className="text-sm text-foreground/70">
                            {review.ownerReplyText}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {!review.reviewedAt && !review.hasOwnerReply && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkReviewed(review.id)}
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Mark Reviewed
                          </Button>
                        )}
                        {review.reviewUrl && (
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={review.reviewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="mr-1 h-3.5 w-3.5" />
                              View on Google
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <ReviewStatusBadge review={review} />
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
