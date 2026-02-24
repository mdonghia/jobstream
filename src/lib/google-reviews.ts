import { prisma } from "@/lib/db"

/**
 * Google Business Profile API integration for fetching and caching reviews.
 *
 * Requires the `googleapis` and `google-auth-library` npm packages.
 * Reviews are fetched from the Google Business Profile API and cached
 * in the local Review table, deduped by externalId.
 */

type GoogleReview = {
  reviewId: string
  reviewer: {
    displayName: string
    profilePhotoUrl?: string
    isAnonymous: boolean
  }
  starRating: string // "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE"
  comment?: string
  createTime: string
  updateTime: string
  reviewReply?: {
    comment: string
    updateTime: string
  }
}

type GoogleReviewsResponse = {
  reviews?: GoogleReview[]
  averageRating?: number
  totalReviewCount?: number
  nextPageToken?: string
}

const STAR_RATING_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
}

/**
 * Construct a URL to view a specific Google review.
 * Since Google doesn't provide direct review URLs, we link to the
 * business's Google Maps reviews page.
 */
function buildGoogleReviewUrl(placeId: string | null): string | null {
  if (!placeId) return null
  return `https://search.google.com/local/reviews?placeid=${placeId}`
}

/**
 * Refresh the Google OAuth access token using the refresh token.
 */
async function refreshAccessToken(organizationId: string): Promise<string | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleTokenExpiry: true,
    },
  })

  if (!org?.googleRefreshToken) return null

  // Check if token is still valid (with 5-minute buffer)
  if (org.googleTokenExpiry && org.googleTokenExpiry > new Date(Date.now() + 5 * 60 * 1000)) {
    return org.googleAccessToken
  }

  // Refresh the token
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error("Google OAuth credentials not configured")
    return null
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: org.googleRefreshToken,
        grant_type: "refresh_token",
      }),
    })

    if (!response.ok) {
      console.error("Token refresh failed:", await response.text())
      return null
    }

    const data = await response.json()

    // Update stored token
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        googleAccessToken: data.access_token,
        googleTokenExpiry: new Date(Date.now() + data.expires_in * 1000),
      },
    })

    return data.access_token
  } catch (error) {
    console.error("Token refresh error:", error)
    return null
  }
}

/**
 * Fetch reviews from the Google Business Profile API.
 */
async function fetchReviewsFromGoogle(
  accessToken: string,
  accountId: string,
  locationId: string,
): Promise<GoogleReviewsResponse | null> {
  try {
    const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?pageSize=50&orderBy=updateTime desc`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error("Google reviews fetch failed:", response.status, await response.text())
      return null
    }

    return await response.json()
  } catch (error) {
    console.error("Google reviews fetch error:", error)
    return null
  }
}

/**
 * Main sync function: fetches Google reviews and upserts into the database.
 * Returns the sync result.
 */
export async function fetchAndSyncGoogleReviews(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      googleAccountId: true,
      googleLocationId: true,
      googlePlaceId: true,
      googleLastSyncAt: true,
    },
  })

  if (!org?.googleAccountId || !org?.googleLocationId) {
    return { error: "Google Business Profile not connected" }
  }

  // Rate limit: don't sync more than once per hour
  if (org.googleLastSyncAt) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    if (org.googleLastSyncAt > oneHourAgo) {
      return { skipped: true, message: "Synced recently, skipping" }
    }
  }

  const accessToken = await refreshAccessToken(organizationId)
  if (!accessToken) {
    return { error: "Failed to get Google access token. Please reconnect." }
  }

  const data = await fetchReviewsFromGoogle(
    accessToken,
    org.googleAccountId,
    org.googleLocationId,
  )

  if (!data) {
    return { error: "Failed to fetch reviews from Google" }
  }

  const reviewUrl = buildGoogleReviewUrl(org.googlePlaceId)

  // Upsert each review into the database
  let synced = 0
  if (data.reviews) {
    for (const review of data.reviews) {
      const rating = STAR_RATING_MAP[review.starRating] || 5

      await prisma.review.upsert({
        where: {
          organizationId_externalId: {
            organizationId,
            externalId: review.reviewId,
          },
        },
        create: {
          organizationId,
          externalId: review.reviewId,
          platform: "google",
          rating,
          reviewerName: review.reviewer.isAnonymous
            ? "Anonymous"
            : review.reviewer.displayName,
          reviewerPhoto: review.reviewer.profilePhotoUrl || null,
          content: review.comment || null,
          reviewDate: new Date(review.createTime),
          hasOwnerReply: !!review.reviewReply,
          ownerReplyText: review.reviewReply?.comment || null,
          ownerReplyDate: review.reviewReply
            ? new Date(review.reviewReply.updateTime)
            : null,
          reviewUrl,
        },
        update: {
          rating,
          reviewerName: review.reviewer.isAnonymous
            ? "Anonymous"
            : review.reviewer.displayName,
          reviewerPhoto: review.reviewer.profilePhotoUrl || null,
          content: review.comment || null,
          hasOwnerReply: !!review.reviewReply,
          ownerReplyText: review.reviewReply?.comment || null,
          ownerReplyDate: review.reviewReply
            ? new Date(review.reviewReply.updateTime)
            : null,
        },
      })
      synced++
    }
  }

  // Update the last sync timestamp
  await prisma.organization.update({
    where: { id: organizationId },
    data: { googleLastSyncAt: new Date() },
  })

  return {
    synced,
    totalReviewCount: data.totalReviewCount || 0,
    averageRating: data.averageRating || 0,
  }
}
