"use client"

import { useState } from "react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  Clock,
  Download,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { approveQuote, declineQuote } from "@/actions/quotes"

interface LineItem {
  id: string
  name: string
  description: string | null
  quantity: number
  unitPrice: number
  total: number
}

interface QuoteData {
  id: string
  quoteNumber: string
  status: string
  createdAt: string
  validUntil: string
  subtotal: number
  taxAmount: number
  total: number
  customerMessage: string | null
  accessToken: string
  approvedAt: string | null
  declinedAt: string | null
  declineReason: string | null
  lineItems: LineItem[]
  customer: {
    firstName: string
    lastName: string
    email: string
    phone: string | null
  }
  organization: {
    name: string
    email: string
    phone: string | null
    logo: string | null
    slug: string
  }
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  DRAFT: {
    label: "Draft",
    color: "bg-gray-100 text-gray-700",
    icon: <Clock className="w-4 h-4" />,
  },
  SENT: {
    label: "Awaiting Response",
    color: "bg-blue-100 text-blue-700",
    icon: <Clock className="w-4 h-4" />,
  },
  APPROVED: {
    label: "Approved",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  DECLINED: {
    label: "Declined",
    color: "bg-red-100 text-red-700",
    icon: <XCircle className="w-4 h-4" />,
  },
  CONVERTED: {
    label: "Converted to Job",
    color: "bg-purple-100 text-purple-700",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  EXPIRED: {
    label: "Expired",
    color: "bg-gray-100 text-gray-500",
    icon: <AlertCircle className="w-4 h-4" />,
  },
}

export function QuotePortalView({ quote }: { quote: QuoteData }) {
  const router = useRouter()
  const [approving, setApproving] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [showDeclineForm, setShowDeclineForm] = useState(false)
  const [declineReason, setDeclineReason] = useState("")

  const status = STATUS_CONFIG[quote.status] || STATUS_CONFIG.SENT
  const isExpired = new Date(quote.validUntil) < new Date()
  const canRespond = quote.status === "SENT" && !isExpired

  async function handleApprove() {
    setApproving(true)
    try {
      const result = await approveQuote(quote.accessToken)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Quote approved!")
        router.refresh()
      }
    } catch {
      toast.error("Failed to approve quote")
    } finally {
      setApproving(false)
    }
  }

  async function handleDecline() {
    setDeclining(true)
    try {
      const result = await declineQuote(quote.accessToken, declineReason || undefined)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Quote declined")
        router.refresh()
      }
    } catch {
      toast.error("Failed to decline quote")
    } finally {
      setDeclining(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Banners */}
      {quote.status === "APPROVED" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800">
              You approved this quote
              {quote.approvedAt &&
                ` on ${format(new Date(quote.approvedAt), "MMM d, yyyy")}`}
            </p>
          </div>
        </div>
      )}

      {quote.status === "DECLINED" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-sm font-medium text-red-800">
              You declined this quote
              {quote.declinedAt &&
                ` on ${format(new Date(quote.declinedAt), "MMM d, yyyy")}`}
            </p>
            {quote.declineReason && (
              <p className="text-xs text-red-600 mt-1">
                Reason: {quote.declineReason}
              </p>
            )}
          </div>
        </div>
      )}

