"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Search,
  MoreHorizontal,
  Receipt,
  Plus,
  Eye,
  Ban,
  DollarSign,
  ChevronDown,
  ChevronUp,
  CreditCard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { formatCurrency, formatDate } from "@/lib/utils"
import { toast } from "sonner"
import { getInvoicesV2, voidInvoice, recordPayment } from "@/actions/invoices"

// ---- Types ----

type InvoiceTab = "draft" | "sent" | "overdue" | "partially_paid" | "paid" | "cancelled"

interface PaymentRow {
  id: string
  amount: number
  method: string
  status: string
  reference: string | null
  notes: string | null
  processedAt: string | null
  createdAt: string
}

interface InvoiceRowV2 {
  id: string
  invoiceNumber: string
  status: string
  total: number
  amountPaid: number
  amountDue: number
  subtotal: number
  taxAmount: number
  discountAmount: number
  dueDate: string
  paidAt: string | null
  sentAt: string | null
  createdAt: string
  customer: {
    id: string
    firstName: string
    lastName: string
  }
  job: {
    id: string
    jobNumber: string
  } | null
  payments: PaymentRow[]
}

interface TabCounts {
  draft: number
  sent: number
  overdue: number
  partially_paid: number
  paid: number
  cancelled: number
}

interface InvoiceListV2Props {
  initialInvoices: InvoiceRowV2[]
  initialTabCounts: TabCounts
  initialTotal: number
  initialPage: number
  initialTotalPages: number
  initialTab: InvoiceTab
}

