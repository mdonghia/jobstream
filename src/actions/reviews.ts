"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { reviewSchema } from "@/lib/validations"

// =============================================================================
// Types
// =============================================================================

type GetReviewsParams = {
  platform?: string
  rating?: number
  responded?: boolean
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  perPage?: number
}

// =============================================================================
// 1. getReviews - List reviews with filters and summary stats
// =============================================================================

export async function getReviews(params: GetReviewsParams = {}) {
  try {
    const user = await requireAuth()
    const {
      platform,
      rating,
      responded,
      dateFrom,
      dateTo,
      search,
      page = 1,
      perPage = 25,
    } = params

    const where: any = { organizationId: user.organizationId }

    if (platform && platform !== "ALL") {
      where.platform = platform
    }

    if (rating !== undefined && rating !== null) {
      where.rating = rating
    }

    if (responded !== undefined) {
      if (responded) {
        where.respondedAt = { not: null }
      } else {
        where.respondedAt = null
      }
    }

    if (dateFrom || dateTo) {
      where.reviewDate = {}
      if (dateFrom) where.reviewDate.gte = new Date(dateFrom + "T00:00:00")
      if (dateTo) where.reviewDate.lte = new Date(dateTo + "T00:00:00")
    }

    // Split on whitespace so multi-word searches like "David Brown" match across fields
    if (search && search.trim()) {
      const words = search.trim().split(/\s+/)
      where.AND = [
        ...(where.AND || []),
        ...words.map((word: string) => ({
          OR: [
            { reviewerName: { contains: word, mode: "insensitive" } },
            { content: { contains: word, mode: "insensitive" } },
            { responseContent: { contains: word, mode: "insensitive" } },
          ],
        })),
      ]
    }

    const skip = (page - 1) * perPage

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [total, reviews, avgRating, totalReviews, respondedCount, requestsSentThisMonth] =
      await Promise.all([
        prisma.review.count({ where }),
        prisma.review.findMany({
          where,
          orderBy: { reviewDate: "desc" },
          skip,
          take: perPage,
          include: {
            customer: {
              select: { id: true, firstName: true, lastName: true },
            },
            job: {
              select: { id: true, jobNumber: true, title: true },
            },
          },
        }),
        // Average rating
        prisma.review.aggregate({
          where: { organizationId: user.organizationId },
          _avg: { rating: true },
        }),
        // Total reviews count
        prisma.review.count({
          where: { organizationId: user.organizationId },
        }),
        // Count of reviews with a response
        prisma.review.count({
          where: {
            organizationId: user.organizationId,
            respondedAt: { not: null },
          },
        }),
        // Review requests sent this month
        prisma.review.count({
          where: {
            organizationId: user.organizationId,
            requestSentAt: { gte: thisMonthStart },
          },
        }),
      ])

    const responseRate =
      totalReviews > 0 ? Math.round((respondedCount / totalReviews) * 100) : 0

    return {
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / perPage),
      summary: {
        averageRating: avgRating._avg.rating ? Number(avgRating._avg.rating.toFixed(1)) : 0,
        totalReviews,
        responseRate,
        requestsSentThisMonth,
      },
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getReviews error:", error)
    return { error: "Failed to fetch reviews" }
  }
}

// =============================================================================
// 2. createReview - Manually add a review
// =============================================================================

export async function createReview(data: {
  platform: string
  reviewerName: string
  rating: number
  content?: string
  reviewDate: string | Date
  reviewUrl?: string
  customerId?: string
  jobId?: string
}) {
  try {
    const user = await requireAuth()

    const result = reviewSchema.safeParse(data)
    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    // Verify customer if provided
    if (data.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: data.customerId, organizationId: user.organizationId },
      })
      if (!customer) return { error: "Customer not found" }
    }

    // Verify job if provided
    if (data.jobId) {
      const job = await prisma.job.findFirst({
        where: { id: data.jobId, organizationId: user.organizationId },
      })
      if (!job) return { error: "Job not found" }
    }

    const review = await prisma.review.create({
      data: {
        organizationId: user.organizationId,
        platform: data.platform,
        reviewerName: data.reviewerName,
        rating: data.rating,
        content: data.content || null,
        reviewDate: new Date(data.reviewDate),
        reviewUrl: data.reviewUrl || null,
        customerId: data.customerId || null,
        jobId: data.jobId || null,
      },
    })

    return { review }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("createReview error:", error)
    return { error: "Failed to create review" }
  }
}

// =============================================================================
// 3. updateReviewResponse - Add or update a response to a review
// =============================================================================

export async function updateReviewResponse(id: string, responseContent: string) {
  try {
    const user = await requireAuth()

    const review = await prisma.review.findFirst({
      where: { id, organizationId: user.organizationId },
    })

    if (!review) return { error: "Review not found" }

    if (!responseContent || !responseContent.trim()) {
      return { error: "Response content is required" }
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        responseContent: responseContent.trim(),
        respondedAt: new Date(),
      },
    })

    return { review: updated }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("updateReviewResponse error:", error)
    return { error: "Failed to update review response" }
  }
}

// =============================================================================
// 4. deleteReview - Delete a review
// =============================================================================

export async function deleteReview(id: string) {
  try {
    const user = await requireAuth()

    const review = await prisma.review.findFirst({
      where: { id, organizationId: user.organizationId },
    })

    if (!review) return { error: "Review not found" }

    await prisma.review.delete({ where: { id } })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("deleteReview error:", error)
    return { error: "Failed to delete review" }
  }
}

// =============================================================================
// 5. sendReviewRequest - Trigger a review request for a completed job
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
      select: { name: true, slug: true },
    })

    const { isNotificationEnabled } = await import("@/lib/notification-check")

    if (await isNotificationEnabled(user.organizationId, "review_request", "email")) {
      // Send review request email (best effort)
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
            html: `
              <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
                <h2>Hi ${job.customer.firstName},</h2>
                <p>Thank you for choosing <strong>${org?.name}</strong>!</p>
                <p>We'd love to hear about your experience. Your feedback helps us improve and helps other customers find us.</p>
                <p>Would you take a moment to leave us a review?</p>
              </div>
            `,
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

    // Update the review request tracking
    // Mark that a request was sent for this job
    await prisma.review.updateMany({
      where: {
        organizationId: user.organizationId,
        jobId,
      },
      data: { requestSentAt: new Date() },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("sendReviewRequest error:", error)
    return { error: "Failed to send review request" }
  }
}
