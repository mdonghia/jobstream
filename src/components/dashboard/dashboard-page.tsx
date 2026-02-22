"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DollarSign,
  Briefcase,
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Calendar,
  FileCheck,
  Receipt,
  MessageSquare,
  CalendarClock,
  AlertTriangle,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import type {
  DashboardStats,
  RevenueChartPoint,
  JobsByStatusPoint,
  UpcomingJob,
  ActivityEntry,
  TodaysScheduleJob,
  ActionRequiredData,
} from "@/actions/dashboard"

// =============================================================================
// Props
// =============================================================================

type DashboardPageProps = {
  stats: DashboardStats
  revenueChart: RevenueChartPoint[]
  jobsByStatus: JobsByStatusPoint[]
  upcomingJobs: UpcomingJob[]
  recentActivity: ActivityEntry[]
  todaysSchedule: TodaysScheduleJob[]
  actionRequired: ActionRequiredData
  userName: string
}

// =============================================================================
// Constants
// =============================================================================

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "#635BFF",
  IN_PROGRESS: "#F5A623",
  COMPLETED: "#30D158",
  CANCELLED: "#E25950",
}

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

// =============================================================================
// Helpers
// =============================================================================

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercentage(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function formatTime(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function timeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateString)
}

function getActivityIcon(entityType: string) {
  switch (entityType.toLowerCase()) {
    case "job":
      return <Briefcase className="w-4 h-4" />
    case "invoice":
      return <Receipt className="w-4 h-4" />
    case "quote":
      return <FileCheck className="w-4 h-4" />
    case "customer":
      return <User className="w-4 h-4" />
    case "payment":
      return <DollarSign className="w-4 h-4" />
    case "communication":
      return <MessageSquare className="w-4 h-4" />
    default:
      return <AlertCircle className="w-4 h-4" />
  }
}

function getActivityLink(entityType: string, entityId: string): string | null {
  switch (entityType.toLowerCase()) {
    case "job":
      return `/jobs/${entityId}`
    case "invoice":
      return `/invoices/${entityId}`
    case "quote":
      return `/quotes/${entityId}`
    case "customer":
      return `/customers/${entityId}`
    default:
      return null
  }
}

// =============================================================================
// Custom Tooltip for Revenue Chart
// =============================================================================

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-white border border-[#E3E8EE] rounded-lg shadow-lg px-3 py-2">
      <p className="text-xs text-[#8898AA] mb-1">{label}</p>
      <p className="text-sm font-semibold text-[#0A2540]">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  )
}

// =============================================================================
// Custom Legend for Pie Chart
// =============================================================================

