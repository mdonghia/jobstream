"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Mail, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import { sendQuote } from "@/actions/quotes"

// ── Types ──────────────────────────────────────────────────────────────────

interface QuoteForSend {
  id: string
  quoteNumber: string
  total: number
  customer: {
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
  }
}

interface QuoteSendModalProps {
  quote: QuoteForSend
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ── Component ──────────────────────────────────────────────────────────────

export function QuoteSendModal({ quote, open, onOpenChange }: QuoteSendModalProps) {
  const router = useRouter()
  const [sendEmail, setSendEmail] = useState(!!quote.customer.email)
  const [sendSms, setSendSms] = useState(!!quote.customer.phone)
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!sendEmail && !sendSms) {
      toast.error("Please select at least one delivery method")
      return
    }

    setSending(true)
    const result = await sendQuote(quote.id, {
      email: sendEmail,
      sms: sendSms,
    })

    if ("error" in result) {
      toast.error(result.error as string)
      setSending(false)
      return
    }

    // Show delivery results
    if (result.errors && result.errors.length > 0) {
      const warnings = result.errors.join(". ")
      toast.warning(`Quote status updated to Sent, but delivery had issues: ${warnings}`)
    } else {
      toast.success("Quote sent successfully")
    }
    setSending(false)
    onOpenChange(false)
    router.refresh()
  }

  const customerName = `${quote.customer.firstName} ${quote.customer.lastName}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-[#0A2540]">Send Quote</DialogTitle>
          <DialogDescription className="text-[#425466]">
            Send <span className="font-mono font-medium text-[#635BFF]">{quote.quoteNumber}</span>{" "}
            to {customerName} for{" "}
            <span className="font-semibold text-[#0A2540]">{formatCurrency(quote.total)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email checkbox */}
          <div className="flex items-center space-x-3">
            <Checkbox
              id="send-email"
              checked={sendEmail}
              onCheckedChange={(checked) => setSendEmail(!!checked)}
              disabled={!quote.customer.email}
            />
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#8898AA]" />
              <Label
                htmlFor="send-email"
                className={`text-sm ${!quote.customer.email ? "text-[#8898AA]" : "text-[#425466]"}`}
              >
                Email
                {quote.customer.email ? (
                  <span className="ml-1 text-xs text-[#8898AA]">
                    ({quote.customer.email})
                  </span>
                ) : (
                  <span className="ml-1 text-xs text-[#8898AA]">
                    (no email on file)
                  </span>
                )}
              </Label>
            </div>
          </div>

          {/* SMS checkbox */}
          <div className="flex items-center space-x-3">
            <Checkbox
              id="send-sms"
              checked={sendSms}
              onCheckedChange={(checked) => setSendSms(!!checked)}
              disabled={!quote.customer.phone}
            />
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#8898AA]" />
              <Label
                htmlFor="send-sms"
                className={`text-sm ${!quote.customer.phone ? "text-[#8898AA]" : "text-[#425466]"}`}
              >
                SMS
                {quote.customer.phone ? (
                  <span className="ml-1 text-xs text-[#8898AA]">
                    ({quote.customer.phone})
                  </span>
                ) : (
                  <span className="ml-1 text-xs text-[#8898AA]">
                    (no phone on file)
                  </span>
                )}
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
            className="border-[#E3E8EE] text-[#425466]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || (!sendEmail && !sendSms)}
            className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
          >
            {sending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
