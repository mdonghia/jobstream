"use client"

import { format, parseISO } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { MoveConfirmation } from "./calendar-types"

interface MoveConfirmationDialogProps {
  move: MoveConfirmation | null
  onConfirm: (sendNotification: boolean) => void
  onCancel: () => void
}

export function MoveConfirmationDialog({
  move,
  onConfirm,
  onCancel,
}: MoveConfirmationDialogProps) {
  if (!move) return null

  const customerName = `${move.visit.job.customer.firstName} ${move.visit.job.customer.lastName}`
  const jobTitle = move.visit.job.title

  const oldDateStr = format(parseISO(move.oldDate), "EEEE, MMM d")
  const newDateStr = format(parseISO(move.newDate), "EEEE, MMM d")

  const timeStr = move.visit.scheduledStart
    ? format(parseISO(move.visit.scheduledStart), "h:mm a")
    : "Anytime"

  // Build description of what changed
  let changeDescription = ""
  if (move.isDateChange && move.isPersonChange) {
    changeDescription = `Moved ${customerName}'s ${jobTitle} visit from ${move.oldMemberName || "Unassigned"} on ${oldDateStr} to ${move.newMemberName || "Unassigned"} on ${newDateStr} at ${timeStr}.`
  } else if (move.isDateChange) {
    changeDescription = `Moved ${customerName}'s ${jobTitle} visit from ${oldDateStr} to ${newDateStr} at ${timeStr}.`
  }

  return (
    <Dialog open={!!move} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-[#0A2540]">Visit Moved</DialogTitle>
          <DialogDescription className="text-[#425466]">
            {changeDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="py-3">
          <p className="text-sm text-[#0A2540] font-medium">
            Would you like to send a notification to the customer?
          </p>
          <p className="text-xs text-[#8898AA] mt-1">
            {customerName} will receive an email with the updated appointment details.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onConfirm(false)}
            className="border-[#E3E8EE] text-[#425466]"
          >
            No, don&apos;t notify
          </Button>
          <Button
            size="sm"
            onClick={() => onConfirm(true)}
            className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
          >
            Yes, send notification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
