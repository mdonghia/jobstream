"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"

// =============================================================================
// Types
// =============================================================================

type DateRange = "last_7_days" | "last_30_days" | "last_3_months" | "last_6_months" | "last_12_months" | "custom"

type ReviewFilter = "all" | "new" | "reviewed" | "responded"

// =============================================================================
// Helpers
// =============================================================================

function getDateRangeBounds(range: DateRange): { from: Date; to: Date } | null {
  const now = new Date()

  switch (range) {
    case "last_7_days": {
      const from = new Date(now)
      from.setDate(from.getDate() - 6)
      from.setHours(0, 0, 0, 0)
      return { from, to: now }
    }
    case "last_30_days": {
      const from = new Date(now)
      from.setDate(from.getDate() - 29)
      from.setHours(0, 0, 0, 0)
      return { from, to: now }
    }
    case "last_3_months": {
      const from = new Date(now)
      from.setMonth(from.getMonth() - 3)
      from.setHours(0, 0, 0, 0)
      return { from, to: now }
    }
    case "last_6_months": {
      const from = new Date(now)
      from.setMonth(from.getMonth() - 6)
      from.setHours(0, 0, 0, 0)
      return { from, to: now }
    }
    case "last_12_months": {
      const from = new Date(now)
      from.setMonth(from.getMonth() - 12)
      from.setHours(0, 0, 0, 0)
      return { from, to: now }
    }
    default:
      return null
  }
}

// =============================================================================
// 1. getReviewRequestStats - Summary stats for the review requests tab
// =============================================================================

export async function getReviewRequestStats(dateRange: DateRange = "last_7_days") {
  try {
    const user = await requireAuth()
    const bounds = getDateRangeBounds(dateRange)

    const where: any = { organizationId: user.organizationId }
    if (bounds) {
      where.sentAt = { gte: bounds.from, lte: bounds.to }
    }

    const [totalSent, uniqueClicked] = await Promise.all([
      prisma.reviewRequest.count({ where }),
      prisma.reviewRequest.count({
        where: { ...where, clickedAt: { not: null } },
      }),
    ])

    const conversionRate = totalSent > 0
      ? Math.round((uniqueClicked / totalSent) * 1000) / 10
      : 0

    return { totalSent, uniqueClicked, conversionRate }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getReviewRequestStats error:", error)
    return { error: "Failed to fetch review request stats" }
  }
}

// =============================================================================
// 2. getReviewRequests - Paginated list of review request emails sent
// =============================================================================

export async function getReviewRequests(
  dateRange: DateRange = "last_7_days",
  page: number = 1,
  perPage: number = 25,
) {
  try {
    const user = await requireAuth()
    const bounds = getDateRangeBounds(dateRange)

    const where: any = { organizationId: user.organizationId }
    if (bounds) {
      where.sentAt = { gte: bounds.from, lte: bounds.to }
    }

    const skip = (page - 1) * perPage

    const [total, requests] = await Promise.all([
      prisma.reviewRequest.count({ where }),
      prisma.reviewRequest.findMany({
        where,
        orderBy: { sentAt: "desc" },
        skip,
        take: perPage,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true },
          },
          job: {
            select: { id: true, jobNumber: true },
          },
        },
      }),
    ])

    return {
      requests,
      total,
      page,
      totalPages: Math.ceil(total / perPage),
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getReviewRequests error:", error)
    return { error: "Failed to fetch review requests" }
  }
}

// =============================================================================
// 3. getGoogleReviews - Cached Google reviews from database
// =============================================================================

export async function getGoogleReviews(
  filter: ReviewFilter = "all",
  page: number = 1,
  perPage: number = 25,
) {
  try {
    const user = await requireAuth()

    const where: any = { organizationId: user.organizationId }

    switch (filter) {
      case "new":
        where.reviewedAt = null
        where.hasOwnerReply = false
        break
      case "reviewed":
        where.reviewedAt = { not: null }
        where.hasOwnerReply = false
        break
      case "responded":
        where.hasOwnerReply = true
        break
    }

    const skip = (page - 1) * perPage

    const [total, reviews] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        orderBy: { reviewDate: "desc" },
        skip,
        take: perPage,
      }),
    ])

    return {
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / perPage),
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getGoogleReviews error:", error)
    return { error: "Failed to fetch Google reviews" }
  }
}

// =============================================================================
// 4. getGoogleReviewStats - Rating, total count, and new count
// =============================================================================

export async function getGoogleReviewStats() {
  try {
    const user = await requireAuth()

    const orgWhere = { organizationId: user.organizationId }

    const [avgRating, totalReviews, newCount, org] = await Promise.all([
      prisma.review.aggregate({
        where: orgWhere,
        _avg: { rating: true },
      }),
      prisma.review.count({ where: orgWhere }),
      prisma.review.count({
        where: {
          ...orgWhere,
          reviewedAt: null,
          hasOwnerReply: false,
        },
      }),
      prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: {
          googlePlaceId: true,
          googleLastSyncAt: true,
        },
      }),
    ])

    return {
      averageRating: avgRating._avg.rating
        ? Number(Number(avgRating._avg.rating).toFixed(1))
        : 0,
      totalReviews,
      newCount,
      isConnected: !!org?.googlePlaceId,
      lastSyncAt: org?.googleLastSyncAt?.toISOString() || null,
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getGoogleReviewStats error:", error)
    return { error: "Failed to fetch Google review stats" }
  }
}

// =============================================================================
// 5. markReviewReviewed - Mark a review as "reviewed" (dismiss "New" badge)
// =============================================================================