function PieLegend({ payload }: any) {
  if (!payload) return null
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-2">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-[#425466]">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// Component
// =============================================================================

export function DashboardPage({
  stats,
  revenueChart,
  jobsByStatus,
  upcomingJobs,
  recentActivity,
  todaysSchedule,
  actionRequired,
  userName,
}: DashboardPageProps) {
  // Format donut chart data
  const donutData = useMemo(
    () =>
      jobsByStatus.map((item) => ({
        name: STATUS_LABELS[item.status] || item.status,
        value: item.count,
        color: STATUS_COLORS[item.status] || "#8898AA",
      })),
    [jobsByStatus]
  )

  const totalJobs = useMemo(
    () => donutData.reduce((sum, d) => sum + d.value, 0),
    [donutData]
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#0A2540]">
          Welcome back, {userName}!
        </h1>
        <p className="text-[#425466] mt-1">
          Here&apos;s an overview of your business.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Revenue This Month */}
        <Card className="border-[#E3E8EE]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8898AA] font-medium">Revenue This Month</p>
                <p className="text-2xl font-semibold text-[#0A2540] mt-1">
                  {formatCurrency(stats.revenueThisMonth)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#635BFF]/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#635BFF]" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {stats.revenueChange >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-[#30D158]" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-[#E25950]" />
              )}
              <span
                className={`text-xs font-medium ${
                  stats.revenueChange >= 0 ? "text-[#30D158]" : "text-[#E25950]"
                }`}
              >
                {formatPercentage(stats.revenueChange)}
              </span>
              <span className="text-xs text-[#8898AA]">vs last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Jobs Completed */}
        <Card className="border-[#E3E8EE]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8898AA] font-medium">Jobs Completed</p>
                <p className="text-2xl font-semibold text-[#0A2540] mt-1">
                  {stats.jobsCompletedThisMonth}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#30D158]/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#30D158]" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {stats.jobsChange >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-[#30D158]" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-[#E25950]" />
              )}
              <span
                className={`text-xs font-medium ${
                  stats.jobsChange >= 0 ? "text-[#30D158]" : "text-[#E25950]"
                }`}
              >
                {formatPercentage(stats.jobsChange)}
              </span>
              <span className="text-xs text-[#8898AA]">vs last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Invoices */}
        <Card className="border-[#E3E8EE]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8898AA] font-medium">Outstanding Invoices</p>
                <p className="text-2xl font-semibold text-[#0A2540] mt-1">
                  {stats.outstandingInvoices.count}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#F5A623]/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#F5A623]" />
              </div>
            </div>
            <p className="text-xs text-[#8898AA] mt-2">
              {formatCurrency(stats.outstandingInvoices.total)} outstanding
            </p>
          </CardContent>
        </Card>

        {/* Quote Conversion Rate */}
        <Card className="border-[#E3E8EE]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8898AA] font-medium">Quote Conversion</p>
                <p className="text-2xl font-semibold text-[#0A2540] mt-1">
                  {stats.quoteConversionRate.toFixed(1)}%
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#635BFF]/10 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-[#635BFF]" />
              </div>
            </div>
            <p className="text-xs text-[#8898AA] mt-2">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule + Action Required Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Today's Schedule */}
        <Card className="border-[#E3E8EE]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-[#0A2540] flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-[#635BFF]" />
              Today&apos;s Schedule
            </CardTitle>
            <Link
              href="/schedule"
              className="text-xs text-[#635BFF] hover:text-[#635BFF]/80 flex items-center gap-1 font-medium"
            >
              Full Schedule
              <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {todaysSchedule.length > 0 ? (
              <div className="space-y-2">
                {todaysSchedule.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#F6F8FA] transition-colors border border-[#E3E8EE]"
                  >
                    {/* Time column */}
                    <div className="flex-shrink-0 w-[90px] text-right">
                      {job.scheduledStart && (
                        <p className="text-xs font-semibold text-[#0A2540]">
                          {formatTime(job.scheduledStart)}
                        </p>
                      )}
                      {job.scheduledEnd && (
                        <p className="text-[11px] text-[#8898AA]">
                          {formatTime(job.scheduledEnd)}
                        </p>
                      )}
                    </div>
                    {/* Vertical accent bar */}
                    <div
                      className="w-0.5 self-stretch rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          job.status === "IN_PROGRESS" ? "#F5A623" : "#635BFF",
                      }}
                    />
                    {/* Job details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[#0A2540] truncate">
                          {job.title}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 shrink-0 ${
                            job.status === "IN_PROGRESS"
                              ? "border-[#F5A623] text-[#F5A623] bg-[#F5A623]/10"
                              : "border-[#E3E8EE] text-[#8898AA]"
                          }`}
                        >
                          {STATUS_LABELS[job.status] || job.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#425466] mt-0.5">
                        {job.customerName}
                      </p>
                      {/* Assigned team member dots */}
                      {job.assignees.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          {job.assignees.map((assignee, idx) => (
                            <div
                              key={idx}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                              style={{ backgroundColor: assignee.color }}
                              title={assignee.name}
                            >
                              {assignee.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                          ))}
                          <span className="text-[11px] text-[#8898AA] ml-1">
                            {job.assignees.map((a) => a.name.split(" ")[0]).join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarClock className="w-10 h-10 text-[#8898AA] mx-auto mb-2" />
                <p className="text-sm text-[#8898AA]">No jobs scheduled for today</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Required */}
        <Card className="border-[#E3E8EE]">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#0A2540] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#F5A623]" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Overdue Invoices */}
            {actionRequired.overdueInvoices.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 rounded-full bg-[#E25950]" />
                  <h4 className="text-xs font-semibold text-[#0A2540] uppercase tracking-wider">
                    Overdue Invoices
                  </h4>
                  <span className="ml-auto text-[11px] font-medium text-[#E25950] bg-[#E25950]/10 px-1.5 py-0.5 rounded-full">
                    {actionRequired.overdueInvoices.length}
                  </span>
                </div>
                <div className="space-y-1">
                  {actionRequired.overdueInvoices.map((inv) => (
                    <Link
                      key={inv.id}
                      href={`/invoices/${inv.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F6F8FA] transition-colors border-l-2 border-[#E25950] pl-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[#0A2540]">
                            {inv.invoiceNumber}
                          </p>
                          <span className="text-xs text-[#8898AA]">
                            {inv.customer.firstName} {inv.customer.lastName}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#E25950] mt-0.5">
                          Due {new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-[#0A2540]">
                        {formatCurrency(inv.amountDue)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Quotes */}
            {actionRequired.pendingQuotes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 rounded-full bg-[#F5A623]" />
                  <h4 className="text-xs font-semibold text-[#0A2540] uppercase tracking-wider">
                    Pending Quotes
                  </h4>
                  <span className="ml-auto text-[11px] font-medium text-[#F5A623] bg-[#F5A623]/10 px-1.5 py-0.5 rounded-full">
                    {actionRequired.pendingQuotes.length}
                  </span>
                </div>
                <div className="space-y-1">
                  {actionRequired.pendingQuotes.map((q) => (
                    <Link
                      key={q.id}
                      href={`/quotes/${q.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F6F8FA] transition-colors border-l-2 border-[#F5A623] pl-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[#0A2540]">
                            {q.quoteNumber}
                          </p>
                          <span className="text-xs text-[#8898AA]">
                            {q.customer.firstName} {q.customer.lastName}
                          </span>
                        </div>
                        {q.sentAt && (
                          <p className="text-[11px] text-[#8898AA] mt-0.5">
                            Sent {new Date(q.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-[#0A2540]">
                        {formatCurrency(q.total)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Bookings */}
            {actionRequired.pendingBookings.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 rounded-full bg-[#635BFF]" />
                  <h4 className="text-xs font-semibold text-[#0A2540] uppercase tracking-wider">
                    Pending Bookings
                  </h4>
                  <span className="ml-auto text-[11px] font-medium text-[#635BFF] bg-[#635BFF]/10 px-1.5 py-0.5 rounded-full">
                    {actionRequired.pendingBookings.length}
                  </span>
                </div>
                <div className="space-y-1">
                  {actionRequired.pendingBookings.map((b) => (
                    <Link
                      key={b.id}
                      href="/bookings"
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F6F8FA] transition-colors border-l-2 border-[#635BFF] pl-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0A2540]">
                          {b.customerName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {b.service && (
                            <span className="text-[11px] text-[#8898AA]">
                              {b.service.name}
                            </span>
                          )}
                          {b.preferredDate && (
                            <span className="text-[11px] text-[#8898AA]">
                              {new Date(b.preferredDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#8898AA] flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state when nothing requires action */}
            {actionRequired.overdueInvoices.length === 0 &&
              actionRequired.pendingQuotes.length === 0 &&
              actionRequired.pendingBookings.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="w-10 h-10 text-[#30D158] mx-auto mb-2" />
                  <p className="text-sm font-medium text-[#425466]">You&apos;re all caught up!</p>
                  <p className="text-xs text-[#8898AA] mt-1">
                    No overdue invoices, pending quotes, or bookings.
                  </p>
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Chart - takes 2 columns */}
        <Card className="border-[#E3E8EE] lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#0A2540]">
              Revenue (Last 12 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueChart}>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#8898AA" }}
                    axisLine={{ stroke: "#E3E8EE" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#8898AA" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) =>
                      value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`
                    }
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#635BFF"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: "#635BFF", stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Jobs by Status Donut - takes 1 column */}
        <Card className="border-[#E3E8EE]">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#0A2540]">
              Jobs by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex flex-col items-center justify-center">
              {totalJobs > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [value, name]}
                      contentStyle={{
                        border: "1px solid #E3E8EE",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend content={<PieLegend />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center">
                  <Briefcase className="w-10 h-10 text-[#8898AA] mx-auto mb-2" />
                  <p className="text-sm text-[#8898AA]">No jobs yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Upcoming Schedule + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Schedule */}
        <Card className="border-[#E3E8EE]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-[#0A2540]">
              Upcoming Schedule
            </CardTitle>
            <Link
              href="/schedule"
              className="text-xs text-[#635BFF] hover:text-[#635BFF]/80 flex items-center gap-1 font-medium"
            >
              View Full Schedule
              <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingJobs.length > 0 ? (
              <div className="space-y-3">
                {upcomingJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#F6F8FA] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#635BFF]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Calendar className="w-4 h-4 text-[#635BFF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[#0A2540] truncate">
                          {job.title}
                        </p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#E3E8EE] text-[#8898AA] shrink-0">
                          {job.jobNumber}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#425466] mt-0.5">{job.customerName}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-[#8898AA]" />
                        <span className="text-xs text-[#8898AA]">
                          {formatDate(job.scheduledStart)} at {formatTime(job.scheduledStart)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-[#8898AA] mx-auto mb-2" />
                <p className="text-sm text-[#8898AA]">No upcoming jobs</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-[#E3E8EE]">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#0A2540]">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {recentActivity.map((entry) => {
                  const link = getActivityLink(entry.entityType, entry.entityId)
                  const content = (
                    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-[#F6F8FA] transition-colors">
                      <div className="w-7 h-7 rounded-full bg-[#F6F8FA] border border-[#E3E8EE] flex items-center justify-center flex-shrink-0 mt-0.5">
                        {getActivityIcon(entry.entityType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#0A2540] leading-snug">
                          {entry.description}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {entry.userName && (
                            <span className="text-xs text-[#8898AA]">{entry.userName}</span>
                          )}
                          <span className="text-xs text-[#8898AA]">
                            {timeAgo(entry.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )

                  return link ? (
                    <Link key={entry.id} href={link}>
                      {content}
                    </Link>
                  ) : (
                    <div key={entry.id}>{content}</div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-10 h-10 text-[#8898AA] mx-auto mb-2" />
                <p className="text-sm text-[#8898AA]">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
