"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils"
import { adjustInvoiceTotal } from "@/actions/invoices"
import { toast } from "sonner"

interface Invoice {
  id: string
  invoiceNumber: string
  total: number
  amountPaid: number
  amountDue: number
}

interface AdjustTotalModalProps {
  invoice: Invoice
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AdjustTotalModal({
  invoice,
  open,
  onOpenChange,
}: AdjustTotalModalProps) {
  const [newTotal, setNewTotal] = useState(String(invoice.total))
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)

  const parsedTotal = parseFloat(newTotal)
  const isValid = !isNaN(parsedTotal) && parsedTotal >= 0 && parsedTotal >= invoice.amountPaid
  const newAmountDue = isValid ? parsedTotal - invoice.amountPaid : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (isNaN(parsedTotal) || parsedTotal < 0) {
      toast.error("Please enter a valid amount")
      return
    }
    if (parsedTotal < invoice.amountPaid) {
      toast.error(
        `New total cannot be less than amount already paid (${formatCurrency(invoice.amountPaid)})`
      )
      return
    }

    setLoading(true)
    try {
      const result = await adjustInvoiceTotal({
        invoiceId: invoice.id,
        newTotal: parsedTotal,
        reason: reason || undefined,
      })

      if ("error" in result) {
        toast.error(result.error)
        return
      }

      toast.success("Invoice total adjusted successfully")
      onOpenChange(false)
      window.location.reload()
    } catch {
      toast.error("Failed to adjust invoice total")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-[#0A2540]">Adjust Invoice Total</DialogTitle>
          <DialogDescription className="text-[#8898AA]">
            Adjust the total for invoice {invoice.invoiceNumber}. This is useful
            when you and a customer agree on a different amount.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Current Summary */}
          <div className="rounded-md border border-[#E3E8EE] bg-[#F6F8FA] p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-[#8898AA]">Current Total</span>
              <span className="font-medium text-[#0A2540]">
                {formatCurrency(invoice.total)}
              </span>
            </div>
            {invoice.amountPaid > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[#8898AA]">Amount Paid</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(invoice.amountPaid)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-[#8898AA]">Current Balance Due</span>
              <span className="font-medium text-[#0A2540]">
                {formatCurrency(invoice.amountDue)}
              </span>
            </div>
          </div>

          {/* New Total */}
          <div className="space-y-2">
            <Label htmlFor="new-total" className="text-sm font-medium text-[#425466]">
              New Total
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8898AA] text-sm">
                $
              </span>
              <Input
                id="new-total"
                type="number"
                step="0.01"
                min={invoice.amountPaid}
                value={newTotal}
                onChange={(e) => setNewTotal(e.target.value)}
                className="pl-7 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                placeholder="0.00"
              />
            </div>
            {invoice.amountPaid > 0 && (
              <p className="text-xs text-[#8898AA]">
                Minimum: {formatCurrency(invoice.amountPaid)} (amount already paid)
              </p>
            )}
          </div>

          {/* New Balance Due Preview */}
          {isValid && newAmountDue !== null && (
            <div className="rounded-md border border-[#E3E8EE] bg-[#F6F8FA] p-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#8898AA]">New Balance Due</span>
                <span
                  className={`font-semibold ${
                    newAmountDue <= 0 ? "text-green-600" : "text-[#0A2540]"
                  }`}
                >
                  {newAmountDue <= 0 ? "Paid in Full" : formatCurrency(newAmountDue)}
                </span>
              </div>
              {newAmountDue <= 0 && (
                <p className="text-xs text-green-600 mt-1">
                  This invoice will be marked as paid.
                </p>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="adjust-reason" className="text-sm font-medium text-[#425466]">
              Reason
              <span className="text-[#8898AA] font-normal ml-1">(optional)</span>
            </Label>
            <Textarea
              id="adjust-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Customer agreed to reduced amount"
              rows={2}
              className="border-[#E3E8EE] focus-visible:ring-[#635BFF] resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[#E3E8EE] text-[#425466]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !isValid}
              className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
            >
              {loading ? "Saving..." : "Adjust Total"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
