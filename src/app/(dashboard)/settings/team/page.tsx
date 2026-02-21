import { requireAuth } from "@/lib/auth-utils"
import { getTeamMembers } from "@/actions/settings"
import { TeamMembers } from "@/components/settings/team-members"

export default async function SettingsTeamPage() {
  const user = await requireAuth()
  const result = await getTeamMembers()

  if ("error" in result) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-[#0A2540]">Team Members</h2>
        <p className="mt-2 text-sm text-red-500">{result.error}</p>
      </div>
    )
  }

  return (
    <TeamMembers
      initialMembers={result.members}
      currentUserId={user.id}
      currentUserRole={user.role}
    />
  )
}
