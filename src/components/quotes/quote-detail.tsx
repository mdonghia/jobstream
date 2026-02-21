"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Pencil,
  Send,
  CheckCircle2,
  XCircle,
  Briefcase,
  Copy,
  Trash2,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Lock,
  Clock,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { QuoteSendModal } from "./quote-send-modal"
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils"
import { toast } from "sonner"
import {
  sendQuote,
  markQuoteApproved,
  markQuoteDeclined,
  convertQuoteToJob,
  duplicateQuote,
  deleteQuote,
} from "@/actions/quotes"

// ── Types ──────────────────────────────────────────────────────────────────

interface LineItem {
  id: string
  name: string
  description: string | null
  quantity: number
  unitPrice: number
  total: number
  taxable: boolean
}

interface QuoteCustomer {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  properties: {
    id: string
    addressLine1: string
    addressLine2: string | null
    city: string
    state: string
    zip: string
  }[]
}

interface QuoteProperty {
  id: string
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  zip: string
}

interface TimelineEvent {
  id: string
  action: string
  description: string
  timestamp: string | Date
  user?: string
}

interface Quote {
  id: string
  quoteNumber: string
  status: string
  subtotal: number
  taxAmount: number
  total: number
  createdAt: string | Date
  validUntil: string | Date
  sentAt: string | Date | null
  approvedAt: string | Date | null
  declinedAt: string | Date | null
  declineReason: string | null
  customerMessage: string | null
  internalNote: string | null
  convertedToJobId: string | null
  customer: QuoteCustomer
  property: QuoteProperty | null
  lineItems: LineItem[]
}

interface QuoteDetailProps {
  quote: Quote
  timeline: TimelineEvent[]
}

// ── Status badge ───────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-50 text-blue-700",
  APPROVED: "bg-green-50 text-green-700",
  DECLINED: "bg-red-50 text-red-700",
  CONVERTED: "bg-green-50 text-green-700",
  EXPIRED: "bg-amber-50 text-amber-700",
}

