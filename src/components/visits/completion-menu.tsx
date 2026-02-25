"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  FileText,
  ClipboardList,
  CalendarPlus,
  ArrowRight,
  Loader2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { createVisit } from "@/actions/visits"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CompletionMenuProps {
  visitId: string
  jobId: string
  customerId: string
  jobNumber: string
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Add Visit Inline Form
// ---------------------------------------------------------------------------

function AddVisitForm({
  jobId,
  onCreated,
  onCancel,
}: {
  jobId: string
  onCreated: () => void
  onCancel: () => void
}) {
  const [purpose, setPurpose] = useState<
    "DIAGNOSTIC" | "SERVICE" | "FOLLOW_UP" | "MAINTENANCE"
  >("FOLLOW_UP")
  const [schedulingType, setSchedulingType] = useState<
    "SCHEDULED" | "ANYTIME" | "UNSCHEDULED"
  >("UNSCHEDULED")
  const [scheduledStart, setScheduledStart] = useState("")
  const [scheduledEnd, setScheduledEnd] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError("")
    startTransition(async () => {
      const result = await createVisit({
        jobId,
        purpose,
        schedulingType,
        scheduledStart: scheduledStart || undefined,
        scheduledEnd: scheduledEnd || undefined,
        notes: notes || undefined,
      })
      if (result.error) {
        setError(result.error)
      } else {
        onCreated()
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="visit-purpose">Purpose</Label>
        <Select
          value={purpose}
          onValueChange={(v) =>
            setPurpose(v as typeof purpose)
          }
        >
          <SelectTrigger id="visit-purpose" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DIAGNOSTIC">Diagnostic</SelectItem>
            <SelectItem value="SERVICE">Service</SelectItem>
            <SelectItem value="FOLLOW_UP">Follow-up</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="visit-scheduling">Scheduling</Label>
        <Select
          value={schedulingType}
          onValueChange={(v) =>
            setSchedulingType(v as typeof schedulingType)
          }
        >
          <SelectTrigger id="visit-scheduling" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="ANYTIME">Anytime</SelectItem>
            <SelectItem value="UNSCHEDULED">Unscheduled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {schedulingType === "SCHEDULED" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="visit-start">Start</Label>
            <Input
              id="visit-start"
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="visit-end">End</Label>
            <Input
              id="visit-end"
              type="datetime-local"
              value={scheduledEnd}
              onChange={(e) => setScheduledEnd(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="visit-notes">Notes (optional)</Label>
        <Textarea
          id="visit-notes"
          placeholder="Notes for the next visit..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Visit"
          )}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CompletionMenu
// ---------------------------------------------------------------------------

export default function CompletionMenu({
  visitId,
  jobId,
  customerId,
  jobNumber,
  onClose,
}: CompletionMenuProps) {
  const router = useRouter()
  const [showAddVisit, setShowAddVisit] = useState(false)
  const [actionTaken, setActionTaken] = useState(false)

  // After creating an invoice or quote, come back to the menu so the tech can
  // take additional actions. We use router.push which leaves the menu in the
  // React tree until navigation completes, but the new page replaces it. If
  // the tech hits "back" they will land on the pipeline again.
  function handleCreateInvoice() {
    setActionTaken(true)
    router.push(`/invoices/new?jobId=${jobId}`)
  }

  function handleCreateQuote() {
    setActionTaken(true)
    router.push(`/quotes/new?jobId=${jobId}&customerId=${customerId}`)
  }

  function handleVisitCreated() {
    setShowAddVisit(false)
    setActionTaken(true)
    router.refresh()
  }

  function handleMoveOn() {
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Visit Complete</DialogTitle>
          <DialogDescription>
            Job #{jobNumber} -- What would you like to do next?
          </DialogDescription>
        </DialogHeader>

        {showAddVisit ? (
          <AddVisitForm
            jobId={jobId}
            onCreated={handleVisitCreated}
            onCancel={() => setShowAddVisit(false)}
          />
        ) : (
          <div className="grid gap-3">
            <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-3 px-4"
              onClick={handleCreateInvoice}
            >
              <FileText className="size-5 text-blue-600 shrink-0" />
              <div className="text-left">
                <div className="font-medium">Create Invoice</div>
                <div className="text-xs text-muted-foreground">
                  Bill the customer for this job
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-3 px-4"
              onClick={handleCreateQuote}
            >
              <ClipboardList className="size-5 text-emerald-600 shrink-0" />
              <div className="text-left">
                <div className="font-medium">Create Quote</div>
                <div className="text-xs text-muted-foreground">
                  Quote additional work for the customer
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-3 px-4"
              onClick={() => setShowAddVisit(true)}
            >
              <CalendarPlus className="size-5 text-purple-600 shrink-0" />
              <div className="text-left">
                <div className="font-medium">Add Visit</div>
                <div className="text-xs text-muted-foreground">
                  Schedule a follow-up visit on this job
                </div>
              </div>
            </Button>

            <Button
              variant={actionTaken ? "default" : "secondary"}
              className="justify-start gap-3 h-auto py-3 px-4"
              onClick={handleMoveOn}
            >
              <ArrowRight className="size-5 shrink-0" />
              <div className="text-left">
                <div className="font-medium">
                  {actionTaken ? "Done -- Move On" : "Move On"}
                </div>
                <div className="text-xs opacity-70">
                  Continue to your next visit
                </div>
              </div>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
