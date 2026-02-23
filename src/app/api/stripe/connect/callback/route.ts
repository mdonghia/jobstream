import { NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.redirect(
        new URL("/settings/payments", process.env.NEXT_PUBLIC_APP_URL!)
      )
    }

    const user = await requireAuth()
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { stripeAccountId: true },
    })

    if (!org?.stripeAccountId) {
      return NextResponse.redirect(
        new URL("/settings/payments", process.env.NEXT_PUBLIC_APP_URL!)
      )
    }

    // Verify the account is fully onboarded
    const account = await stripe.accounts.retrieve(org.stripeAccountId)
    const isOnboarded = !!(account.charges_enabled && account.payouts_enabled)

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: { stripeOnboarded: isOnboarded },
    })

    return NextResponse.redirect(
      new URL(
        `/settings/payments?connected=${isOnboarded}`,
        process.env.NEXT_PUBLIC_APP_URL!
      )
    )
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("Stripe Connect callback error:", error)
    return NextResponse.redirect(
      new URL("/settings/payments", process.env.NEXT_PUBLIC_APP_URL!)
    )
  }
}
