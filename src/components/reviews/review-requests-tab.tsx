"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Mail, MousePointerClick, Percent, ChevronLeft, ChevronRight } from "lucide-react"

type DateRange = "this_month" | "last_month" | "this_quarter" | "all_time"

type ReviewRequestItem = {
  id: string
  sentAt: string
  clickedAt: string | null
  customer: { id: string; firstName: string; lastName: string } | null
  job: { id: string; jobNumber: string } | null
}

type Props = {
  initialStats?: { totalSent: number; uniqueClicked: number; conversionRate: number }
  initialRequests?: ReviewRequestItem[]
  initialTotal?: number
}

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  this_month: "This Month",
  last_month: "Last Month",
  this_quarter: "This Quarter",
  all_time: "All Time",
}

export function ReviewRequestsTab({ initialStats, initialRequests, initialTotal }: Props) {
  const [dateRange, setDateRange] = useState<DateRange>("this_month")
  const [stats, setStats] = useState(initialStats || { totalSent: 0, uniqueClicked: 0, conversionRate: 0 })
  const [requests, setRequests] = useState<ReviewRequestItem[]>(initialRequests || [])
  const [total, setTotal] = useState(initialTotal || 0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isPending, startTransition] = useTransition()

  const perPage = 25

  const loadData = useCallback(async (range: DateRange, p: number) => {
    startTransition(async () => {
      try {
        const mod = await import("@/actions/reviews")

        const [statsResult, requestsResult] = await Promise.all([
          mod.getReviewRequestStats(range),
          mod.getReviewRequests(range, p, perPage),
        ])

        if (statsResult && !("error" in statsResult)) {
          setStats(statsResult)
        }
        if (requestsResult && !("error" in requestsResult)) {
          setRequests(
            requestsResult.requests.map((r: any) => ({
              ...r,
              sentAt: r.sentAt instanceof Date ? r.sentAt.toISOString() : r.sentAt,
              clickedAt: r.clickedAt
                ? r.clickedAt instanceof Date
                  ? r.clickedAt.toISOString()
                  : r.clickedAt
                : null,
            })),
          )
          setTotal(requestsResult.total)
          setTotalPages(requestsResult.totalPages)
        }
      } catch (e) {
        console.error("Failed to load review request data:", e)
      }
    })
  }, [])

  useEffect(() => {
    loadData(dateRange, page)
  }, [dateRange, page, loadData])

  function handleDateRangeChange(value: string) {
    setDateRange(value as DateRange)
    setPage(1)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Track review request emails sent to customers after jobs are completed.
        See how many customers opened the email and clicked through to leave a review.
        Configure automatic requests in Settings &gt; Reviews.
      </p>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2.5 dark:bg-blue-950">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Requests Sent</p>
                <p className="text-2xl font-bold">{stats.totalSent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-2.5 dark:bg-green-950">
                <MousePointerClick className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customers Clicked</p>
                <p className="text-2xl font-bold">{stats.uniqueClicked}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2.5 dark:bg-purple-950">
                <Percent className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{stats.conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date range filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recent Requests</h3>
        <Select value={dateRange} onValueChange={handleDateRangeChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DATE_RANGE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Requests table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Clicked?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {isPending
                      ? "Loading..."
                      : "No review requests sent in this period."}
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">
                      {req.customer
                        ? `${req.customer.firstName} ${req.customer.lastName}`
                        : "Unknown"}
                    </TableCell>
                    <TableCell>
                      {req.job ? req.job.jobNumber : "-"}
                    </TableCell>
                    <TableCell>{formatDate(req.sentAt)}</TableCell>
                    <TableCell>
                      {req.clickedAt ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200">
                          Yes ({formatDate(req.clickedAt)})
                        </Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
