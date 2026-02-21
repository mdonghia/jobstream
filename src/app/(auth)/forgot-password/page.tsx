"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { forgotPassword } from "@/actions/auth"

export default function ForgotPasswordPage() {
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError("")
    const result = await forgotPassword(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="border-[#E3E8EE]">
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-[#0A2540] text-center mb-2">
            Check your email
          </h2>
          <p className="text-sm text-[#425466] text-center">
            If an account exists with that email, we&apos;ve sent a password reset link.
            It will expire in 1 hour.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Link href="/login" className="text-sm text-[#635BFF] hover:underline">
            Back to login
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="border-[#E3E8EE]">
      <form action={handleSubmit}>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-[#0A2540] text-center mb-2">
            Reset your password
          </h2>
          <p className="text-sm text-[#425466] text-center">
            Enter your email and we&apos;ll send you a reset link.
          </p>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-semibold uppercase text-[#8898AA]">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="mike@example.com"
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
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
          <Link href="/login" className="text-sm text-[#635BFF] hover:underline text-center">
            Back to login
          </Link>
        </CardFooter>
      </form>
    </Card>
  )
}
