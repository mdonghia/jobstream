"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import {
  Download,
  Loader2,
  CalendarClock,
  List,
  Pencil,
  Trash2,
} from "lucide-react"
import {
  subDays,
  subMonths,
  format,
} from "date-fns"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { toast } from "sonner"
import {
  getInvoicesReport,
  getPaymentsReport,
  getJobsReport,
  getTeamReport,
  getTimeTrackingReport,
  scheduleReport,
  getReportSchedules,
  deleteReportSchedule,
  updateReportSchedule,
} from "@/actions/reports"
import type { ReportScheduleItem } from "@/actions/reports"

// =============================================================================
// Types
// =============================================================================

type ReportType = "invoices" | "payments" | "jobs" | "team_activity" | "time_tracking"

type DatePreset = "last_7_days" | "last_30_days" | "last_3_months" | "last_6_months" | "last_12_months" | "custom"

type DateRange = {
  dateFrom: string
  dateTo: string
}

// =============================================================================
// Constants
// =============================================================================

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  invoices: "Invoices",
  payments: "Payments",
  jobs: "Jobs",
  team_activity: "Team Activity",
  time_tracking: "Time Tracking",
}

const REPORT_TYPE_DESCRIPTIONS: Record<ReportType, string> = {
  invoices: "All invoices in the date range with status, amounts, and customer",
  payments: "All payments received with method, amount, and linked invoice",
  jobs: "All jobs with status, visits, revenue, and customer",
  team_activity: "All visits by team member with duration details",
  time_tracking: "Total time spent per team member per day",
}

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  last_7_days: "Past 7 days",
  last_30_days: "Past month",
  last_3_months: "Past 3 months",
  last_6_months: "Past 6 months",
  last_12_months: "Past year",
  custom: "Custom range",
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

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
// Schedule Report Dialog
// =============================================================================

