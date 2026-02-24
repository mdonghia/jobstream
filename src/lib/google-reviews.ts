import { prisma } from "@/lib/db"

/**
 * Google Places API (New) integration for fetching and caching reviews.
 *
 * Uses a single platform-level API key (GOOGLE_PLACES_API_KEY) instead of
 * per-client OAuth. Clients just search for their business name and select it.
 * Reviews are fetched via Place Details and cached in the Review table.
 */

// =============================================================================
// Types
// =============================================================================

export type PlacesSearchResult = {
  id: string
  displayName: string
  formattedAddress: string
  rating: number | null
  userRatingCount: number | null
}

type PlaceReview = {
  name: string
  rating: number
  text?: { text: string; languageCode: string }
  originalText?: { text: string; languageCode: string }
  authorAttribution: {
    displayName: string
    uri?: string
    photoUri?: string
  }
  publishTime: string
  relativePublishTimeDescription?: string
  googleMapsUri?: string
}

// =============================================================================
// Helpers
// =============================================================================

function getApiKey(): string | null {
  return process.env.GOOGLE_PLACES_API_KEY || null
}

// =============================================================================
// 1. Search for businesses by name (Text Search)
// =============================================================================

export async function searchGooglePlaces(
  query: string,
): Promise<{ results: PlacesSearchResult[] } | { error: string }> {
  const apiKey = getApiKey()
  if (!apiKey) {
    return { error: "Google Places API key is not configured." }
  }

  if (!query || query.trim().length < 2) {
    return { results: [] }
  }

  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
        },
        body: JSON.stringify({
          textQuery: query,
          pageSize: 5,
        }),
      },
    )

    if (!response.ok) {
      const text = await response.text()
      console.error("Places text search failed:", response.status, text)
      return { error: "Failed to search Google Places. Check API key configuration." }
    }

    const data = await response.json()
    const places = data.places || []

    return {
      results: places.map((p: any) => ({
        id: p.id,
        displayName: p.displayName?.text || "Unknown",
        formattedAddress: p.formattedAddress || "",
        rating: p.rating || null,
        userRatingCount: p.userRatingCount || null,
      })),
    }
  } catch (error) {
    console.error("Places text search error:", error)
    return { error: "Failed to search Google Places." }
  }
}

// =============================================================================
// 2. Fetch reviews for a place (Place Details)
// =============================================================================

async function fetchPlaceReviews(
  placeId: string,
): Promise<{
  reviews: PlaceReview[]
  rating: number | null
  userRatingCount: number | null
} | null> {
  const apiKey = getApiKey()
  if (!apiKey) return null

  try {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`

    const response = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "displayName,rating,userRatingCount,reviews",
      },
    })

    if (!response.ok) {
      const text = await response.text()
      console.error("Place details fetch failed:", response.status, text)
      return null
    }

    const data = await response.json()
    return {
      reviews: data.reviews || [],
      rating: data.rating || null,
      userRatingCount: data.userRatingCount || null,
    }
  } catch (error) {
    console.error("Place details fetch error:", error)
    return null
  }
}

// =============================================================================
// 3. Main sync function: fetch reviews and upsert into database
// =============================================================================

export async function fetchAndSyncGoogleReviews(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      googlePlaceId: true,
      googleLastSyncAt: true,
    },
  })

  if (!org?.googlePlaceId) {
    return { error: "Google Business not connected. Search for your business in Review Settings." }
  }

  // Rate limit: don't sync more than once per hour
  if (org.googleLastSyncAt) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    if (org.googleLastSyncAt > oneHourAgo) {
      return { skipped: true, message: "Synced recently, skipping" }
    }
  }

  const data = await fetchPlaceReviews(org.googlePlaceId)

  if (!data) {
    return { error: "Failed to fetch reviews from Google. Check API key configuration." }
  }

  const reviewUrl = `https://search.google.com/local/reviews?placeid=${org.googlePlaceId}`

  // Upsert each review into the database
  let synced = 0
  for (const review of data.reviews) {
    // Extract a stable external ID from the review resource name
    // Format: "places/{placeId}/reviews/{reviewId}"
    const externalId = review.name || `${org.googlePlaceId}-${review.publishTime}`

    await prisma.review.upsert({
      where: {
        organizationId_externalId: {
          organizationId,
          externalId,
        },
      },
      create: {
        organizationId,
        externalId,
        platform: "google",
        rating: review.rating,
        reviewerName: review.authorAttribution.displayName || "Anonymous",
        reviewerPhoto: review.authorAttribution.photoUri || null,
        content: review.originalText?.text || review.text?.text || null,
        reviewDate: new Date(review.publishTime),
        hasOwnerReply: false,
        reviewUrl: review.googleMapsUri || reviewUrl,
      },
      update: {
        rating: review.rating,
        reviewerName: review.authorAttribution.displayName || "Anonymous",
        reviewerPhoto: review.authorAttribution.photoUri || null,
        content: review.originalText?.text || review.text?.text || null,
        reviewUrl: review.googleMapsUri || reviewUrl,
      },
    })
    synced++
  }

  // Update the last sync timestamp
  await prisma.organization.update({
    where: { id: organizationId },
    data: { googleLastSyncAt: new Date() },
  })

  return {
    synced,
    totalReviewCount: data.userRatingCount || 0,
    averageRating: data.rating || 0,
  }
}
