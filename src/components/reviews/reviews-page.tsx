"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Star,
  Plus,
  Search,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { format } from "date-fns"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Review {
  id: string
  customerId: string | null
  customerName: string | null
  jobId: string | null
  platform: string
  rating: number
  reviewerName: string | null
  content: string | null
  reviewDate: string
  responseContent: string | null
  respondedAt: string | null
  reviewUrl: string | null
  createdAt: string
}

interface ReviewSummary {
  averageRating: number
  totalReviews: number
  responseRate: number
  requestsSentThisMonth: number
}

interface ReviewsPageProps {
  initialReviews?: Review[]
  initialSummary?: ReviewSummary
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StarRating({
  rating,
  size = "sm",
  interactive = false,
  onRate,
}: {
  rating: number
  size?: "sm" | "md" | "lg"
  interactive?: boolean
  onRate?: (rating: number) => void
}) {
  const sizeClasses = {
    sm: "w-3.5 h-3.5",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  }

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${
            star <= rating
              ? "text-amber-400 fill-amber-400"
              : "text-[#E3E8EE]"
          } ${interactive ? "cursor-pointer hover:text-amber-300" : ""}`}
          onClick={
            interactive && onRate ? () => onRate(star) : undefined
          }
        />
      ))}
    </div>
  )
}

const platformConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  Google: {
    label: "Google",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  Yelp: {
    label: "Yelp",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
  },
  Facebook: {
    label: "Facebook",
    color: "text-[#1877F2]",
    bg: "bg-blue-50 border-blue-200",
  },
  Other: {
    label: "Other",
    color: "text-[#425466]",
    bg: "bg-[#F6F8FA] border-[#E3E8EE]",
  },
}

const defaultSummary: ReviewSummary = {
  averageRating: 0,
  totalReviews: 0,
  responseRate: 0,
  requestsSentThisMonth: 0,
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReviewsPage({
  initialReviews = [],
  initialSummary,
}: ReviewsPageProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [summary, setSummary] = useState<ReviewSummary>(
    initialSummary ?? defaultSummary
  )
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState("")
  const [platformFilter, setPlatformFilter] = useState("all")
  const [ratingFilter, setRatingFilter] = useState("all")
  const [respondedFilter, setRespondedFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Add review dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newPlatform, setNewPlatform] = useState("Google")
  const [newReviewerName, setNewReviewerName] = useState("")
  const [newRating, setNewRating] = useState(5)
  const [newContent, setNewContent] = useState("")
  const [newReviewDate, setNewReviewDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  )
  const [newReviewUrl, setNewReviewUrl] = useState("")
  const [newCustomerSearch, setNewCustomerSearch] = useState("")

  // Response state (for expanded review)
  const [responseText, setResponseText] = useState("")
  const [savingResponse, setSavingResponse] = useState(false)

  // Fetch reviews
  const fetchReviews = useCallback(async () => {
    try {
      const mod = await import("@/actions/reviews").catch(() => null)
      if (mod?.getReviews) {
        setLoading(true)
        const result = await mod.getReviews({
          search: search || undefined,
          platform: platformFilter !== "all" ? platformFilter : undefined,
          rating: ratingFilter !== "all" ? Number(ratingFilter) : undefined,
          responded:
            respondedFilter === "all"
              ? undefined
              : respondedFilter === "yes",
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        })
        if (result && !("error" in result)) {
          setReviews((result.reviews ?? []).map((r: any) => ({
            ...r,
            customerName: r.customer
              ? `${r.customer.firstName} ${r.customer.lastName}`
              : null,
            reviewDate: r.reviewDate instanceof Date ? r.reviewDate.toISOString() : r.reviewDate,
            respondedAt: r.respondedAt instanceof Date ? r.respondedAt.toISOString() : r.respondedAt,
            createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
          })))
          if (result.summary) setSummary(result.summary)
        }
        setLoading(false)
      }
    } catch {
      // Server actions not yet available
    }
  }, [search, platformFilter, ratingFilter, respondedFilter, dateFrom, dateTo])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReviews()
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchReviews])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
      setResponseText("")
    } else {
      setExpandedId(id)
      const review = reviews.find((r) => r.id === id)
      setResponseText(review?.responseContent ?? "")
    }
  }

  async function handleSaveResponse(reviewId: string) {
    if (!responseText.trim()) {
      toast.error("Please write a response")
      return
    }

    setSavingResponse(true)
    try {
      const mod = await import("@/actions/reviews").catch(() => null)
      if (mod?.updateReviewResponse) {
        const result = await mod.updateReviewResponse(reviewId, responseText)
        if (result && "error" in result) {
          toast.error(result.error as string)
          return
        }
        toast.success("Response saved")
      } else {
        // Mock: update locally
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId
              ? {
                  ...r,
                  responseContent: responseText,
                  respondedAt: new Date().toISOString(),
                }
              : r
          )
        )
        toast.success("Response saved locally")
      }
      fetchReviews()
    } catch {
      toast.error("Failed to save response")
    } finally {
      setSavingResponse(false)
    }
  }

  async function handleAddReview() {
    if (!newReviewerName.trim()) {
      toast.error("Please enter a reviewer name")
      return
    }

    try {
      const mod = await import("@/actions/reviews").catch(() => null)
      if (mod?.createReview) {
        const result = await mod.createReview({
          platform: newPlatform,
          reviewerName: newReviewerName,
          rating: newRating,
          content: newContent || undefined,
          reviewDate: newReviewDate,
          reviewUrl: newReviewUrl || undefined,
        })
        if (result && "error" in result) {
          toast.error(result.error as string)
          return
        }
        toast.success("Review added")
      } else {
        // Mock: add locally
        const newReview: Review = {
          id: crypto.randomUUID(),
          customerId: null,
          customerName: newCustomerSearch || null,
          jobId: null,
          platform: newPlatform,
          rating: newRating,
          reviewerName: newReviewerName,
          content: newContent || null,
          reviewDate: newReviewDate,
          responseContent: null,
          respondedAt: null,
          reviewUrl: newReviewUrl || null,
          createdAt: new Date().toISOString(),
        }
        setReviews((prev) => [newReview, ...prev])
        toast.success("Review added locally")
      }
      setAddDialogOpen(false)
      resetAddForm()
      fetchReviews()
    } catch {
      toast.error("Failed to add review")
    }
  }

  function resetAddForm() {
    setNewPlatform("Google")
    setNewReviewerName("")
    setNewRating(5)
    setNewContent("")
    setNewReviewDate(format(new Date(), "yyyy-MM-dd"))
    setNewReviewUrl("")
    setNewCustomerSearch("")
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#0A2540]">Reviews</h1>
          <p className="text-sm text-[#8898AA] mt-0.5">
            Track and respond to customer reviews
          </p>
        </div>
        <Button
          onClick={() => {
            resetAddForm()
            setAddDialogOpen(true)
          }}
          size="sm"
          className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Review
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-[#E3E8EE]">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-[#8898AA] uppercase tracking-wider">
              Average Rating
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl font-semibold text-[#0A2540]">
                {summary.averageRating > 0
                  ? summary.averageRating.toFixed(1)
                  : "--"}
              </span>
              {summary.averageRating > 0 && (
                <StarRating rating={Math.round(summary.averageRating)} size="md" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E3E8EE]">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-[#8898AA] uppercase tracking-wider">
              Total Reviews
            </p>
            <p className="text-2xl font-semibold text-[#0A2540] mt-2">
              {summary.totalReviews}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#E3E8EE]">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-[#8898AA] uppercase tracking-wider">
              Response Rate
            </p>
            <p className="text-2xl font-semibold text-[#0A2540] mt-2">
              {summary.totalReviews > 0
                ? `${Math.round(summary.responseRate)}%`
                : "--"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#E3E8EE]">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-[#8898AA] uppercase tracking-wider">
              Requests Sent (This Month)
            </p>
            <p className="text-2xl font-semibold text-[#0A2540] mt-2">
              {summary.requestsSentThisMonth}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-t-lg border border-b-0 border-[#E3E8EE] p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8898AA]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reviews..."
              className="pl-10 h-9 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select
              value={platformFilter}
              onValueChange={setPlatformFilter}
            >
              <SelectTrigger className="w-[120px] h-9 border-[#E3E8EE] text-sm">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="Google">Google</SelectItem>
                <SelectItem value="Yelp">Yelp</SelectItem>
                <SelectItem value="Facebook">Facebook</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-[110px] h-9 border-[#E3E8EE] text-sm">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={respondedFilter}
              onValueChange={setRespondedFilter}
            >
              <SelectTrigger className="w-[130px] h-9 border-[#E3E8EE] text-sm">
                <SelectValue placeholder="Responded" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Responded</SelectItem>
                <SelectItem value="no">Not Responded</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 w-[140px] border-[#E3E8EE] text-sm"
              aria-label="Date from"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 w-[140px] border-[#E3E8EE] text-sm"
              aria-label="Date to"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        className={`bg-white rounded-b-lg border border-[#E3E8EE] overflow-hidden ${loading ? "opacity-50" : ""}`}
      >
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Star className="w-12 h-12 text-[#8898AA] mb-3" />
            <h3 className="text-sm font-semibold text-[#0A2540] mb-1">
              No reviews yet
            </h3>
            <p className="text-sm text-[#8898AA] max-w-sm">
              {search || platformFilter !== "all" || ratingFilter !== "all"
                ? "Try adjusting your filters."
                : "Send review requests to your customers after completing jobs."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                    Platform
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                    Rating
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                    Review Preview
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                    Response
                  </th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => {
                  const platform =
                    platformConfig[review.platform] ?? platformConfig.Other
                  const isExpanded = expandedId === review.id
                  const hasResponse = !!review.responseContent

                  return (
                    <>
                      <tr
                        key={review.id}
                        className="border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50 cursor-pointer"
                        onClick={() => toggleExpand(review.id)}
                      >
                        <td className="px-4 py-3 text-sm text-[#425466] whitespace-nowrap">
                          {format(
                            new Date(review.reviewDate),
                            "MMM d, yyyy"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-[#0A2540]">
                          {review.reviewerName ??
                            review.customerName ?? (
                              <span className="text-[#8898AA]">Anonymous</span>
                            )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`${platform.bg} ${platform.color} text-xs`}
                          >
                            {platform.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <StarRating rating={review.rating} />
                        </td>
                        <td className="px-4 py-3 text-sm text-[#425466] max-w-[250px] truncate">
                          {review.content ?? (
                            <span className="text-[#8898AA] italic">
                              No content
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {hasResponse ? (
                            <Badge
                              variant="outline"
                              className="bg-green-50 border-green-200 text-green-700 text-xs"
                            >
                              <MessageCircle className="w-3 h-3 mr-0.5" />
                              Responded
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 border-amber-200 text-amber-700 text-xs"
                            >
                              Awaiting
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-[#8898AA]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[#8898AA]" />
                          )}
                        </td>
                      </tr>

                      {/* Expanded content */}
                      {isExpanded && (
                        <tr
                          key={`${review.id}-expanded`}
                          className="border-b border-[#E3E8EE]"
                        >
                          <td colSpan={7} className="px-4 py-5 bg-[#F6F8FA]">
                            <div className="max-w-2xl space-y-4">
                              {/* Full review */}
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <StarRating
                                    rating={review.rating}
                                    size="md"
                                  />
                                  <span className="text-sm text-[#8898AA]">
                                    by{" "}
                                    {review.reviewerName ?? "Anonymous"}
                                  </span>
                                  {review.reviewUrl && (
                                    <a
                                      href={review.reviewUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#635BFF] hover:underline text-xs inline-flex items-center gap-0.5"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      View
                                    </a>
                                  )}
                                </div>
                                <p className="text-sm text-[#425466] whitespace-pre-wrap">
                                  {review.content ?? "No review content."}
                                </p>
                              </div>

                              {/* Response section */}
                              <div className="border-t border-[#E3E8EE] pt-4">
                                {hasResponse ? (
                                  <div>
                                    <p className="text-xs font-semibold text-[#8898AA] uppercase mb-2">
                                      Your Response
                                    </p>
                                    <p className="text-sm text-[#425466] bg-white p-3 rounded border border-[#E3E8EE]">
                                      {review.responseContent}
                                    </p>
                                    {review.respondedAt && (
                                      <p className="text-xs text-[#8898AA] mt-1">
                                        Responded{" "}
                                        {format(
                                          new Date(review.respondedAt),
                                          "MMM d, yyyy"
                                        )}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-xs font-semibold text-[#8898AA] uppercase mb-2">
                                      Write a Response
                                    </p>
                                    <Textarea
                                      value={responseText}
                                      onChange={(e) =>
                                        setResponseText(e.target.value)
                                      }
                                      placeholder="Write your response to this review..."
                                      className="border-[#E3E8EE] focus-visible:ring-[#635BFF] min-h-[80px] bg-white"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="flex justify-end mt-2">
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleSaveResponse(review.id)
                                        }}
                                        disabled={savingResponse}
                                        className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
                                      >
                                        <Send className="w-3.5 h-3.5 mr-1" />
                                        {savingResponse
                                          ? "Saving..."
                                          : "Save Response"}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Review Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">Add Review</DialogTitle>
            <DialogDescription className="text-[#8898AA]">
              Manually add a review from an external platform.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm text-[#425466]">Platform</Label>
              <Select value={newPlatform} onValueChange={setNewPlatform}>
                <SelectTrigger className="mt-1.5 h-10 border-[#E3E8EE]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Google">Google</SelectItem>
                  <SelectItem value="Yelp">Yelp</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm text-[#425466]">Reviewer Name</Label>
              <Input
                value={newReviewerName}
                onChange={(e) => setNewReviewerName(e.target.value)}
                placeholder="John Smith"
                className="mt-1.5 h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              />
            </div>

            <div>
              <Label className="text-sm text-[#425466]">Rating</Label>
              <div className="mt-1.5">
                <StarRating
                  rating={newRating}
                  size="lg"
                  interactive
                  onRate={setNewRating}
                />
              </div>
            </div>

            <div>
              <Label className="text-sm text-[#425466]">
                Review Content (optional)
              </Label>
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Paste the review content here..."
                className="mt-1.5 border-[#E3E8EE] focus-visible:ring-[#635BFF] min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-[#425466]">Review Date</Label>
                <Input
                  type="date"
                  value={newReviewDate}
                  onChange={(e) => setNewReviewDate(e.target.value)}
                  className="mt-1.5 h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                />
              </div>
              <div>
                <Label className="text-sm text-[#425466]">
                  URL (optional)
                </Label>
                <Input
                  value={newReviewUrl}
                  onChange={(e) => setNewReviewUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1.5 h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm text-[#425466]">
                Link to Customer (optional)
              </Label>
              <Input
                value={newCustomerSearch}
                onChange={(e) => setNewCustomerSearch(e.target.value)}
                placeholder="Search customer name..."
                className="mt-1.5 h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              />
              <p className="text-xs text-[#8898AA] mt-1">
                Customer linking will be available when server actions are
                connected.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              className="border-[#E3E8EE] text-[#425466]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddReview}
              className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
            >
              Add Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
