"use client"

import { useState, useCallback, useEffect } from "react"
import {
  CreditCard,
  Search,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Download,
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
import { toast } from "sonner"
import { format } from "date-fns"
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
  processedAt: string | null
  createdAt: string
}

interface PaymentSummary {
  receivedThisMonth: number
  receivedLastMonth: number
  outstanding: number
  overdue: number
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
  receivedLastMonth: 0,
  outstanding: 0,
  overdue: 0,
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
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

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
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
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
          })))
          if (result.summary) setSummary(result.summary)
        }
        setLoading(false)
      }
    } catch {
      // Server actions not yet available
    }
  }, [search, methodFilter, statusFilter, dateFrom, dateTo])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPayments()
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchPayments])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#0A2540]">Payments</h1>
          <p className="text-sm text-[#8898AA] mt-0.5">
            Track payment history and outstanding balances
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                  Received Last Month
                </p>
                <p className="text-2xl font-semibold text-[#0A2540] mt-1">
                  {formatCurrency(summary.receivedLastMonth)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#F6F8FA] flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-[#8898AA]" />
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

            <div className="flex flex-wrap gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 w-[140px] border-[#E3E8EE] text-sm"
                placeholder="From"
                aria-label="Date from"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 w-[140px] border-[#E3E8EE] text-sm"
                placeholder="To"
                aria-label="Date to"
              />

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
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const method = methodConfig[payment.method]
                    const status = statusConfig[payment.status]
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
                        <td className="px-4 py-3 text-sm text-[#635BFF] font-mono">
                          {payment.invoiceNumber ?? (
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
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
