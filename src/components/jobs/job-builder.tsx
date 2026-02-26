"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Plus,
  Trash2,
  CalendarIcon,
  Clock,
  User,
  Check,
  ChevronsUpDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn, formatCurrency, formatDate, getInitials } from "@/lib/utils"
import { toast } from "sonner"
import { createJob, updateJob } from "@/actions/jobs"
import { searchCustomersWithProperties } from "@/actions/customers"
import { format } from "date-fns"
import { useAutoSave } from "@/hooks/use-auto-save"
import { AutoSaveIndicator } from "@/components/shared/auto-save-indicator"

// ---- Types ----

interface Service {
  id: string
  name: string
  description: string | null
  defaultPrice: number | string
  unit: string
  taxable: boolean
  isActive: boolean
}

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  properties?: Property[]
}

interface Property {
  id: string
  addressLine1: string
  city: string
  state: string
  zip: string
  isPrimary?: boolean
}

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  avatar: string | null
  color: string | null
  role: string
}

interface OrgSettings {
  taxRate: number
  currency: string
}

interface LineItem {
  id: string
  serviceId?: string
  name: string
  description: string
  quantity: number
  unitPrice: number
  taxable: boolean
}

interface ChecklistTemplateItem {
  id: string
  label: string
  sortOrder: number
}

interface ChecklistTemplate {
  id: string
  name: string
  items: ChecklistTemplateItem[]
  services: { id: string; name: string }[]
}

interface AttachedChecklist {
  templateId: string
  templateName: string
  items: string[]
  autoAdded: boolean // true = auto-populated from service, false = manually selected
}

interface JobBuilderProps {
  services: Service[]
  customers: Customer[]
  teamMembers: TeamMember[]
  orgSettings: OrgSettings
  checklistTemplates?: ChecklistTemplate[]
  initialData?: any
  mode?: "create" | "edit"
}

// ---- Helpers ----

const DURATION_OPTIONS = [
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
  { value: "180", label: "3 hours" },
  { value: "240", label: "4 hours" },
  { value: "360", label: "Half day (6h)" },
  { value: "480", label: "Full day (8h)" },
]

const TIME_OPTIONS: string[] = []
for (let h = 6; h <= 20; h++) {
  for (let m = 0; m < 60; m += 15) {
    const hour = h.toString().padStart(2, "0")
    const minute = m.toString().padStart(2, "0")
    TIME_OPTIONS.push(`${hour}:${minute}`)
  }
}

function formatTimeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 || 12
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

// ---- Component ----

