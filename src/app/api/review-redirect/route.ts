import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Public endpoint for tracking review request link clicks.
 * Called when a customer clicks a review link in the review request email.
 * Records the first click (deduped per request) then redirects to the platform URL.
 *
 * Query params:
 *   token    - unique ReviewRequest token
 *   platform - "google" | "yelp" | "facebook"
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const token = searchParams.get("token")
  const platform = searchParams.get("platform")

  if (!token || !platform) {
    return NextResponse.json({ error: "Missing token or platform" }, { status: 400 })
  }

  try {
    // Look up the review request by token
    const reviewRequest = await prisma.reviewRequest.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            reviewGoogleUrl: true,
            reviewYelpUrl: true,
            reviewFacebookUrl: true,
          },
        },
      },
    })

    if (!reviewRequest) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 })
    }

    // Record the click (only the first one -- deduped per request)
    if (!reviewRequest.clickedAt) {
      await prisma.reviewRequest.update({
        where: { token },
        data: { clickedAt: new Date() },
      })
    }

    // Determine the redirect URL based on platform
    let redirectUrl: string | null = null
    switch (platform.toLowerCase()) {
      case "google":
        redirectUrl = reviewRequest.organization.reviewGoogleUrl
        break
      case "yelp":
        redirectUrl = reviewRequest.organization.reviewYelpUrl
        break
      case "facebook":
        redirectUrl = reviewRequest.organization.reviewFacebookUrl
        break
    }

    if (!redirectUrl) {
      // Fallback: redirect to Google search for the business
      return NextResponse.json(
        { error: "Review platform URL not configured" },
        { status: 404 },
      )
    }

    return NextResponse.redirect(redirectUrl, 302)
  } catch (error) {
    console.error("Review redirect error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
