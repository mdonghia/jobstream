import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { ProfileForm } from "@/components/settings/profile-form"

export default async function ProfilePage() {
  const user = await requireAuth()

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      avatar: true,
      role: true,
      preferredView: true,
      notificationsEnabled: true,
    },
  })

  if (!dbUser) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-semibold text-[#0A2540]">Profile</h1>
        <p className="mt-2 text-sm text-red-500">User not found.</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold text-[#0A2540]">Profile</h1>
      <p className="mt-1 text-sm text-[#425466]">
        Manage your personal information and password.
      </p>

      <div className="mt-6 max-w-2xl">
        <ProfileForm
          profile={{
            id: dbUser.id,
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            email: dbUser.email,
            phone: dbUser.phone ?? "",
            avatar: dbUser.avatar,
            role: dbUser.role,
            preferredView: dbUser.preferredView ?? "admin",
            notificationsEnabled: dbUser.notificationsEnabled,
          }}
        />
      </div>
    </div>
  )
}
