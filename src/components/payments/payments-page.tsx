"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import {
  CreditCard,
  Search,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Download,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  format,
  subDays,
  subMonths,
} from "date-fns"
import { formatCurrency } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Payment {
  id: string
  invoiceId: string | null
  invoiceNumber: string | null
  customerName: string
  amount: number
  method: "CARD" | "ACH" | "CASH" | "CHECK" | "OTHER"
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED"
  reference: string | null
  notes: string | null
  stripePaymentId: string | null
  processedAt: string | null
  createdAt: string
}

interface PaymentSummary {
  receivedThisMonth: number
  outstanding: number
  overdue: number
}

interface OutstandingInvoice {
  id: string
  invoiceNumber: string
  total: number
  amountPaid: number
  amountDue: number
  customerName: string
}

interface PaymentsPageProps {
  initialPayments?: Payment[]
  initialSummary?: PaymentSummary
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const methodConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  CARD: {
    label: "Card",
    color: "text-[#635BFF]",
    bg: "bg-[#635BFF]/10 border-[#635BFF]/20",
  },
  ACH: {
    label: "ACH",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  CASH: {
    label: "Cash",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
  },
  CHECK: {
    label: "Check",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
  OTHER: {
    label: "Other",
    color: "text-[#425466]",
    bg: "bg-[#F6F8FA] border-[#E3E8EE]",
  },
}

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  PENDING: {
    label: "Pending",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
  COMPLETED: {
    label: "Completed",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
  },
  FAILED: {
    label: "Failed",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
  },
  REFUNDED: {
    label: "Refunded",
    color: "text-[#425466]",
    bg: "bg-[#F6F8FA] border-[#E3E8EE]",
  },
}

const defaultSummary: PaymentSummary = {
  receivedThisMonth: 0,
  outstanding: 0,
  overdue: 0,
}

type DatePreset = "last_7_days" | "last_30_days" | "last_3_months" | "last_6_months" | "last_12_months" | "custom"

function getDateRange(preset: DatePreset, customFrom?: string, customTo?: string): { dateFrom: string; dateTo: string } {
  const now = new Date()
  switch (preset) {
    case "last_7_days":
      return {
        dateFrom: format(subDays(now, 6), "yyyy-MM-dd"),
        dateTo: format(now, "yyyy-MM-dd"),
      }
    case "last_30_days":
      return {
        dateFrom: format(subDays(now, 29), "yyyy-MM-dd"),
        dateTo: format(now, "yyyy-MM-dd"),
      }
    case "last_3_months":
      return {
        dateFrom: format(subMonths(now, 3), "yyyy-MM-dd"),
        dateTo: format(now, "yyyy-MM-dd"),
      }
    case "last_6_months":
      return {
        dateFrom: format(subMonths(now, 6), "yyyy-MM-dd"),
        dateTo: format(now, "yyyy-MM-dd"),
      }
    case "last_12_months":
      return {
        dateFrom: format(subMonths(now, 12), "yyyy-MM-dd"),
        dateTo: format(now, "yyyy-MM-dd"),
      }
    case "custom":
      return {
        dateFrom: customFrom || format(subDays(now, 6), "yyyy-MM-dd"),
        dateTo: customTo || format(now, "yyyy-MM-dd"),
      }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PaymentsPage({
  initialPayments = [],
  initialSummary,
}: PaymentsPageProps) {
  const [payments, setPayments] = useState<Payment[]>(initialPayments)
  const [summary, setSummary] = useState<PaymentSummary>(
    initialSummary ?? defaultSummary
  )
  const [loading, setLoading] = useState(false)

  // Filters
  const [search, setSearch] = useState("")
  const [methodFilter, setMethodFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [datePreset, setDatePreset] = useState<DatePreset>("last_7_days")
  const [customDateFrom, setCustomDateFrom] = useState("")
  const [customDateTo, setCustomDateTo] = useState("")

  const dateRange = getDateRange(datePreset, customDateFrom, customDateTo)

  // Add Payment dialog state
  const [addPaymentOpen, setAddPaymentOpen] = useState(false)
  const [addPaymentStep, setAddPaymentStep] = useState<1 | 2>(1)
  const [addPaymentLoading, setAddPaymentLoading] = useState(false)
  const [outstandingInvoices, setOutstandingInvoices] = useState<OutstandingInvoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<OutstandingInvoice | null>(null)
  const [invoiceSearch, setInvoiceSearch] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentReference, setPaymentReference] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")

  // Edit Payment dialog state
  const [editPaymentOpen, setEditPaymentOpen] = useState(false)
  const [editPaymentLoading, setEditPaymentLoading] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [editAmount, setEditAmount] = useState("")
  const [editMethod, setEditMethod] = useState("")
  const [editReference, setEditReference] = useState("")
  const [editNotes, setEditNotes] = useState("")

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    try {
      const mod = await import("@/actions/payments").catch(() => null)
      if (mod?.getPayments) {
        setLoading(true)
        const result = await mod.getPayments({
          search: search || undefined,
          method: methodFilter !== "all" ? methodFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          dateFrom: dateRange.dateFrom,
          dateTo: dateRange.dateTo,
        })
        if (result && !("error" in result)) {
          setPayments((result.payments ?? []).map((p: any) => ({
            ...p,
            invoiceNumber: p.invoice?.invoiceNumber ?? null,
            customerName: p.invoice?.customer
              ? `${p.invoice.customer.firstName} ${p.invoice.customer.lastName}`
              : "Unknown",
            createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
            processedAt: p.processedAt instanceof Date ? p.processedAt.toISOString() : p.processedAt,
            stripePaymentId: p.stripePaymentId ?? null,
            notes: p.notes ?? null,
          })))
          if (result.summary) setSummary(result.summary)
        }
        setLoading(false)
      }
    } catch {
      // Server actions not yet available
    }
  }, [search, methodFilter, statusFilter, dateRange.dateFrom, dateRange.dateTo])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPayments()
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchPayments])