// ---- Status Badge ----

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: {
    label: "Draft",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  SENT: {
    label: "Sent",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  VIEWED: {
    label: "Viewed",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  OVERDUE: {
    label: "Overdue",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  PARTIALLY_PAID: {
    label: "Partial",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  PAID: {
    label: "Paid",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  VOID: {
    label: "Void",
    className: "bg-gray-50 text-gray-400 border-gray-200 line-through",
  },
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium ${config.className}`}
    >
      {config.label}
    </Badge>
  )
}

// ---- Tab Config ----

const TAB_CONFIG: { key: InvoiceTab; label: string }[] = [
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "overdue", label: "Overdue" },
  { key: "partially_paid", label: "Partially Paid" },
  { key: "paid", label: "Paid" },
  { key: "cancelled", label: "Cancelled" },
]

// ---- Main Component ----

export function InvoiceListV2({
  initialInvoices,
  initialTabCounts,
  initialTotal,
  initialPage,
  initialTotalPages,
  initialTab,
}: InvoiceListV2Props) {
  const router = useRouter()

  const [invoices, setInvoices] = useState(initialInvoices)
  const [tabCounts, setTabCounts] = useState(initialTabCounts)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<InvoiceTab>(initialTab)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  // Record payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [paymentReference, setPaymentReference] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)

  const fetchInvoices = useCallback(
    async (params?: {
      tab?: InvoiceTab
      search?: string
      page?: number
    }) => {
      setLoading(true)
      try {
        const result = await getInvoicesV2({
          tab: params?.tab ?? activeTab,
          search: params?.search ?? search,
          page: params?.page ?? page,
          perPage: 25,
        })

        if ("error" in result) {
          toast.error(result.error as string)
          return
        }

        setInvoices(result.invoices as any)
        setTotal(result.total)
        setPage(result.page)
        setTotalPages(result.totalPages)
        setTabCounts(result.tabCounts)
      } catch {
        toast.error("Failed to load invoices")
      } finally {
        setLoading(false)
      }
    },
    [activeTab, search, page]
  )

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices({ search, page: 1 })
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function handleTabChange(tab: InvoiceTab) {
    setActiveTab(tab)
    setPage(1)
    setExpandedRowId(null)
    fetchInvoices({ tab, page: 1 })
  }

  async function handleVoid(id: string) {
    if (!confirm("Are you sure you want to void this invoice? This cannot be undone.")) return
    const result = await voidInvoice(id)
    if ("error" in result) {
      toast.error(result.error)
      return
    }
    toast.success("Invoice voided")
    fetchInvoices()
  }

  function openPaymentDialog(invoiceId: string, maxAmount: number) {
    setPaymentInvoiceId(invoiceId)
    setPaymentAmount(maxAmount.toFixed(2))
    setPaymentMethod("CASH")
    setPaymentReference("")
    setPaymentNotes("")
    setPaymentDialogOpen(true)
  }

  async function handleRecordPayment() {
    if (!paymentInvoiceId) return
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    setPaymentSubmitting(true)
    try {
      const result = await recordPayment({
        invoiceId: paymentInvoiceId,
        amount,
        method: paymentMethod,
        reference: paymentReference || undefined,
        notes: paymentNotes || undefined,
      })

      if ("error" in result) {
        toast.error(result.error)
        return
      }

      toast.success("Payment recorded")
      setPaymentDialogOpen(false)
      fetchInvoices()
    } catch {
      toast.error("Failed to record payment")
    } finally {
      setPaymentSubmitting(false)
    }
  }

  const allCount = Object.values(tabCounts).reduce((sum, c) => sum + c, 0)

  // ---- Empty State ----

  if (allCount === 0 && !search) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Receipt className="w-16 h-16 text-[#8898AA] mb-4" />
        <h2 className="text-lg font-semibold text-[#0A2540] mb-2">No invoices yet</h2>
        <p className="text-sm text-[#425466] max-w-md">
          Create your first invoice to start billing customers and tracking payments.
        </p>
        <Button
          onClick={() => router.push("/invoices/new")}
          className="mt-4 bg-[#635BFF] hover:bg-[#5851ea] text-white"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Invoice
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#0A2540]">Invoices</h1>
          <p className="text-sm text-[#8898AA] mt-0.5">{allCount} total</p>
        </div>
        <Button
          onClick={() => router.push("/invoices/new")}
          className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Invoice
        </Button>
      </div>

      {/* 6 Filter Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as InvoiceTab)} className="mb-4">
        <TabsList className="bg-transparent rounded-none w-full justify-start h-auto p-0 gap-1 border-b border-[#E3E8EE] overflow-x-auto overflow-y-hidden">
          {TAB_CONFIG.map(({ key, label }) => (
            <TabsTrigger
              key={key}
              value={key}
              className="px-3 py-2 border-b-2 border-transparent -mb-px text-[#8898AA] hover:text-[#425466] data-[state=active]:border-[#635BFF] data-[state=active]:text-[#0A2540]"
            >
              {label}
              <span
                className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                  activeTab === key
                    ? "bg-[#635BFF]/10 text-[#635BFF]"
                    : "bg-gray-100 text-[#8898AA]"
                }`}
              >
                {tabCounts[key]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8898AA]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by invoice number or customer name..."
          className="pl-10 h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#E3E8EE] overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`w-full ${loading ? "opacity-50" : ""}`}>
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
                <th className="px-4 py-3 w-8" />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Invoice #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Job #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Paid / Due
                </th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const isExpanded = expandedRowId === inv.id
                const isOverdue = inv.status === "OVERDUE"
                return (
                  <InvoiceRowWithExpansion
                    key={inv.id}
                    inv={inv}
                    isExpanded={isExpanded}
                    isOverdue={isOverdue}
                    onToggleExpand={() =>
                      setExpandedRowId(isExpanded ? null : inv.id)
                    }
                    onView={() => router.push(`/invoices/${inv.id}`)}
                    onVoid={() => handleVoid(inv.id)}
                    onRecordPayment={() =>
                      openPaymentDialog(inv.id, inv.amountDue)
                    }
                  />
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E3E8EE]">
            <p className="text-sm text-[#8898AA]">
              Showing {(page - 1) * 25 + 1} to {Math.min(page * 25, total)} of{" "}
              {total} results
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage(page - 1)
                  fetchInvoices({ page: page - 1 })
                }}
                className="h-8 border-[#E3E8EE]"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage(page + 1)
                  fetchInvoices({ page: page + 1 })
                }}
                className="h-8 border-[#E3E8EE]"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* No results with filters */}
        {invoices.length === 0 && search && (
          <div className="py-12 text-center">
            <p className="text-sm text-[#8898AA]">No invoices match your search.</p>
          </div>
        )}
        {invoices.length === 0 && !search && (
          <div className="py-12 text-center">
            <p className="text-sm text-[#8898AA]">No invoices in this category.</p>
          </div>
        )}
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Amount</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-method">Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="ACH">ACH</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-reference">Reference (optional)</Label>
              <Input
                id="payment-reference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Check #, transaction ID, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-notes">Notes (optional)</Label>
              <Input
                id="payment-notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Payment notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              disabled={paymentSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={paymentSubmitting}
              className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
            >
              {paymentSubmitting ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---- Invoice Row with Expandable Payment History ----

function InvoiceRowWithExpansion({
  inv,
  isExpanded,
  isOverdue,
  onToggleExpand,
  onView,
  onVoid,
  onRecordPayment,
}: {
  inv: InvoiceRowV2
  isExpanded: boolean
  isOverdue: boolean
  onToggleExpand: () => void
  onView: () => void
  onVoid: () => void
  onRecordPayment: () => void
}) {
  return (
    <>
      <tr
        className={`border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50 cursor-pointer ${
          isOverdue ? "bg-red-50/40" : ""
        }`}
        onClick={onView}
      >
        {/* Expand toggle */}
        <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}>
          <button className="p-0.5 rounded hover:bg-gray-100" aria-label="Toggle payment details">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-[#8898AA]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#8898AA]" />
            )}
          </button>
        </td>

        {/* Invoice # */}
        <td className="px-4 py-3">
          <Link
            href={`/invoices/${inv.id}`}
            className="text-sm font-medium font-mono text-[#635BFF] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {inv.invoiceNumber}
          </Link>
        </td>

        {/* Customer */}
        <td className="px-4 py-3">
          <Link
            href={`/customers/${inv.customer.id}`}
            className="text-sm text-[#0A2540] hover:text-[#635BFF]"
            onClick={(e) => e.stopPropagation()}
          >
            {inv.customer.firstName} {inv.customer.lastName}
          </Link>
        </td>

        {/* Job # */}
        <td className="px-4 py-3">
          {inv.job ? (
            <Link
              href={`/jobs/${inv.job.id}`}
              className="text-sm font-mono text-[#635BFF] hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {inv.job.jobNumber}
            </Link>
          ) : (
            <span className="text-sm text-[#8898AA]">&mdash;</span>
          )}
        </td>

        {/* Amount */}
        <td className="px-4 py-3 text-sm font-medium text-[#0A2540]">
          {formatCurrency(inv.total)}
        </td>

        {/* Due Date */}
        <td className="px-4 py-3 text-sm text-[#425466]">
          {formatDate(inv.dueDate)}
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          <StatusBadge status={inv.status} />
        </td>

        {/* Paid / Due */}
        <td className="px-4 py-3">
          <div className="text-sm">
            <span className="font-medium text-green-600">
              {inv.amountPaid > 0 ? formatCurrency(inv.amountPaid) : "$0.00"}
            </span>
            <span className="text-[#8898AA] mx-1">/</span>
            <span className={inv.amountDue > 0 ? "text-red-600 font-medium" : "text-[#8898AA]"}>
              {formatCurrency(inv.amountDue)}
            </span>
          </div>
        </td>

        {/* Actions */}
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                <MoreHorizontal className="w-4 h-4 text-[#8898AA]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <Eye className="w-4 h-4 mr-2" />
                View
              </DropdownMenuItem>
              {!["VOID", "PAID"].includes(inv.status) && (
                <DropdownMenuItem onClick={onRecordPayment}>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Record Payment
                </DropdownMenuItem>
              )}
              {!["VOID", "PAID"].includes(inv.status) && (
                <DropdownMenuItem
                  onClick={onVoid}
                  className="text-red-600 focus:text-red-600"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Void
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>

      {/* Expanded payment history */}
      {isExpanded && (
        <tr className="border-b border-[#E3E8EE] bg-[#F9FAFB]">
          <td colSpan={9} className="px-8 py-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase text-[#8898AA] tracking-wide">
                Payment History
              </h4>
              {!["VOID", "PAID"].includes(inv.status) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRecordPayment}
                  className="h-7 text-xs border-[#E3E8EE]"
                >
                  <DollarSign className="w-3 h-3 mr-1" />
                  Record Payment
                </Button>
              )}
            </div>
            {inv.payments.length === 0 ? (
              <p className="text-sm text-[#8898AA] italic">No payments recorded yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase text-[#8898AA]">
                    <th className="text-left py-1.5 pr-4">Date</th>
                    <th className="text-left py-1.5 pr-4">Amount</th>
                    <th className="text-left py-1.5 pr-4">Method</th>
                    <th className="text-left py-1.5 pr-4">Status</th>
                    <th className="text-left py-1.5">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.payments.map((p) => (
                    <tr key={p.id} className="border-t border-[#E3E8EE]/50">
                      <td className="py-1.5 pr-4 text-[#425466]">
                        {p.processedAt ? formatDate(p.processedAt) : formatDate(p.createdAt)}
                      </td>
                      <td className="py-1.5 pr-4 font-medium text-[#0A2540]">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-1.5 pr-4 text-[#425466]">
                        <span className="inline-flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          {p.method}
                        </span>
                      </td>
                      <td className="py-1.5 pr-4">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            p.status === "COMPLETED"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-yellow-50 text-yellow-700 border-yellow-200"
                          }`}
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-1.5 text-[#8898AA]">
                        {p.reference || "\u2014"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
