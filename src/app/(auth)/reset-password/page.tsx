"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { resetPassword } from "@/actions/auth"

function ResetPasswordForm() {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  if (!token) {
    return (
      <Card className="border-[#E3E8EE]">
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-[#0A2540] text-center mb-2">
            Invalid reset link
          </h2>
          <p className="text-sm text-[#425466] text-center">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Link href="/forgot-password" className="text-sm text-[#635BFF] hover:underline">
            Request new reset link
          </Link>
        </CardFooter>
      </Card>
    )
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError("")
    const result = await resetPassword(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <Card className="border-[#E3E8EE]">
      <form action={handleSubmit}>
        <input type="hidden" name="token" value={token} />
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-[#0A2540] text-center mb-2">
            Set new password
          </h2>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-semibold uppercase text-[#8898AA]">
              New Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Minimum 8 characters"
              className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase text-[#8898AA]">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              placeholder="Confirm your password"
              className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-9 bg-[#635BFF] hover:bg-[#5851ea] text-white"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
          <Link href="/login" className="text-sm text-[#635BFF] hover:underline text-center">
            Back to login
          </Link>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
