import { requireAuth } from "@/lib/auth-utils"

export default async function ProfilePage() {
  await requireAuth()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-[#0A2540]">Profile</h1>
      <p className="mt-2 text-[#425466]">
        Edit your profile settings here.
      </p>
    </div>
  )
}
