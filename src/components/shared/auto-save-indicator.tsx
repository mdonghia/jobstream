"use client"

import { Loader2, Check, AlertCircle } from "lucide-react"

type AutoSaveStatus = "idle" | "saving" | "saved" | "error"

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus
  className?: string
}

/**
 * A subtle inline indicator that shows the current auto-save status.
 * Renders nothing when idle (no changes pending).
 */
export function AutoSaveIndicator({ status, className = "" }: AutoSaveIndicatorProps) {
  if (status === "idle") return null

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-normal transition-opacity duration-300 ${className}`}
    >
      {status === "saving" && (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-[#8898AA]" />
          <span className="text-[#8898AA]">Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="w-3 h-3 text-green-600" />
          <span className="text-green-600">Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="w-3 h-3 text-red-500" />
          <span className="text-red-500">Save failed</span>
        </>
      )}
    </span>
  )
}
