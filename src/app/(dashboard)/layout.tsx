import { requireAuth } from "@/lib/auth-utils"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth()

  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      {/* Sidebar and topbar will be added in Phase 2 */}
      <main>{children}</main>
    </div>
  )
}
