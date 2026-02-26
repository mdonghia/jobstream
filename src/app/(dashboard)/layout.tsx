import { requireAuth, getOrganization } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth()
  const org = await getOrganization(user.organizationId)

  // Fetch the user's preferredView from the database for dual-role view switching
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { preferredView: true, notificationsEnabled: true },
  })

  return (
    <DashboardShell
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        preferredView: dbUser?.preferredView ?? "admin",
        notificationsEnabled: dbUser?.notificationsEnabled ?? true,
      }}
      orgName={org?.name || "JobStream"}
      marketingSuiteEnabled={org?.marketingSuiteEnabled ?? false}
    >
      {children}
    </DashboardShell>
  )
}
