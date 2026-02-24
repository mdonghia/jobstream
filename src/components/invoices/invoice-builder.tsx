"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { format, addDays } from "date-fns"
import {
  CalendarIcon,
  Check,
  ChevronsUpDown,
  Plus,
  Trash2,
  ArrowLeft,
  Percent,
  DollarSign,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Separator } from "@/components/ui/separator"
import { cn, formatCurrency } from "@/lib/utils"
import { createInvoice, sendInvoice } from "@/actions/invoices"
import { toast } from "sonner"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Service {
  id: string
  name: string
  defaultPrice: number
  description: string | null
  taxable: boolean
}

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string | null
  company: string | null
}

interface OrgSettings {
  taxRate: number
  invoiceDueDays: number
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

interface InitialData {
  customerId?: string
  jobId?: string
  jobNumber?: string
  lineItems?: {
    serviceId?: string | null
    name: string
    description?: string | null
    quantity: number
    unitPrice: number
    taxable: boolean
  }[]
  dueDate?: string
}

interface InvoiceBuilderProps {
  services: Service[]
  customers: Customer[]
  orgSettings: OrgSettings
  initialData?: InitialData
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let nextItemId = 1
function newLineItem(): LineItem {
  return {
    id: `item-${nextItemId++}`,
    serviceId: undefined,
    name: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
    taxable: true,
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function InvoiceBuilder({
  services,
  customers,
  orgSettings,
  initialData,
}: InvoiceBuilderProps) {
  const router = useRouter()

  // Customer
  const [customerId, setCustomerId] = useState(initialData?.customerId || "")
  const [customerOpen, setCustomerOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState("")

  // Line Items
  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    if (initialData?.lineItems && initialData.lineItems.length > 0) {
      return initialData.lineItems.map((li) => ({
        id: `item-${nextItemId++}`,
        serviceId: li.serviceId || undefined,
        name: li.name,
        description: li.description || "",
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        taxable: li.taxable,
      }))
    }
    return [newLineItem()]
  })

  // Discount
  const [showDiscount, setShowDiscount] = useState(false)
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage")
  const [discountValue, setDiscountValue] = useState("")

  // Notes
  const [customerNote, setCustomerNote] = useState("")
  const [internalNote, setInternalNote] = useState("")

  // Due date
  const defaultDue = initialData?.dueDate
    ? new Date(initialData.dueDate)
    : addDays(new Date(), orgSettings.invoiceDueDays)
  const [dueDate, setDueDate] = useState<Date>(defaultDue)
  const [dueDateOpen, setDueDateOpen] = useState(false)

  // Submission state
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  // ─── Calculations ──────────────────────────────────────────────────────

  const calculations = useMemo(() => {
    const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0)
    const taxableAmount = lineItems
      .filter((li) => li.taxable)
      .reduce((sum, li) => sum + li.quantity * li.unitPrice, 0)

    let discountAmount = 0
    const dv = parseFloat(discountValue) || 0
    if (showDiscount && dv > 0) {
      if (discountType === "percentage") {
        discountAmount = subtotal * (dv / 100)
      } else {
        discountAmount = dv
      }
    }

    const afterDiscount = subtotal - discountAmount
    const taxableAfterDiscount = Math.max(0, taxableAmount - discountAmount)
    const taxAmount = taxableAfterDiscount * orgSettings.taxRate
    const total = afterDiscount + taxAmount

    return { subtotal, discountAmount, taxableAfterDiscount, taxAmount, total }
  }, [lineItems, showDiscount, discountType, discountValue, orgSettings.taxRate])

  // ─── Customer search filtering ─────────────────────────────────────────

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers
    const q = customerSearch.toLowerCase()
    return customers.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q))
    )
  }, [customers, customerSearch])

  const selectedCustomer = customers.find((c) => c.id === customerId)

  // ─── Line Item Operations ──────────────────────────────────────────────

  function updateLineItem(id: string, updates: Partial<LineItem>) {
    setLineItems((items) =>
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
  }

  function removeLineItem(id: string) {
    setLineItems((items) => {
      const filtered = items.filter((item) => item.id !== id)
      return filtered.length === 0 ? [newLineItem()] : filtered
    })
  }

  function selectService(itemId: string, serviceId: string) {
    const service = services.find((s) => s.id === serviceId)
    if (!service) return
    updateLineItem(itemId, {
      serviceId,
      name: service.name,
      description: service.description || "",
      unitPrice: service.defaultPrice,
      taxable: service.taxable,
    })
  }

  // ─── Submit ────────────────────────────────────────────────────────────

  async function handleSubmit(sendAfterCreate: boolean) {
    // Validation
    if (!customerId) {
      toast.error("Please select a customer")
      return
    }
    const validItems = lineItems.filter((li) => li.name.trim() && li.unitPrice > 0)
    if (validItems.length === 0) {
      toast.error("Please add at least one line item")
      return
    }

    const setLoading = sendAfterCreate ? setSending : setSaving
    setLoading(true)

    try {
      const result = await createInvoice({
        customerId,
        jobId: initialData?.jobId,
        lineItems: validItems.map((li) => ({
          serviceId: li.serviceId,
          name: li.name,
          description: li.description || undefined,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          taxable: li.taxable,
        })),
        discountType: showDiscount ? discountType : undefined,
        discountValue: showDiscount ? parseFloat(discountValue) || undefined : undefined,
        customerNote: customerNote || undefined,
        internalNote: internalNote || undefined,
        dueDate: dueDate.toISOString(),
      })

      if ("error" in result) {
        toast.error(result.error)
        return
      }

      const invoice = (result as any).invoice

      if (sendAfterCreate && invoice?.id) {
        const sendResult = await sendInvoice(invoice.id)
        if ("error" in sendResult) {
          toast.error(`Invoice created but failed to send: ${sendResult.error}`)
          router.push(`/invoices/${invoice.id}`)
          return
        }
        toast.success("Invoice created and sent")
      } else {
        toast.success("Invoice saved as draft")
      }

      router.push(`/invoices/${invoice.id}`)
    } catch {
      toast.error("Failed to create invoice")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.push("/invoices")}
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-[#0A2540]">New Invoice</h1>
          {initialData?.jobNumber && (
            <p className="text-sm text-[#635BFF] mt-0.5">
              From Job {initialData.jobNumber}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left Column ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selector */}
          <div className="bg-white rounded-lg border border-[#E3E8EE] p-5">
            <Label className="text-sm font-medium text-[#0A2540] mb-3 block">Customer</Label>
            <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={customerOpen}
                  className="w-full justify-between border-[#E3E8EE] text-left font-normal"
                >
                  {selectedCustomer
                    ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}${
                        selectedCustomer.company ? ` - ${selectedCustomer.company}` : ""
                      }`
                    : "Select customer..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search customers..."
                    value={customerSearch}
                    onValueChange={setCustomerSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No customer found.</CommandEmpty>
                    <CommandGroup>
                      {filteredCustomers.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.id}
                          onSelect={(val) => {
                            setCustomerId(val === customerId ? "" : val)
                            setCustomerOpen(false)
                            setCustomerSearch("")
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              customerId === c.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div>
                            <span className="font-medium">
                              {c.firstName} {c.lastName}
                            </span>
                            {c.company && (
                              <span className="text-xs text-[#8898AA] ml-2">{c.company}</span>
                            )}
                            {c.email && (
                              <p className="text-xs text-[#8898AA]">{c.email}</p>
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

          {/* Line Items */}
          <div className="bg-white rounded-lg border border-[#E3E8EE] p-5">
            <Label className="text-sm font-medium text-[#0A2540] mb-3 block">Line Items</Label>

            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  services={services}
                  onUpdate={(updates) => updateLineItem(item.id, updates)}
                  onRemove={() => removeLineItem(item.id)}
                  onSelectService={(serviceId) => selectService(item.id, serviceId)}
                  showRemove={lineItems.length > 1}
                  index={index}
                />
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 border-dashed border-[#E3E8EE] text-[#635BFF] hover:text-[#5851ea] hover:border-[#635BFF]"
              onClick={() => setLineItems([...lineItems, newLineItem()])}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Line Item
            </Button>
          </div>

          {/* Discount */}
          <div className="bg-white rounded-lg border border-[#E3E8EE] p-5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-[#0A2540]">Discount</Label>
              <Switch checked={showDiscount} onCheckedChange={setShowDiscount} />
            </div>

            {showDiscount && (
              <div className="mt-4 flex items-center gap-3">
                <Select
                  value={discountType}
                  onValueChange={(v) => setDiscountType(v as "percentage" | "fixed")}
                >
                  <SelectTrigger className="w-[160px] border-[#E3E8EE]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">
                      <span className="flex items-center gap-1">
                        <Percent className="w-3 h-3" /> Percentage
                      </span>
                    </SelectItem>
                    <SelectItem value="fixed">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> Fixed Amount
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8898AA] text-sm">
                    {discountType === "percentage" ? "%" : "$"}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="0"
                    className="pl-7 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg border border-[#E3E8EE] p-5 space-y-4">
            <div>
              <Label className="text-sm font-medium text-[#0A2540] mb-2 block">
                Customer Note
                <span className="text-[#8898AA] font-normal ml-1">(visible on invoice)</span>
              </Label>
              <Textarea
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="Thank you for your business..."
                rows={3}
                className="border-[#E3E8EE] focus-visible:ring-[#635BFF] resize-none"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-[#0A2540] mb-2 block">
                Internal Note
                <span className="text-[#8898AA] font-normal ml-1">(not visible to customer)</span>
              </Label>
              <Textarea
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Internal notes..."
                rows={2}
                className="border-[#E3E8EE] focus-visible:ring-[#635BFF] resize-none"
              />
            </div>
          </div>
        </div>

        {/* ─── Right Column (Sticky Summary) ────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="bg-white rounded-lg border border-[#E3E8EE] p-5">
              <h3 className="text-sm font-semibold text-[#0A2540] mb-4">Summary</h3>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#425466]">Subtotal</span>
                  <span className="font-medium text-[#0A2540]">
                    {formatCurrency(calculations.subtotal)}
                  </span>
                </div>

                {showDiscount && calculations.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#425466]">
                      Discount
                      {discountType === "percentage" && discountValue
                        ? ` (${discountValue}%)`
                        : ""}
                    </span>
                    <span className="font-medium text-red-500">
                      -{formatCurrency(calculations.discountAmount)}
                    </span>
                  </div>
                )}

                {orgSettings.taxRate > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#425466]">Taxable Amount</span>
                      <span className="text-[#0A2540]">
                        {formatCurrency(calculations.taxableAfterDiscount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#425466]">Tax ({+(orgSettings.taxRate * 100).toFixed(2)}%)</span>
                      <span className="text-[#0A2540]">
                        {formatCurrency(calculations.taxAmount)}
                      </span>
                    </div>
                  </>
                )}

                <Separator className="bg-[#E3E8EE]" />

                <div className="flex justify-between">
                  <span className="text-base font-semibold text-[#0A2540]">Total</span>
                  <span className="text-base font-semibold text-[#0A2540]">
                    {formatCurrency(calculations.total)}
                  </span>
                </div>
              </div>

              {/* Due Date */}
              <div className="mt-6">
                <Label className="text-sm font-medium text-[#425466] mb-2 block">Due Date</Label>
                <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal border-[#E3E8EE]"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-[#8898AA]" />
                      {format(dueDate, "MMM d, yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={(d) => {
                        if (d) setDueDate(d)
                        setDueDateOpen(false)
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-2">
                <Button
                  onClick={() => handleSubmit(true)}
                  disabled={saving || sending}
                  className="w-full bg-[#635BFF] hover:bg-[#5851ea] text-white"
                >
                  {sending ? "Sending..." : "Send Invoice"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSubmit(false)}
                  disabled={saving || sending}
                  className="w-full border-[#E3E8EE] text-[#425466]"
                >
                  {saving ? "Saving..." : "Save as Draft"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Line Item Row Component ─────────────────────────────────────────────────

function LineItemRow({
  item,
  services,
  onUpdate,
  onRemove,
  onSelectService,
  showRemove,
  index,
}: {
  item: LineItem
  services: Service[]
  onUpdate: (updates: Partial<LineItem>) => void
  onRemove: () => void
  onSelectService: (serviceId: string) => void
  showRemove: boolean
  index: number
}) {
  const [serviceOpen, setServiceOpen] = useState(false)
  const lineTotal = item.quantity * item.unitPrice

  return (
    <div className="border border-[#E3E8EE] rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          {/* Service Combobox */}
          <div>
            <Label className="text-xs text-[#8898AA] mb-1 block">
              Service
              <span className="font-normal ml-1">(optional)</span>
            </Label>
            <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between border-[#E3E8EE] text-left font-normal text-sm h-9"
                >
                  {item.serviceId
                    ? services.find((s) => s.id === item.serviceId)?.name || "Select service..."
                    : "Select service..."}
                  <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search services..." />
                  <CommandList>
                    <CommandEmpty>No service found.</CommandEmpty>
                    <CommandGroup>
                      {services.map((s) => (
                        <CommandItem
                          key={s.id}
                          value={s.name}
                          onSelect={() => {
                            onSelectService(s.id)
                            setServiceOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              item.serviceId === s.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex justify-between w-full">
                            <span>{s.name}</span>
                            <span className="text-xs text-[#8898AA]">
                              {formatCurrency(s.defaultPrice)}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Name + Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-[#8898AA] mb-1 block">Name</Label>
              <Input
                value={item.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="Line item name"
                className="h-9 text-sm border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              />
            </div>
            <div>
              <Label className="text-xs text-[#8898AA] mb-1 block">Description</Label>
              <Input
                value={item.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="Description (optional)"
                className="h-9 text-sm border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              />
            </div>
          </div>

          {/* Qty, Price, Total */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-[#8898AA] mb-1 block">Qty</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={item.quantity}
                onChange={(e) => onUpdate({ quantity: parseFloat(e.target.value) || 0 })}
                className="h-9 text-sm border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              />
            </div>
            <div>
              <Label className="text-xs text-[#8898AA] mb-1 block">Unit Price</Label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#8898AA] text-xs">
                  $
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.unitPrice}
                  onChange={(e) => onUpdate({ unitPrice: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-sm pl-5 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-[#8898AA] mb-1 block">Total</Label>
              <div className="h-9 flex items-center text-sm font-medium text-[#0A2540] bg-[#F6F8FA] rounded-md px-3 border border-[#E3E8EE]">
                {formatCurrency(lineTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* Remove Button */}
        {showRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[#8898AA] hover:text-red-500 mt-5"
            onClick={onRemove}
            aria-label="Remove line item"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