function ScheduleReportDialog({
  open,
  onOpenChange,
  currentReportType,
  editingSchedule,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentReportType: ReportType
  editingSchedule?: ReportScheduleItem | null
  onSaved?: () => void
}) {
  const [reportType, setReportType] = useState(currentReportType)
  const [frequency, setFrequency] = useState("weekly")
  const [dayOfWeek, setDayOfWeek] = useState(1) // Monday
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [emailsInput, setEmailsInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const isEditing = !!editingSchedule

  // Populate form when dialog opens
  useEffect(() => {
    if (open) {
      if (editingSchedule) {
        setReportType(editingSchedule.reportType as ReportType)
        setFrequency(editingSchedule.frequency)
        setDayOfWeek(editingSchedule.dayOfWeek ?? 1)
        setDayOfMonth(editingSchedule.dayOfMonth ?? 1)
        setEmailsInput(editingSchedule.emails.join(", "))
      } else {
        setReportType(currentReportType)
        setEmailsInput("")
      }
      setError("")
      setSuccess(false)
    }
  }, [open, currentReportType, editingSchedule])

  const handleSave = async () => {
    setError("")
    setSaving(true)

    const emails = emailsInput.split(",").map((e) => e.trim()).filter(Boolean)
    if (emails.length === 0) {
      setError("At least one email address is required")
      setSaving(false)
      return
    }

    const input = {
      reportType,
      frequency,
      dayOfWeek: frequency === "weekly" ? dayOfWeek : undefined,
      dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
      emails,
    }

    const result = isEditing
      ? await updateReportSchedule(editingSchedule!.id, input)
      : await scheduleReport(input)

    setSaving(false)

    if ("error" in result) {
      setError(result.error)
    } else {
      setSuccess(true)
      setTimeout(() => {
        onOpenChange(false)
        setSuccess(false)
        setEmailsInput("")
        onSaved?.()
      }, 1000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-[#0A2540]">{isEditing ? "Edit Schedule" : "Schedule Report"}</DialogTitle>
          <DialogDescription className="text-[#8898AA]">
            {isEditing ? "Update the report schedule settings." : "Set up automatic report delivery by email."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Report Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#425466]">Report Type</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger className="border-[#E3E8EE] text-[#0A2540]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(REPORT_TYPE_LABELS) as [ReportType, string][]).map(([value, label]) => (
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
            ) : isEditing ? (
              "Update Schedule"
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

// =============================================================================
// Helper: Format schedule frequency for display
// =============================================================================

function formatFrequency(schedule: ReportScheduleItem): string {
  if (schedule.frequency === "weekly" && schedule.dayOfWeek !== null) {
    return `Weekly on ${DAYS_OF_WEEK[schedule.dayOfWeek]}s`
  }
  if (schedule.frequency === "monthly" && schedule.dayOfMonth !== null) {
    const suffix = schedule.dayOfMonth === 1 ? "st" : schedule.dayOfMonth === 2 ? "nd" : schedule.dayOfMonth === 3 ? "rd" : "th"
    return `Monthly on the ${schedule.dayOfMonth}${suffix}`
  }
  return schedule.frequency
}

// =============================================================================
// Main Reports Page Component
// =============================================================================

export function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("invoices")
  const [datePreset, setDatePreset] = useState<DatePreset>("last_7_days")
  const [customDateFrom, setCustomDateFrom] = useState("")
  const [customDateTo, setCustomDateTo] = useState("")
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState("")
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)

  // Scheduled reports state
  const [schedules, setSchedules] = useState<ReportScheduleItem[]>([])
  const [schedulesLoaded, setSchedulesLoaded] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ReportScheduleItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch schedules on mount
  const fetchSchedules = useCallback(async () => {
    const result = await getReportSchedules()
    if (Array.isArray(result)) {
      setSchedules(result)
    }
    setSchedulesLoaded(true)
  }, [])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  // Handle schedule deletion
  async function handleDeleteSchedule() {
    if (!deleteId) return
    setDeleting(true)
    const result = await deleteReportSchedule(deleteId)
    if ("error" in result) {
      toast.error(result.error)
    } else {
      toast.success("Schedule deleted")
      fetchSchedules()
    }
    setDeleting(false)
    setDeleteId(null)
  }

  const dateRange = getDateRangeForPreset(datePreset, customDateFrom, customDateTo)
  const parseLocalDate = (s: string) => s.length === 10 ? new Date(s + "T00:00:00") : new Date(s)
  const formattedRange = `${format(parseLocalDate(dateRange.dateFrom), "MMM d, yyyy")} - ${format(parseLocalDate(dateRange.dateTo), "MMM d, yyyy")}`

  const handleGenerateReport = async () => {
    setGenerating(true)
    setError("")

    const range = getDateRangeForPreset(datePreset, customDateFrom, customDateTo)

    try {
      switch (reportType) {
        case "invoices": {
          const result = await getInvoicesReport(range)
          if ("error" in result) {
            setError(result.error)
          } else {
            downloadCSV(
              result.invoices.map((inv) => ({
                "Invoice #": inv.invoiceNumber,
                Customer: inv.customerName,
                "Job #": inv.jobNumber || "N/A",
                Amount: inv.amount.toFixed(2),
                "Due Date": new Date(inv.dueDate).toLocaleDateString(),
                Status: inv.status,
                "Date Paid": inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : "N/A",
              })),
              `invoices-report-${format(new Date(), "yyyy-MM-dd")}`
            )
          }
          break
        }
        case "payments": {
          const result = await getPaymentsReport(range)
          if ("error" in result) {
            setError(result.error)
          } else {
            downloadCSV(
              result.payments.map((p) => ({
                "Payment Date": new Date(p.paymentDate).toLocaleDateString(),
                "Invoice #": p.invoiceNumber,
                Customer: p.customerName,
                Amount: p.amount.toFixed(2),
                Method: p.method,
                Status: p.status,
              })),
              `payments-report-${format(new Date(), "yyyy-MM-dd")}`
            )
          }
          break
        }
        case "jobs": {
          const result = await getJobsReport(range)
          if ("error" in result) {
            setError(result.error)
          } else {
            // Flatten jobs by service type + team member into a useful CSV
            // Since the server action returns aggregate data, we export what we have
            const rows: Record<string, any>[] = []
            // Summary row
            rows.push({
              "Report": "Jobs Summary",
              "Total Jobs": result.summary.total,
              "Completed": result.summary.completed,
              "Cancelled": result.summary.cancelled,
              "Avg Completion (min)": result.summary.avgCompletionMinutes,
            })
            // If there are service type breakdowns, add them
            if (result.jobsByServiceType.length > 0) {
              rows.push({ "Report": "" }) // blank separator
              rows.push({ "Report": "--- Jobs by Service Type ---" })
              result.jobsByServiceType.forEach((r) => {
                rows.push({
                  "Report": r.service,
                  "Total Jobs": r.count,
                })
              })
            }
            // Team member breakdowns
            if (result.jobsByTeamMember.length > 0) {
              rows.push({ "Report": "" })
              rows.push({ "Report": "--- Jobs by Team Member ---" })
              result.jobsByTeamMember.forEach((r) => {
                rows.push({
                  "Report": r.name,
                  "Total Jobs": r.count,
                })
              })
            }
            downloadCSV(rows, `jobs-report-${format(new Date(), "yyyy-MM-dd")}`)
          }
          break
        }
        case "team_activity": {
          const result = await getTeamReport(range)
          if ("error" in result) {
            setError(result.error)
          } else {
            downloadCSV(
              result.members.map((m) => ({
                "Team Member": m.name,
                "Hours Worked": m.hoursWorked,
                "Jobs Completed": m.jobsCompleted,
                "Revenue Generated": m.revenueGenerated.toFixed(2),
              })),
              `team-activity-report-${format(new Date(), "yyyy-MM-dd")}`
            )
          }
          break
        }
        case "time_tracking": {
          const result = await getTimeTrackingReport(range)
          if ("error" in result) {
            setError(result.error)
          } else {
            downloadCSV(
              result.entries.map((e) => ({
                "Team Member": e.name,
                Date: new Date(e.date + "T00:00:00").toLocaleDateString(),
                "Start Time": e.startTime ? new Date(e.startTime).toLocaleTimeString() : "N/A",
                "End Time": e.endTime ? new Date(e.endTime).toLocaleTimeString() : "N/A",
                "Total Hours": e.totalHours,
              })),
              `time-tracking-report-${format(new Date(), "yyyy-MM-dd")}`
            )
          }
          break
        }
      }
    } catch (err) {
      console.error("Failed to generate report:", err)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#0A2540]">Reports</h1>
        <p className="text-sm text-[#8898AA] mt-1">
          Select a report type, choose a date range, and export or schedule it.
        </p>
      </div>

      <Card className="border-[#E3E8EE] max-w-2xl">
        <CardContent className="pt-6 space-y-6">
          {/* Report Type Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#425466]">Report Type</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger className="border-[#E3E8EE] text-[#0A2540]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(REPORT_TYPE_LABELS) as [ReportType, string][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-[#8898AA]">
              {REPORT_TYPE_DESCRIPTIONS[reportType]}
            </p>
          </div>

          {/* Date Range Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#425466]">Date Range</Label>
            <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
              <SelectTrigger className="border-[#E3E8EE] text-[#0A2540]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(DATE_PRESET_LABELS) as [DatePreset, string][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Custom date inputs */}
            {datePreset === "custom" && (
              <div className="flex items-center gap-2 pt-1">
                <Input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="h-9 border-[#E3E8EE] text-sm"
                />
                <span className="text-sm text-[#8898AA] shrink-0">to</span>
                <Input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="h-9 border-[#E3E8EE] text-sm"
                />
              </div>
            )}

            <p className="text-xs text-[#8898AA]">
              {formattedRange}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">
              {error}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              className="bg-[#635BFF] hover:bg-[#5851DB] text-white"
              onClick={handleGenerateReport}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="border-[#E3E8EE] text-[#425466]"
              onClick={() => {
                setEditingSchedule(null)
                setScheduleDialogOpen(true)
              }}
            >
              <CalendarClock className="w-4 h-4 mr-2" />
              Schedule Report
            </Button>
          </div>

          {/* View Scheduled Reports link (only when schedules exist) */}
          {schedulesLoaded && schedules.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                className="text-sm text-[#635BFF] hover:text-[#5851ea] hover:underline inline-flex items-center gap-1.5"
                onClick={() => setSheetOpen(true)}
              >
                <List className="w-3.5 h-3.5" />
                View Scheduled Reports ({schedules.length})
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Report Dialog (create / edit) */}
      <ScheduleReportDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        currentReportType={reportType}
        editingSchedule={editingSchedule}
        onSaved={fetchSchedules}
      />

      {/* Scheduled Reports Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-[#0A2540]">Scheduled Reports</SheetTitle>
            <SheetDescription className="text-[#8898AA]">
              Manage your recurring report deliveries.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-3">
            {schedules.length === 0 ? (
              <p className="text-sm text-[#8898AA] py-8 text-center">No scheduled reports yet.</p>
            ) : (
              schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="rounded-lg border border-[#E3E8EE] p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0A2540]">
                        {REPORT_TYPE_LABELS[schedule.reportType as ReportType] || schedule.reportType}
                      </p>
                      <p className="text-xs text-[#8898AA] mt-0.5">
                        {formatFrequency(schedule)}
                      </p>
                      <p className="text-xs text-[#8898AA] mt-1 truncate" title={schedule.emails.join(", ")}>
                        {schedule.emails.join(", ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-[#8898AA] hover:text-[#635BFF]"
                        onClick={() => {
                          setEditingSchedule(schedule)
                          setScheduleDialogOpen(true)
                        }}
                        aria-label="Edit schedule"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-[#8898AA] hover:text-red-600"
                        onClick={() => setDeleteId(schedule.id)}
                        aria-label="Delete schedule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        title="Delete Schedule"
        description="Are you sure you want to delete this scheduled report? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteSchedule}
        loading={deleting}
      />
    </div>
  )
}
