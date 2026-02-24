import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

/**
 * Google OAuth callback handler.
 * After the user authorizes access to their Google Business Profile,
 * Google redirects here with an authorization code. We exchange it for
 * tokens and store them on the Organization.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.organizationId) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    const { searchParams } = request.nextUrl
    const code = searchParams.get("code")
    const error = searchParams.get("error")

    if (error) {
      console.error("Google OAuth error:", error)
      return NextResponse.redirect(
        new URL("/settings/reviews?google=error&reason=" + encodeURIComponent(error), request.url),
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/settings/reviews?google=error&reason=no_code", request.url),
      )
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(
        new URL("/settings/reviews?google=error&reason=not_configured", request.url),
      )
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text()
      console.error("Token exchange failed:", tokenError)
      return NextResponse.redirect(
        new URL("/settings/reviews?google=error&reason=token_exchange_failed", request.url),
      )
    }

    const tokens = await tokenResponse.json()

    // Fetch the user's Google Business Profile accounts
    const accountsResponse = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      },
    )

    let accountId: string | null = null
    let locationId: string | null = null
    let placeId: string | null = null

    if (accountsResponse.ok) {
      const accountsData = await accountsResponse.json()
      const account = accountsData.accounts?.[0]

      if (account) {
        // Extract account ID from the resource name (e.g., "accounts/123456")
        accountId = account.name?.replace("accounts/", "") || null

        // Fetch locations for this account
        if (accountId) {
          const locationsResponse = await fetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${account.name}/locations`,
            {
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
              },
            },
          )

          if (locationsResponse.ok) {
            const locationsData = await locationsResponse.json()
            const location = locationsData.locations?.[0]

            if (location) {
              locationId = location.name?.split("/").pop() || null
              // Google Maps place ID for constructing review URLs
              placeId = location.metadata?.placeId || null
            }
          }
        }
      }
    }

    // Store tokens and account info on the Organization
    await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token || null,
        googleTokenExpiry: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        googleAccountId: accountId,
        googleLocationId: locationId,
        googlePlaceId: placeId,
      },
    })

    return NextResponse.redirect(
      new URL("/settings/reviews?google=success", request.url),
    )
  } catch (error) {
    console.error("Google OAuth callback error:", error)
    return NextResponse.redirect(
      new URL("/settings/reviews?google=error&reason=internal_error", request.url),
    )
  }
}
