"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { login } from "@/actions/auth"

function LoginForm() {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const resetSuccess = searchParams.get("reset") === "success"

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError("")
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <Card className="border-[#E3E8EE]">
      <form action={handleSubmit}>
        <CardContent className="pt-6 space-y-4">
          <h2 className="text-xl font-semibold text-[#0A2540] text-center mb-2">
            Welcome back
          </h2>

          {resetSuccess && (
            <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md border border-green-200">
              Password reset successfully. Please log in with your new password.
            </div>
          )}

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

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="password" className="text-xs font-semibold uppercase text-[#8898AA]">
                Password
              </Label>
              <Link href="/forgot-password" className="text-xs text-[#635BFF] hover:underline">
                Forgot your password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Enter your password"
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
            {loading ? "Signing in..." : "Sign In"}
          </Button>
          <p className="text-sm text-[#8898AA] text-center">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[#635BFF] hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
