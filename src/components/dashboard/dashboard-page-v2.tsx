"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CalendarX,
  FileWarning,
  ClockAlert,
  ReceiptText,
  CheckCircle,
  DollarSign,
  CalendarCheck,
  ArrowRight,
  TrendingUp,
} from "lucide-react"
import type { DashboardV2Stats } from "@/actions/dashboard-v2"

// =============================================================================
// Props
// =============================================================================

type DashboardPageV2Props = {
  stats: DashboardV2Stats
  userName: string
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

// =============================================================================
// Component
// =============================================================================

export function DashboardPageV2({ stats, userName }: DashboardPageV2Props) {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#0A2540]">
          Welcome back, {userName}!
        </h1>
        <p className="text-[#425466] mt-1">
          Here&apos;s what needs your attention today.
        </p>
      </div>

      {/* ================================================================= */}
      {/* Action Items                                                       */}
      {/* ================================================================= */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-[#0A2540] mb-4 flex items-center gap-2">
          <ClockAlert className="w-4 h-4 text-[#F5A623]" />
          Action Items
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Unscheduled Jobs */}
          <Link href="/jobs?tab=unscheduled">
            <Card className="border-[#E3E8EE] hover:border-[#635BFF] hover:shadow-md transition-all cursor-pointer group">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#8898AA] font-medium">Unscheduled Jobs</p>
                    <p className="text-2xl font-semibold text-[#0A2540] mt-1">
                      {stats.unscheduledJobsCount}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-[#635BFF]/10 flex items-center justify-center">
                    <CalendarX className="w-5 h-5 text-[#635BFF]" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-[#635BFF] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  View jobs <ArrowRight className="w-3 h-3" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Needs Invoicing */}
          <Link href="/jobs?tab=needs_invoicing">
            <Card className="border-[#E3E8EE] hover:border-[#30D158] hover:shadow-md transition-all cursor-pointer group">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#8898AA] font-medium">Needs Invoicing</p>
                    <p className="text-2xl font-semibold text-[#0A2540] mt-1">
                      {stats.needsInvoicingCount}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-[#30D158]/10 flex items-center justify-center">
                    <ReceiptText className="w-5 h-5 text-[#30D158]" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-[#30D158] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  View jobs <ArrowRight className="w-3 h-3" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Overdue Quotes */}
          <Link href="/quotes?status=SENT">
            <Card className="border-[#E3E8EE] hover:border-[#F5A623] hover:shadow-md transition-all cursor-pointer group">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#8898AA] font-medium">Overdue Quotes</p>
                    <p className="text-2xl font-semibold text-[#0A2540] mt-1">
                      {stats.overdueQuotesCount}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-[#F5A623]/10 flex items-center justify-center">
                    <FileWarning className="w-5 h-5 text-[#F5A623]" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-[#F5A623] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  View quotes <ArrowRight className="w-3 h-3" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Overdue Invoices */}
          <Link href="/invoices?tab=overdue">
            <Card className="border-[#E3E8EE] hover:border-[#E25950] hover:shadow-md transition-all cursor-pointer group">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#8898AA] font-medium">Overdue Invoices</p>
                    <p className="text-2xl font-semibold text-[#0A2540] mt-1">
                      {stats.overdueInvoicesCount}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-[#E25950]/10 flex items-center justify-center">
                    <ClockAlert className="w-5 h-5 text-[#E25950]" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-[#E25950] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  View invoices <ArrowRight className="w-3 h-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Today's Progress                                                   */}
      {/* ================================================================= */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-[#0A2540] mb-4 flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-[#635BFF]" />
          Today&apos;s Progress
        </h2>
        <Link href="/schedule">
          <Card className="border-[#E3E8EE] hover:border-[#635BFF] hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 min-h-[48px]">
                <div className="w-12 h-12 rounded-xl bg-[#30D158]/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-[#30D158]" />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <p className="text-lg font-semibold text-[#0A2540]">
                    {stats.visitsCompletedToday} of {stats.visitsScheduledToday} visits
                    complete
                  </p>
                  <p className="text-sm text-[#8898AA] mt-0.5">
                    {stats.visitsScheduledToday === 0
                      ? "No visits scheduled for today"
                      : stats.visitsCompletedToday === stats.visitsScheduledToday
                        ? "All visits completed -- great job!"
                        : `${stats.visitsScheduledToday - stats.visitsCompletedToday} remaining`}
                  </p>
                </div>
              </div>
              {/* Progress bar */}
              {stats.visitsScheduledToday > 0 && (
                <div className="mt-4">
                  <div className="w-full h-2 bg-[#E3E8EE] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#30D158] rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          (stats.visitsCompletedToday / stats.visitsScheduledToday) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1 mt-3 text-xs text-[#635BFF] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                View schedule <ArrowRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ================================================================= */}
      {/* Financial Health                                                    */}
      {/* ================================================================= */}
      <div className="mb-8">
      <h2 className="text-base font-semibold text-[#0A2540] mb-4 flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-[#30D158]" />
        Financial Health
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue */}
        <Card className="border-[#E3E8EE]">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#0A2540] flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#635BFF]" />
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-[#E3E8EE]">
                <div>
                  <p className="text-sm text-[#425466]">Past 7 days</p>
                </div>
                <p className="text-lg font-semibold text-[#0A2540]">
                  {formatCurrency(stats.revenuePastWeek)}
                </p>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-[#E3E8EE]">
                <div>
                  <p className="text-sm text-[#425466]">Past 30 days</p>
                </div>
                <p className="text-lg font-semibold text-[#0A2540]">
                  {formatCurrency(stats.revenuePastMonth)}
                </p>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-[#425466]">Past 12 months</p>
                </div>
                <p className="text-lg font-semibold text-[#0A2540]">
                  {formatCurrency(stats.revenuePastYear)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visits Completed */}
        <Card className="border-[#E3E8EE]">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#0A2540] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#30D158]" />
              Visits Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-[#E3E8EE]">
                <div>
                  <p className="text-sm text-[#425466]">Past 7 days</p>
                </div>
                <p className="text-lg font-semibold text-[#0A2540]">
                  {stats.visitsCompletedPastWeek}
                </p>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-[#E3E8EE]">
                <div>
                  <p className="text-sm text-[#425466]">Past 30 days</p>
                </div>
                <p className="text-lg font-semibold text-[#0A2540]">
                  {stats.visitsCompletedPastMonth}
                </p>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-[#425466]">Past 12 months</p>
                </div>
                <p className="text-lg font-semibold text-[#0A2540]">
                  {stats.visitsCompletedPastYear}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}
