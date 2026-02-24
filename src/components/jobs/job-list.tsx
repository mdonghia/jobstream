"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Briefcase,
  Search,
  MoreHorizontal,
  Plus,
  ChevronUp,
  ChevronDown,
  CalendarIcon,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup,
} from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatDate, formatTime, getInitials, isJobUnscheduled } from "@/lib/utils"
import { toast } from "sonner"
import { getJobs } from "@/actions/jobs"

// ---- Types ----

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  avatar: string | null
  color: string | null
}

interface JobAssignment {
  user: TeamMember
}

interface JobRow {
  id: string
  jobNumber: string
  title: string
  status: string
  priority: string
  scheduledStart: string | Date | null
  scheduledEnd: string | Date | null
  isRecurring?: boolean
  recurrenceRule?: string | null
  customer: {
    id: string
    firstName: string
    lastName: string
  }
  assignments: JobAssignment[]
}

interface JobListProps {
  initialJobs: JobRow[]
  initialTotal: number
  initialPage: number
  initialTotalPages: number
  initialStatusCounts: Record<string, number>
  teamMembers: TeamMember[]
}

// ---- Helpers ----

const STATUS_TABS = [
  { value: "ALL", label: "All" },
  { value: "UNSCHEDULED", label: "Unscheduled" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
]

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-50 text-blue-700",
  HIGH: "bg-amber-50 text-amber-700",
  URGENT: "bg-red-50 text-red-700",
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const RECURRENCE_LABELS: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  BIWEEKLY: "Biweekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUALLY: "Annually",
}

// ---- Component ----

