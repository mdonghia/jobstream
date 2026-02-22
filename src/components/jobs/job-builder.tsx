"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn, formatCurrency, formatDate, getInitials } from "@/lib/utils"
import { toast } from "sonner"
import { createJob } from "@/actions/jobs"
import { getCustomers } from "@/actions/customers"
import { format } from "date-fns"

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

interface ChecklistItem {
  id: string
  label: string
}

interface JobBuilderProps {
  services: Service[]
  customers: Customer[]
  teamMembers: TeamMember[]
  orgSettings: OrgSettings
  initialData?: any
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

function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

// ---- Component ----

export function JobBuilder({
  services,
  customers: initialCustomers,
  teamMembers,
  orgSettings,
  initialData,
}: JobBuilderProps) {
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

  // Assignment
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>(
    initialData?.assignedUserIds || []
  )

  // Recurring
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState("WEEKLY")
  const [weeklyDays, setWeeklyDays] = useState<number[]>([])
  const [recurrenceEnd, setRecurrenceEnd] = useState<"never" | "date">("never")
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>(
    undefined
  )

  // Checklist
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(
    initialData?.checklistItems?.map((label: string) => ({
      id: generateId(),
      label,
    })) || []
  )
  const [newChecklistItem, setNewChecklistItem] = useState("")

  // Notes
  const [internalNote, setInternalNote] = useState(initialData?.internalNote || "")

  // Customer search effect
  useEffect(() => {
    if (!customerSearch.trim()) return
    const timer = setTimeout(async () => {
      const result = await getCustomers({
        search: customerSearch,
        status: "active",
        perPage: 10,
      })
      if (!("error" in result)) {
        setCustomers(result.customers as any)
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
  }

  function updateLineItem(id: string, field: keyof LineItem, value: any) {
    setLineItems(
      lineItems.map((li) => (li.id === id ? { ...li, [field]: value } : li))
    )
  }

  function removeLineItem(id: string) {
    setLineItems(lineItems.filter((li) => li.id !== id))
  }

  // Checklist handlers
  function addChecklistItem() {
    if (!newChecklistItem.trim()) return
    setChecklistItems([
      ...checklistItems,
      { id: generateId(), label: newChecklistItem.trim() },
    ])
    setNewChecklistItem("")
  }

  function removeChecklistItem(id: string) {
    setChecklistItems(checklistItems.filter((item) => item.id !== id))
  }

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
      const result = await createJob({
        customerId: selectedCustomerId,
        propertyId: selectedPropertyId || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
        assignedUserIds: assignedUserIds.length > 0 ? assignedUserIds : undefined,
        checklistItems:
          checklistItems.length > 0
            ? checklistItems.map((ci) => ci.label)
            : undefined,
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
            : undefined,
        internalNote: internalNote.trim() || undefined,
        isRecurring,
        recurrenceRule: isRecurring ? frequency : undefined,
        recurrenceEndDate:
          isRecurring && recurrenceEnd === "date" && recurrenceEndDate
            ? recurrenceEndDate.toISOString()
            : undefined,
      })

      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Job created successfully")
        router.push(`/jobs/${result.jobId}`)
      }
    } catch {
      toast.error("Failed to create job")
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
          <h1 className="text-2xl font-semibold text-[#0A2540]">New Job</h1>
          <p className="text-sm text-[#8898AA]">
            Create a new job for a customer
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
                                setSelectedPropertyId("")
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
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
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
                    </SelectContent>
                  </Select>
                </div>

                {(frequency === "WEEKLY" || frequency === "BIWEEKLY") && (
                  <div className="space-y-1.5">
                    <Label className="text-sm text-[#425466]">
                      Repeat on days
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map((day, index) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() =>
                            setWeeklyDays((prev) =>
                              prev.includes(index)
                                ? prev.filter((d) => d !== index)
                                : [...prev, index]
                            )
                          }
                          className={cn(
                            "w-9 h-9 rounded-full text-xs font-medium transition-colors",
                            weeklyDays.includes(index)
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

                <div className="space-y-1.5">
                  <Label className="text-sm text-[#425466]">Ends</Label>
                  <Select
                    value={recurrenceEnd}
                    onValueChange={(v) =>
                      setRecurrenceEnd(v as "never" | "date")
                    }
                  >
                    <SelectTrigger className="w-[200px] h-10 border-[#E3E8EE] text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="date">On a date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recurrenceEnd === "date" && (
                  <div className="space-y-1.5">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[200px] justify-start h-10 text-left font-normal border-[#E3E8EE] text-sm",
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
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Section 7: Checklist */}
          <Card className="border-[#E3E8EE]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-[#0A2540]">
                Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {checklistItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 group"
                >
                  <GripVertical className="w-4 h-4 text-[#8898AA] opacity-0 group-hover:opacity-100 cursor-grab" />
                  <span className="flex-1 text-sm text-[#425466]">
                    {item.label}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[#8898AA] opacity-0 group-hover:opacity-100 hover:text-red-500"
                    onClick={() => removeChecklistItem(item.id)}
                    aria-label="Remove checklist item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Add a checklist item..."
                  className="h-9 text-sm border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addChecklistItem()
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-[#E3E8EE]"
                  onClick={addChecklistItem}
                  aria-label="Add checklist item"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
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
                      priority === "LOW" && "bg-gray-100 text-gray-700",
                      priority === "MEDIUM" && "bg-blue-50 text-blue-700",
                      priority === "HIGH" && "bg-amber-50 text-amber-700",
                      priority === "URGENT" && "bg-red-50 text-red-700"
                    )}
                  >
                    {priority.charAt(0) + priority.slice(1).toLowerCase()}
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
              {submitting ? "Creating..." : "Create Job"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
