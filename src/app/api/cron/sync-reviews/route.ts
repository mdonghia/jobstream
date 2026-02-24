import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { fetchAndSyncGoogleReviews } from "@/lib/google-reviews"

/**
 * Cron endpoint to sync Google reviews for all connected organizations.
 * Runs daily at 6:00 AM ET via Vercel Cron.
 *
 * GET /api/cron/sync-reviews
 */
export async function GET(request: NextRequest) {
  // Verify the cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Find all organizations that have a Google Place ID connected
    const orgs = await prisma.organization.findMany({
      where: { googlePlaceId: { not: null } },
      select: { id: true, name: true, googlePlaceId: true },
    })

    if (orgs.length === 0) {
      return NextResponse.json({ message: "No organizations with Google connected", synced: 0 })
    }

    const results: { orgId: string; name: string; status: string; synced?: number }[] = []

    for (const org of orgs) {
      try {
        // Clear the rate limit so the cron can always sync
        await prisma.organization.update({
          where: { id: org.id },
          data: { googleLastSyncAt: null },
        })

        const result = await fetchAndSyncGoogleReviews(org.id)

        if ("error" in result) {
          results.push({ orgId: org.id, name: org.name, status: "error: " + result.error })
        } else if ("skipped" in result) {
          results.push({ orgId: org.id, name: org.name, status: "skipped" })
        } else {
          results.push({ orgId: org.id, name: org.name, status: "ok", synced: result.synced })
        }
      } catch (e) {
        console.error(`Cron sync failed for org ${org.id}:`, e)
        results.push({ orgId: org.id, name: org.name, status: "error" })
      }
    }

    const totalSynced = results.reduce((sum, r) => sum + (r.synced || 0), 0)

    return NextResponse.json({
      message: `Synced reviews for ${orgs.length} organization(s)`,
      totalSynced,
      results,
    })
  } catch (error) {
    console.error("Cron sync-reviews error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
