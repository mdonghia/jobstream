"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { updateJobStatus } from "@/actions/jobs"

// ---- Types ----

interface ChecklistItem {
  id: string
  label: string
  isCompleted: boolean
}

interface CompleteJobModalProps {
  job: {
    id: string
    jobNumber: string
    title: string
    customerId: string
    checklistItems?: ChecklistItem[]
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ---- Component ----

export function CompleteJobModal({
  job,
  open,
  onOpenChange,
}: CompleteJobModalProps) {
  const router = useRouter()
  const [completionNotes, setCompletionNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showInvoicePrompt, setShowInvoicePrompt] = useState(false)

  const checklistItems = job.checklistItems || []
  const incompleteItems = checklistItems.filter((item) => !item.isCompleted)
  const hasIncompleteItems = incompleteItems.length > 0

  async function handleComplete() {
    setSubmitting(true)
    try {
      const result = await updateJobStatus(job.id, "COMPLETED", {
        completionNotes: completionNotes.trim() || undefined,
      })

      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Job completed successfully")
        setShowInvoicePrompt(true)
      }
    } catch {
      toast.error("Failed to complete job")
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setCompletionNotes("")
    setShowInvoicePrompt(false)
    onOpenChange(false)
    router.refresh()
  }

  // After completion: invoice prompt
  if (showInvoicePrompt) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">Job Completed</DialogTitle>
            <DialogDescription className="text-[#425466]">
              {job.jobNumber} - {job.title} has been marked as completed.
              Would you like to create an invoice for this job?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <FileText className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleClose}
              className="border-[#E3E8EE]"
            >
              Not Now
            </Button>
            <Button
              asChild
              className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
            >
              <Link href={`/invoices/new?jobId=${job.id}`}>
                Create Invoice
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#0A2540]">Complete Job</DialogTitle>
          <DialogDescription className="text-[#425466]">
            Mark {job.jobNumber} - {job.title} as completed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Incomplete checklist warning */}
          {hasIncompleteItems && (
            <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Incomplete checklist items
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {incompleteItems.length} of {checklistItems.length} checklist
                  items are not yet completed:
                </p>
                <ul className="mt-1.5 space-y-0.5">
                  {incompleteItems.slice(0, 5).map((item) => (
                    <li
                      key={item.id}
                      className="text-xs text-amber-700 flex items-center gap-1"
                    >
                      <span className="w-1 h-1 rounded-full bg-amber-500" />
                      {item.label}
                    </li>
                  ))}
                  {incompleteItems.length > 5 && (
                    <li className="text-xs text-amber-600">
                      and {incompleteItems.length - 5} more...
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Completion notes */}
          <div className="space-y-1.5">
            <Label className="text-sm text-[#425466]">Completion Notes</Label>
            <Textarea
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Add any notes about the completed job..."
              className="min-h-[100px] border-[#E3E8EE] focus-visible:ring-[#635BFF]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#E3E8EE]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {submitting ? "Completing..." : "Complete Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