function StatusBadge({ status }: { status: string }) {
  const display = status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[status] || "bg-gray-100 text-gray-700"}`}
    >
      {display}
    </span>
  )
}

// ── Timeline icons ─────────────────────────────────────────────────────────

const timelineIcons: Record<string, React.ReactNode> = {
  created: <Clock className="w-4 h-4 text-gray-400" />,
  sent: <Send className="w-4 h-4 text-blue-500" />,
  approved: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  declined: <XCircle className="w-4 h-4 text-red-500" />,
  converted: <Briefcase className="w-4 h-4 text-green-500" />,
}

// ── Component ──────────────────────────────────────────────────────────────

export function QuoteDetail({ quote: initialQuote, timeline }: QuoteDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [quote] = useState(initialQuote)
  const [loading, setLoading] = useState(false)

  // Modals
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Open send modal if redirected from builder
  useEffect(() => {
    if (searchParams.get("action") === "send" && quote.status === "DRAFT") {
      setSendModalOpen(true)
    }
  }, [searchParams, quote.status])

  // ── Action handlers ──────────────────────────────────────────────────────

  async function handleMarkApproved() {
    setLoading(true)
    const result = await markQuoteApproved(quote.id)
    if ("error" in result) {
      toast.error(result.error as string)
    } else {
      toast.success("Quote marked as approved")
      router.refresh()
    }
    setLoading(false)
  }

  async function handleMarkDeclined() {
    setLoading(true)
    const result = await markQuoteDeclined(quote.id)
    if ("error" in result) {
      toast.error(result.error as string)
    } else {
      toast.success("Quote marked as declined")
      router.refresh()
    }
    setLoading(false)
  }

  async function handleConvertToJob() {
    setLoading(true)
    const result = await convertQuoteToJob(quote.id)
    if ("error" in result) {
      toast.error(result.error as string)
      setLoading(false)
    } else {
      toast.success("Quote converted to job")
      router.push(`/jobs/${(result as any).jobId}`)
    }
  }

  async function handleDuplicate() {
    setLoading(true)
    const result = await duplicateQuote(quote.id)
    if ("error" in result) {
      toast.error(result.error as string)
      setLoading(false)
    } else {
      toast.success("Quote duplicated")
      router.push(`/quotes/${(result as any).quoteId}`)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteQuote(quote.id)
    if ("error" in result) {
      toast.error(result.error as string)
      setDeleting(false)
      setDeleteDialogOpen(false)
    } else {
      toast.success("Quote deleted")
      router.push("/quotes")
    }
  }

  // ── Action buttons based on status ───────────────────────────────────────

  function renderActions() {
    switch (quote.status) {
      case "DRAFT":
        return (
          <>
            <Button
              variant="outline"
              size="sm"
              className="border-[#E3E8EE] text-[#425466]"
              asChild
            >
              <Link href={`/quotes/${quote.id}/edit`}>
                <Pencil className="w-4 h-4 mr-1.5" />
                Edit
              </Link>
            </Button>
            <Button
              size="sm"
              className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
              onClick={() => setSendModalOpen(true)}
              disabled={loading}
            >
              <Send className="w-4 h-4 mr-1.5" />
              Send Quote
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={loading}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete
            </Button>
          </>
        )
      case "SENT":
        return (
          <>
            <Button
              variant="outline"
              size="sm"
              className="border-[#E3E8EE] text-[#425466]"
              onClick={() => setSendModalOpen(true)}
              disabled={loading}
            >
              <Send className="w-4 h-4 mr-1.5" />
              Resend
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleMarkApproved}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
              )}
              Mark as Approved
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={handleMarkDeclined}
              disabled={loading}
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Mark as Declined
            </Button>
          </>
        )
      case "APPROVED":
        return (
          <Button
            size="sm"
            className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
            onClick={handleConvertToJob}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Briefcase className="w-4 h-4 mr-1.5" />
            )}
            Convert to Job
          </Button>
        )
      case "DECLINED":
        return (
          <Button
            variant="outline"
            size="sm"
            className="border-[#E3E8EE] text-[#425466]"
            onClick={handleDuplicate}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Copy className="w-4 h-4 mr-1.5" />
            )}
            Duplicate
          </Button>
        )
      case "CONVERTED":
        return quote.convertedToJobId ? (
          <Button
            variant="outline"
            size="sm"
            className="border-[#E3E8EE] text-[#425466]"
            asChild
          >
            <Link href={`/jobs/${quote.convertedToJobId}`}>
              <ExternalLink className="w-4 h-4 mr-1.5" />
              View Job
            </Link>
          </Button>
        ) : null
      default:
        return null
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const property =
    quote.property ||
    (quote.customer.properties?.length > 0
      ? quote.customer.properties[0]
      : null)

  return (
    <div>
      {/* Back link */}
      <Link
        href="/quotes"
        className="inline-flex items-center gap-1 text-sm text-[#8898AA] hover:text-[#635BFF] mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Quotes
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#0A2540] font-mono">
              {quote.quoteNumber}
            </h1>
            <StatusBadge status={quote.status} />
          </div>
          <p className="text-sm text-[#8898AA] mt-0.5">
            Created {formatDate(quote.createdAt)}
            {quote.validUntil && ` \u00B7 Valid until ${formatDate(quote.validUntil)}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">{renderActions()}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer info card */}
          <Card className="border-[#E3E8EE]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase text-[#8898AA]">
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link
                  href={`/customers/${quote.customer.id}`}
                  className="text-sm font-medium text-[#635BFF] hover:underline"
                >
                  {quote.customer.firstName} {quote.customer.lastName}
                </Link>
                {quote.customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#8898AA]" />
                    <a
                      href={`mailto:${quote.customer.email}`}
                      className="text-sm text-[#425466] hover:text-[#635BFF]"
                    >
                      {quote.customer.email}
                    </a>
                  </div>
                )}
                {quote.customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#8898AA]" />
                    <a
                      href={`tel:${quote.customer.phone}`}
                      className="text-sm text-[#425466] hover:text-[#635BFF]"
                    >
                      {formatPhone(quote.customer.phone)}
                    </a>
                  </div>
                )}
                {property && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#8898AA] mt-0.5" />
                    <p className="text-sm text-[#425466]">
                      {property.addressLine1}
                      {property.addressLine2 && `, ${property.addressLine2}`}
                      <br />
                      {property.city}, {property.state} {property.zip}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line items table */}
          <Card className="border-[#E3E8EE]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase text-[#8898AA]">
                Line Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F6F8FA] border-y border-[#E3E8EE]">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                        Item
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA] w-[80px]">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA] w-[120px]">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-[#8898AA] w-[120px]">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.lineItems.map((li) => (
                      <tr key={li.id} className="border-b border-[#E3E8EE]">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-[#0A2540]">{li.name}</p>
                          {li.description && (
                            <p className="text-xs text-[#8898AA] mt-0.5">{li.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#425466]">{li.quantity}</td>
                        <td className="px-4 py-3 text-sm text-[#425466]">
                          {formatCurrency(li.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-[#0A2540] text-right">
                          {formatCurrency(li.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="px-4 py-4 space-y-2">
                <div className="flex justify-end">
                  <div className="w-[250px] space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#425466]">Subtotal</span>
                      <span className="text-[#0A2540]">{formatCurrency(quote.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#425466]">Tax</span>
                      <span className="text-[#0A2540]">{formatCurrency(quote.taxAmount)}</span>
                    </div>
                    <Separator className="bg-[#E3E8EE]" />
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-[#0A2540]">Total</span>
                      <span className="text-lg font-semibold text-[#0A2540]">
                        {formatCurrency(quote.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer message */}
          {quote.customerMessage && (
            <Card className="border-[#E3E8EE]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase text-[#8898AA]">
                  Customer Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#425466] whitespace-pre-wrap">
                  {quote.customerMessage}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Internal note */}
          {quote.internalNote && (
            <Card className="border-[#E3E8EE]">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold uppercase text-[#8898AA]">
                    Internal Note
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="text-xs bg-amber-50 text-amber-700"
                  >
                    <Lock className="w-3 h-3 mr-1" />
                    Internal
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#425466] whitespace-pre-wrap">
                  {quote.internalNote}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar: Timeline */}
        <div className="lg:col-span-1">
          <Card className="border-[#E3E8EE]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase text-[#8898AA]">
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-sm text-[#8898AA]">No events yet</p>
              ) : (
                <div className="space-y-4">
                  {timeline.map((event, index) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="mt-0.5">
                        {timelineIcons[event.action] || (
                          <Clock className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#0A2540]">{event.description}</p>
                        <p className="text-xs text-[#8898AA] mt-0.5">
                          {formatDate(event.timestamp)}
                          {event.user && ` by ${event.user}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Send modal */}
      <QuoteSendModal
        quote={{
          id: quote.id,
          quoteNumber: quote.quoteNumber,
          total: quote.total,
          customer: {
            firstName: quote.customer.firstName,
            lastName: quote.customer.lastName,
            email: quote.customer.email,
            phone: quote.customer.phone,
          },
        }}
        open={sendModalOpen}
        onOpenChange={setSendModalOpen}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Quote"
        description={`Are you sure you want to delete ${quote.quoteNumber}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}
