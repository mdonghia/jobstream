"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Send,
  CreditCard,
  Ban,
  Copy,
  Pencil,
  Mail,
  Bell,
  User,
  MapPin,
  Phone,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"
import { toast } from "sonner"
import { sendInvoice, voidInvoice } from "@/actions/invoices"
import { RecordPaymentModal } from "./record-payment-modal"

// ─── Types ───────────────────────────────────────────────────────────────────

interface LineItem {
  id: string
  name: string
  description: string | null
  quantity: number
  unitPrice: number
  total: number
  taxable: boolean
}

interface Payment {
  id: string
  amount: number
  method: string
  status: string
  reference: string | null
  notes: string | null
  processedAt: string | null
  createdAt: string
}

interface CustomerProperty {
  id: string
  addressLine1: string
  city: string
  state: string
  zip: string
}

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  company: string | null
  properties: CustomerProperty[]
}

interface Job {
  id: string
  jobNumber: string
  title: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  subtotal: number
  discountType: string | null
  discountValue: number | null
  discountAmount: number
  taxAmount: number
  total: number
  amountPaid: number
  amountDue: number
  dueDate: string
  customerNote: string | null
  internalNote: string | null
  sentAt: string | null
  viewedAt: string | null
  paidAt: string | null
  createdAt: string
  customer: Customer
  job: Job | null
  lineItems: LineItem[]
  payments: Payment[]
}

interface InvoiceDetailProps {
  invoice: Invoice
}

// ─── Status Config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-600 border-gray-200" },
  SENT: { label: "Sent", className: "bg-blue-50 text-blue-700 border-blue-200" },
  VIEWED: { label: "Viewed", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  OVERDUE: { label: "Overdue", className: "bg-red-50 text-red-700 border-red-200" },
  PARTIALLY_PAID: { label: "Partially Paid", className: "bg-amber-50 text-amber-700 border-amber-200" },
  PAID: { label: "Paid", className: "bg-green-50 text-green-700 border-green-200" },
  VOID: { label: "Void", className: "bg-gray-50 text-gray-400 border-gray-200" },
}

