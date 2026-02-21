"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from "lucide-react"
import { register } from "@/actions/auth"

export default function RegisterPage() {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError("")
    const result = await register(formData)
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
            Create your account
          </h2>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-xs font-semibold uppercase text-[#8898AA]">
                First Name
              </Label>
              <Input
                id="firstName"
                name="firstName"
                required
                placeholder="Mike"
                className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-xs font-semibold uppercase text-[#8898AA]">
                Last Name
              </Label>
              <Input
                id="lastName"
                name="lastName"
                required
                placeholder="Smith"
                className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              />
            </div>
          </div>

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
            <Label htmlFor="password" className="text-xs font-semibold uppercase text-[#8898AA]">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                placeholder="Minimum 8 characters"
                className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF] pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8898AA] hover:text-[#425466]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessName" className="text-xs font-semibold uppercase text-[#8898AA]">
              Business Name
            </Label>
            <Input
              id="businessName"
              name="businessName"
              required
              placeholder="Mike's Plumbing"
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
            {loading ? "Creating account..." : "Create Account"}
          </Button>
          <p className="text-sm text-[#8898AA] text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-[#635BFF] hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