export async function markReviewReviewed(reviewId: string) {
  try {
    const user = await requireAuth()

    const review = await prisma.review.findFirst({
      where: { id: reviewId, organizationId: user.organizationId },
    })

    if (!review) return { error: "Review not found" }

    await prisma.review.update({
      where: { id: reviewId },
      data: { reviewedAt: new Date() },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("markReviewReviewed error:", error)
    return { error: "Failed to mark review as reviewed" }
  }
}

// =============================================================================
// Review request email template
// =============================================================================

function buildReviewRequestHtml(
  firstName: string,
  orgName: string,
  token: string,
  googleUrl: string | null,
  yelpUrl: string | null,
  facebookUrl: string | null,
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"
  const buttonStyle =
    "display: inline-block; padding: 12px 24px; margin: 6px 8px 6px 0; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;"

  const buttons: string[] = []
  if (googleUrl) {
    const trackUrl = `${baseUrl}/api/review-redirect?token=${encodeURIComponent(token)}&platform=google`
    buttons.push(
      `<a href="${trackUrl}" style="${buttonStyle} background-color: #4285F4;">Google Reviews</a>`,
    )
  }
  if (yelpUrl) {
    const trackUrl = `${baseUrl}/api/review-redirect?token=${encodeURIComponent(token)}&platform=yelp`
    buttons.push(
      `<a href="${trackUrl}" style="${buttonStyle} background-color: #D32323;">Yelp Reviews</a>`,
    )
  }
  if (facebookUrl) {
    const trackUrl = `${baseUrl}/api/review-redirect?token=${encodeURIComponent(token)}&platform=facebook`
    buttons.push(
      `<a href="${trackUrl}" style="${buttonStyle} background-color: #1877F2;">Facebook Reviews</a>`,
    )
  }

  const hasLinks = buttons.length > 0
  const linkPrompt = hasLinks
    ? "Would you take a moment to leave us a review on one of these platforms?"
    : "Would you take a moment to leave us a review?"
  const linkSection = hasLinks
    ? `<div style="margin: 24px 0;">${buttons.join("\n      ")}</div>`
    : ""

  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px; color: #1a1a1a;">
      <h2 style="color: #111827; margin-bottom: 16px;">Hi ${firstName},</h2>
      <p style="font-size: 16px; line-height: 1.6;">Thank you for choosing <strong>${orgName}</strong>!</p>
      <p style="font-size: 16px; line-height: 1.6;">We'd love to hear about your experience. Your feedback helps us improve and helps other customers find us.</p>
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">${linkPrompt}</p>
      ${linkSection}
      <p style="font-size: 14px; color: #6b7280; margin-top: 32px;">Thank you for your business!<br/>The ${orgName} Team</p>
    </div>
  `
}

// =============================================================================
// 6. sendReviewRequest - Trigger a review request for a completed job
// =============================================================================

export async function sendReviewRequest(jobId: string) {
  try {
    const user = await requireAuth()

    const job = await prisma.job.findFirst({
      where: { id: jobId, organizationId: user.organizationId },
      include: {
        customer: true,
      },
    })

    if (!job) return { error: "Job not found" }
    if (job.status !== "COMPLETED") {
      return { error: "Review requests can only be sent for completed jobs" }
    }

    if (!job.customer.email) {
      return { error: "Customer does not have an email address" }
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        name: true,
        slug: true,
        reviewGoogleUrl: true,
        reviewYelpUrl: true,
        reviewFacebookUrl: true,
      },
    })

    // Create a ReviewRequest record with a unique tracking token
    const reviewRequest = await prisma.reviewRequest.create({
      data: {
        organizationId: user.organizationId,
        customerId: job.customerId,
        jobId: job.id,
      },
    })

    const { isNotificationEnabled } = await import("@/lib/notification-check")

    if (await isNotificationEnabled(user.organizationId, "review_request", "email")) {
      if (process.env.SENDGRID_API_KEY) {
        try {
          const sgMail = await import("@sendgrid/mail")
          sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)
          await sgMail.default.send({
            to: job.customer.email,
            from: {
              email: process.env.SENDGRID_FROM_EMAIL || "noreply@jobstream.app",
              name: org?.name || "JobStream",
            },
            subject: `How did we do? - ${org?.name}`,
            html: buildReviewRequestHtml(
              job.customer.firstName,
              org?.name || "Our Company",
              reviewRequest.token,
              org?.reviewGoogleUrl || null,
              org?.reviewYelpUrl || null,
              org?.reviewFacebookUrl || null,
            ),
          })
        } catch (e) {
          console.error("Failed to send review request email:", e)
        }
      } else {
        console.log(`[Review Request] Would send email to ${job.customer.email} for job ${job.jobNumber}`)
      }

      // Create communication log entry
      await prisma.communicationLog.create({
        data: {
          organizationId: user.organizationId,
          customerId: job.customerId,
          type: "EMAIL",
          direction: "OUTBOUND",
          recipientAddress: job.customer.email,
          subject: `How did we do? - ${org?.name}`,
          content: `Review request sent for job ${job.jobNumber}`,
          status: process.env.SENDGRID_API_KEY ? "SENT" : "QUEUED",
          triggeredBy: "review_request",
        },
      })
    }

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("sendReviewRequest error:", error)
    return { error: "Failed to send review request" }
  }
}

// =============================================================================
// 7. syncGoogleReviews - Fetch reviews from Google and cache in database
// =============================================================================

export async function syncGoogleReviews() {
  try {
    const user = await requireAuth()

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        googlePlaceId: true,
        googleLastSyncAt: true,
      },
    })

    if (!org?.googlePlaceId) {
      return { error: "Google Business not connected" }
    }

    // Import the sync service
    const { fetchAndSyncGoogleReviews } = await import("@/lib/google-reviews")
    const result = await fetchAndSyncGoogleReviews(user.organizationId)

    return result
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("syncGoogleReviews error:", error)
    return { error: "Failed to sync Google reviews" }
  }
}
