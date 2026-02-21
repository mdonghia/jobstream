import { Suspense } from "react"
import { requireAuth } from "@/lib/auth-utils"
import { PaymentsPage } from "@/components/payments/payments-page"

export default async function PaymentsRoute() {
  await requireAuth()

  // Try to load initial data from server actions (when available)
  let initialPayments: any[] = []
  let initialSummary = undefined

  try {
    const mod = await import("@/actions/payments").catch(() => null)
    if (mod?.getPayments) {
      const result = await mod.getPayments({})
      if (result && !("error" in result)) {
        initialPayments = (result.payments ?? []).map((p: any) => ({
          ...p,
          amount: typeof p.amount === "object" ? Number(p.amount) : p.amount,
          processedAt:
            p.processedAt instanceof Date
              ? p.processedAt.toISOString()
              : p.processedAt,
          createdAt:
            p.createdAt instanceof Date
              ? p.createdAt.toISOString()
              : p.createdAt,
        }))
        if (result.summary) {
          initialSummary = result.summary
        }
      }
    }
  } catch {
    // Server actions not yet available -- render with empty data
  }

  return (
    <Suspense>
      <PaymentsPage
        initialPayments={initialPayments}
        initialSummary={initialSummary}
      />
    </Suspense>
  )
}
