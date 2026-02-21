import { requireAuth, getOrganization } from "@/lib/auth-utils"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth()
  const org = await getOrganization(user.organizationId)

  return (
    <DashboardShell
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      }}
      orgName={org?.name || "JobStream"}
    >
      {children}
    </DashboardShell>
  )
}
