"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn, formatCurrency } from "@/lib/utils"
import { recordPayment } from "@/actions/invoices"
import { toast } from "sonner"

interface Invoice {
  id: string
  invoiceNumber: string
  total: number
  amountPaid: number
  amountDue: number
}

interface RecordPaymentModalProps {
  invoice: Invoice
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RecordPaymentModal({
  invoice,
  open,
  onOpenChange,
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState(String(invoice.amountDue))
  const [method, setMethod] = useState("CASH")
  const [date, setDate] = useState<Date>(new Date())
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }
    if (parsedAmount > invoice.amountDue) {
      toast.error("Amount exceeds the remaining balance")
      return
    }

    setLoading(true)
    try {
      const result = await recordPayment({
        invoiceId: invoice.id,
        amount: parsedAmount,
        method,
        reference: reference || undefined,
        notes: notes || undefined,
        date: date.toISOString(),
      })

      if ("error" in result) {
        toast.error(result.error)
        return
      }

      toast.success("Payment recorded successfully")
      onOpenChange(false)
      // Force a page refresh to show updated data
      window.location.reload()
    } catch {
      toast.error("Failed to record payment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-[#0A2540]">Record Payment</DialogTitle>
          <DialogDescription className="text-[#8898AA]">
            Record a manual payment for invoice {invoice.invoiceNumber}.
            Remaining balance: {formatCurrency(invoice.amountDue)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="payment-amount" className="text-sm font-medium text-[#425466]">
              Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8898AA] text-sm">
                $
              </span>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={invoice.amountDue}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Method */}
          <div className="space-y-2">
            <Label htmlFor="payment-method" className="text-sm font-medium text-[#425466]">
              Payment Method
            </Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="border-[#E3E8EE]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CHECK">Check</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#425466]">Date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal border-[#E3E8EE]",
                    !date && "text-[#8898AA]"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-[#8898AA]" />
                  {date ? format(date, "MMM d, yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    if (d) setDate(d)
                    setCalendarOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label htmlFor="payment-reference" className="text-sm font-medium text-[#425466]">
              Reference
              <span className="text-[#8898AA] font-normal ml-1">(optional)</span>
            </Label>
            <Input
              id="payment-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g., Check #1234"
              className="border-[#E3E8EE] focus-visible:ring-[#635BFF]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="payment-notes" className="text-sm font-medium text-[#425466]">
              Notes
              <span className="text-[#8898AA] font-normal ml-1">(optional)</span>
            </Label>
            <Textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
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
              disabled={loading}
              className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
            >
              {loading ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
