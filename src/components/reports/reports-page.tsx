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
  DollarSign,
  Briefcase,
  FileCheck,
  Users,
  UserPlus,
  Download,
  TrendingUp,
  Clock,
  XCircle,
  CheckCircle,
  Loader2,
} from "lucide-react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
  getJobsReport,
  getQuotesReport,
  getTeamReport,
  getCustomersReport,
} from "@/actions/reports"
import type {
  RevenueReportResult,
  JobsReportResult,
  QuotesReportResult,
  TeamReportResult,
  CustomersReportResult,
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
// Revenue Tab
// =============================================================================

function RevenueTab({ data }: { data: RevenueReportResult | null }) {
  if (!data) return <LoadingState />

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Revenue" value={formatCurrency(data.summary.totalRevenue)} icon={DollarSign} />
        <StatCard label="Avg. Per Job" value={formatCurrency(data.summary.avgPerJob)} icon={TrendingUp} color="#30D158" />
        <StatCard label="Largest Invoice" value={formatCurrency(data.summary.largestInvoice)} icon={FileCheck} color="#F5A623" />
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
              <BarChart data={data.revenueByMonth}>
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

      {/* Revenue by Category Table */}
      <Card className="border-[#E3E8EE]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#0A2540]">
            Revenue by Category
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="border-[#E3E8EE] text-[#425466]"
            onClick={() =>
              downloadCSV(
                data.revenueByCategory.map((r) => ({
                  Category: r.category,
                  Revenue: r.revenue.toFixed(2),
                  "Line Items": r.count,
                })),
                "revenue-by-category"
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
                <TableHead className="text-[#8898AA]">Category</TableHead>
                <TableHead className="text-[#8898AA] text-right">Revenue</TableHead>
                <TableHead className="text-[#8898AA] text-right">Line Items</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.revenueByCategory.length > 0 ? (
                data.revenueByCategory.map((row) => (
                  <TableRow key={row.category} className="border-[#E3E8EE]">
                    <TableCell className="text-[#0A2540] font-medium">{row.category}</TableCell>
                    <TableCell className="text-[#425466] text-right">{formatCurrency(row.revenue)}</TableCell>
                    <TableCell className="text-[#425466] text-right">{row.count}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-[#8898AA] py-8">
                    No data for this period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Customers by Revenue Table */}
      <Card className="border-[#E3E8EE]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#0A2540]">
            Top Customers by Revenue
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="border-[#E3E8EE] text-[#425466]"
            onClick={() =>
              downloadCSV(
                data.revenueByCustomer.map((r) => ({
                  Customer: r.customerName,
                  Revenue: r.revenue.toFixed(2),
                  Jobs: r.jobCount,
                })),
                "top-customers-by-revenue"
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
                <TableHead className="text-[#8898AA]">Customer</TableHead>
                <TableHead className="text-[#8898AA] text-right">Revenue</TableHead>
                <TableHead className="text-[#8898AA] text-right">Jobs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.revenueByCustomer.length > 0 ? (
                data.revenueByCustomer.map((row) => (
                  <TableRow key={row.customerId} className="border-[#E3E8EE]">
                    <TableCell className="text-[#0A2540] font-medium">{row.customerName}</TableCell>
                    <TableCell className="text-[#425466] text-right">{formatCurrency(row.revenue)}</TableCell>
                    <TableCell className="text-[#425466] text-right">{row.jobCount}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-[#8898AA] py-8">
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
// Quotes Tab
// =============================================================================

function QuotesTab({ data }: { data: QuotesReportResult | null }) {
  if (!data) return <LoadingState />

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <StatCard label="Sent" value={data.summary.sent} icon={FileCheck} />
        <StatCard label="Approved" value={data.summary.approved} icon={CheckCircle} color="#30D158" />
        <StatCard label="Declined" value={data.summary.declined} icon={XCircle} color="#E25950" />
        <StatCard label="Expired" value={data.summary.expired} icon={Clock} color="#F5A623" />
        <StatCard label="Conversion Rate" value={`${data.summary.conversionRate.toFixed(1)}%`} icon={TrendingUp} color="#635BFF" />
      </div>

      {/* Conversion Rate by Month */}
      <Card className="border-[#E3E8EE]">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-[#0A2540]">
            Conversion Rate by Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.conversionByMonth}>
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
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="rate"
                  name="Conversion Rate"
                  stroke="#635BFF"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#635BFF" }}
                  activeDot={{ r: 5, fill: "#635BFF", stroke: "#fff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Quotes by Status */}
      <Card className="border-[#E3E8EE]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#0A2540]">
            Quotes by Status
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="border-[#E3E8EE] text-[#425466]"
            onClick={() =>
              downloadCSV(
                data.quotesByStatus.map((r) => ({
                  Status: r.status,
                  Count: r.count,
                  "Total Value": r.total.toFixed(2),
                })),
                "quotes-by-status"
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
                <TableHead className="text-[#8898AA]">Status</TableHead>
                <TableHead className="text-[#8898AA] text-right">Count</TableHead>
                <TableHead className="text-[#8898AA] text-right">Total Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.quotesByStatus.length > 0 ? (
                data.quotesByStatus.map((row) => (
                  <TableRow key={row.status} className="border-[#E3E8EE]">
                    <TableCell className="text-[#0A2540] font-medium">{row.status}</TableCell>
                    <TableCell className="text-[#425466] text-right">{row.count}</TableCell>
                    <TableCell className="text-[#425466] text-right">{formatCurrency(row.total)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-[#8898AA] py-8">
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
// Team Tab
// =============================================================================

function TeamTab({ data }: { data: TeamReportResult | null }) {
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
// Customers Tab
// =============================================================================

function CustomersTab({ data }: { data: CustomersReportResult | null }) {
  if (!data) return <LoadingState />

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Total Customers" value={data.summary.total} icon={Users} />
        <StatCard label="New This Period" value={data.summary.newThisPeriod} icon={UserPlus} color="#30D158" />
        <StatCard label="Active" value={data.summary.active} icon={CheckCircle} color="#635BFF" />
        <StatCard label="Inactive" value={data.summary.inactive} icon={Clock} color="#8898AA" />
      </div>

      {/* New Customers by Month */}
      <Card className="border-[#E3E8EE]">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-[#0A2540]">
            New Customers by Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.newByMonth}>
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
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="New Customers"
                  stroke="#635BFF"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#635BFF" }}
                  activeDot={{ r: 5, fill: "#635BFF", stroke: "#fff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Customers Table */}
      <Card className="border-[#E3E8EE]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-[#0A2540]">
            Top Customers by Lifetime Value
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="border-[#E3E8EE] text-[#425466]"
            onClick={() =>
              downloadCSV(
                data.topCustomers.map((c) => ({
                  Customer: c.customerName,
                  "Total Revenue": c.totalRevenue.toFixed(2),
                  Jobs: c.jobCount,
                  "Last Job": c.lastJobDate
                    ? new Date(c.lastJobDate).toLocaleDateString()
                    : "N/A",
                })),
                "top-customers"
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
                <TableHead className="text-[#8898AA]">Customer</TableHead>
                <TableHead className="text-[#8898AA] text-right">Total Revenue</TableHead>
                <TableHead className="text-[#8898AA] text-right">Jobs</TableHead>
                <TableHead className="text-[#8898AA] text-right">Last Job</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topCustomers.length > 0 ? (
                data.topCustomers.map((row) => (
                  <TableRow key={row.customerId} className="border-[#E3E8EE]">
                    <TableCell className="text-[#0A2540] font-medium">{row.customerName}</TableCell>
                    <TableCell className="text-[#425466] text-right">{formatCurrency(row.totalRevenue)}</TableCell>
                    <TableCell className="text-[#425466] text-right">{row.jobCount}</TableCell>
                    <TableCell className="text-[#425466] text-right">
                      {row.lastJobDate
                        ? new Date(row.lastJobDate).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-[#8898AA] py-8">
                    No customer data available
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
// Main Reports Page Component
// =============================================================================

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState("revenue")
  const [datePreset, setDatePreset] = useState<DatePreset>("last_7_days")
  const [loading, setLoading] = useState(false)
  const [customDateFrom, setCustomDateFrom] = useState("")
  const [customDateTo, setCustomDateTo] = useState("")

  // Report data state
  const [revenueData, setRevenueData] = useState<RevenueReportResult | null>(null)
  const [jobsData, setJobsData] = useState<JobsReportResult | null>(null)
  const [quotesData, setQuotesData] = useState<QuotesReportResult | null>(null)
  const [teamData, setTeamData] = useState<TeamReportResult | null>(null)
  const [customersData, setCustomersData] = useState<CustomersReportResult | null>(null)

  const fetchData = useCallback(async (tab: string, preset: DatePreset) => {
    setLoading(true)
    const range = getDateRangeForPreset(preset, customDateFrom, customDateTo)

    try {
      switch (tab) {
        case "revenue": {
          const result = await getRevenueReport(range)
          if (!("error" in result)) setRevenueData(result)
          break
        }
        case "jobs": {
          const result = await getJobsReport(range)
          if (!("error" in result)) setJobsData(result)
          break
        }
        case "quotes": {
          const result = await getQuotesReport(range)
          if (!("error" in result)) setQuotesData(result)
          break
        }
        case "team": {
          const result = await getTeamReport(range)
          if (!("error" in result)) setTeamData(result)
          break
        }
        case "customers": {
          const result = await getCustomersReport(range)
          if (!("error" in result)) setCustomersData(result)
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

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Clear old data so loading state shows
    switch (value) {
      case "revenue": setRevenueData(null); break
      case "jobs": setJobsData(null); break
      case "quotes": setQuotesData(null); break
      case "team": setTeamData(null); break
      case "customers": setCustomersData(null); break
    }
  }

  const handlePresetChange = (value: string) => {
    setDatePreset(value as DatePreset)
    // Clear current tab data
    switch (activeTab) {
      case "revenue": setRevenueData(null); break
      case "jobs": setJobsData(null); break
      case "quotes": setQuotesData(null); break
      case "team": setTeamData(null); break
      case "customers": setCustomersData(null); break
    }
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
          <TabsTrigger value="revenue" className="rounded-none border-b-2 border-transparent px-3 py-2 h-auto flex-none -mb-px after:hidden text-sm font-medium text-[#8898AA] hover:text-[#425466] data-[state=active]:border-[#635BFF] data-[state=active]:text-[#0A2540] data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5">
            <DollarSign className="w-4 h-4" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="jobs" className="rounded-none border-b-2 border-transparent px-3 py-2 h-auto flex-none -mb-px after:hidden text-sm font-medium text-[#8898AA] hover:text-[#425466] data-[state=active]:border-[#635BFF] data-[state=active]:text-[#0A2540] data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5">
            <Briefcase className="w-4 h-4" />
            Jobs
          </TabsTrigger>
          <TabsTrigger value="quotes" className="rounded-none border-b-2 border-transparent px-3 py-2 h-auto flex-none -mb-px after:hidden text-sm font-medium text-[#8898AA] hover:text-[#425466] data-[state=active]:border-[#635BFF] data-[state=active]:text-[#0A2540] data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5">
            <FileCheck className="w-4 h-4" />
            Quotes
          </TabsTrigger>
          <TabsTrigger value="team" className="rounded-none border-b-2 border-transparent px-3 py-2 h-auto flex-none -mb-px after:hidden text-sm font-medium text-[#8898AA] hover:text-[#425466] data-[state=active]:border-[#635BFF] data-[state=active]:text-[#0A2540] data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5">
            <Users className="w-4 h-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="customers" className="rounded-none border-b-2 border-transparent px-3 py-2 h-auto flex-none -mb-px after:hidden text-sm font-medium text-[#8898AA] hover:text-[#425466] data-[state=active]:border-[#635BFF] data-[state=active]:text-[#0A2540] data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5">
            <UserPlus className="w-4 h-4" />
            Customers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <RevenueTab data={revenueData} />
        </TabsContent>
        <TabsContent value="jobs">
          <JobsTab data={jobsData} />
        </TabsContent>
        <TabsContent value="quotes">
          <QuotesTab data={quotesData} />
        </TabsContent>
        <TabsContent value="team">
          <TeamTab data={teamData} />
        </TabsContent>
        <TabsContent value="customers">
          <CustomersTab data={customersData} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
