"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { Loader2, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { submitIssue } from "@/actions/report-issue"

const CATEGORIES = ["Bug", "Feature Request", "Question", "Other"] as const

export function ReportIssueForm() {
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
    } else {
      setPreview(null)
    }
  }

  function clearScreenshot() {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      const result = await submitIssue(formData)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Issue submitted successfully. Thank you for your feedback!")
        formRef.current?.reset()
        setPreview(null)
      }
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#0A2540]">Report an Issue</h2>
      <p className="mt-1 text-sm text-[#425466]">
        Let us know if something isn&apos;t working right or if you have a suggestion.
      </p>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="mt-6 max-w-lg space-y-5"
      >
        {/* Category */}
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-[#0A2540]"
          >
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue="Bug"
            className="mt-1.5 block w-full rounded-lg border border-[#E3E8EE] bg-white px-3 py-2 text-sm text-[#0A2540] shadow-sm focus:border-[#635BFF] focus:outline-none focus:ring-1 focus:ring-[#635BFF]"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-[#0A2540]"
          >
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={5}
            placeholder="Describe what happened, what you expected, and any steps to reproduce the issue..."
            className="mt-1.5 block w-full rounded-lg border border-[#E3E8EE] bg-white px-3 py-2 text-sm text-[#0A2540] shadow-sm placeholder:text-[#8898AA] focus:border-[#635BFF] focus:outline-none focus:ring-1 focus:ring-[#635BFF]"
          />
        </div>

        {/* Page URL */}
        <div>
          <label
            htmlFor="pageUrl"
            className="block text-sm font-medium text-[#0A2540]"
          >
            Page URL{" "}
            <span className="font-normal text-[#8898AA]">(optional)</span>
          </label>
          <input
            id="pageUrl"
            name="pageUrl"
            type="text"
            placeholder="https://jobstream.vercel.app/..."
            className="mt-1.5 block w-full rounded-lg border border-[#E3E8EE] bg-white px-3 py-2 text-sm text-[#0A2540] shadow-sm placeholder:text-[#8898AA] focus:border-[#635BFF] focus:outline-none focus:ring-1 focus:ring-[#635BFF]"
          />
        </div>

        {/* Screenshot */}
        <div>
          <label className="block text-sm font-medium text-[#0A2540]">
            Screenshot{" "}
            <span className="font-normal text-[#8898AA]">(optional)</span>
          </label>

          {preview ? (
            <div className="mt-1.5 relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Screenshot preview"
                className="max-h-48 rounded-lg border border-[#E3E8EE]"
              />
              <button
                type="button"
                onClick={clearScreenshot}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#E3E8EE] bg-[#F6F8FA] px-4 py-8 text-sm text-[#8898AA] transition-colors hover:border-[#635BFF] hover:text-[#635BFF]"
            >
              <Upload className="h-4 w-4" />
              Click to upload a screenshot
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            name="screenshot"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={submitting}
          className="bg-[#635BFF] text-white hover:bg-[#5851ea]"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Issue"
          )}
        </Button>
      </form>
    </div>
  )
}