      {isExpired && quote.status === "SENT" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <p className="text-sm font-medium text-yellow-800">
            This quote expired on{" "}
            {format(new Date(quote.validUntil), "MMM d, yyyy")}. Please contact{" "}
            {quote.organization.name} for an updated quote.
          </p>
        </div>
      )}

      {/* Quote Card */}
      <div className="bg-white rounded-xl border border-[#E3E8EE] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#E3E8EE]">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-[#8898AA]">
                Quote
              </p>
              <h1 className="text-2xl font-bold text-[#0A2540]">
                {quote.quoteNumber}
              </h1>
            </div>
            <Badge className={`${status.color} gap-1.5 text-xs`}>
              {status.icon}
              {status.label}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-[#8898AA] text-xs">Date</p>
              <p className="text-[#0A2540] font-medium">
                {format(new Date(quote.createdAt), "MMM d, yyyy")}
              </p>
            </div>
            <div>
              <p className="text-[#8898AA] text-xs">Valid Until</p>
              <p
                className={`font-medium ${isExpired ? "text-red-600" : "text-[#0A2540]"}`}
              >
                {format(new Date(quote.validUntil), "MMM d, yyyy")}
              </p>
            </div>
            <div>
              <p className="text-[#8898AA] text-xs">Total</p>
              <p className="text-2xl font-bold text-[#0A2540]">
                ${quote.total.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Prepared For */}
        <div className="px-6 py-4 border-b border-[#E3E8EE] bg-[#F6F8FA]">
          <p className="text-xs font-semibold uppercase text-[#8898AA] mb-1">
            Prepared For
          </p>
          <p className="text-sm font-medium text-[#0A2540]">
            {quote.customer.firstName} {quote.customer.lastName}
          </p>
          {quote.customer.email && (
            <p className="text-sm text-[#425466]">{quote.customer.email}</p>
          )}
        </div>

        {/* Line Items */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E3E8EE] bg-[#F6F8FA]">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Item
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-[#8898AA]">
                  Qty
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-[#8898AA]">
                  Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-[#8898AA]">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {quote.lineItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[#E3E8EE] last:border-0"
                >
                  <td className="px-6 py-3">
                    <p className="text-sm font-medium text-[#0A2540]">
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="text-xs text-[#8898AA] mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right text-sm text-[#425466]">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-3 text-right text-sm text-[#425466]">
                    ${item.unitPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-[#0A2540]">
                    ${item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-6 py-4 border-t border-[#E3E8EE] bg-[#F6F8FA]">
          <div className="max-w-xs ml-auto space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-[#425466]">Subtotal</span>
              <span className="text-[#0A2540]">
                ${quote.subtotal.toFixed(2)}
              </span>
            </div>
            {quote.taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[#425466]">Tax</span>
                <span className="text-[#0A2540]">
                  ${quote.taxAmount.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t border-[#E3E8EE] pt-2 mt-2">
              <span className="text-[#0A2540]">Total</span>
              <span className="text-[#0A2540]">
                ${quote.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Customer Message */}
        {quote.customerMessage && (
          <div className="px-6 py-4 border-t border-[#E3E8EE]">
            <p className="text-xs font-semibold uppercase text-[#8898AA] mb-1">
              Message
            </p>
            <p className="text-sm text-[#425466] whitespace-pre-wrap">
              {quote.customerMessage}
            </p>
          </div>
        )}
      </div>

      {/* Approve/Decline Buttons */}
      {canRespond && (
        <div className="space-y-4">
          {showDeclineForm ? (
            <div className="bg-white rounded-xl border border-[#E3E8EE] p-6 space-y-4">
              <h3 className="text-sm font-semibold text-[#0A2540]">
                Decline Quote
              </h3>
              <Textarea
                placeholder="Optional: Tell us why you're declining..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                rows={3}
              />
              <div className="flex gap-3">
                <Button
                  onClick={handleDecline}
                  disabled={declining}
                  variant="destructive"
                  className="flex-1"
                >
                  {declining ? "Declining..." : "Confirm Decline"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeclineForm(false)}
                  className="border-[#E3E8EE]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleApprove}
                disabled={approving}
                className="bg-[#635BFF] hover:bg-[#5851ea] text-white flex-1 h-12 text-base"
              >
                <ThumbsUp className="w-5 h-5 mr-2" />
                {approving ? "Approving..." : "Approve Quote"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeclineForm(true)}
                className="border-[#E3E8EE] text-[#425466] h-12"
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                Decline
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Download PDF */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          className="border-[#E3E8EE] text-[#425466]"
          onClick={() =>
            window.open(
              `/api/pdf/portal/quote/${quote.accessToken}`,
              "_blank"
            )
          }
        >
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* From section */}
      <div className="text-center text-xs text-[#8898AA] space-y-0.5">
        <p>
          From <span className="font-medium">{quote.organization.name}</span>
        </p>
        {quote.organization.email && <p>{quote.organization.email}</p>}
        {quote.organization.phone && <p>{quote.organization.phone}</p>}
      </div>
    </div>
  )
}