  // Open Add Payment dialog: fetch outstanding invoices
  const handleOpenAddPayment = async () => {
    setAddPaymentOpen(true)
    setAddPaymentStep(1)
    setSelectedInvoice(null)
    setInvoiceSearch("")
    setPaymentAmount("")
    setPaymentMethod("CASH")
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setPaymentReference("")
    setPaymentNotes("")
    try {
      const mod = await import("@/actions/payments").catch(() => null)
      if (mod?.getOutstandingInvoices) {
        const result = await mod.getOutstandingInvoices()
        if (result && "invoices" in result && result.invoices) {
          setOutstandingInvoices(result.invoices)
        }
      }
    } catch {
      toast.error("Failed to load outstanding invoices")
    }
  }

  // Select an invoice and go to step 2
  const handleSelectInvoice = (inv: OutstandingInvoice) => {
    setSelectedInvoice(inv)
    setPaymentAmount(inv.amountDue.toFixed(2))
    setAddPaymentStep(2)
  }

  // Submit the payment
  const handleSubmitPayment = async () => {
    if (!selectedInvoice) return
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }
    if (amount > selectedInvoice.amountDue) {
      toast.error("Amount exceeds the remaining balance")
      return
    }
    setAddPaymentLoading(true)
    try {
      const mod = await import("@/actions/invoices").catch(() => null)
      if (mod?.recordPayment) {
        const result = await mod.recordPayment({
          invoiceId: selectedInvoice.id,
          amount,
          method: paymentMethod,
          reference: paymentReference || undefined,
          notes: paymentNotes || undefined,
          date: paymentDate,
        })
        if (result && "error" in result) {
          toast.error(result.error as string)
        } else {
          toast.success("Payment recorded successfully")
          setAddPaymentOpen(false)
          fetchPayments()
        }
      }
    } catch {
      toast.error("Failed to record payment")
    } finally {
      setAddPaymentLoading(false)
    }
  }

  // Open Edit Payment dialog
  const handleOpenEditPayment = (payment: Payment) => {
    setEditingPayment(payment)
    setEditAmount(String(payment.amount))
    setEditMethod(payment.method)
    setEditReference(payment.reference ?? "")
    setEditNotes(payment.notes ?? "")
    setEditPaymentOpen(true)
  }

  // Submit edit
  const handleSubmitEditPayment = async () => {
    if (!editingPayment) return
    const amount = parseFloat(editAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }
    setEditPaymentLoading(true)
    try {
      const mod = await import("@/actions/payments").catch(() => null)
      if (mod?.updatePayment) {
        const result = await mod.updatePayment(editingPayment.id, {
          amount,
          method: editMethod,
          reference: editReference || null,
          notes: editNotes || null,
        })
        if (result && "error" in result) {
          toast.error(result.error as string)
        } else {
          toast.success("Payment updated successfully")
          setEditPaymentOpen(false)
          setEditingPayment(null)
          fetchPayments()
        }
      }
    } catch {
      toast.error("Failed to update payment")
    } finally {
      setEditPaymentLoading(false)
    }
  }

  // Delete payment
  const handleDeletePayment = async (payment: Payment) => {
    if (!window.confirm(`Are you sure you want to delete this ${formatCurrency(payment.amount)} payment?`)) {
      return
    }
    try {
      const mod = await import("@/actions/payments").catch(() => null)
      if (mod?.deletePayment) {
        const result = await mod.deletePayment(payment.id)
        if (result && "error" in result) {
          toast.error(result.error as string)
        } else {
          toast.success("Payment deleted successfully")
          fetchPayments()
        }
      }
    } catch {
      toast.error("Failed to delete payment")
    }
  }

  // Filter outstanding invoices by search
  const filteredInvoices = outstandingInvoices.filter((inv) => {
    if (!invoiceSearch.trim()) return true
    const q = invoiceSearch.toLowerCase()
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q)
    )
  })

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#0A2540]">Payments</h1>
          <p className="text-sm text-[#8898AA] mt-0.5">
            Track payment history and outstanding balances
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
            onClick={handleOpenAddPayment}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Payment
          </Button>
          <Button
            variant="outline"
            className="border-[#E3E8EE] text-[#425466]"
            onClick={async () => {
              try {
                if (payments.length === 0) {
                  toast.error("No payments to export")
                  return
                }
                const csvRows = payments.map((p) => ({
                  Date: p.processedAt
                    ? new Date(p.processedAt).toLocaleDateString()
                    : new Date(p.createdAt).toLocaleDateString(),
                  "Invoice #": p.invoiceNumber ?? "",
                  Customer: p.customerName,
                  Amount: Number(p.amount).toFixed(2),
                  Method: (methodConfig[p.method]?.label ?? p.method),
                  Status: (statusConfig[p.status]?.label ?? p.status),
                  Reference: p.reference ?? "",
                }))
                const headers = Object.keys(csvRows[0])
                const rows = csvRows.map((row) =>
                  headers
                    .map((h) => {
                      const val = String((row as any)[h] ?? "")
                      return val.includes(",") || val.includes('"')
                        ? `"${val.replace(/"/g, '""')}"`
                        : val
                    })
                    .join(",")
                )
                const csv = [headers.join(","), ...rows].join("\n")
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
                const url = URL.createObjectURL(blob)
                const link = document.createElement("a")
                link.href = url
                link.download = `payments-export-${new Date().toISOString().slice(0, 10)}.csv`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)
                toast.success("Payments exported")
              } catch {
                toast.error("Failed to export payments")
              }
            }}
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card className="border-[#E3E8EE]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#8898AA] uppercase tracking-wider">
                  Received This Month
                </p>
                <p className="text-2xl font-semibold text-[#0A2540] mt-1">
                  {formatCurrency(summary.receivedThisMonth)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E3E8EE]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#8898AA] uppercase tracking-wider">
                  Outstanding
                </p>
                <p className="text-2xl font-semibold text-[#0A2540] mt-1">
                  {formatCurrency(summary.outstanding)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E3E8EE]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#8898AA] uppercase tracking-wider">
                  Overdue
                </p>
                <p className="text-2xl font-semibold text-red-600 mt-1">
                  {formatCurrency(summary.overdue)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-[#E3E8EE] mb-0">
        <div className="p-4 border-b border-[#E3E8EE]">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8898AA]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by customer name or invoice number..."
                className="pl-10 h-9 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-end">
              <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                <SelectTrigger className="w-[160px] h-9 border-[#E3E8EE] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                  <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                  <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                  <SelectItem value="last_12_months">Last 12 Months</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              {datePreset === "custom" && (
                <>
                  <Input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="h-9 w-[150px] border-[#E3E8EE] text-sm"
                    aria-label="Date from"
                  />
                  <span className="text-sm text-[#8898AA]">to</span>
                  <Input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="h-9 w-[150px] border-[#E3E8EE] text-sm"
                    aria-label="Date to"
                  />
                </>
              )}

              <Select
                value={methodFilter}
                onValueChange={setMethodFilter}
              >
                <SelectTrigger className="w-[120px] h-9 border-[#E3E8EE] text-sm">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="ACH">ACH</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[130px] h-9 border-[#E3E8EE] text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={loading ? "opacity-50" : ""}>
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CreditCard className="w-12 h-12 text-[#8898AA] mb-3" />
              <h3 className="text-sm font-semibold text-[#0A2540] mb-1">
                No payments found
              </h3>
              <p className="text-sm text-[#8898AA]">
                {search || methodFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters."
                  : "Payments will appear here once you start collecting from invoices."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                      Invoice #
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-[#8898AA]">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-[#8898AA]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const method = methodConfig[payment.method]
                    const status = statusConfig[payment.status]
                    const isManual = !payment.stripePaymentId
                    return (
                      <tr
                        key={payment.id}
                        className="border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50"
                      >
                        <td className="px-4 py-3 text-sm text-[#425466]">
                          {payment.processedAt
                            ? format(
                                new Date(payment.processedAt),
                                "MMM d, yyyy"
                              )
                            : format(
                                new Date(payment.createdAt),
                                "MMM d, yyyy"
                              )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-[#0A2540]">
                          {payment.customerName}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono">
                          {payment.invoiceId ? (
                            <Link href={`/invoices/${payment.invoiceId}`} className="text-[#635BFF] hover:underline">
                              {payment.invoiceNumber || "--"}
                            </Link>
                          ) : (
                            <span className="text-[#8898AA]">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#0A2540] text-right">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`${method.bg} ${method.color} text-xs`}
                          >
                            {method.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`${status.bg} ${status.color} text-xs`}
                          >
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isManual ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-[#8898AA] hover:text-[#0A2540]"
                                onClick={() => handleOpenEditPayment(payment)}
                                title="Edit payment"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-[#8898AA] hover:text-red-600"
                                onClick={() => handleDeletePayment(payment)}
                                title="Delete payment"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-[#8898AA]">--</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Payment Dialog */}
      <Dialog open={addPaymentOpen} onOpenChange={setAddPaymentOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {addPaymentStep === 1 ? "Select Invoice" : "Record Payment"}
            </DialogTitle>
            <DialogDescription>
              {addPaymentStep === 1
                ? "Choose an outstanding invoice to apply a payment to."
                : `Recording payment for Invoice #${selectedInvoice?.invoiceNumber}`}
            </DialogDescription>
          </DialogHeader>

          {addPaymentStep === 1 ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8898AA]" />
                <Input
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  placeholder="Search invoices..."
                  className="pl-10 h-9 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                />
              </div>
              <div className="max-h-[300px] overflow-y-auto border border-[#E3E8EE] rounded-md">
                {filteredInvoices.length === 0 ? (
                  <div className="p-6 text-center text-sm text-[#8898AA]">
                    No outstanding invoices found.
                  </div>
                ) : (
                  filteredInvoices.map((inv) => (
                    <button
                      key={inv.id}
                      type="button"
                      className="w-full text-left px-4 py-3 border-b border-[#E3E8EE] last:border-b-0 hover:bg-[#F6F8FA] transition-colors"
                      onClick={() => handleSelectInvoice(inv)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-mono text-[#635BFF]">
                            #{inv.invoiceNumber}
                          </span>
                          <span className="text-sm text-[#425466] ml-3">
                            {inv.customerName}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-[#0A2540]">
                          {formatCurrency(inv.amountDue)} due
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-[#F6F8FA] rounded-md p-3 border border-[#E3E8EE]">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#425466]">
                    Invoice #{selectedInvoice?.invoiceNumber} -- {selectedInvoice?.customerName}
                  </span>
                  <span className="font-semibold text-[#0A2540]">
                    {formatCurrency(selectedInvoice?.amountDue ?? 0)} due
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payment-amount">Amount</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedInvoice?.amountDue}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payment-method">Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="payment-method" className="border-[#E3E8EE]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CHECK">Check</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payment-date">Date</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payment-reference">Reference (optional)</Label>
                <Input
                  id="payment-reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                  placeholder='e.g. Check #1234'
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payment-notes">Notes (optional)</Label>
                <Textarea
                  id="payment-notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="border-[#E3E8EE] focus-visible:ring-[#635BFF] min-h-[60px]"
                  placeholder="Any additional notes..."
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddPaymentStep(1)}
                  disabled={addPaymentLoading}
                  className="border-[#E3E8EE] text-[#425466]"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmitPayment}
                  disabled={addPaymentLoading}
                  className="bg-[#635BFF] hover:bg-[#5851DB] text-white"
                >
                  {addPaymentLoading ? "Recording..." : "Record Payment"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={editPaymentOpen} onOpenChange={setEditPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
            <DialogDescription>
              Update the details of this manual payment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-amount">Amount</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-method">Method</Label>
              <Select value={editMethod} onValueChange={setEditMethod}>
                <SelectTrigger id="edit-method" className="border-[#E3E8EE]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="ACH">ACH</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-reference">Reference (optional)</Label>
              <Input
                id="edit-reference"
                value={editReference}
                onChange={(e) => setEditReference(e.target.value)}
                className="border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                placeholder='e.g. Check #1234'
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-notes">Notes (optional)</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="border-[#E3E8EE] focus-visible:ring-[#635BFF] min-h-[60px]"
                placeholder="Any additional notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditPaymentOpen(false)}
              disabled={editPaymentLoading}
              className="border-[#E3E8EE] text-[#425466]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitEditPayment}
              disabled={editPaymentLoading}
              className="bg-[#635BFF] hover:bg-[#5851DB] text-white"
            >
              {editPaymentLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
