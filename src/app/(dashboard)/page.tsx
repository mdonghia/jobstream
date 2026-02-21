import { requireAuth } from "@/lib/auth-utils"

export default async function DashboardPage() {
  const user = await requireAuth()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-[#0A2540]">
        Welcome, {user.firstName}!
      </h1>
      <p className="text-[#425466] mt-2">
        Your dashboard is being built. Check back soon.
      </p>
    </div>
  )
}
