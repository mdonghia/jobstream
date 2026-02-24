"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { sendPortalLoginCode, verifyPortalCode } from "@/actions/portal"

export default function PortalLoginPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const slug = params.slug

  const [step, setStep] = useState<"email" | "code">("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [codeSent, setCodeSent] = useState(false)

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await sendPortalLoginCode(email.trim(), slug)
      if ("error" in result && result.error) {
        setError(result.error)
      } else {
        setStep("code")
        setCodeSent(true)
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await verifyPortalCode(email.trim(), code.trim(), slug)
      if ("error" in result && result.error) {
        setError(result.error)
      } else if ("sessionToken" in result && result.sessionToken) {
        // Set session cookie
        document.cookie = `portal_session_${slug}=${result.sessionToken}; path=/portal/${slug}; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`
        router.push(`/portal/${slug}/dashboard`)
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-[#0A2540]">
            Customer Portal
          </CardTitle>
          <CardDescription>
            {step === "email"
              ? "Enter your email to receive a login code"
              : `We sent a 6-digit code to ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !email.trim()}
              >
                {loading ? "Sending..." : "Send Code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  required
                  autoFocus
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || code.length !== 6}
              >
                {loading ? "Verifying..." : "Verify Code"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email")
                    setCode("")
                    setError("")
                    setCodeSent(false)
                  }}
                  className="text-sm text-[#635BFF] hover:underline"
                >
                  Use a different email
                </button>
              </div>

              {codeSent && (
                <p className="text-xs text-center text-[#8898AA]">
                  We&apos;ve sent a verification code to your email. It may take up to a minute to arrive. Check your spam folder if you don&apos;t see it. The code expires in 10 minutes.
                </p>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
