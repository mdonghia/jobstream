import { requireAuth } from "@/lib/auth-utils"
import { getAllTags, getTagUsageCounts } from "@/actions/customers"
import { CustomerTagsManager } from "@/components/settings/customer-tags-manager"

export default async function SettingsCustomerTagsPage() {
  await requireAuth()

  const [tagsResult, countsResult] = await Promise.all([
    getAllTags(),
    getTagUsageCounts(),
  ])

  const tags = Array.isArray(tagsResult) ? tagsResult : []
  const counts =
    countsResult && "counts" in countsResult ? (countsResult.counts ?? {}) : {}

  return <CustomerTagsManager initialTags={tags} initialCounts={counts} />
}
