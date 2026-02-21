import { requireAuth } from "@/lib/auth-utils"
import { ReportsPage as ReportsPageClient } from "@/components/reports/reports-page"

export default async function ReportsPage() {
  await requireAuth()

  return <ReportsPageClient />
}
