"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  FileText,
  Search,
  MoreHorizontal,
  Eye,
  Copy,
  Trash2,
  Plus,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { formatCurrency, formatDate } from "@/lib/utils"
import { toast } from "sonner"
import { getQuotes, duplicateQuote, deleteQuote } from "@/actions/quotes"

// ── Types ──────────────────────────────────────────────────────────────────

interface QuoteRow {
  id: string
  quoteNumber: string
  status: string
  total: number
  subtotal: number
  taxAmount: number
  createdAt: string | Date
  validUntil: string | Date
  customer: {
    id: string
    firstName: string
    lastName: string
  }
}

interface QuoteListProps {
  initialQuotes: QuoteRow[]
  initialStatusCounts: Record<string, number>
  initialTotal: number
  initialPage: number
  initialTotalPages: number
}

// ── Status badge (local) ───────────────────────────────────────────────────

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
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || "bg-gray-100 text-gray-700"}`}
    >
      {display}
    </span>
  )
}

// ── Tabs config ────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "APPROVED", label: "Approved" },
  { value: "DECLINED", label: "Declined" },
  { value: "EXPIRED", label: "Expired" },
]

// ── Component ──────────────────────────────────────────────────────────────

export function QuoteList({
  initialQuotes,
  initialStatusCounts,
  initialTotal,
  initialPage,
  initialTotalPages,
}: QuoteListProps) {
  const router = useRouter()

  const [quotes, setQuotes] = useState<QuoteRow[]>(initialQuotes)
  const [statusCounts, setStatusCounts] = useState(initialStatusCounts)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("ALL")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Fetch quotes ─────────────────────────────────────────────────────────

  const fetchQuotes = useCallback(
    async (params?: {
      search?: string
      status?: string
      sortBy?: string
      sortOrder?: "asc" | "desc"
      page?: number
    }) => {
      setLoading(true)
      try {
        const result = await getQuotes({
          search: params?.search ?? search,
          status: params?.status ?? activeTab,
          sortBy: params?.sortBy ?? sortBy,
          sortOrder: params?.sortOrder ?? sortOrder,
          page: params?.page ?? page,
          perPage: 25,
        })
        if ("error" in result) {
          toast.error(result.error as string)
        } else {
          setQuotes(result.quotes as any)
          setTotal(result.total)
          setPage(result.page)
          setTotalPages(result.totalPages)
          if (result.statusCounts) setStatusCounts(result.statusCounts)
        }
      } catch {
        toast.error("Failed to load quotes")
      } finally {
        setLoading(false)
      }
    },
    [search, activeTab, sortBy, sortOrder, page]
  )

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuotes({ search, page: 1 })
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // ── Sort handler ─────────────────────────────────────────────────────────

  function handleSort(column: string) {
    const newOrder = sortBy === column && sortOrder === "asc" ? "desc" : "asc"
    setSortBy(column)
    setSortOrder(newOrder)
    fetchQuotes({ sortBy: column, sortOrder: newOrder })
  }

  // ── Tab change ───────────────────────────────────────────────────────────

  function handleTabChange(value: string) {
    setActiveTab(value)
    setPage(1)
    fetchQuotes({ status: value, page: 1 })
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handleDuplicate(quoteId: string) {
    const result = await duplicateQuote(quoteId)
    if ("error" in result) {
      toast.error(result.error as string)
      return
    }
    toast.success("Quote duplicated")
    if (result.quoteId) {
      router.push(`/quotes/${result.quoteId}`)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    const result = await deleteQuote(deleteId)
    if ("error" in result) {
      toast.error(result.error as string)
    } else {
      toast.success("Quote deleted")
      fetchQuotes()
    }
    setDeleting(false)
    setDeleteId(null)
  }

  // ── Sort header ──────────────────────────────────────────────────────────

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
          <span className="text-[#635BFF]">{sortOrder === "asc" ? "\u2191" : "\u2193"}</span>
        )}
      </span>
    </th>
  )

  // ── Total count for a tab ────────────────────────────────────────────────

  function tabCount(status: string): number {
    if (status === "ALL") {
      return Object.values(statusCounts).reduce((sum, c) => sum + c, 0)
    }
    return statusCounts[status] || 0
  }

  // ── Empty state (no quotes at all) ───────────────────────────────────────

  const noQuotesAtAll =
    total === 0 && !search && activeTab === "ALL" && Object.values(statusCounts).every((c) => c === 0)

  if (noQuotesAtAll) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <FileText className="w-16 h-16 text-[#8898AA] mb-4" />
        <h2 className="text-lg font-semibold text-[#0A2540] mb-2">No quotes yet</h2>
        <p className="text-sm text-[#425466] max-w-md">
          Create your first quote to send a professional estimate to a customer.
        </p>
        <Button asChild className="mt-4 bg-[#635BFF] hover:bg-[#5851ea] text-white">
          <Link href="/quotes/new">New Quote</Link>
        </Button>
      </div>
    )
  }

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#0A2540]">Quotes</h1>
          <p className="text-sm text-[#8898AA] mt-0.5">{total} total</p>
        </div>
        <Button asChild className="bg-[#635BFF] hover:bg-[#5851ea] text-white">
          <Link href="/quotes/new">
            <Plus className="w-4 h-4 mr-1.5" />
            New Quote
          </Link>
        </Button>
      </div>

      {/* Status tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-4">
        <TabsList className="bg-transparent border-b border-[#E3E8EE] rounded-none w-full justify-start h-10 p-0 gap-0 overflow-x-auto overflow-y-hidden">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#635BFF] data-[state=active]:text-[#635BFF] data-[state=active]:shadow-none px-4 py-2.5 text-sm text-[#8898AA] hover:text-[#425466]"
            >
              {tab.label}
              <span className="ml-1.5 text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">
                {tabCount(tab.value)}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8898AA]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by quote number or customer name..."
          className="pl-10 h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#E3E8EE] overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`w-full ${loading ? "opacity-50" : ""}`}>
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
                <SortHeader column="quoteNumber">Quote #</SortHeader>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Customer
                </th>
                <SortHeader column="total">Amount</SortHeader>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Status
                </th>
                <SortHeader column="createdAt">Created</SortHeader>
                <SortHeader column="validUntil">Valid Until</SortHeader>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr
                  key={quote.id}
                  className="border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50 cursor-pointer"
                  onClick={() => router.push(`/quotes/${quote.id}`)}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/quotes/${quote.id}`}
                      className="text-sm font-mono text-[#635BFF] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {quote.quoteNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#0A2540]">
                    {quote.customer.firstName} {quote.customer.lastName}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-[#0A2540]">
                    {formatCurrency(quote.total)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={quote.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-[#425466]">
                    {formatDate(quote.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#425466]">
                    {formatDate(quote.validUntil)}
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
                          <Link href={`/quotes/${quote.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(quote.id)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        {quote.status === "DRAFT" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteId(quote.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E3E8EE]">
            <p className="text-sm text-[#8898AA]">
              Showing {(page - 1) * 25 + 1} to {Math.min(page * 25, total)} of {total} results
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage(page - 1)
                  fetchQuotes({ page: page - 1 })
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
                  fetchQuotes({ page: page + 1 })
                }}
                className="h-8 border-[#E3E8EE]"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* No results with filters */}
        {quotes.length === 0 && (search || activeTab !== "ALL") && (
          <div className="py-12 text-center">
            <p className="text-sm text-[#8898AA]">No quotes match your filters.</p>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        title="Delete Quote"
        description="Are you sure you want to delete this draft quote? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  )
}
