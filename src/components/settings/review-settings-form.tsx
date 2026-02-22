"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { updateReviewSettings } from "@/actions/settings"

// ============================================================================
// Types
// ============================================================================

interface ReviewSettingsFormProps {
  settings: {
    name: string
    reviewGoogleUrl: string | null
    reviewYelpUrl: string | null
    reviewFacebookUrl: string | null
    reviewAutoRequest: boolean
    reviewRequestDelay: number
  }
}

// ============================================================================
// Component
// ============================================================================

export function ReviewSettingsForm({ settings }: ReviewSettingsFormProps) {
  const [saving, setSaving] = useState(false)

  // Review platform URLs
  const [googleUrl, setGoogleUrl] = useState(settings.reviewGoogleUrl || "")
  const [yelpUrl, setYelpUrl] = useState(settings.reviewYelpUrl || "")
  const [facebookUrl, setFacebookUrl] = useState(
    settings.reviewFacebookUrl || ""
  )

  // Auto-request settings
  const [autoRequest, setAutoRequest] = useState(settings.reviewAutoRequest)
  const [requestDelay, setRequestDelay] = useState(
    String(settings.reviewRequestDelay)
  )

  const orgName = settings.name

  // -----------------------------------------------------------------------
  // Save
  // -----------------------------------------------------------------------

  async function handleSave() {
    setSaving(true)
    try {
      const result = await updateReviewSettings({
        reviewGoogleUrl: googleUrl.trim() || null,
        reviewYelpUrl: yelpUrl.trim() || null,
        reviewFacebookUrl: facebookUrl.trim() || null,
        reviewAutoRequest: autoRequest,
        reviewRequestDelay: Number(requestDelay) || 24,
      })
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Settings saved")
      }
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  // -----------------------------------------------------------------------
  // Shared styles
  // -----------------------------------------------------------------------

  const labelClass = "text-xs font-semibold uppercase text-[#8898AA]"
  const inputClass = "h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"

  // -----------------------------------------------------------------------
  // Which review links are configured?
  // -----------------------------------------------------------------------

  const hasAnyReviewLink =
    googleUrl.trim() || yelpUrl.trim() || facebookUrl.trim()

  return (
    <div className="space-y-8">
      {/* ----------------------------------------------------------------- */}
      {/* Review Platforms */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Review Platforms
        </h2>
        <p className="mt-1 text-sm text-[#425466]">
          Add your review page URLs so customers can leave reviews on the
          platforms you prefer.
        </p>

        <div className="mt-4 space-y-4">
          {/* Google */}
          <div className="space-y-1.5">
            <Label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google Reviews
              </span>
            </Label>
            <Input
              type="url"
              value={googleUrl}
              onChange={(e) => setGoogleUrl(e.target.value)}
              placeholder="https://search.google.com/local/writereview?placeid=..."
              className={inputClass}
            />
          </div>

          {/* Yelp */}
          <div className="space-y-1.5">
            <Label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="#FF1A1A"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12.81 10.99c-.27-.57-.02-1 .47-1.27l4.11-1.92c.49-.22 1-.09 1.24.36.23.44.08.96-.42 1.19l-4.11 1.92c-.48.24-1.02.29-1.29-.28zm-.81 2.6c-.06.62.26 1.01.83 1.1l4.47.54c.53.07 1-.21 1.08-.69.09-.48-.25-.97-.77-1.04l-4.47-.54c-.58-.06-1.08.01-1.14.63zm-1.16-2.3c.55-.28.72-.85.49-1.49L9.12 5.1c-.22-.58-.73-.82-1.24-.56-.51.26-.68.84-.46 1.42l2.21 4.7c.24.63.66.9 1.21.63zm-1.02 3.53c-.17-.6-.64-.82-1.2-.68L4.2 15.33c-.52.15-.78.6-.61 1.09.17.49.66.74 1.18.6l4.42-1.19c.57-.15.8-.42.63-1.01zm1.6 1.33c-.63-.07-1.02.25-1.15.85l-1.03 4.44c-.12.54.15 1.03.64 1.14.49.11.99-.2 1.11-.73l1.03-4.44c.13-.6-.03-1.2-.6-1.26z" />
                </svg>
                Yelp Reviews
              </span>
            </Label>
            <Input
              type="url"
              value={yelpUrl}
              onChange={(e) => setYelpUrl(e.target.value)}
              placeholder="https://www.yelp.com/writeareview/biz/..."
              className={inputClass}
            />
          </div>

          {/* Facebook */}
          <div className="space-y-1.5">
            <Label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="#1877F2"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook Reviews
              </span>
            </Label>
            <Input
              type="url"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              placeholder="https://www.facebook.com/yourbusiness/reviews"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Automatic Review Requests */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-[#E3E8EE] pt-8">
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Automatic Review Requests
        </h2>
        <p className="mt-1 text-sm text-[#425466]">
          Automatically send review request emails to customers after jobs are
          marked complete.
        </p>

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-[#E3E8EE] p-4">
            <div>
              <Label className={labelClass}>
                Enable Automatic Review Requests
              </Label>
              <p className="mt-1 text-sm text-[#425466]">
                Send review request emails automatically when jobs are completed.
              </p>
            </div>
            <Switch
              checked={autoRequest}
              onCheckedChange={setAutoRequest}
              aria-label="Enable automatic review requests"
            />
          </div>

          {autoRequest && (
            <div className="max-w-xs space-y-1.5">
              <Label className={labelClass}>
                Delay After Job Completion (hours)
              </Label>
              <Input
                type="number"
                min="1"
                max="168"
                value={requestDelay}
                onChange={(e) => setRequestDelay(e.target.value)}
                className={inputClass}
                aria-label="Delay in hours"
              />
              <p className="text-xs text-[#8898AA]">
                How many hours after a job is completed before sending the review
                request.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Review Request Preview */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-[#E3E8EE] pt-8">
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Review Request Preview
        </h2>
        <p className="mt-1 text-sm text-[#425466]">
          A preview of the review request email your customers will receive.
        </p>

        <div className="mt-4 overflow-hidden rounded-lg border border-[#E3E8EE]">
          {/* Email preview */}
          <div className="bg-[#F6F8FA] px-6 py-4">
            <p className="text-xs font-medium text-[#8898AA]">
              EMAIL PREVIEW
            </p>
          </div>
          <div className="bg-white p-6 sm:p-8">
            <div className="mx-auto max-w-md text-center">
              <h3 className="text-xl font-semibold text-[#0A2540]">
                How was your experience with {orgName}?
              </h3>
              <p className="mt-3 text-sm text-[#425466]">
                Thank you for choosing {orgName}! We would love to hear about
                your experience. Your feedback helps us improve and helps other
                customers find us.
              </p>

              {/* Star rating display */}
              <div className="mt-6 flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="h-8 w-8 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>

              {/* Review links */}
              <div className="mt-6 space-y-2">
                {googleUrl.trim() && (
                  <div className="rounded-lg border border-[#E3E8EE] p-3 text-sm text-[#635BFF]">
                    Leave a review on Google
                  </div>
                )}
                {yelpUrl.trim() && (
                  <div className="rounded-lg border border-[#E3E8EE] p-3 text-sm text-[#635BFF]">
                    Leave a review on Yelp
                  </div>
                )}
                {facebookUrl.trim() && (
                  <div className="rounded-lg border border-[#E3E8EE] p-3 text-sm text-[#635BFF]">
                    Leave a review on Facebook
                  </div>
                )}
                {!hasAnyReviewLink && (
                  <p className="text-sm text-[#8898AA] italic">
                    Add review platform URLs above to see links here.
                  </p>
                )}
              </div>

              <p className="mt-6 text-xs text-[#8898AA]">
                Sent from {orgName} via JobStream
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Save Button */}
      {/* ----------------------------------------------------------------- */}
      <div className="border-t border-[#E3E8EE] pt-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  )
}
