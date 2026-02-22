"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  MoreHorizontal,
  UserPlus,
  Loader2,
  Shield,
  ShieldCheck,
  Wrench,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getInitials, formatRelativeTime } from "@/lib/utils"
import {
  inviteTeamMember,
  updateTeamMemberRole,
  deactivateTeamMember,
  activateTeamMember,
  getTeamMembers,
} from "@/actions/settings"

// ============================================================================
// Types
// ============================================================================

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  avatar: string | null
  role: string
  color: string | null
  isActive: boolean
  lastLoginAt: Date | string | null
  createdAt: Date | string
}

interface TeamMembersProps {
  initialMembers: TeamMember[]
  currentUserId: string
  currentUserRole: string
}

// ============================================================================
// Role config
// ============================================================================

const ROLE_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  OWNER: {
    label: "Owner",
    color: "text-amber-700",
    bgColor: "bg-amber-50 ring-amber-200",
    icon: ShieldCheck,
  },
  ADMIN: {
    label: "Admin",
    color: "text-[#635BFF]",
    bgColor: "bg-[#635BFF]/10 ring-[#635BFF]/20",
    icon: Shield,
  },
  TECHNICIAN: {
    label: "Technician",
    color: "text-[#425466]",
    bgColor: "bg-gray-100 ring-gray-200",
    icon: Wrench,
  },
}

// ============================================================================
// Component
// ============================================================================

export function TeamMembers({
  initialMembers,
  currentUserId,
  currentUserRole,
}: TeamMembersProps) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviting, setInviting] = useState(false)

  // Invite form state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<string>("TECHNICIAN")
  const [inviteColor, setInviteColor] = useState("#635BFF")

  const canManageTeam =
    currentUserRole === "OWNER" || currentUserRole === "ADMIN"

  // -----------------------------------------------------------------------
  // Refresh members list
  // -----------------------------------------------------------------------

  async function refreshMembers() {
    const result = await getTeamMembers()
    if (!("error" in result)) {
      setMembers(result.members)
    }
  }

  // -----------------------------------------------------------------------
  // Invite
  // -----------------------------------------------------------------------

  async function handleInvite() {
    if (!firstName.trim() || !lastName.trim() || !inviteEmail.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    setInviting(true)
    try {
      const result = await inviteTeamMember({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole as "ADMIN" | "TECHNICIAN",
        color: inviteColor,
      })

      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Team member invited")
        setInviteOpen(false)
        resetInviteForm()
        refreshMembers()
      }
    } catch {
      toast.error("Failed to invite team member")
    } finally {
      setInviting(false)
    }
  }

  function resetInviteForm() {
    setFirstName("")
    setLastName("")
    setInviteEmail("")
    setInviteRole("TECHNICIAN")
    setInviteColor("#635BFF")
  }

  // -----------------------------------------------------------------------
  // Role change
  // -----------------------------------------------------------------------

  async function handleRoleChange(memberId: string, newRole: string) {
    const result = await updateTeamMemberRole(memberId, newRole)
    if ("error" in result) {
      toast.error(result.error)
    } else {
      toast.success("Role updated")
      refreshMembers()
    }
  }

  // -----------------------------------------------------------------------
  // Activate / deactivate
  // -----------------------------------------------------------------------

  async function handleToggleActive(memberId: string, isActive: boolean) {
    const result = isActive
      ? await deactivateTeamMember(memberId)
      : await activateTeamMember(memberId)

    if ("error" in result) {
      toast.error(result.error)
    } else {
      toast.success(isActive ? "Team member deactivated" : "Team member activated")
      refreshMembers()
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#0A2540]">
            Team Members
          </h2>
          <p className="mt-1 text-sm text-[#425466]">
            {members.length} member{members.length !== 1 ? "s" : ""} in your
            organization.
          </p>
        </div>
        {canManageTeam && (
          <Button
            onClick={() => setInviteOpen(true)}
            className="bg-[#635BFF] hover:bg-[#5851ea] text-white flex-shrink-0"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Team Member
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-lg border border-[#E3E8EE] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E3E8EE] bg-[#F6F8FA]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Last Login
                </th>
                {canManageTeam && (
                  <th className="px-4 py-3 w-10"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.TECHNICIAN
                const isCurrentUser = member.id === currentUserId

                return (
                  <tr
                    key={member.id}
                    className="border-b border-[#E3E8EE] last:border-b-0"
                  >
                    {/* Avatar + Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          {member.avatar ? (
                            <AvatarImage
                              src={member.avatar}
                              alt={`${member.firstName} ${member.lastName}`}
                            />
                          ) : null}
                          <AvatarFallback
                            style={{
                              backgroundColor: member.color || "#635BFF",
                              color: "white",
                            }}
                          >
                            {getInitials(member.firstName, member.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-[#0A2540]">
                            {member.firstName} {member.lastName}
                            {isCurrentUser && (
                              <span className="ml-1.5 text-xs text-[#8898AA]">
                                (you)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-sm text-[#425466]">
                      {member.email}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${roleConfig.bgColor} ${roleConfig.color}`}
                      >
                        <roleConfig.icon className="h-3 w-3" />
                        {roleConfig.label}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {member.isActive ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-50 text-green-700 ring-1 ring-inset ring-green-200"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-200"
                        >
                          Inactive
                        </Badge>
                      )}
                    </td>

                    {/* Last Login */}
                    <td className="px-4 py-3 text-sm text-[#425466]">
                      {member.lastLoginAt
                        ? formatRelativeTime(member.lastLoginAt)
                        : "Never"}
                    </td>

                    {/* Actions */}
                    {canManageTeam && (
                      <td className="px-4 py-3">
                        {!isCurrentUser && member.role !== "OWNER" ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="More actions"
                              >
                                <MoreHorizontal className="h-4 w-4 text-[#8898AA]" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleRoleChange(
                                    member.id,
                                    member.role === "ADMIN"
                                      ? "TECHNICIAN"
                                      : "ADMIN"
                                  )
                                }
                              >
                                {member.role === "ADMIN"
                                  ? "Change to Technician"
                                  : "Change to Admin"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  handleToggleActive(member.id, member.isActive)
                                }
                                className={
                                  member.isActive
                                    ? "text-red-600 focus:text-red-600"
                                    : ""
                                }
                              >
                                {member.isActive ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* Invite Dialog */}
      {/* --------------------------------------------------------------------- */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open)
          if (!open) resetInviteForm()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">
              Invite Team Member
            </DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization. They will receive an
              email with a link to set their password.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                  First Name *
                </Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                  Last Name *
                </Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                Email *
              </Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="john@example.com"
                className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                Role
              </Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="h-10 w-full border-[#E3E8EE] focus-visible:ring-[#635BFF]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="TECHNICIAN">Technician</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                Calendar Color
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={inviteColor}
                  onChange={(e) => setInviteColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-[#E3E8EE] p-1"
                />
                <Input
                  value={inviteColor}
                  onChange={(e) => setInviteColor(e.target.value)}
                  placeholder="#635BFF"
                  className="h-10 flex-1 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInviteOpen(false)}
              className="border-[#E3E8EE]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviting}
              className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
            >
              {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
