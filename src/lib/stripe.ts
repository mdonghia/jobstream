import Stripe from "stripe"

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-01-28.clover",
    })
  }
  return stripeInstance
}
