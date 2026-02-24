"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updatePortalProfile } from "@/actions/portal"

interface PortalProfileFormProps {
  customerId: string
  initialData: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
}

export function PortalProfileForm({ customerId, initialData }: PortalProfileFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      const result = await updatePortalProfile(customerId, formData)
      if ("error" in result && result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        router.refresh()
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch {
      setError("Failed to update profile. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-600 bg-green-50 rounded-md px-3 py-2">
          Profile updated successfully!
        </p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  )
}
