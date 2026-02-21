"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateProfile, changePassword } from "@/actions/settings"

// ============================================================================
// Types
// ============================================================================

interface ProfileData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  avatar: string | null
  role: string
}

interface ProfileFormProps {
  profile: ProfileData
}

// ============================================================================
// Component
// ============================================================================

export function ProfileForm({ profile }: ProfileFormProps) {
  // Profile fields
  const [firstName, setFirstName] = useState(profile.firstName)
  const [lastName, setLastName] = useState(profile.lastName)
  const [email, setEmail] = useState(profile.email)
  const [phone, setPhone] = useState(profile.phone || "")
  const [savingProfile, setSavingProfile] = useState(false)

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  // Shared style classes
  const labelClass = "text-xs font-semibold uppercase text-[#8898AA]"
  const inputClass = "h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"

  // -----------------------------------------------------------------------
  // Save Profile
  // -----------------------------------------------------------------------

  async function handleSaveProfile() {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("First name, last name, and email are required")
      return
    }

    setSavingProfile(true)
    try {
      const result = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
      })

      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Profile saved")
      }
    } catch {
      toast.error("Failed to save profile")
    } finally {
      setSavingProfile(false)
    }
  }

  // -----------------------------------------------------------------------
  // Change Password
  // -----------------------------------------------------------------------

  async function handleChangePassword() {
    if (!currentPassword) {
      toast.error("Current password is required")
      return
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setSavingPassword(true)
    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      })

      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Password updated")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }
    } catch {
      toast.error("Failed to change password")
    } finally {
      setSavingPassword(false)
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-8">
      {/* ----------------------------------------------------------------- */}
      {/* Personal Information */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Personal Information
        </h2>
        <p className="mt-1 text-sm text-[#425466]">
          Update your name, email, and phone number.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className={labelClass}>First Name *</Label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
              className={inputClass}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Last Name *</Label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              className={inputClass}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className={inputClass}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Phone</Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-6">
          <Button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
          >
            {savingProfile && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Profile
          </Button>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Change Password */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-[#E3E8EE] pt-8">
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Change Password
        </h2>
        <p className="mt-1 text-sm text-[#425466]">
          Update your password to keep your account secure.
        </p>

        <div className="mt-4 grid gap-4 max-w-sm">
          <div className="space-y-1.5">
            <Label className={labelClass}>Current Password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 8 chars)"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-6">
          <Button
            onClick={handleChangePassword}
            disabled={savingPassword}
            variant="outline"
            className="border-[#E3E8EE]"
          >
            {savingPassword && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Update Password
          </Button>
        </div>
      </section>
    </div>
  )
}
