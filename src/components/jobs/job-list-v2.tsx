"use client"

import { useState, useEffect, useTransition, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Search, Plus, Briefcase } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { formatDate, formatCurrency } from "@/lib/utils"
import { getJobsV2, getJobTabCounts } from "@/actions/jobs-v2"
import type { JobFilterTab } from "@/lib/job-filter-tab"

// =============================================================================
// Types
// =============================================================================

interface SerializedVisit {
  id: string
  visitNumber: number
  status: string
  scheduledStart: string | null
  schedulingType: string
  purpose: string | null
  assignments: {
    user: {
      id: string
      firstName: string
      lastName: string
      color: string | null
    }
  }[]
}

interface SerializedQuote {
  id: string
  quoteNumber: string
  total: number
  sentAt: string | null
  status: string
}

interface SerializedInvoice {
  id: string
  invoiceNumber: string
  total: number
  amountDue: number
  dueDate: string | null
  status: string
}

interface SerializedLineItem {
  total: number
}

interface SerializedJob {
  id: string
  jobNumber: string
  title: string
  isEmergency: boolean
  createdAt: string
  customer: {
    id: string
    firstName: string
    lastName: string
  }
  visits: SerializedVisit[]
  quotes: SerializedQuote[]
  invoices: SerializedInvoice[]
  lineItems: SerializedLineItem[]
}

// =============================================================================
// Tab definitions
// =============================================================================

const TAB_CONFIG: { value: JobFilterTab; label: string }[] = [
  { value: "unscheduled", label: "Unscheduled" },
  { value: "upcoming", label: "Upcoming" },
  { value: "awaiting_approval", label: "Awaiting Approval" },
  { value: "needs_invoicing", label: "Needs Invoicing" },
  { value: "awaiting_payment", label: "Awaiting Payment" },
  { value: "closed", label: "Closed" },
  { value: "recurring", label: "Recurring" },
]

// Recurrence label lookup for the Recurring tab
const RECURRENCE_LABELS: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  BIWEEKLY: "Biweekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUALLY: "Annually",
}

// =============================================================================
// Helpers
// =============================================================================

/** Days between a date and now. Returns 0 if the date is today or in the future. */
function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0
  const then = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - then.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

/** Find the most-relevant quote (first SENT one, or just the first) */
function primaryQuote(quotes: SerializedQuote[]): SerializedQuote | null {
  return quotes.find((q) => q.status === "SENT") ?? quotes[0] ?? null
}

/** Find the most-relevant invoice (first unpaid one, or just the first) */
function primaryInvoice(invoices: SerializedInvoice[]): SerializedInvoice | null {
  const unpaid = invoices.find((inv) =>
    ["SENT", "VIEWED", "OVERDUE", "PARTIALLY_PAID"].includes(inv.status)
  )
  return unpaid ?? invoices[0] ?? null
}

/** Find the next upcoming visit (earliest SCHEDULED/EN_ROUTE/IN_PROGRESS by date) */
function nextUpcomingVisit(visits: SerializedVisit[]): SerializedVisit | null {
  const active = visits
    .filter(
      (v) =>
        v.status === "SCHEDULED" || v.status === "EN_ROUTE" || v.status === "IN_PROGRESS"
    )
    .sort((a, b) => {
      if (!a.scheduledStart) return 1
      if (!b.scheduledStart) return -1
      return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
    })
  return active[0] ?? null
}

/** Count completed (non-cancelled) visits */
function completedVisitCount(visits: SerializedVisit[]): number {
  return visits.filter((v) => v.status === "COMPLETED").length
}

/** Sum line item totals */
function lineItemsTotal(items: SerializedLineItem[]): number {
  return items.reduce((sum, li) => sum + li.total, 0)
}

/** Get the first assigned tech for the next visit */
function assignedTech(visit: SerializedVisit | null): string {
  if (!visit || visit.assignments.length === 0) return "Unassigned"
  const tech = visit.assignments[0].user
  return `${tech.firstName} ${tech.lastName}`
}

/** Find the date a job was closed -- uses latest completed visit, falling back to latest cancelled visit */
function closedDate(visits: SerializedVisit[]): string | null {
  const completed = visits
    .filter((v) => v.status === "COMPLETED" && v.scheduledStart)
    .sort((a, b) => {
      return (
        new Date(b.scheduledStart!).getTime() - new Date(a.scheduledStart!).getTime()
      )
    })
  if (completed[0]?.scheduledStart) return completed[0].scheduledStart

  // Fallback: if no completed visits, use the latest cancelled visit
  const cancelled = visits
    .filter((v) => v.status === "CANCELLED" && v.scheduledStart)
    .sort((a, b) => {
      return (
        new Date(b.scheduledStart!).getTime() - new Date(a.scheduledStart!).getTime()
      )
    })
  return cancelled[0]?.scheduledStart ?? null
}

