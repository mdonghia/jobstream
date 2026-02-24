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
  Copy,
  Ban,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
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
import { formatCurrency, formatDate } from "@/lib/utils"
import { toast } from "sonner"
import { getInvoices, voidInvoice } from "@/actions/invoices"

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvoiceRow {
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
}

interface Summary {
  outstanding: number
  outstandingCount: number
  overdue: number
  overdueCount: number
  paidThisMonth: number
}

interface InvoiceListProps {
  initialInvoices: InvoiceRow[]
  initialSummary: Summary
  initialStatusCounts: Record<string, number>
  initialTotal: number
  initialPage: number
  initialTotalPages: number
}

// ─── Status Badge ────────────────────────────────────────────────────────────

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

// ─── Main Component ──────────────────────────────────────────────────────────

export function InvoiceList({
  initialInvoices,
  initialSummary,
  initialStatusCounts,
  initialTotal,
  initialPage,
  initialTotalPages,
}: InvoiceListProps) {
  const router = useRouter()

  const [invoices, setInvoices] = useState(initialInvoices)
  const [summary, setSummary] = useState(initialSummary)
  const [statusCounts, setStatusCounts] = useState(initialStatusCounts)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("ALL")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const fetchInvoices = useCallback(
    async (params?: {
      status?: string
      search?: string
      sortBy?: string
      sortOrder?: "asc" | "desc"
      page?: number
    }) => {
      setLoading(true)
      try {
        const result = await getInvoices({
          status: params?.status ?? activeTab,
          search: params?.search ?? search,
          sortBy: params?.sortBy ?? sortBy,
          sortOrder: params?.sortOrder ?? sortOrder,
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
        setStatusCounts(result.statusCounts)
        setSummary(result.summary)
      } catch {
        toast.error("Failed to load invoices")
      } finally {
        setLoading(false)
      }
    },
    [activeTab, search, sortBy, sortOrder, page]
  )

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices({ search, page: 1 })
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    setPage(1)
    fetchInvoices({ status: tab, page: 1 })
  }

  function handleSort(column: string) {
    const newOrder = sortBy === column && sortOrder === "asc" ? "desc" : "asc"
    setSortBy(column)
    setSortOrder(newOrder)
    fetchInvoices({ sortBy: column, sortOrder: newOrder })
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

  const allCount = Object.values(statusCounts).reduce((sum, c) => sum + c, 0)

  const SortHeader = ({
    column,
    children,
  }: {
    column: string
    children: React.ReactNode
  }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA] cursor-pointer hover:text-[#425466] select-none"
      onClick={() => handleSort(column)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortBy === column && (
          <span className="text-[#635BFF]">
            {sortOrder === "asc" ? "\u2191" : "\u2193"}
          </span>
        )}
      </span>
    </th>
  )

  // ─── Empty State ─────────────────────────────────────────────────────────

  if (
    allCount === 0 &&
    !search &&
    activeTab === "ALL"
  ) {
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
          <Plus className="w-4 h-4 mr-2" />
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
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Outstanding */}
        <div className="bg-white rounded-lg border border-[#E3E8EE] p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-[#8898AA]" />
            <span className="text-xs font-medium text-[#8898AA] uppercase tracking-wide">
              Outstanding
            </span>
          </div>
          <p className="text-xl font-semibold text-[#0A2540]">
            {formatCurrency(summary.outstanding)}
          </p>
          <p className="text-xs text-[#8898AA] mt-0.5">
            {summary.outstandingCount} invoice{summary.outstandingCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Overdue */}
        <div
          className={`bg-white rounded-lg border p-4 ${
            summary.overdueCount > 0 ? "border-red-200 bg-red-50/30" : "border-[#E3E8EE]"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle
              className={`w-4 h-4 ${summary.overdueCount > 0 ? "text-red-500" : "text-[#8898AA]"}`}
            />
            <span className="text-xs font-medium text-[#8898AA] uppercase tracking-wide">
              Overdue
            </span>
          </div>
          <p
            className={`text-xl font-semibold ${
              summary.overdueCount > 0 ? "text-red-600" : "text-[#0A2540]"
            }`}
          >
            {formatCurrency(summary.overdue)}
          </p>
          <p className="text-xs text-[#8898AA] mt-0.5">
            {summary.overdueCount} invoice{summary.overdueCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Paid This Month */}
        <div className="bg-white rounded-lg border border-[#E3E8EE] p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-[#8898AA] uppercase tracking-wide">
              Paid This Month
            </span>
          </div>
          <p className="text-xl font-semibold text-[#0A2540]">
            {formatCurrency(summary.paidThisMonth)}
          </p>
        </div>

      </div>

      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-4">
        <TabsList className="bg-[#F6F8FA] border border-[#E3E8EE] h-9 overflow-x-auto overflow-y-hidden w-full justify-start">
          <TabsTrigger value="ALL" className="text-xs data-[state=active]:bg-white">
            All <span className="ml-1 text-[#8898AA]">({allCount})</span>
          </TabsTrigger>
          <TabsTrigger value="DRAFT" className="text-xs data-[state=active]:bg-white">
            Draft <span className="ml-1 text-[#8898AA]">({statusCounts.DRAFT ?? 0})</span>
          </TabsTrigger>
          <TabsTrigger value="OUTSTANDING" className="text-xs data-[state=active]:bg-white">
            Outstanding
            <span className="ml-1 text-[#8898AA]">
              ({(statusCounts.SENT ?? 0) + (statusCounts.VIEWED ?? 0) + (statusCounts.PARTIALLY_PAID ?? 0) + (statusCounts.OVERDUE ?? 0)})
            </span>
          </TabsTrigger>
          <TabsTrigger value="OVERDUE" className="text-xs data-[state=active]:bg-white">
            Overdue <span className="ml-1 text-[#8898AA]">({statusCounts.OVERDUE ?? 0})</span>
          </TabsTrigger>
          <TabsTrigger value="PAID" className="text-xs data-[state=active]:bg-white">
            Paid <span className="ml-1 text-[#8898AA]">({statusCounts.PAID ?? 0})</span>
          </TabsTrigger>
          <TabsTrigger value="VOID" className="text-xs data-[state=active]:bg-white">
            Void <span className="ml-1 text-[#8898AA]">({statusCounts.VOID ?? 0})</span>
          </TabsTrigger>
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
                <SortHeader column="invoiceNumber">Invoice #</SortHeader>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Customer
                </th>
                <SortHeader column="total">Amount</SortHeader>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Status
                </th>
                <SortHeader column="createdAt">Issued</SortHeader>
                <SortHeader column="dueDate">Due Date</SortHeader>
                <SortHeader column="amountPaid">Paid</SortHeader>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const isOverdue = inv.status === "OVERDUE"
                return (
                  <tr
                    key={inv.id}
                    className={`border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50 cursor-pointer ${
                      isOverdue ? "bg-red-50/40" : ""
                    }`}
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-sm font-medium font-mono text-[#635BFF] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/customers/${inv.customer.id}`}
                        className="text-sm text-[#0A2540] hover:text-[#635BFF]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {inv.customer.firstName} {inv.customer.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-[#0A2540]">
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-[#425466]">
                      {formatDate(inv.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#425466]">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-sm font-medium text-[#0A2540]">
                          {inv.amountPaid > 0 ? formatCurrency(inv.amountPaid) : "\u2014"}
                        </span>
                        {inv.paidAt && (
                          <p className="text-xs text-[#8898AA]">
                            {formatDate(inv.paidAt)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                            <MoreHorizontal className="w-4 h-4 text-[#8898AA]" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/invoices/${inv.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/invoices/new?duplicate=${inv.id}`
                              )
                            }
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          {inv.status !== "VOID" && inv.status !== "PAID" && (
                            <DropdownMenuItem
                              onClick={() => handleVoid(inv.id)}
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
        {invoices.length === 0 && (search || activeTab !== "ALL") && (
          <div className="py-12 text-center">
            <p className="text-sm text-[#8898AA]">No invoices match your filters.</p>
          </div>
        )}
      </div>
    </>
  )
}
