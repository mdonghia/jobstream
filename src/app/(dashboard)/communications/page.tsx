import { Suspense } from "react"
import { requireAuth } from "@/lib/auth-utils"
import { CommunicationsPage } from "@/components/communications/communications-page"

export default async function CommunicationsRoute() {
  await requireAuth()

  // Try to load initial data from server actions (when available)
  let initialCommunications: any[] = []

  try {
    const mod = await import("@/actions/communications").catch(() => null)
    if (mod?.getCommunications) {
      const result = await mod.getCommunications({})
      if (result && !("error" in result)) {
        initialCommunications = (result.communications ?? []).map(
          (c: any) => ({
            ...c,
            customerName:
              c.customer
                ? `${c.customer.firstName} ${c.customer.lastName}`
                : null,
            createdAt:
              c.createdAt instanceof Date
                ? c.createdAt.toISOString()
                : c.createdAt,
          })
        )
      }
    }
  } catch {
    // Server actions not yet available -- render with empty data
  }

  return (
    <Suspense>
      <CommunicationsPage
        initialCommunications={initialCommunications}
      />
    </Suspense>
  )
}