function StatusBadge({ status, large }: { status: string; large?: boolean }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT
  return (
    <Badge
      variant="outline"
      className={`${config.className} ${large ? "text-sm px-3 py-1" : "text-xs"}`}
    >
      {config.label}
    </Badge>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function InvoiceDetail({ invoice }: InvoiceDetailProps) {
  const router = useRouter()
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const customer = invoice.customer

  async function handleSend() {
    setActionLoading("send")
    try {
      const result = await sendInvoice(invoice.id)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success("Invoice sent successfully")
      window.location.reload()
    } catch {
      toast.error("Failed to send invoice")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleVoid() {
    if (!confirm("Are you sure you want to void this invoice? This cannot be undone.")) return
    setActionLoading("void")
    try {
      const result = await voidInvoice(invoice.id)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success("Invoice voided")
      window.location.reload()
    } catch {
      toast.error("Failed to void invoice")
    } finally {
      setActionLoading(null)
    }
  }

  // ─── Action Buttons per Status ─────────────────────────────────────────

  function renderActions() {
    const status = invoice.status
    const buttons: React.ReactNode[] = []

    if (status === "DRAFT") {
      buttons.push(
        <Button
          key="edit"
          variant="outline"
          className="border-[#E3E8EE] text-[#425466]"
          onClick={() => router.push(`/invoices/new?duplicate=${invoice.id}`)}
        >
          <Pencil className="w-4 h-4 mr-2" />
          Edit
        </Button>,
        <Button
          key="send"
          className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
          onClick={handleSend}
          disabled={actionLoading === "send"}
        >
          <Send className="w-4 h-4 mr-2" />
          {actionLoading === "send" ? "Sending..." : "Send Invoice"}
        </Button>
      )
    }

    if (status === "SENT" || status === "VIEWED") {
      buttons.push(
        <Button
          key="resend"
          variant="outline"
          className="border-[#E3E8EE] text-[#425466]"
          onClick={handleSend}
          disabled={actionLoading === "send"}
        >
          <Mail className="w-4 h-4 mr-2" />
          {actionLoading === "send" ? "Sending..." : "Resend"}
        </Button>,
        <Button
          key="payment"
          className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
          onClick={() => setPaymentModalOpen(true)}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Record Payment
        </Button>,
        <Button
          key="void"
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50"
          onClick={handleVoid}
          disabled={actionLoading === "void"}
        >
          <Ban className="w-4 h-4 mr-2" />
          {actionLoading === "void" ? "Voiding..." : "Void"}
        </Button>
      )
    }

    if (status === "OVERDUE") {
      buttons.push(
        <Button
          key="reminder"
          variant="outline"
          className="border-[#E3E8EE] text-[#425466]"
          onClick={handleSend}
          disabled={actionLoading === "send"}
        >
          <Bell className="w-4 h-4 mr-2" />
          {actionLoading === "send" ? "Sending..." : "Send Reminder"}
        </Button>,
        <Button
          key="payment"
          className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
          onClick={() => setPaymentModalOpen(true)}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Record Payment
        </Button>,
        <Button
          key="void"
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50"
          onClick={handleVoid}
          disabled={actionLoading === "void"}
        >
          <Ban className="w-4 h-4 mr-2" />
          Void
        </Button>
      )
    }

    if (status === "PARTIALLY_PAID") {
      buttons.push(
        <Button
          key="payment"
          className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
          onClick={() => setPaymentModalOpen(true)}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Record Payment
        </Button>,
        <Button
          key="void"
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50"
          onClick={handleVoid}
          disabled={actionLoading === "void"}
        >
          <Ban className="w-4 h-4 mr-2" />
          Void
        </Button>
      )
    }

    if (status === "PAID") {
      buttons.push(
        <Button
          key="void"
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50"
          onClick={handleVoid}
          disabled={actionLoading === "void"}
        >
          <Ban className="w-4 h-4 mr-2" />
          Void
        </Button>
      )
    }

    if (status === "VOID") {
      buttons.push(
        <Button
          key="duplicate"
          variant="outline"
          className="border-[#E3E8EE] text-[#425466]"
          onClick={() => router.push(`/invoices/new?duplicate=${invoice.id}`)}
        >
          <Copy className="w-4 h-4 mr-2" />
          Duplicate
        </Button>
      )
    }

    return buttons
  }

  // ─── Activity Timeline ─────────────────────────────────────────────────

  function renderTimeline() {
    const events: { date: string; icon: React.ReactNode; text: string; color: string }[] = []

    events.push({
      date: invoice.createdAt,
      icon: <FileText className="w-4 h-4" />,
      text: "Invoice created",
      color: "text-[#8898AA]",
    })

    if (invoice.sentAt) {
      events.push({
        date: invoice.sentAt,
        icon: <Send className="w-4 h-4" />,
        text: "Invoice sent to customer",
        color: "text-blue-500",
      })
    }

    if (invoice.viewedAt) {
      events.push({
        date: invoice.viewedAt,
        icon: <Eye className="w-4 h-4" />,
        text: "Viewed by customer",
        color: "text-indigo-500",
      })
    }

    invoice.payments.forEach((payment) => {
      events.push({
        date: payment.processedAt || payment.createdAt,
        icon: <CreditCard className="w-4 h-4" />,
        text: `Payment of ${formatCurrency(payment.amount)} received (${payment.method})`,
        color: "text-green-500",
      })
    })

    if (invoice.paidAt) {
      events.push({
        date: invoice.paidAt,
        icon: <CheckCircle2 className="w-4 h-4" />,
        text: "Invoice paid in full",
        color: "text-green-600",
      })
    }

    if (invoice.status === "VOID") {
      events.push({
        date: invoice.createdAt, // No specific void date stored
        icon: <Ban className="w-4 h-4" />,
        text: "Invoice voided",
        color: "text-gray-400",
      })
    }

    // Sort by date descending
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return events
  }

  const timeline = renderTimeline()

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 mt-1"
            onClick={() => router.push("/invoices")}
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#0A2540] font-mono">
                {invoice.invoiceNumber}
              </h1>
              <StatusBadge status={invoice.status} large />
            </div>
            {invoice.job && (
              <Link
                href={`/jobs/${invoice.job.id}`}
                className="text-sm text-[#635BFF] hover:underline mt-1 inline-block"
              >
                Job {invoice.job.jobNumber}: {invoice.job.title}
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">{renderActions()}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left Column ──────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card className="border-[#E3E8EE]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#0A2540] flex items-center gap-2">
                <User className="w-4 h-4 text-[#8898AA]" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link
                  href={`/customers/${customer.id}`}
                  className="text-base font-medium text-[#0A2540] hover:text-[#635BFF]"
                >
                  {customer.firstName} {customer.lastName}
                </Link>
                {customer.company && (
                  <p className="text-sm text-[#425466]">{customer.company}</p>
                )}
                {customer.email && (
                  <p className="text-sm text-[#425466] flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#8898AA]" />
                    {customer.email}
                  </p>
                )}
                {customer.phone && (
                  <p className="text-sm text-[#425466] flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#8898AA]" />
                    {customer.phone}
                  </p>
                )}
                {customer.properties?.[0] && (
                  <p className="text-sm text-[#425466] flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#8898AA]" />
                    {customer.properties[0].addressLine1},{" "}
                    {customer.properties[0].city}, {customer.properties[0].state}{" "}
                    {customer.properties[0].zip}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card className="border-[#E3E8EE]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#0A2540]">Line Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E3E8EE] bg-[#F6F8FA]">
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-[#8898AA] uppercase">
                        Item
                      </th>
                      <th className="px-5 py-2.5 text-right text-xs font-semibold text-[#8898AA] uppercase">
                        Qty
                      </th>
                      <th className="px-5 py-2.5 text-right text-xs font-semibold text-[#8898AA] uppercase">
                        Unit Price
                      </th>
                      <th className="px-5 py-2.5 text-right text-xs font-semibold text-[#8898AA] uppercase">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lineItems.map((li) => (
                      <tr key={li.id} className="border-b border-[#E3E8EE]">
                        <td className="px-5 py-3">
                          <div>
                            <span className="text-sm font-medium text-[#0A2540]">{li.name}</span>
                            {li.description && (
                              <p className="text-xs text-[#8898AA] mt-0.5">{li.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-[#425466] text-right">
                          {li.quantity}
                        </td>
                        <td className="px-5 py-3 text-sm text-[#425466] text-right">
                          {formatCurrency(li.unitPrice)}
                        </td>
                        <td className="px-5 py-3 text-sm font-medium text-[#0A2540] text-right">
                          {formatCurrency(li.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="px-5 py-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#425466]">Subtotal</span>
                  <span className="font-medium text-[#0A2540]">
                    {formatCurrency(invoice.subtotal)}
                  </span>
                </div>

                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#425466]">
                      Discount
                      {invoice.discountType === "percentage" && invoice.discountValue
                        ? ` (${invoice.discountValue}%)`
                        : ""}
                    </span>
                    <span className="font-medium text-red-500">
                      -{formatCurrency(invoice.discountAmount)}
                    </span>
                  </div>
                )}

                {invoice.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#425466]">Tax</span>
                    <span className="text-[#0A2540]">{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                )}

                <Separator className="bg-[#E3E8EE]" />

                <div className="flex justify-between">
                  <span className="text-base font-semibold text-[#0A2540]">Total</span>
                  <span className="text-base font-semibold text-[#0A2540]">
                    {formatCurrency(invoice.total)}
                  </span>
                </div>

                {invoice.amountPaid > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Paid</span>
                      <span className="font-medium text-green-600">
                        -{formatCurrency(invoice.amountPaid)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-[#0A2540]">Balance Due</span>
                      <span className="text-sm font-semibold text-[#0A2540]">
                        {formatCurrency(invoice.amountDue)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          {invoice.payments.length > 0 && (
            <Card className="border-[#E3E8EE]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#0A2540] flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#8898AA]" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E3E8EE] bg-[#F6F8FA]">
                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-[#8898AA] uppercase">
                          Date
                        </th>
                        <th className="px-5 py-2.5 text-right text-xs font-semibold text-[#8898AA] uppercase">
                          Amount
                        </th>
                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-[#8898AA] uppercase">
                          Method
                        </th>
                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-[#8898AA] uppercase">
                          Reference
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.payments.map((p) => (
                        <tr key={p.id} className="border-b border-[#E3E8EE]">
                          <td className="px-5 py-3 text-sm text-[#425466]">
                            {formatDate(p.processedAt || p.createdAt)}
                          </td>
                          <td className="px-5 py-3 text-sm font-medium text-green-600 text-right">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="px-5 py-3 text-sm text-[#425466] capitalize">
                            {p.method.toLowerCase()}
                          </td>
                          <td className="px-5 py-3 text-sm text-[#425466]">
                            {p.reference || "\u2014"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {(invoice.customerNote || invoice.internalNote) && (
            <Card className="border-[#E3E8EE]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#0A2540]">Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {invoice.customerNote && (
                  <div>
                    <p className="text-xs font-medium text-[#8898AA] uppercase mb-1">
                      Customer Note
                    </p>
                    <p className="text-sm text-[#425466] whitespace-pre-wrap">
                      {invoice.customerNote}
                    </p>
                  </div>
                )}
                {invoice.internalNote && (
                  <div>
                    <p className="text-xs font-medium text-[#8898AA] uppercase mb-1">
                      Internal Note
                    </p>
                    <p className="text-sm text-[#425466] whitespace-pre-wrap bg-amber-50/50 rounded p-3 border border-amber-100">
                      {invoice.internalNote}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── Right Column ─────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-6">
          {/* Invoice Summary */}
          <Card className="border-[#E3E8EE]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#0A2540]">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#8898AA]">Status</span>
                <StatusBadge status={invoice.status} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#8898AA]">Amount</span>
                <span className="font-medium text-[#0A2540]">
                  {formatCurrency(invoice.total)}
                </span>
              </div>
              {invoice.amountPaid > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#8898AA]">Paid</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(invoice.amountPaid)}
                  </span>
                </div>
              )}
              {invoice.amountDue > 0 && invoice.status !== "VOID" && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#8898AA]">Balance Due</span>
                  <span
                    className={`font-medium ${
                      invoice.status === "OVERDUE" ? "text-red-600" : "text-[#0A2540]"
                    }`}
                  >
                    {formatCurrency(invoice.amountDue)}
                  </span>
                </div>
              )}
              <Separator className="bg-[#E3E8EE]" />
              <div className="flex justify-between text-sm">
                <span className="text-[#8898AA]">Issued</span>
                <span className="text-[#425466]">{formatDate(invoice.createdAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#8898AA]">Due Date</span>
                <span
                  className={`${
                    invoice.status === "OVERDUE" ? "text-red-600 font-medium" : "text-[#425466]"
                  }`}
                >
                  {formatDate(invoice.dueDate)}
                </span>
              </div>
              {invoice.sentAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#8898AA]">Sent</span>
                  <span className="text-[#425466]">{formatDate(invoice.sentAt)}</span>
                </div>
              )}
              {invoice.paidAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#8898AA]">Paid</span>
                  <span className="text-green-600">{formatDate(invoice.paidAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card className="border-[#E3E8EE]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#0A2540] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#8898AA]" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.map((event, i) => (
                  <div key={i} className="flex gap-3">
                    <div className={`mt-0.5 ${event.color}`}>{event.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#425466]">{event.text}</p>
                      <p className="text-xs text-[#8898AA] mt-0.5">
                        {formatDateTime(event.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Modal */}
      <RecordPaymentModal
        invoice={invoice}
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
      />
    </div>
  )
}
