import { Suspense } from "react"
import { requireAuth } from "@/lib/auth-utils"
import { getCustomers, getAllTags } from "@/actions/customers"
import { CustomerList } from "@/components/customers/customer-list"

export default async function CustomersPage() {
  await requireAuth()

  const [customersResult, tags] = await Promise.all([
    getCustomers({ status: "active", page: 1, perPage: 25 }),
    getAllTags(),
  ])

  const customers = "error" in customersResult ? [] : customersResult.customers
  const total = "error" in customersResult ? 0 : customersResult.total
  const page = "error" in customersResult ? 1 : customersResult.page
  const totalPages = "error" in customersResult ? 0 : customersResult.totalPages

  return (
    <Suspense>
      <CustomerList
        initialCustomers={customers as any}
        initialTotal={total}
        initialPage={page}
        initialTotalPages={totalPages}
        initialTags={Array.isArray(tags) ? tags : []}
      />
    </Suspense>
  )
}