export function JobList({
  initialJobs,
  initialTotal,
  initialPage,
  initialTotalPages,
  initialStatusCounts,
  teamMembers,
}: JobListProps) {
  const router = useRouter()

  const [jobs, setJobs] = useState(initialJobs)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [statusCounts, setStatusCounts] = useState(initialStatusCounts)
  const [loading, setLoading] = useState(false)

  // Filters
  const [search, setSearch] = useState("")
  const [statusTab, setStatusTab] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [assignedFilter, setAssignedFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("ALL")
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [sortBy, setSortBy] = useState("scheduledStart")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const fetchJobs = useCallback(
    async (params?: {
      search?: string
      status?: string
      assignedUserId?: string
      priority?: string
      dateFrom?: string
      dateTo?: string
      sortBy?: string
      sortOrder?: "asc" | "desc"
      page?: number
    }) => {
      setLoading(true)
      try {
        const effectiveStatus = params?.status ?? statusTab
        const effectiveAssigned = params?.assignedUserId ?? assignedFilter
        const effectivePriority = params?.priority ?? priorityFilter

        const result = await getJobs({
          search: params?.search ?? search,
          status: effectiveStatus === "ALL" ? undefined : effectiveStatus,
          assignedUserId: effectiveAssigned === "all" ? undefined : effectiveAssigned,
          priority: effectivePriority === "ALL" ? undefined : effectivePriority,
          dateFrom: params?.dateFrom ?? (dateFrom ? dateFrom.toISOString() : undefined),
          dateTo: params?.dateTo ?? (dateTo ? dateTo.toISOString() : undefined),
          sortBy: params?.sortBy ?? sortBy,
          sortOrder: params?.sortOrder ?? sortOrder,
          page: params?.page ?? page,
          perPage: 25,
        })
        if ("error" in result) {
          toast.error(result.error as string)
        } else {
          setJobs(result.jobs as any)
          setTotal(result.total)
          setPage(result.page)
          setTotalPages(result.totalPages)
          if (result.statusCounts) {
            setStatusCounts(result.statusCounts)
          }
        }
      } catch {
        toast.error("Failed to load jobs")
      } finally {
        setLoading(false)
      }
    },
    [search, statusTab, assignedFilter, priorityFilter, dateFrom, dateTo, sortBy, sortOrder, page]
  )

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobs({ search, page: 1 })
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function handleSort(column: string) {
    const newOrder = sortBy === column && sortOrder === "asc" ? "desc" : "asc"
    setSortBy(column)
    setSortOrder(newOrder)
    fetchJobs({ sortBy: column, sortOrder: newOrder })
  }

  function handleStatusTab(tab: string) {
    setStatusTab(tab)
    setPage(1)
    fetchJobs({ status: tab, page: 1 })
  }

  function handleFilterChange(key: string, value: string) {
    if (key === "status") {
      setStatusFilter(value)
      fetchJobs({ status: value, page: 1 })
    }
    if (key === "assignedUserId") {
      setAssignedFilter(value)
      fetchJobs({ assignedUserId: value, page: 1 })
    }
    if (key === "priority") {
      setPriorityFilter(value)
      fetchJobs({ priority: value, page: 1 })
    }
    setPage(1)
  }

  function getTabCount(tab: string): number {
    if (tab === "ALL") {
      // Exclude UNSCHEDULED from the sum since those jobs are already counted under SCHEDULED
      return Object.entries(statusCounts)
        .filter(([key]) => key !== "UNSCHEDULED")
        .reduce((sum, [, c]) => sum + c, 0)
    }
    return statusCounts[tab] || 0
  }

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
        {sortBy === column &&
          (sortOrder === "asc" ? (
            <ChevronUp className="w-3 h-3 text-[#635BFF]" />
          ) : (
            <ChevronDown className="w-3 h-3 text-[#635BFF]" />
          ))}
      </span>
    </th>
  )

  // Total empty state: no jobs at all
  const totalJobCount = Object.values(statusCounts).reduce((sum, c) => sum + c, 0)
  if (totalJobCount === 0 && !search && !dateFrom && !dateTo) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Briefcase className="w-16 h-16 text-[#8898AA] mb-4" strokeWidth={1.5} />
        <h2 className="text-lg font-semibold text-[#0A2540] mb-2">No jobs yet</h2>
        <p className="text-sm text-[#425466] max-w-md">
          Create your first job to start tracking work for your customers.
        </p>
        <Button asChild className="mt-4 bg-[#635BFF] hover:bg-[#5851ea] text-white">
          <Link href="/jobs/new">New Job</Link>
        </Button>
      </div>
    )
  }

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

      {/* Status Tabs */}
      <div className="flex gap-1 mb-4 border-b border-[#E3E8EE] overflow-x-auto overflow-y-hidden">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleStatusTab(tab.value)}
            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              statusTab === tab.value
                ? "border-[#635BFF] text-[#0A2540]"
                : "border-transparent text-[#8898AA] hover:text-[#425466]"
            }`}
          >
            {tab.label}
            <span
              className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                statusTab === tab.value
                  ? "bg-[#635BFF]/10 text-[#635BFF]"
                  : "bg-gray-100 text-[#8898AA]"
              }`}
            >
              {getTabCount(tab.value)}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8898AA]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name, job number, or title..."
          className="pl-10 h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select
          value={assignedFilter}
          onValueChange={(v) => handleFilterChange("assignedUserId", v)}
        >
          <SelectTrigger className="w-[160px] h-9 border-[#E3E8EE] text-sm">
            <SelectValue placeholder="Assigned To" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Members</SelectItem>
            {teamMembers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={priorityFilter}
          onValueChange={(v) => handleFilterChange("priority", v)}
        >
          <SelectTrigger className="w-[130px] h-9 border-[#E3E8EE] text-sm">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Priorities</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 border-[#E3E8EE] text-sm text-[#425466]">
              <CalendarIcon className="w-4 h-4 mr-1.5" />
              {dateFrom
                ? dateTo
                  ? `${formatDate(dateFrom)} - ${formatDate(dateTo)}`
                  : `From ${formatDate(dateFrom)}`
                : "Date Range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={
                dateFrom
                  ? { from: dateFrom, to: dateTo }
                  : undefined
              }
              onSelect={(range) => {
                setDateFrom(range?.from)
                setDateTo(range?.to)
                if (range?.from && range?.to) {
                  fetchJobs({
                    dateFrom: range.from.toISOString(),
                    dateTo: range.to.toISOString(),
                    page: 1,
                  })
                  setPage(1)
                }
              }}
            />
            {(dateFrom || dateTo) && (
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-sm"
                  onClick={() => {
                    setDateFrom(undefined)
                    setDateTo(undefined)
                    fetchJobs({ dateFrom: "", dateTo: "", page: 1 })
                    setPage(1)
                  }}
                >
                  Clear dates
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#E3E8EE] overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`w-full ${loading ? "opacity-50" : ""}`}>
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
                <SortHeader column="jobNumber">Job #</SortHeader>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Assigned
                </th>
                <SortHeader column="scheduledStart">Scheduled</SortHeader>
                <SortHeader column="priority">Priority</SortHeader>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Status
                </th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50 cursor-pointer"
                  onClick={() => router.push(`/jobs/${job.id}`)}
                >
                  {/* Job Number */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-sm font-medium text-[#635BFF] hover:underline font-mono"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {job.jobNumber}
                    </Link>
                  </td>

                  {/* Customer */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/${job.customer.id}`}
                      className="text-sm text-[#0A2540] hover:text-[#635BFF]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {job.customer.firstName} {job.customer.lastName}
                    </Link>
                  </td>

                  {/* Title */}
                  <td className="px-4 py-3 text-sm text-[#425466] max-w-[250px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{job.title}</span>
                      {job.isRecurring && (
                        <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-[#635BFF]/10 border border-[#635BFF]/20 text-[#635BFF] text-[10px] font-medium px-1.5 py-0.5">
                          <RotateCcw className="w-2.5 h-2.5" />
                          {RECURRENCE_LABELS[job.recurrenceRule || ""] || "Recurring"}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Assigned */}
                  <td className="px-4 py-3">
                    {job.assignments.length > 0 ? (
                      <AvatarGroup>
                        {job.assignments.slice(0, 3).map((a) => (
                          <Avatar key={a.user.id} size="sm">
                            {a.user.avatar ? (
                              <AvatarImage src={a.user.avatar} />
                            ) : null}
                            <AvatarFallback
                              className="text-[10px]"
                              style={{
                                backgroundColor: a.user.color || "#635BFF",
                                color: "#fff",
                              }}
                            >
                              {getInitials(a.user.firstName, a.user.lastName)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {job.assignments.length > 3 && (
                          <Avatar size="sm">
                            <AvatarFallback className="text-[10px] bg-gray-200 text-gray-600">
                              +{job.assignments.length - 3}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </AvatarGroup>
                    ) : (
                      <span className="text-xs text-[#8898AA]">Unassigned</span>
                    )}
                  </td>

                  {/* Scheduled */}
                  <td className="px-4 py-3 text-sm text-[#425466]">
                    {!isJobUnscheduled(job.scheduledStart) ? (
                      <div>
                        <span>{formatDate(job.scheduledStart!)}</span>
                        <span className="block text-xs text-[#8898AA]">
                          {formatTime(job.scheduledStart!)}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs px-2 py-0.5">Unscheduled</span>
                    )}
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        PRIORITY_COLORS[job.priority] || PRIORITY_COLORS.MEDIUM
                      }`}
                    >
                      {toTitleCase(job.priority)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={job.status} />
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
                        <DropdownMenuItem asChild>
                          <Link href={`/jobs/${job.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/jobs/new?duplicate=${job.id}`}>Duplicate</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/invoices/new?jobId=${job.id}`}
                            className="text-[#425466]"
                          >
                            Create Invoice
                          </Link>
                        </DropdownMenuItem>
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
                  fetchJobs({ page: page - 1 })
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
                  fetchJobs({ page: page + 1 })
                }}
                className="h-8 border-[#E3E8EE]"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* No results with filters */}
        {jobs.length === 0 && (search || statusTab !== "ALL") && (
          <div className="py-12 text-center">
            <p className="text-sm text-[#8898AA]">No jobs match your filters.</p>
          </div>
        )}
      </div>
    </>
  )
}