// =============================================================================
// Component
// =============================================================================

export default function JobListV2() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // State
  const [activeTab, setActiveTab] = useState<JobFilterTab>("unscheduled")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [jobs, setJobs] = useState<SerializedJob[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [tabCounts, setTabCounts] = useState<Record<JobFilterTab, number>>({
    recurring: 0,
    awaiting_approval: 0,
    unscheduled: 0,
    upcoming: 0,
    needs_invoicing: 0,
    awaiting_payment: 0,
    closed: 0,
  })

  // Track whether this is the initial mount so we can load data
  const initialLoadDone = useRef(false)

  // ----- Fetch jobs -----
  const fetchJobs = useCallback(
    (tab: JobFilterTab, searchQuery: string, pageNum: number) => {
      startTransition(async () => {
        const result = await getJobsV2({
          tab,
          search: searchQuery || undefined,
          page: pageNum,
          perPage: 25,
        })
        if ("error" in result) {
          toast.error(result.error as string)
        } else {
          setJobs(result.jobs as SerializedJob[])
          setTotal(result.total)
          setPage(result.page)
          setTotalPages(result.totalPages)
          if (result.tabCounts) {
            setTabCounts(result.tabCounts)
          }
        }
      })
    },
    []
  )

  // ----- Initial load -----
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true
      // Load tab counts
      startTransition(async () => {
        const counts = await getJobTabCounts()
        setTabCounts(counts)
      })
      // Load initial tab data
      fetchJobs(activeTab, "", 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ----- Debounced search -----
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchJobs(activeTab, search, 1)
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // ----- Tab change -----
  function handleTabChange(tab: string) {
    const newTab = tab as JobFilterTab
    setActiveTab(newTab)
    setPage(1)
    setSearch("")
    fetchJobs(newTab, "", 1)
  }

  // ----- Pagination -----
  function handlePrev() {
    const newPage = page - 1
    setPage(newPage)
    fetchJobs(activeTab, search, newPage)
  }

  function handleNext() {
    const newPage = page + 1
    setPage(newPage)
    fetchJobs(activeTab, search, newPage)
  }

  // ==========================================================================
  // Column renderers per tab
  // ==========================================================================

  function renderTableHeaders() {
    const headerClass =
      "px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]"

    switch (activeTab) {
      case "unscheduled":
        return (
          <TableRow className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
            <TableHead className={headerClass}>Job #</TableHead>
            <TableHead className={headerClass}>Customer</TableHead>
            <TableHead className={headerClass}>Service</TableHead>
            <TableHead className={headerClass}>Emergency</TableHead>
            <TableHead className={headerClass}>Date Created</TableHead>
          </TableRow>
        )
      case "upcoming":
        return (
          <TableRow className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
            <TableHead className={headerClass}>Job #</TableHead>
            <TableHead className={headerClass}>Customer</TableHead>
            <TableHead className={headerClass}>Service</TableHead>
            <TableHead className={headerClass}>Next Visit</TableHead>
            <TableHead className={headerClass}>Assigned Tech</TableHead>
          </TableRow>
        )
      case "awaiting_approval":
        return (
          <TableRow className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
            <TableHead className={headerClass}>Job #</TableHead>
            <TableHead className={headerClass}>Customer</TableHead>
            <TableHead className={headerClass}>Quote #</TableHead>
            <TableHead className={headerClass}>Quote Amount</TableHead>
            <TableHead className={headerClass}>Sent Date</TableHead>
            <TableHead className={headerClass}>Days Waiting</TableHead>
          </TableRow>
        )
      case "needs_invoicing":
        return (
          <TableRow className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
            <TableHead className={headerClass}>Job #</TableHead>
            <TableHead className={headerClass}>Customer</TableHead>
            <TableHead className={headerClass}>Service</TableHead>
            <TableHead className={headerClass}>Visits Completed</TableHead>
            <TableHead className={headerClass}>Line Items Total</TableHead>
          </TableRow>
        )
      case "awaiting_payment":
        return (
          <TableRow className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
            <TableHead className={headerClass}>Job #</TableHead>
            <TableHead className={headerClass}>Customer</TableHead>
            <TableHead className={headerClass}>Invoice #</TableHead>
            <TableHead className={headerClass}>Invoice Amount</TableHead>
            <TableHead className={headerClass}>Due Date</TableHead>
            <TableHead className={headerClass}>Days Outstanding</TableHead>
          </TableRow>
        )
      case "closed":
        return (
          <TableRow className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
            <TableHead className={headerClass}>Job #</TableHead>
            <TableHead className={headerClass}>Customer</TableHead>
            <TableHead className={headerClass}>Service</TableHead>
            <TableHead className={headerClass}>Total Invoiced</TableHead>
            <TableHead className={headerClass}>Date Closed</TableHead>
          </TableRow>
        )
      case "recurring":
        return (
          <TableRow className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
            <TableHead className={headerClass}>Job #</TableHead>
            <TableHead className={headerClass}>Customer</TableHead>
            <TableHead className={headerClass}>Service</TableHead>
            <TableHead className={headerClass}>Frequency</TableHead>
            <TableHead className={headerClass}>Next Visit</TableHead>
            <TableHead className={headerClass}>Last Completed</TableHead>
          </TableRow>
        )
    }
  }

  function renderTableRow(job: SerializedJob) {
    const jobLink = (
      <Link
        href={`/jobs/${job.id}`}
        className="text-sm font-medium text-[#635BFF] hover:underline font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {job.jobNumber}
      </Link>
    )

    const customerName = `${job.customer.firstName} ${job.customer.lastName}`

    const emergencyBadge = job.isEmergency ? (
      <Badge variant="destructive" className="text-[10px]">
        Emergency
      </Badge>
    ) : (
      <span className="text-sm text-[#8898AA]">--</span>
    )

    switch (activeTab) {
      case "unscheduled":
        return (
          <TableRow
            key={job.id}
            className="border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50 cursor-pointer"
            onClick={() => router.push(`/jobs/${job.id}`)}
          >
            <TableCell className="px-4 py-3">{jobLink}</TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#0A2540]">
              {customerName}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#425466] max-w-[250px] truncate">
              {job.title}
            </TableCell>
            <TableCell className="px-4 py-3">{emergencyBadge}</TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#425466]">
              {formatDate(job.createdAt)}
            </TableCell>
          </TableRow>
        )

      case "upcoming": {
        const nextVisit = nextUpcomingVisit(job.visits)
        return (
          <TableRow
            key={job.id}
            className="border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50 cursor-pointer"
            onClick={() => router.push(`/jobs/${job.id}`)}
          >
            <TableCell className="px-4 py-3">{jobLink}</TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#0A2540]">
              {customerName}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#425466] max-w-[250px] truncate">
              {job.title}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#425466]">
              {nextVisit?.scheduledStart
                ? formatDate(nextVisit.scheduledStart)
                : "Not scheduled"}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#425466]">
              {assignedTech(nextVisit)}
            </TableCell>
          </TableRow>
        )
      }

      case "awaiting_approval": {
        const quote = primaryQuote(job.quotes)
        return (
          <TableRow
            key={job.id}
            className="border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50 cursor-pointer"
            onClick={() => router.push(`/jobs/${job.id}`)}
          >
            <TableCell className="px-4 py-3">{jobLink}</TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#0A2540]">
              {customerName}
            </TableCell>
            <TableCell className="px-4 py-3">
              {quote ? (
                <Link
                  href={`/quotes/${quote.id}`}
                  className="text-sm font-medium text-[#635BFF] hover:underline font-mono"
                  onClick={(e) => e.stopPropagation()}
                >
                  {quote.quoteNumber}
                </Link>
              ) : (
                <span className="text-sm text-[#8898AA]">--</span>
              )}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#425466]">
              {quote ? formatCurrency(quote.total) : "--"}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#425466]">
              {quote?.sentAt ? formatDate(quote.sentAt) : "--"}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#425466]">
              {quote?.sentAt ? `${daysSince(quote.sentAt)}d` : "--"}
            </TableCell>
          </TableRow>
        )
      }

      case "needs_invoicing":
        return (
          <TableRow
            key={job.id}
            className="border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50 cursor-pointer"
            onClick={() => router.push(`/jobs/${job.id}`)}
          >
            <TableCell className="px-4 py-3">{jobLink}</TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#0A2540]">
              {customerName}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#425466] max-w-[250px] truncate">
              {job.title}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#425466]">
              {completedVisitCount(job.visits)}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#425466]">
              {formatCurrency(lineItemsTotal(job.lineItems))}
            </TableCell>
          </TableRow>
        )

      case "awaiting_payment": {
        const invoice = primaryInvoice(job.invoices)
        return (
          <TableRow
            key={job.id}
            className="border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50 cursor-pointer"
            onClick={() => router.push(`/jobs/${job.id}`)}
          >
            <TableCell className="px-4 py-3">{jobLink}</TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#0A2540]">
              {customerName}
            </TableCell>
            <TableCell className="px-4 py-3">
              {invoice ? (
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="text-sm font-medium text-[#635BFF] hover:underline font-mono"
                  onClick={(e) => e.stopPropagation()}
                >
                  {invoice.invoiceNumber}
                </Link>
              ) : (
                <span className="text-sm text-[#8898AA]">--</span>
              )}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#425466]">
              {invoice ? formatCurrency(invoice.amountDue) : "--"}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#425466]">
              {invoice?.dueDate ? formatDate(invoice.dueDate) : "--"}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#425466]">
              {invoice?.dueDate ? `${daysSince(invoice.dueDate)}d` : "--"}
            </TableCell>
          </TableRow>
        )
      }

      case "closed": {
        const totalInvoiced = job.invoices.reduce((sum, inv) => sum + inv.total, 0)
        // Use the latest completed visit date as "date closed", falling back to cancelled
        const jobClosedDate = closedDate(job.visits)
        return (
          <TableRow
            key={job.id}
            className="border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50 cursor-pointer"
            onClick={() => router.push(`/jobs/${job.id}`)}
          >
            <TableCell className="px-4 py-3">{jobLink}</TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#0A2540]">
              {customerName}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#425466] max-w-[250px] truncate">
              {job.title}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#425466]">
              {formatCurrency(totalInvoiced)}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#425466]">
              {jobClosedDate ? formatDate(jobClosedDate) : "--"}
            </TableCell>
          </TableRow>
        )
      }

      case "recurring": {
        const nextVisit = nextUpcomingVisit(job.visits)
        const lastCompleted = closedDate(job.visits)
        // Try to infer frequency from visit purpose or fallback
        // The recurrence rule is on the Job model, not in the serialized data currently.
        // We'll show frequency based on visit pattern or fallback.
        return (
          <TableRow
            key={job.id}
            className="border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50 cursor-pointer"
            onClick={() => router.push(`/jobs/${job.id}`)}
          >
            <TableCell className="px-4 py-3">{jobLink}</TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#0A2540]">
              {customerName}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#425466] max-w-[250px] truncate">
              {job.title}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#425466]">
              {(job as any).recurrenceRule
                ? RECURRENCE_LABELS[(job as any).recurrenceRule] || (job as any).recurrenceRule
                : "Recurring"}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#425466]">
              {nextVisit?.scheduledStart
                ? formatDate(nextVisit.scheduledStart)
                : "Not scheduled"}
            </TableCell>
            <TableCell className="px-4 py-3 text-sm text-[#425466]">
              {lastCompleted ? formatDate(lastCompleted) : "--"}
            </TableCell>
          </TableRow>
        )
      }
    }
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#0A2540]">Jobs</h1>
          <p className="text-sm text-[#8898AA] mt-0.5">{total} total</p>
        </div>
        <Button asChild className="bg-[#635BFF] hover:bg-[#5851ea] text-white">
          <Link href="/jobs/new">
            <Plus className="w-4 h-4 mr-1.5" />
            New Job
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8898AA]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by job number, quote number, customer, service, address..."
          className="pl-10 h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
        />
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
        <TabsList
          variant="line"
          className="flex gap-0 border-b border-[#E3E8EE] overflow-x-auto overflow-y-hidden w-full"
        >
          {TAB_CONFIG.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px rounded-none ${
                activeTab === tab.value
                  ? "border-[#635BFF] text-[#0A2540]"
                  : "border-transparent text-[#8898AA] hover:text-[#425466]"
              }`}
            >
              {tab.label}
              <Badge
                variant="secondary"
                className={`ml-1.5 text-[10px] rounded-full px-1.5 py-0 min-w-[20px] h-[18px] ${
                  activeTab === tab.value
                    ? "bg-[#635BFF]/10 text-[#635BFF]"
                    : "bg-gray-100 text-[#8898AA]"
                }`}
              >
                {tabCounts[tab.value] ?? 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#E3E8EE] overflow-hidden">
        <div className={isPending ? "opacity-50 pointer-events-none" : ""}>
          <Table>
            <TableHeader>{renderTableHeaders()}</TableHeader>
            <TableBody>
              {jobs.length > 0
                ? jobs.map((job) => renderTableRow(job))
                : null}
            </TableBody>
          </Table>
        </div>

        {/* Empty state */}
        {jobs.length === 0 && !isPending && (
          <div className="py-12 text-center">
            {search ? (
              <p className="text-sm text-[#8898AA]">
                No jobs match your search.
              </p>
            ) : (
              <div className="flex flex-col items-center">
                <Briefcase
                  className="w-12 h-12 text-[#8898AA] mb-3"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-[#8898AA]">
                  No jobs in this category.
                </p>
              </div>
            )}
          </div>
        )}

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
                disabled={page <= 1 || isPending}
                onClick={handlePrev}
                className="h-8 border-[#E3E8EE]"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isPending}
                onClick={handleNext}
                className="h-8 border-[#E3E8EE]"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
