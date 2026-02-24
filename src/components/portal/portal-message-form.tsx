"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { sendPortalMessage } from "@/actions/portal"

interface PortalMessageFormProps {
  customerId: string
  orgId: string
}

export function PortalMessageForm({ customerId, orgId }: PortalMessageFormProps) {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return

    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      const result = await sendPortalMessage(customerId, orgId, content)
      if ("error" in result && result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setContent("")
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch {
      setError("Failed to send message. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        placeholder="Type your message here..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="resize-none"
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600">Message sent successfully!</p>
      )}
      <Button
        type="submit"
        disabled={loading || !content.trim()}
        size="sm"
      >
        {loading ? "Sending..." : "Send Message"}
      </Button>
    </form>
  )
}
