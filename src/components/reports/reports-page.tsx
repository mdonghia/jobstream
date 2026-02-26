"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  DollarSign,
  Briefcase,
  FileText,
  Users,
  CreditCard,
  Download,
  TrendingUp,
  Clock,
  XCircle,
  CheckCircle,
  Loader2,
  CalendarClock,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts"
import {
  subDays,
  subMonths,
  format,
} from "date-fns"
import {
  getRevenueReport,
  getInvoicesReport,
  getPaymentsReport,
  getJobsReport,
  getTeamReport,
  getTimeTrackingReport,
  scheduleReport,
} from "@/actions/reports"
import type {
  RevenueReportResult,
  InvoicesReportResult,
  PaymentsReportResult,
  JobsReportResult,
  TeamReportResult,
  TimeTrackingReportResult,
} from "@/actions/reports"

// =============================================================================
// Types
// =============================================================================

type DatePreset = "last_7_days" | "last_30_days" | "last_3_months" | "last_6_months" | "last_12_months" | "custom"

type DateRange = {
  dateFrom: string
  dateTo: string
}

// =============================================================================
// Helpers
// =============================================================================

function getDateRangeForPreset(preset: DatePreset, customDateFrom?: string, customDateTo?: string): DateRange {
  const now = new Date()
  switch (preset) {
    case "last_7_days":
      return {
        dateFrom: subDays(now, 6).toISOString(),
        dateTo: now.toISOString(),
      }
    case "last_30_days":
      return {
        dateFrom: subDays(now, 29).toISOString(),
        dateTo: now.toISOString(),
      }
    case "last_3_months":
      return {
        dateFrom: subMonths(now, 3).toISOString(),
        dateTo: now.toISOString(),
      }
    case "last_6_months":
      return {
        dateFrom: subMonths(now, 6).toISOString(),
        dateTo: now.toISOString(),
      }
    case "last_12_months":
      return {
        dateFrom: subMonths(now, 12).toISOString(),
        dateTo: now.toISOString(),
      }
    case "custom":
      return {
        dateFrom: customDateFrom || format(subDays(now, 6), "yyyy-MM-dd"),
        dateTo: customDateTo || format(now, "yyyy-MM-dd"),
      }
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMinutesToDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

function downloadCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h]
          if (typeof val === "string" && val.includes(",")) {
            return `"${val}"`
          }
          return val
        })
        .join(",")
    ),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

// Map tab values to human-readable report type names
const TAB_TO_REPORT_TYPE: Record<string, string> = {
  invoices: "invoices",
  payments: "payments",
  jobs: "jobs",
  team_activity: "team_activity",
  time_tracking: "time_tracking",
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  invoices: "Invoices",
  payments: "Payments",
  jobs: "Jobs",
  team_activity: "Team Activity",
  time_tracking: "Time Tracking",
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

// =============================================================================
// Custom Tooltip
// =============================================================================

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-white border border-[#E3E8EE] rounded-lg shadow-lg px-3 py-2">
      <p className="text-xs text-[#8898AA] mb-1">{label}</p>
      {payload.map((item: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: item.color }}>
          {item.name}: {typeof item.value === "number" && item.name.toLowerCase().includes("revenue")
            ? formatCurrency(item.value)
            : typeof item.value === "number" && item.name.toLowerCase().includes("rate")
              ? `${item.value}%`
              : item.value}
        </p>
      ))}
    </div>
  )
}

// =============================================================================
// Stat Card Component
// =============================================================================

function StatCard({
  label,
  value,
  icon: Icon,
  color = "#635BFF",
}: {
  label: string
  value: string | number
  icon: any
  color?: string
}) {
  return (
    <Card className="border-[#E3E8EE]">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#8898AA] font-medium">{label}</p>
            <p className="text-2xl font-semibold text-[#0A2540] mt-1">{value}</p>
          </div>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// Loading Spinner
// =============================================================================

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 text-[#635BFF] animate-spin" />
    </div>
  )
}

// =============================================================================
// Status Badge
// =============================================================================

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PAID: "bg-green-100 text-green-800",
    COMPLETED: "bg-green-100 text-green-800",
    SENT: "bg-blue-100 text-blue-800",
    VIEWED: "bg-blue-100 text-blue-800",
    DRAFT: "bg-gray-100 text-gray-800",
    OVERDUE: "bg-red-100 text-red-800",
    VOID: "bg-gray-100 text-gray-500",
    PARTIALLY_PAID: "bg-yellow-100 text-yellow-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    FAILED: "bg-red-100 text-red-800",
    REFUNDED: "bg-purple-100 text-purple-800",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}>
      {status.replace(/_/g, " ")}
    </span>
  )
}

