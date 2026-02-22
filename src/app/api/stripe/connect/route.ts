import { NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.redirect(
        new URL(
          "/settings/payments?error=stripe_not_configured",
          process.env.NEXT_PUBLIC_APP_URL
        )
      )
    }

    const user = await requireAuth()
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { stripeAccountId: true, email: true, name: true },
    })

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    let accountId = org.stripeAccountId

    // Create a new Stripe Connect account if none exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "standard",
        email: org.email,
        business_profile: { name: org.name },
      })
      accountId = account.id
      await prisma.organization.update({
        where: { id: user.organizationId },
        data: { stripeAccountId: accountId },
      })
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/callback`,
      type: "account_onboarding",
    })

    return NextResponse.redirect(accountLink.url)
  } catch (error: any) {
    console.error("Stripe Connect error:", error)
    return NextResponse.redirect(
      new URL(
        "/settings/payments?error=connect_failed",
        process.env.NEXT_PUBLIC_APP_URL
      )
    )
  }
}
