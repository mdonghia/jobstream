import { NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"

export async function POST() {
  try {
    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured. Please contact your administrator." },
        { status: 503 }
      )
    }

    const user = await requireAuth()
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { stripeAccountId: true, email: true, name: true },
    })

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      )
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

    // Create account link for onboarding, with stale account recovery
    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/callback`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/callback`,
        type: "account_onboarding",
      })
      return NextResponse.json({ url: accountLink.url })
    } catch (linkError: any) {
      // If the saved account is invalid/deleted on Stripe's side, create a fresh one
      if (linkError?.type === "StripeInvalidRequestError") {
        const newAccount = await stripe.accounts.create({
          type: "standard",
          email: org.email,
          business_profile: { name: org.name },
        })
        accountId = newAccount.id
        await prisma.organization.update({
          where: { id: user.organizationId },
          data: { stripeAccountId: accountId, stripeOnboarded: false },
        })
        const accountLink = await stripe.accountLinks.create({
          account: accountId,
          refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/callback`,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/callback`,
          type: "account_onboarding",
        })
        return NextResponse.json({ url: accountLink.url })
      }
      throw linkError
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("Stripe Connect error:", error)
    const message =
      error?.message || "Failed to start Stripe onboarding. Please try again."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