// =============================================================================
// Invoices Tab
// =============================================================================

function InvoicesTab({
  revenueData,
  invoicesData,
}: {
  revenueData: RevenueReportResult | null
  invoicesData: InvoicesReportResult | null
}) {
  if (!revenueData || !invoicesData) return <LoadingState />

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={formatCurrency(revenueData.summary.totalRevenue)} icon={DollarSign} />
        <StatCard label="Total Invoices" value={invoicesData.summary.totalInvoices} icon={FileText} color="#635BFF" />
        <StatCard label="Total Paid" value={formatCurrency(invoicesData.summary.totalPaid)} icon={CheckCircle} color="#30D158" />
        <StatCard label="Outstanding" value={formatCurrency(invoicesData.summary.totalOutstanding)} icon={Clock} color="#E25950" />
      </div>

      {/* Revenue by Month Bar Chart */}
      <Card className="border-[#E3E8EE]">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-[#0A2540]">
            Revenue by Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EE" />
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
                  tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue" fill="#635BFF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Individual Invoice Table */}
      <Card className="border-[#E3E8EE]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#0A2540]">
            Invoice Details
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="border-[#E3E8EE] text-[#425466]"
            onClick={() =>
              downloadCSV(
                invoicesData.invoices.map((inv) => ({
                  "Invoice #": inv.invoiceNumber,
                  Customer: inv.customerName,
                  "Job #": inv.jobNumber || "N/A",
                  Amount: inv.amount.toFixed(2),
                  "Due Date": new Date(inv.dueDate).toLocaleDateString(),
                  Status: inv.status,
                  "Date Paid": inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : "N/A",
                })),
                "invoices-report"
              )
            }
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            CSV
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#E3E8EE]">
                <TableHead className="text-[#8898AA]">Invoice #</TableHead>
                <TableHead className="text-[#8898AA]">Customer</TableHead>
                <TableHead className="text-[#8898AA]">Job #</TableHead>
                <TableHead className="text-[#8898AA] text-right">Amount</TableHead>
                <TableHead className="text-[#8898AA]">Due Date</TableHead>
                <TableHead className="text-[#8898AA]">Status</TableHead>
                <TableHead className="text-[#8898AA]">Date Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoicesData.invoices.length > 0 ? (
                invoicesData.invoices.map((inv) => (
                  <TableRow key={inv.id} className="border-[#E3E8EE]">
                    <TableCell className="text-[#0A2540] font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell className="text-[#425466]">{inv.customerName}</TableCell>
                    <TableCell className="text-[#425466]">{inv.jobNumber || "--"}</TableCell>
                    <TableCell className="text-[#425466] text-right">{formatCurrency(inv.amount)}</TableCell>
                    <TableCell className="text-[#425466]">{new Date(inv.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                    <TableCell className="text-[#425466]">
                      {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : "--"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-[#8898AA] py-8">
                    No invoices for this period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// Payments Tab
// =============================================================================

function PaymentsTab({ data }: { data: PaymentsReportResult | null }) {
  if (!data) return <LoadingState />

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Payments" value={data.summary.totalPayments} icon={CreditCard} />
        <StatCard label="Total Amount" value={formatCurrency(data.summary.totalAmount)} icon={DollarSign} color="#30D158" />
        <StatCard
          label="Most Common Method"
          value={data.summary.byMethod.length > 0 ? data.summary.byMethod[0].method : "N/A"}
          icon={TrendingUp}
          color="#F5A623"
        />
      </div>

      {/* Payments by Method */}
      {data.summary.byMethod.length > 0 && (
        <Card className="border-[#E3E8EE]">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#0A2540]">
              Payments by Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.summary.byMethod}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EE" />
                  <XAxis
                    dataKey="method"
                    tick={{ fontSize: 11, fill: "#8898AA" }}
                    axisLine={{ stroke: "#E3E8EE" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#8898AA" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" name="Amount" fill="#30D158" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Payments Table */}
      <Card className="border-[#E3E8EE]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#0A2540]">
            Payment Records
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="border-[#E3E8EE] text-[#425466]"
            onClick={() =>
              downloadCSV(
                data.payments.map((p) => ({
                  "Payment Date": new Date(p.paymentDate).toLocaleDateString(),
                  "Invoice #": p.invoiceNumber,
                  Customer: p.customerName,
                  Amount: p.amount.toFixed(2),
                  Method: p.method,
                  Status: p.status,
                })),
                "payments-report"
              )
            }
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            CSV
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#E3E8EE]">
                <TableHead className="text-[#8898AA]">Payment Date</TableHead>
                <TableHead className="text-[#8898AA]">Invoice #</TableHead>
                <TableHead className="text-[#8898AA]">Customer</TableHead>
                <TableHead className="text-[#8898AA] text-right">Amount</TableHead>
                <TableHead className="text-[#8898AA]">Method</TableHead>
                <TableHead className="text-[#8898AA]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.payments.length > 0 ? (
                data.payments.map((p) => (
                  <TableRow key={p.id} className="border-[#E3E8EE]">
                    <TableCell className="text-[#0A2540] font-medium">
                      {new Date(p.paymentDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-[#425466]">{p.invoiceNumber}</TableCell>
                    <TableCell className="text-[#425466]">{p.customerName}</TableCell>
                    <TableCell className="text-[#425466] text-right">{formatCurrency(p.amount)}</TableCell>
                    <TableCell className="text-[#425466]">{p.method}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-[#8898AA] py-8">
                    No payments for this period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// Jobs Tab
// =============================================================================

function JobsTab({ data }: { data: JobsReportResult | null }) {
  if (!data) return <LoadingState />

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Total Jobs" value={data.summary.total} icon={Briefcase} />
        <StatCard label="Completed" value={data.summary.completed} icon={CheckCircle} color="#30D158" />
        <StatCard label="Cancelled" value={data.summary.cancelled} icon={XCircle} color="#E25950" />
        <StatCard label="Avg. Completion" value={formatMinutesToDuration(data.summary.avgCompletionMinutes)} icon={Clock} color="#F5A623" />
      </div>

      {/* Jobs by Month Stacked Bar */}
      <Card className="border-[#E3E8EE]">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-[#0A2540]">
            Jobs by Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.jobsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EE" />
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
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: "12px" }}
                  formatter={(value) => <span className="text-[#425466]">{value}</span>}
                />
                <Bar dataKey="completed" name="Completed" stackId="a" fill="#30D158" radius={[0, 0, 0, 0]} />
                <Bar dataKey="cancelled" name="Cancelled" stackId="a" fill="#E25950" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Jobs by Service Type */}
      <Card className="border-[#E3E8EE]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#0A2540]">
            Jobs by Service Type
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="border-[#E3E8EE] text-[#425466]"
            onClick={() =>
              downloadCSV(
                data.jobsByServiceType.map((r) => ({
                  Service: r.service,
                  Count: r.count,
                })),
                "jobs-by-service-type"
              )
            }
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            CSV
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#E3E8EE]">
                <TableHead className="text-[#8898AA]">Service</TableHead>
                <TableHead className="text-[#8898AA] text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.jobsByServiceType.length > 0 ? (
                data.jobsByServiceType.map((row) => (
                  <TableRow key={row.service} className="border-[#E3E8EE]">
                    <TableCell className="text-[#0A2540] font-medium">{row.service}</TableCell>
                    <TableCell className="text-[#425466] text-right">{row.count}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-[#8898AA] py-8">
                    No data for this period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Jobs by Team Member */}
      <Card className="border-[#E3E8EE]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#0A2540]">
            Jobs by Team Member
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="border-[#E3E8EE] text-[#425466]"
            onClick={() =>
              downloadCSV(
                data.jobsByTeamMember.map((r) => ({
                  "Team Member": r.name,
                  "Jobs Assigned": r.count,
                })),
                "jobs-by-team-member"
              )
            }
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            CSV
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#E3E8EE]">
                <TableHead className="text-[#8898AA]">Team Member</TableHead>
                <TableHead className="text-[#8898AA] text-right">Jobs Assigned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.jobsByTeamMember.length > 0 ? (
                data.jobsByTeamMember.map((row) => (
                  <TableRow key={row.userId} className="border-[#E3E8EE]">
                    <TableCell className="text-[#0A2540] font-medium">{row.name}</TableCell>
                    <TableCell className="text-[#425466] text-right">{row.count}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-[#8898AA] py-8">
                    No data for this period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// Team Activity Tab
// =============================================================================

function TeamActivityTab({ data }: { data: TeamReportResult | null }) {
  if (!data) return <LoadingState />

  // Sort by hours for chart
  const chartData = [...data.members]
    .sort((a, b) => b.hoursWorked - a.hoursWorked)
    .slice(0, 15)

  return (
    <div className="space-y-6">
      {/* Horizontal Bar Chart - Hours by Team Member */}
      <Card className="border-[#E3E8EE]">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-[#0A2540]">
            Hours by Team Member
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E3E8EE" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#8898AA" }}
                    axisLine={{ stroke: "#E3E8EE" }}
                    tickLine={false}
                    tickFormatter={(v) => `${v}h`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#8898AA" }}
                    axisLine={false}
                    tickLine={false}
                    width={120}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="hoursWorked" name="Hours" fill="#635BFF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-[#8898AA]">No time entries for this period</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Performance Table */}
      <Card className="border-[#E3E8EE]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#0A2540]">
            Team Performance
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="border-[#E3E8EE] text-[#425466]"
            onClick={() =>
              downloadCSV(
                data.members.map((m) => ({
                  "Team Member": m.name,
                  "Hours Worked": m.hoursWorked,
                  "Jobs Completed": m.jobsCompleted,
                  "Revenue Generated": m.revenueGenerated.toFixed(2),
                })),
                "team-performance"
              )
            }
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            CSV
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#E3E8EE]">
                <TableHead className="text-[#8898AA]">Team Member</TableHead>
                <TableHead className="text-[#8898AA] text-right">Hours Worked</TableHead>
                <TableHead className="text-[#8898AA] text-right">Jobs Completed</TableHead>
                <TableHead className="text-[#8898AA] text-right">Revenue Generated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.members.length > 0 ? (
                data.members.map((row) => (
                  <TableRow key={row.userId} className="border-[#E3E8EE]">
                    <TableCell className="text-[#0A2540] font-medium">{row.name}</TableCell>
                    <TableCell className="text-[#425466] text-right">{row.hoursWorked}h</TableCell>
                    <TableCell className="text-[#425466] text-right">{row.jobsCompleted}</TableCell>
                    <TableCell className="text-[#425466] text-right">{formatCurrency(row.revenueGenerated)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-[#8898AA] py-8">
                    No team data for this period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// Time Tracking Tab
// =============================================================================

function TimeTrackingTab({ data }: { data: TimeTrackingReportResult | null }) {
  if (!data) return <LoadingState />

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Hours" value={`${data.summary.totalHours}h`} icon={Clock} />
        <StatCard label="Days Tracked" value={data.summary.totalDays} icon={CalendarClock} color="#635BFF" />
        <StatCard label="Avg Hours / Day" value={`${data.summary.avgHoursPerDay}h`} icon={TrendingUp} color="#30D158" />
      </div>

      {/* Time Tracking Table */}
      <Card className="border-[#E3E8EE]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#0A2540]">
            Daily Time by Team Member
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="border-[#E3E8EE] text-[#425466]"
            onClick={() =>
              downloadCSV(
                data.entries.map((e) => ({
                  "Team Member": e.name,
                  Date: new Date(e.date + "T00:00:00").toLocaleDateString(),
                  "Start Time": e.startTime ? new Date(e.startTime).toLocaleTimeString() : "N/A",
                  "End Time": e.endTime ? new Date(e.endTime).toLocaleTimeString() : "N/A",
                  "Total Hours": e.totalHours,
                })),
                "time-tracking-report"
              )
            }
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            CSV
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#E3E8EE]">
                <TableHead className="text-[#8898AA]">Team Member</TableHead>
                <TableHead className="text-[#8898AA]">Date</TableHead>
                <TableHead className="text-[#8898AA]">Start Time</TableHead>
                <TableHead className="text-[#8898AA]">End Time</TableHead>
                <TableHead className="text-[#8898AA] text-right">Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.entries.length > 0 ? (
                data.entries.map((entry, i) => (
                  <TableRow key={`${entry.userId}-${entry.date}-${i}`} className="border-[#E3E8EE]">
                    <TableCell className="text-[#0A2540] font-medium">{entry.name}</TableCell>
                    <TableCell className="text-[#425466]">
                      {new Date(entry.date + "T00:00:00").toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-[#425466]">
                      {entry.startTime ? new Date(entry.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}
                    </TableCell>
                    <TableCell className="text-[#425466]">
                      {entry.endTime ? new Date(entry.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}
                    </TableCell>
                    <TableCell className="text-[#425466] text-right">{entry.totalHours}h</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-[#8898AA] py-8">
                    No time tracking data for this period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// Schedule Report Dialog
// =============================================================================

function ScheduleReportDialog({
  open,
  onOpenChange,
  currentTab,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTab: string
}) {
  const [reportType, setReportType] = useState(currentTab)
  const [frequency, setFrequency] = useState("weekly")
  const [dayOfWeek, setDayOfWeek] = useState(1) // Monday
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [emailsInput, setEmailsInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Update report type when dialog opens with a different tab
  useEffect(() => {
    if (open) {
      setReportType(currentTab)
      setError("")
      setSuccess(false)
    }
  }, [open, currentTab])

  const handleSave = async () => {
    setError("")
    setSaving(true)

    const emails = emailsInput.split(",").map((e) => e.trim()).filter(Boolean)
    if (emails.length === 0) {
      setError("At least one email address is required")
      setSaving(false)
      return
    }

    const result = await scheduleReport({
      reportType,
      frequency,
      dayOfWeek: frequency === "weekly" ? dayOfWeek : undefined,
      dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
      emails,
    })

    setSaving(false)

    if ("error" in result) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => {
        onOpenChange(false)
        setSuccess(false)
        setEmailsInput("")
      }, 1500)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-[#0A2540]">Schedule Report</DialogTitle>
          <DialogDescription className="text-[#8898AA]">
            Set up automatic report delivery by email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Report Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#425466]">Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="border-[#E3E8EE] text-[#0A2540]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#425466]">Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="border-[#E3E8EE] text-[#0A2540]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Day of Week (for weekly) */}
          {frequency === "weekly" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#425466]">Day of Week</Label>
              <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
                <SelectTrigger className="border-[#E3E8EE] text-[#0A2540]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Day of Month (for monthly) */}
          {frequency === "monthly" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#425466]">Day of Month</Label>
              <Select value={String(dayOfMonth)} onValueChange={(v) => setDayOfMonth(Number(v))}>
                <SelectTrigger className="border-[#E3E8EE] text-[#0A2540]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Email Addresses */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#425466]">
              Email Address(es)
            </Label>
            <Input
              placeholder="email@example.com, another@example.com"
              value={emailsInput}
              onChange={(e) => setEmailsInput(e.target.value)}
              className="border-[#E3E8EE] text-[#0A2540]"
            />
            <p className="text-xs text-[#8898AA]">
              Separate multiple emails with commas.
            </p>
          </div>

          {/* Error / Success Messages */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-700 bg-green-50 rounded px-3 py-2">
              Schedule saved successfully.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="border-[#E3E8EE] text-[#425466]"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#635BFF] hover:bg-[#5851DB] text-white"
            onClick={handleSave}
            disabled={saving || success}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Schedule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// Main Reports Page Component
// =============================================================================

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState("invoices")
  const [datePreset, setDatePreset] = useState<DatePreset>("last_7_days")
  const [loading, setLoading] = useState(false)
  const [customDateFrom, setCustomDateFrom] = useState("")
  const [customDateTo, setCustomDateTo] = useState("")
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)

  // Report data state
  const [revenueData, setRevenueData] = useState<RevenueReportResult | null>(null)
  const [invoicesData, setInvoicesData] = useState<InvoicesReportResult | null>(null)
  const [paymentsData, setPaymentsData] = useState<PaymentsReportResult | null>(null)
  const [jobsData, setJobsData] = useState<JobsReportResult | null>(null)
  const [teamData, setTeamData] = useState<TeamReportResult | null>(null)
  const [timeTrackingData, setTimeTrackingData] = useState<TimeTrackingReportResult | null>(null)

  const fetchData = useCallback(async (tab: string, preset: DatePreset) => {
    setLoading(true)
    const range = getDateRangeForPreset(preset, customDateFrom, customDateTo)

    try {
      switch (tab) {
        case "invoices": {
          // Fetch both revenue chart data and individual invoices in parallel
          const [revenueResult, invoicesResult] = await Promise.all([
            getRevenueReport(range),
            getInvoicesReport(range),
          ])
          if (!("error" in revenueResult)) setRevenueData(revenueResult)
          if (!("error" in invoicesResult)) setInvoicesData(invoicesResult)
          break
        }
        case "payments": {
          const result = await getPaymentsReport(range)
          if (!("error" in result)) setPaymentsData(result)
          break
        }
        case "jobs": {
          const result = await getJobsReport(range)
          if (!("error" in result)) setJobsData(result)
          break
        }
        case "team_activity": {
          const result = await getTeamReport(range)
          if (!("error" in result)) setTeamData(result)
          break
        }
        case "time_tracking": {
          const result = await getTimeTrackingReport(range)
          if (!("error" in result)) setTimeTrackingData(result)
          break
        }
      }
    } catch (err) {
      console.error("Failed to fetch report data:", err)
    } finally {
      setLoading(false)
    }
  }, [customDateFrom, customDateTo])

  // Fetch on mount and when tab/date changes
  useEffect(() => {
    fetchData(activeTab, datePreset)
  }, [activeTab, datePreset, fetchData, customDateFrom, customDateTo])

  const clearTabData = (tab: string) => {
    switch (tab) {
      case "invoices":
        setRevenueData(null)
        setInvoicesData(null)
        break
      case "payments":
        setPaymentsData(null)
        break
      case "jobs":
        setJobsData(null)
        break
      case "team_activity":
        setTeamData(null)
        break
      case "time_tracking":
        setTimeTrackingData(null)
        break
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    clearTabData(value)
  }

  const handlePresetChange = (value: string) => {
    setDatePreset(value as DatePreset)
    clearTabData(activeTab)
  }

  const dateRange = getDateRangeForPreset(datePreset, customDateFrom, customDateTo)
  const parseLocalDate = (s: string) => s.length === 10 ? new Date(s + "T00:00:00") : new Date(s)
  const formattedRange = `${format(parseLocalDate(dateRange.dateFrom), "MMM d, yyyy")} - ${format(parseLocalDate(dateRange.dateTo), "MMM d, yyyy")}`

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#0A2540]">Reports</h1>
          <p className="text-sm text-[#8898AA] mt-0.5">{formattedRange}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="border-[#E3E8EE] text-[#425466]"
            onClick={() => setScheduleDialogOpen(true)}
          >
            <CalendarClock className="w-3.5 h-3.5 mr-1.5" />
            Schedule Report
          </Button>
          <Select value={datePreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[180px] border-[#E3E8EE] text-[#425466]">
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
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="h-9 w-[150px] border-[#E3E8EE] text-sm"
              />
              <span className="text-sm text-[#8898AA]">to</span>
              <Input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="h-9 w-[150px] border-[#E3E8EE] text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-transparent rounded-none w-full justify-start h-auto p-0 gap-1 border-b border-[#E3E8EE] overflow-x-auto overflow-y-hidden mb-4">
          <TabsTrigger value="invoices" className="px-3 py-2 border-b-2 border-transparent -mb-px text-[#8898AA] hover:text-[#425466] data-[state=active]:border-[#635BFF] data-[state=active]:text-[#0A2540] gap-1.5">
            <FileText className="w-4 h-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="payments" className="px-3 py-2 border-b-2 border-transparent -mb-px text-[#8898AA] hover:text-[#425466] data-[state=active]:border-[#635BFF] data-[state=active]:text-[#0A2540] gap-1.5">
            <CreditCard className="w-4 h-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="jobs" className="px-3 py-2 border-b-2 border-transparent -mb-px text-[#8898AA] hover:text-[#425466] data-[state=active]:border-[#635BFF] data-[state=active]:text-[#0A2540] gap-1.5">
            <Briefcase className="w-4 h-4" />
            Jobs
          </TabsTrigger>
          <TabsTrigger value="team_activity" className="px-3 py-2 border-b-2 border-transparent -mb-px text-[#8898AA] hover:text-[#425466] data-[state=active]:border-[#635BFF] data-[state=active]:text-[#0A2540] gap-1.5">
            <Users className="w-4 h-4" />
            Team Activity
          </TabsTrigger>
          <TabsTrigger value="time_tracking" className="px-3 py-2 border-b-2 border-transparent -mb-px text-[#8898AA] hover:text-[#425466] data-[state=active]:border-[#635BFF] data-[state=active]:text-[#0A2540] gap-1.5">
            <Clock className="w-4 h-4" />
            Time Tracking
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <InvoicesTab revenueData={revenueData} invoicesData={invoicesData} />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab data={paymentsData} />
        </TabsContent>
        <TabsContent value="jobs">
          <JobsTab data={jobsData} />
        </TabsContent>
        <TabsContent value="team_activity">
          <TeamActivityTab data={teamData} />
        </TabsContent>
        <TabsContent value="time_tracking">
          <TimeTrackingTab data={timeTrackingData} />
        </TabsContent>
      </Tabs>

      {/* Schedule Report Dialog */}
      <ScheduleReportDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        currentTab={activeTab}
      />
    </div>
  )
}