export function JobBuilder({
  services,
  customers: initialCustomers,
  teamMembers,
  orgSettings,
  checklistTemplates = [],
  initialData,
  mode = "create",
}: JobBuilderProps) {
  const isEditing = mode === "edit"
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  // Customer selection
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [customerSearch, setCustomerSearch] = useState("")
  const [customerOpen, setCustomerOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    initialData?.customerId || ""
  )
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    initialData?.propertyId || ""
  )

  // Job details
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [priority, setPriority] = useState(initialData?.priority || "MEDIUM")

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initialData?.lineItems || []
  )

  // Schedule
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialData?.scheduledStart ? new Date(initialData.scheduledStart) : undefined
  )
  const [startTime, setStartTime] = useState(initialData?.startTime || "09:00")
  const [duration, setDuration] = useState(initialData?.duration || "60")
  const [arrivalWindow, setArrivalWindow] = useState<string>(
    initialData?.arrivalWindowMinutes !== undefined && initialData?.arrivalWindowMinutes !== null
      ? String(initialData.arrivalWindowMinutes)
      : ""
  )

  // Assignment
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>(
    initialData?.assignedUserIds || []
  )

  // Recurring
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring ?? false)

  // Parse recurrenceRule: could be a plain string like "WEEKLY" or JSON like {"frequency":"MONTHLY","dayOfWeek":1,"weekOfMonth":2}
  const parsedRule = (() => {
    const raw = initialData?.recurrenceRule
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      if (typeof parsed === "object" && parsed.frequency) return parsed
    } catch {
      // Legacy plain string
    }
    return { frequency: raw }
  })()

  const [frequency, setFrequency] = useState(parsedRule?.frequency || "WEEKLY")
  const [recurDayOfWeek, setRecurDayOfWeek] = useState<number>(
    parsedRule?.dayOfWeek ?? new Date().getDay()
  )
  const [recurWeekOfMonth, setRecurWeekOfMonth] = useState<number>(
    parsedRule?.weekOfMonth ?? 1
  )
  const [recurMonth, setRecurMonth] = useState<number>(
    parsedRule?.month ?? 0
  )
  const [recurQuarterMonths, setRecurQuarterMonths] = useState<number[]>(
    parsedRule?.months ?? [0, 3, 6, 9]
  )
  const [recurrenceStartDate, setRecurrenceStartDate] = useState<Date>(
    initialData?.recurrenceStartDate ? new Date(initialData.recurrenceStartDate) : new Date()
  )
  const [recurrenceEnd, setRecurrenceEnd] = useState<"never" | "date">(
    initialData?.recurrenceEndDate ? "date" : "never"
  )
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>(
    initialData?.recurrenceEndDate ? new Date(initialData.recurrenceEndDate) : undefined
  )

  // Checklists (template-based)
  // When editing, reconstruct attached checklists from the job's existing checklist items
  // by matching them against available templates (via service links on line items).
  const [attachedChecklists, setAttachedChecklists] = useState<AttachedChecklist[]>(() => {
    if (!initialData?.checklistItems?.length) return []

    const existingLabels = new Set<string>(initialData.checklistItems)
    const attached: AttachedChecklist[] = []
    const coveredLabels = new Set<string>()

    // First, match templates linked to services that are in the line items
    const serviceIdsInJob = new Set(
      (initialData.lineItems || [])
        .map((li: LineItem) => li.serviceId)
        .filter(Boolean)
    )

    for (const template of checklistTemplates) {
      const templateLabels = template.items.map((i) => i.label)
      const isLinkedToJobService = template.services.some((s) => serviceIdsInJob.has(s.id))
      const hasMatchingItems = templateLabels.some((label) => existingLabels.has(label))

      if (isLinkedToJobService && hasMatchingItems) {
        attached.push({
          templateId: template.id,
          templateName: template.name,
          items: templateLabels,
          autoAdded: true,
        })
        templateLabels.forEach((l) => coveredLabels.add(l))
      }
    }

    // Then, check remaining templates that match by item content
    for (const template of checklistTemplates) {
      if (attached.some((ac) => ac.templateId === template.id)) continue
      const templateLabels = template.items.map((i) => i.label)
      const allMatch = templateLabels.every((label) => existingLabels.has(label))
      if (allMatch && templateLabels.length > 0) {
        attached.push({
          templateId: template.id,
          templateName: template.name,
          items: templateLabels,
          autoAdded: false,
        })
        templateLabels.forEach((l) => coveredLabels.add(l))
      }
    }

    // Any remaining items not covered by a template go into a synthetic "Custom Items" group
    const uncovered = initialData.checklistItems.filter(
      (label: string) => !coveredLabels.has(label)
    )
    if (uncovered.length > 0) {
      attached.push({
        templateId: "__custom__",
        templateName: "Custom Items",
        items: uncovered,
        autoAdded: false,
      })
    }

    return attached
  })
  const [checklistSelectorOpen, setChecklistSelectorOpen] = useState(false)

  // Notes
  const [internalNote, setInternalNote] = useState(initialData?.internalNote || "")

  // Customer search effect
  useEffect(() => {
    if (!customerSearch.trim()) return
    const timer = setTimeout(async () => {
      const result = await searchCustomersWithProperties(customerSearch)
      if (!("error" in result)) {
        setCustomers(result.customers)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [customerSearch])

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)
  const customerProperties = selectedCustomer?.properties || []

  // Line item handlers
  function addLineItem(service?: Service) {
    const newItem: LineItem = {
      id: generateId(),
      serviceId: service?.id,
      name: service?.name || "",
      description: service?.description || "",
      quantity: 1,
      unitPrice: service ? Number(service.defaultPrice) : 0,
      taxable: service?.taxable ?? true,
    }
    setLineItems([...lineItems, newItem])

    // Auto-populate checklists linked to this service
    if (service) {
      const linkedTemplates = checklistTemplates.filter((t) =>
        t.services.some((s) => s.id === service.id)
      )
      if (linkedTemplates.length > 0) {
        setAttachedChecklists((prev) => {
          const updated = [...prev]
          for (const template of linkedTemplates) {
            if (!updated.some((ac) => ac.templateId === template.id)) {
              updated.push({
                templateId: template.id,
                templateName: template.name,
                items: template.items.map((i) => i.label),
                autoAdded: true,
              })
            }
          }
          return updated
        })
      }
    }
  }

  function updateLineItem(id: string, field: keyof LineItem, value: any) {
    setLineItems(
      lineItems.map((li) => (li.id === id ? { ...li, [field]: value } : li))
    )
  }

  function removeLineItem(id: string) {
    const removedItem = lineItems.find((li) => li.id === id)
    const remaining = lineItems.filter((li) => li.id !== id)
    setLineItems(remaining)

    // If the removed item had a serviceId, check if any other line items still
    // reference that service. If not, remove any auto-added checklists linked to it.
    if (removedItem?.serviceId) {
      const serviceStillPresent = remaining.some(
        (li) => li.serviceId === removedItem.serviceId
      )
      if (!serviceStillPresent) {
        const linkedTemplateIds = checklistTemplates
          .filter((t) => t.services.some((s) => s.id === removedItem.serviceId))
          .map((t) => t.id)
        if (linkedTemplateIds.length > 0) {
          setAttachedChecklists((prev) =>
            prev.filter(
              (ac) => !(ac.autoAdded && linkedTemplateIds.includes(ac.templateId))
            )
          )
        }
      }
    }
  }

  // Checklist template handlers
  function attachChecklistTemplate(template: ChecklistTemplate) {
    if (attachedChecklists.some((ac) => ac.templateId === template.id)) return
    setAttachedChecklists((prev) => [
      ...prev,
      {
        templateId: template.id,
        templateName: template.name,
        items: template.items.map((i) => i.label),
        autoAdded: false,
      },
    ])
  }

  function removeAttachedChecklist(templateId: string) {
    setAttachedChecklists((prev) =>
      prev.filter((ac) => ac.templateId !== templateId)
    )
  }

  // Flatten all attached checklist items for submission (deduplicated)
  const allChecklistLabels = (() => {
    const seen = new Set<string>()
    const labels: string[] = []
    for (const ac of attachedChecklists) {
      for (const item of ac.items) {
        if (!seen.has(item)) {
          seen.add(item)
          labels.push(item)
        }
      }
    }
    return labels
  })()

  // Assignment toggle
  function toggleAssignment(userId: string) {
    setAssignedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  // Totals
  const subtotal = lineItems.reduce(
    (sum, li) => sum + li.quantity * li.unitPrice,
    0
  )

  // Build scheduled end from duration
  function getScheduledEnd(): Date | null {
    if (!startDate) return null
    const start = new Date(startDate)
    const [h, m] = startTime.split(":").map(Number)
    start.setHours(h, m, 0, 0)
    const end = new Date(start.getTime() + parseInt(duration) * 60 * 1000)
    return end
  }

  // Build a JSON recurrence rule from the form state
  function buildRecurrenceRule(): string {
    const rule: any = { frequency }

    if (frequency === "WEEKLY" || frequency === "BIWEEKLY") {
      rule.dayOfWeek = recurDayOfWeek
    } else if (frequency === "MONTHLY") {
      rule.dayOfWeek = recurDayOfWeek
      rule.weekOfMonth = recurWeekOfMonth
    } else if (frequency === "QUARTERLY") {
      rule.dayOfWeek = recurDayOfWeek
      rule.weekOfMonth = recurWeekOfMonth
      rule.months = recurQuarterMonths
    } else if (frequency === "ANNUAL") {
      rule.dayOfWeek = recurDayOfWeek
      rule.weekOfMonth = recurWeekOfMonth
      rule.month = recurMonth
    }

    return JSON.stringify(rule)
  }

  // ---- Auto-save (edit mode only) ----

  // Build a stable data object for auto-save comparison
  const autoSaveData = useMemo(
    () => ({
      customerId: selectedCustomerId,
      propertyId: selectedPropertyId,
      title,
      description,
      priority,
      lineItems,
      startDate: startDate?.toISOString() || "",
      startTime,
      duration,
      arrivalWindow,
      assignedUserIds,
      isRecurring,
      frequency,
      recurDayOfWeek,
      recurWeekOfMonth,
      recurMonth,
      recurQuarterMonths,
      recurrenceStartDate: recurrenceStartDate.toISOString(),
      recurrenceEnd,
      recurrenceEndDate: recurrenceEndDate?.toISOString() || "",
      internalNote,
      attachedChecklists,
    }),
    [
      selectedCustomerId, selectedPropertyId, title, description, priority,
      lineItems, startDate, startTime, duration, arrivalWindow, assignedUserIds,
      isRecurring, frequency, recurDayOfWeek, recurWeekOfMonth, recurMonth,
      recurQuarterMonths, recurrenceStartDate, recurrenceEnd, recurrenceEndDate,
      internalNote, attachedChecklists,
    ]
  )

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleAutoSave = useCallback(async () => {
    // Must have required fields to auto-save
    if (!selectedCustomerId || !title.trim() || !startDate) return

    const scheduledStart = new Date(startDate)
    const [hh, mm] = startTime.split(":").map(Number)
    scheduledStart.setHours(hh, mm, 0, 0)

    const scheduledEnd = getScheduledEnd()
    if (!scheduledEnd) return

    const jobPayload = {
      customerId: selectedCustomerId,
      propertyId: selectedPropertyId || undefined,
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
      assignedUserIds: assignedUserIds.length > 0 ? assignedUserIds : [],
      checklistItems: allChecklistLabels,
      lineItems:
        lineItems.length > 0
          ? lineItems.map((li) => ({
              serviceId: li.serviceId,
              name: li.name,
              description: li.description || undefined,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
              taxable: li.taxable,
            }))
          : [],
      internalNote: internalNote.trim() || undefined,
      isRecurring,
      recurrenceRule: isRecurring ? buildRecurrenceRule() : undefined,
      recurrenceEndDate:
        isRecurring && recurrenceEnd === "date" && recurrenceEndDate
          ? recurrenceEndDate.toISOString()
          : undefined,
      arrivalWindowMinutes: arrivalWindow !== "" ? parseInt(arrivalWindow, 10) : undefined,
    }

    const result = await updateJob(initialData.id, jobPayload)
    if ("error" in result) {
      throw new Error(result.error)
    }
  }, [
    selectedCustomerId, selectedPropertyId, title, description, priority,
    lineItems, startDate, startTime, duration, assignedUserIds, allChecklistLabels,
    internalNote, isRecurring, recurrenceEnd, recurrenceEndDate, arrivalWindow,
    initialData?.id,
  ])

  const { status: autoSaveStatus, saveNow: autoSaveNow } = useAutoSave({
    data: autoSaveData,
    onSave: handleAutoSave,
    enabled: isEditing && !!initialData?.id,
    debounceMs: 1500,
  })

  // Submit
  async function handleSubmit() {
    if (!selectedCustomerId) {
      toast.error("Please select a customer")
      return
    }
    if (!title.trim()) {
      toast.error("Please enter a job title")
      return
    }
    if (!startDate) {
      toast.error("Please select a start date")
      return
    }

    const scheduledStart = new Date(startDate)
    const [h, m] = startTime.split(":").map(Number)
    scheduledStart.setHours(h, m, 0, 0)

    const scheduledEnd = getScheduledEnd()
    if (!scheduledEnd) {
      toast.error("Please select a valid schedule")
      return
    }

    setSubmitting(true)
    try {
      const jobPayload = {
        customerId: selectedCustomerId,
        propertyId: selectedPropertyId || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
        assignedUserIds: assignedUserIds.length > 0 ? assignedUserIds : [],
        checklistItems: allChecklistLabels,
        lineItems:
          lineItems.length > 0
            ? lineItems.map((li) => ({
                serviceId: li.serviceId,
                name: li.name,
                description: li.description || undefined,
                quantity: li.quantity,
                unitPrice: li.unitPrice,
                taxable: li.taxable,
              }))
            : [],
        internalNote: internalNote.trim() || undefined,
        isRecurring,
        recurrenceRule: isRecurring ? buildRecurrenceRule() : undefined,
        recurrenceEndDate:
          isRecurring && recurrenceEnd === "date" && recurrenceEndDate
            ? recurrenceEndDate.toISOString()
            : undefined,
        arrivalWindowMinutes: arrivalWindow !== "" ? parseInt(arrivalWindow, 10) : undefined,
      }

      if (isEditing && initialData?.id) {
        const result = await updateJob(initialData.id, jobPayload)
        if ("error" in result) {
          toast.error(result.error)
        } else {
          toast.success("Job updated successfully")
          router.push(`/jobs/${initialData.id}`)
        }
      } else {
        const result = await createJob(jobPayload)
        if ("error" in result) {
          toast.error(result.error)
        } else {
          toast.success("Job created successfully")
          router.push(`/jobs/${result.jobId}`)
        }
      }
    } catch {
      toast.error(isEditing ? "Failed to update job" : "Failed to create job")
    } finally {
      setSubmitting(false)
    }
  }

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="h-8 w-8"
          aria-label="Go back"
        >
          <Link href="/jobs">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#0A2540]">
              {isEditing ? "Edit Job" : "New Job"}
            </h1>
            {isEditing && <AutoSaveIndicator status={autoSaveStatus} />}
          </div>
          <p className="text-sm text-[#8898AA]">
            {isEditing
              ? "Update the details for this job"
              : "Create a new job for a customer"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Customer & Property */}
          <Card className="border-[#E3E8EE]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-[#0A2540]">
                Customer & Property
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer Combobox */}
              <div className="space-y-1.5">
                <Label className="text-sm text-[#425466]">Customer *</Label>
                <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerOpen}
                      className="w-full justify-between h-10 border-[#E3E8EE] text-sm font-normal"
                    >
                      {selectedCustomer
                        ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                        : "Select a customer..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search customers..."
                        value={customerSearch}
                        onValueChange={setCustomerSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No customers found.</CommandEmpty>
                        <CommandGroup>
                          {customers.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.id}
                              onSelect={() => {
                                setSelectedCustomerId(c.id)
                                const primary = c.properties?.find((p) => p.isPrimary)
                                setSelectedPropertyId(primary?.id || c.properties?.[0]?.id || "")
                                setCustomerOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCustomerId === c.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <div>
                                <p className="text-sm">
                                  {c.firstName} {c.lastName}
                                </p>
                                {c.email && (
                                  <p className="text-xs text-[#8898AA]">
                                    {c.email}
                                  </p>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Property Select */}
              {selectedCustomer && customerProperties.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-sm text-[#425466]">Property</Label>
                  <Select
                    value={selectedPropertyId}
                    onValueChange={setSelectedPropertyId}
                  >
                    <SelectTrigger className="h-10 border-[#E3E8EE] text-sm">
                      <SelectValue placeholder="Select a property..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customerProperties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.addressLine1}, {p.city}, {p.state} {p.zip}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Job Details */}
          <Card className="border-[#E3E8EE]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-[#0A2540]">
                Job Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-[#425466]">Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Weekly lawn mowing"
                  className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-[#425466]">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details about this job..."
                  className="min-h-[80px] border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-[#425466]">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="w-[180px] h-10 border-[#E3E8EE] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEDIUM">Standard</SelectItem>
                    <SelectItem value="URGENT">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Services / Line Items */}
          <Card className="border-[#E3E8EE]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-[#0A2540]">
                Services & Line Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lineItems.length > 0 && (
                <div className="space-y-3">
                  {lineItems.map((li) => (
                    <div
                      key={li.id}
                      className="flex gap-3 items-start p-3 bg-[#F6F8FA] rounded-lg border border-[#E3E8EE]"
                    >
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-2">
                          <Input
                            value={li.name}
                            onChange={(e) =>
                              updateLineItem(li.id, "name", e.target.value)
                            }
                            placeholder="Service name"
                            className="h-9 text-sm border-[#E3E8EE]"
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            value={li.quantity}
                            onChange={(e) =>
                              updateLineItem(
                                li.id,
                                "quantity",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="Qty"
                            className="h-9 text-sm border-[#E3E8EE]"
                            min={0}
                            step={0.01}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={li.unitPrice}
                            onChange={(e) =>
                              updateLineItem(
                                li.id,
                                "unitPrice",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="Price"
                            className="h-9 text-sm border-[#E3E8EE]"
                            min={0}
                            step={0.01}
                          />
                          <span className="text-sm text-[#8898AA] whitespace-nowrap">
                            {formatCurrency(li.quantity * li.unitPrice)}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-[#8898AA] hover:text-red-500"
                        onClick={() => removeLineItem(li.id)}
                        aria-label="Remove line item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex justify-end pt-1">
                    <p className="text-sm font-medium text-[#0A2540]">
                      Subtotal: {formatCurrency(subtotal)}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {services
                  .filter((s) => s.isActive)
                  .slice(0, 8)
                  .map((service) => (
                    <Button
                      key={service.id}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-[#E3E8EE] hover:border-[#635BFF] hover:text-[#635BFF]"
                      onClick={() => addLineItem(service)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {service.name}
                    </Button>
                  ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-dashed border-[#E3E8EE]"
                  onClick={() => addLineItem()}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Custom Item
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Schedule */}
          <Card className="border-[#E3E8EE]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-[#0A2540]">
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Start Date */}
                <div className="space-y-1.5">
                  <Label className="text-sm text-[#425466]">Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start h-10 text-left font-normal border-[#E3E8EE] text-sm",
                          !startDate && "text-[#8898AA]"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate
                          ? format(startDate, "MMM d, yyyy")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Start Time */}
                <div className="space-y-1.5">
                  <Label className="text-sm text-[#425466]">Start Time *</Label>
                  <Select value={startTime} onValueChange={setStartTime}>
                    <SelectTrigger className="h-10 border-[#E3E8EE] text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {formatTimeLabel(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration */}
                <div className="space-y-1.5">
                  <Label className="text-sm text-[#425466]">Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="h-10 border-[#E3E8EE] text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Arrival Window */}
              <div className="space-y-1.5">
                <Label className="text-sm text-[#425466]">Arrival Window</Label>
                <Select value={arrivalWindow || "default"} onValueChange={(v) => setArrivalWindow(v === "default" ? "" : v)}>
                  <SelectTrigger className="w-[220px] h-10 border-[#E3E8EE] text-sm">
                    <SelectValue placeholder="Default (org setting)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (org setting)</SelectItem>
                    <SelectItem value="0">Exact time</SelectItem>
                    <SelectItem value="15">15 min window</SelectItem>
                    <SelectItem value="30">30 min window</SelectItem>
                    <SelectItem value="60">1 hour window</SelectItem>
                    <SelectItem value="120">2 hour window</SelectItem>
                    <SelectItem value="180">3 hour window</SelectItem>
                    <SelectItem value="240">4 hour window</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#8898AA]">
                  How much flexibility to give your tech for arrival time
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Assign Team Members */}
          <Card className="border-[#E3E8EE]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-[#0A2540]">
                Assign Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {teamMembers.map((member) => {
                  const isSelected = assignedUserIds.includes(member.id)
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleAssignment(member.id)}
                      className={cn(
                        "flex items-center gap-3 w-full p-2.5 rounded-lg border transition-colors text-left",
                        isSelected
                          ? "border-[#635BFF] bg-[#635BFF]/5"
                          : "border-[#E3E8EE] hover:border-[#635BFF]/30"
                      )}
                    >
                      <div className="relative">
                        <Avatar size="sm">
                          {member.avatar ? (
                            <AvatarImage src={member.avatar} />
                          ) : null}
                          <AvatarFallback
                            className="text-[10px]"
                            style={{
                              backgroundColor: member.color || "#635BFF",
                              color: "#fff",
                            }}
                          >
                            {getInitials(member.firstName, member.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                          style={{
                            backgroundColor: member.color || "#635BFF",
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0A2540]">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-xs text-[#8898AA] capitalize">
                          {member.role.toLowerCase()}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-[#635BFF]" />
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Section 6: Recurring */}
          <Card className="border-[#E3E8EE]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-[#0A2540]">
                  Recurring Job
                </CardTitle>
                <Switch
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
              </div>
            </CardHeader>
            {isRecurring && (
              <CardContent className="space-y-4">
                {/* Start / End dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-[#425466]">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start h-10 text-left font-normal border-[#E3E8EE] text-sm"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(recurrenceStartDate, "MMM d, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={recurrenceStartDate}
                          onSelect={(d) => d && setRecurrenceStartDate(d)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm text-[#425466]">End Date</Label>
                    <Select
                      value={recurrenceEnd}
                      onValueChange={(v) => setRecurrenceEnd(v as "never" | "date")}
                    >
                      <SelectTrigger className="h-10 border-[#E3E8EE] text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="date">On a date</SelectItem>
                      </SelectContent>
                    </Select>
                    {recurrenceEnd === "date" && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start h-10 text-left font-normal border-[#E3E8EE] text-sm",
                              !recurrenceEndDate && "text-[#8898AA]"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {recurrenceEndDate
                              ? format(recurrenceEndDate, "MMM d, yyyy")
                              : "Pick end date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={recurrenceEndDate}
                            onSelect={setRecurrenceEndDate}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>

                {/* Frequency */}
                <div className="space-y-1.5">
                  <Label className="text-sm text-[#425466]">Frequency</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger className="w-[200px] h-10 border-[#E3E8EE] text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="BIWEEKLY">Biweekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                      <SelectItem value="ANNUAL">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Day of Week -- for weekly, bi-weekly, monthly, quarterly, annual */}
                {frequency !== "DAILY" && (
                  <div className="space-y-1.5">
                    <Label className="text-sm text-[#425466]">Day of the week</Label>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map((day, index) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setRecurDayOfWeek(index)}
                          className={cn(
                            "w-9 h-9 rounded-full text-xs font-medium transition-colors",
                            recurDayOfWeek === index
                              ? "bg-[#635BFF] text-white"
                              : "bg-[#F6F8FA] text-[#425466] hover:bg-[#E3E8EE]"
                          )}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Week of Month -- for monthly, quarterly, annual */}
                {(frequency === "MONTHLY" || frequency === "QUARTERLY" || frequency === "ANNUAL") && (
                  <div className="space-y-1.5">
                    <Label className="text-sm text-[#425466]">Week of the month</Label>
                    <Select
                      value={String(recurWeekOfMonth)}
                      onValueChange={(v) => setRecurWeekOfMonth(parseInt(v))}
                    >
                      <SelectTrigger className="w-[200px] h-10 border-[#E3E8EE] text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st week</SelectItem>
                        <SelectItem value="2">2nd week</SelectItem>
                        <SelectItem value="3">3rd week</SelectItem>
                        <SelectItem value="4">4th week</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#8898AA]">
                      e.g., the {recurWeekOfMonth === 1 ? "1st" : recurWeekOfMonth === 2 ? "2nd" : recurWeekOfMonth === 3 ? "3rd" : "4th"}{" "}
                      {WEEKDAYS[recurDayOfWeek]} of each {frequency === "MONTHLY" ? "month" : frequency === "QUARTERLY" ? "quarter" : "year"}
                    </p>
                  </div>
                )}

                {/* Month selector -- for annual */}
                {frequency === "ANNUAL" && (
                  <div className="space-y-1.5">
                    <Label className="text-sm text-[#425466]">Month</Label>
                    <Select
                      value={String(recurMonth)}
                      onValueChange={(v) => setRecurMonth(parseInt(v))}
                    >
                      <SelectTrigger className="w-[200px] h-10 border-[#E3E8EE] text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTH_NAMES.map((m, i) => (
                          <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Quarter months selector -- for quarterly */}
                {frequency === "QUARTERLY" && (
                  <div className="space-y-1.5">
                    <Label className="text-sm text-[#425466]">
                      Select 4 months (one per quarter)
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      {MONTH_NAMES.map((m, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setRecurQuarterMonths((prev) => {
                              if (prev.includes(i)) {
                                return prev.filter((x) => x !== i)
                              }
                              if (prev.length >= 4) return prev
                              return [...prev, i].sort((a, b) => a - b)
                            })
                          }}
                          className={cn(
                            "px-2 py-1.5 rounded text-xs font-medium transition-colors",
                            recurQuarterMonths.includes(i)
                              ? "bg-[#635BFF] text-white"
                              : "bg-[#F6F8FA] text-[#425466] hover:bg-[#E3E8EE]"
                          )}
                        >
                          {m.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#8898AA]">
                      {recurQuarterMonths.length}/4 selected
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Section 7: Checklists */}
          <Card className="border-[#E3E8EE]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-[#0A2540]">
                Checklists
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template selector */}
              {checklistTemplates.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-sm text-[#425466]">Add Checklist Template</Label>
                  <Popover open={checklistSelectorOpen} onOpenChange={setChecklistSelectorOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={checklistSelectorOpen}
                        className="w-full justify-between h-10 border-[#E3E8EE] text-sm font-normal"
                      >
                        Select a checklist template...
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search templates..." />
                        <CommandList>
                          <CommandEmpty>No templates found.</CommandEmpty>
                          <CommandGroup>
                            {checklistTemplates.map((template) => {
                              const alreadyAttached = attachedChecklists.some(
                                (ac) => ac.templateId === template.id
                              )
                              return (
                                <CommandItem
                                  key={template.id}
                                  value={template.name}
                                  disabled={alreadyAttached}
                                  onSelect={() => {
                                    attachChecklistTemplate(template)
                                    setChecklistSelectorOpen(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      alreadyAttached ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm">{template.name}</p>
                                    <p className="text-xs text-[#8898AA]">
                                      {template.items.length} item{template.items.length !== 1 ? "s" : ""}
                                      {template.services.length > 0 && (
                                        <> &middot; Linked to {template.services.map((s) => s.name).join(", ")}</>
                                      )}
                                    </p>
                                  </div>
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Attached checklists (read-only display) */}
              {attachedChecklists.length > 0 ? (
                <div className="space-y-3">
                  {attachedChecklists.map((ac) => (
                    <div
                      key={ac.templateId}
                      className="p-3 bg-[#F6F8FA] rounded-lg border border-[#E3E8EE]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[#0A2540]">
                            {ac.templateName}
                          </p>
                          {ac.autoAdded && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-[#635BFF]/10 text-[#635BFF]">
                              Auto
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-[#8898AA] hover:text-red-500"
                          onClick={() => removeAttachedChecklist(ac.templateId)}
                          aria-label={`Remove ${ac.templateName} checklist`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <ul className="space-y-1">
                        {ac.items.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-center gap-2 text-sm text-[#425466]"
                          >
                            <div className="w-4 h-4 rounded border border-[#E3E8EE] flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#8898AA]">
                  {checklistTemplates.length > 0
                    ? "No checklists attached. Select a template above or add a service with linked checklists."
                    : "No checklist templates available. Create templates in Settings to use them here."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Section 8: Internal Notes */}
          <Card className="border-[#E3E8EE]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-[#0A2540]">
                Internal Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Notes visible only to your team..."
                className="min-h-[80px] border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sticky Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <Card className="border-[#E3E8EE]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-[#0A2540]">
                  Job Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer */}
                <div>
                  <p className="text-xs uppercase font-semibold text-[#8898AA] mb-1">
                    Customer
                  </p>
                  <p className="text-sm text-[#0A2540]">
                    {selectedCustomer
                      ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                      : "Not selected"}
                  </p>
                </div>

                <Separator className="bg-[#E3E8EE]" />

                {/* Property */}
                {selectedPropertyId && (
                  <>
                    <div>
                      <p className="text-xs uppercase font-semibold text-[#8898AA] mb-1">
                        Property
                      </p>
                      <p className="text-sm text-[#425466]">
                        {customerProperties.find(
                          (p) => p.id === selectedPropertyId
                        )?.addressLine1 || ""}
                      </p>
                    </div>
                    <Separator className="bg-[#E3E8EE]" />
                  </>
                )}

                {/* Schedule */}
                <div>
                  <p className="text-xs uppercase font-semibold text-[#8898AA] mb-1">
                    Scheduled
                  </p>
                  <p className="text-sm text-[#425466]">
                    {startDate ? (
                      <>
                        {format(startDate, "MMM d, yyyy")} at{" "}
                        {formatTimeLabel(startTime)}
                        <br />
                        <span className="text-xs text-[#8898AA]">
                          Duration:{" "}
                          {
                            DURATION_OPTIONS.find((d) => d.value === duration)
                              ?.label
                          }
                        </span>
                      </>
                    ) : (
                      "Not scheduled"
                    )}
                  </p>
                </div>

                <Separator className="bg-[#E3E8EE]" />

                {/* Assigned */}
                <div>
                  <p className="text-xs uppercase font-semibold text-[#8898AA] mb-1">
                    Assigned To
                  </p>
                  {assignedUserIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {assignedUserIds.map((uid) => {
                        const member = teamMembers.find((m) => m.id === uid)
                        if (!member) return null
                        return (
                          <Badge
                            key={uid}
                            variant="secondary"
                            className="text-xs"
                          >
                            {member.firstName} {member.lastName}
                          </Badge>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-[#8898AA]">No one assigned</p>
                  )}
                </div>

                <Separator className="bg-[#E3E8EE]" />

                {/* Priority */}
                <div>
                  <p className="text-xs uppercase font-semibold text-[#8898AA] mb-1">
                    Priority
                  </p>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs",
                      priority === "URGENT"
                        ? "bg-red-50 text-red-700"
                        : "bg-blue-50 text-blue-700"
                    )}
                  >
                    {priority === "URGENT" ? "Emergency" : "Standard"}
                  </Badge>
                </div>

                {lineItems.length > 0 && (
                  <>
                    <Separator className="bg-[#E3E8EE]" />
                    <div>
                      <p className="text-xs uppercase font-semibold text-[#8898AA] mb-1">
                        Estimated Total
                      </p>
                      <p className="text-lg font-semibold text-[#0A2540]">
                        {formatCurrency(subtotal)}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-[#635BFF] hover:bg-[#5851ea] text-white h-11"
            >
              {submitting
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save Changes"
                  : "Create Job"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
