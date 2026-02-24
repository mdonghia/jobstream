"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Search,
  Check,
  ChevronsUpDown,
  Layers,
  ChevronDown,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn, formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import { createQuote, updateQuote } from "@/actions/quotes"
import { getCustomers } from "@/actions/customers"

// ── Types ──────────────────────────────────────────────────────────────────

interface ServiceItem {
  id: string
  name: string
  description: string | null
  defaultPrice: number
  unit: string
  taxable: boolean
  isActive: boolean
}

interface CustomerItem {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  properties: {
    id: string
    addressLine1: string
    city: string
    state: string
    zip: string
  }[]
}

interface OrgSettings {
  taxRate: number
  quoteValidDays: number
}

interface LineItem {
  key: string // local unique key for React
  serviceId?: string
  name: string
  description: string
  quantity: number
  unitPrice: number
  taxable: boolean
}

interface QuoteOption {
  key: string
  name: string
  description: string
  lineItems: LineItem[]
  expanded: boolean
}

interface QuoteBuilderProps {
  services: ServiceItem[]
  customers: CustomerItem[]
  orgSettings: OrgSettings
  initialData?: {
    id?: string
    customerId?: string
    propertyId?: string
    lineItems?: LineItem[]
    customerMessage?: string
    internalNote?: string
    validDays?: number
  }
  mode?: "create" | "edit"
}

// ── Helpers ────────────────────────────────────────────────────────────────

let nextKey = 1
function newKey(): string {
  return `li-${nextKey++}`
}

function emptyLineItem(): LineItem {
  return {
    key: newKey(),
    name: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
    taxable: true,
  }
}

let nextOptionKey = 1
function newOptionKey(): string {
  return `opt-${nextOptionKey++}`
}

function emptyOption(name: string): QuoteOption {
  return {
    key: newOptionKey(),
    name,
    description: "",
    lineItems: [emptyLineItem()],
    expanded: true,
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function QuoteBuilder({
  services,
  customers: initialCustomers,
  orgSettings,
  initialData,
  mode = "create",
}: QuoteBuilderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [customers, setCustomers] = useState<CustomerItem[]>(initialCustomers)
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    initialData?.customerId || searchParams.get("customerId") || ""
  )
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    initialData?.propertyId || ""
  )
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initialData?.lineItems?.length ? initialData.lineItems : [emptyLineItem()]
  )
  const [customerMessage, setCustomerMessage] = useState(
    initialData?.customerMessage || ""
  )
  const [internalNote, setInternalNote] = useState(
    initialData?.internalNote || ""
  )
  const [validDays, setValidDays] = useState(
    initialData?.validDays || orgSettings.quoteValidDays || 30
  )

  // Multi-option state
  const [useOptions, setUseOptions] = useState(false)
  const [options, setOptions] = useState<QuoteOption[]>([])

  const [saving, setSaving] = useState(false)
  const [sendAfterCreate, setSendAfterCreate] = useState(false)

  // Customer combobox
  const [customerOpen, setCustomerOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState("")

  // Fetch more customers if searching
  const searchCustomers = useCallback(async (query: string) => {
    if (!query.trim()) return
    try {
      const result = await getCustomers({ search: query, perPage: 20 })
      if (!("error" in result)) {
        setCustomers((prev) => {
          const existingIds = new Set(prev.map((c) => c.id))
          const newCusts = (result.customers as any[]).filter(
            (c) => !existingIds.has(c.id)
          )
          return [...prev, ...newCusts]
        })
      }
    } catch {
      // Silently fail search
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearch.trim()) {
        searchCustomers(customerSearch)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [customerSearch, searchCustomers])

  // Selected customer data
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)

  // Auto-select property if customer has only one
  useEffect(() => {
    if (selectedCustomer && selectedCustomer.properties?.length === 1) {
      setSelectedPropertyId(selectedCustomer.properties[0].id)
    } else if (!selectedCustomer) {
      setSelectedPropertyId("")
    }
  }, [selectedCustomerId, selectedCustomer])

  // ── Line items management ────────────────────────────────────────────────

  function updateLineItem(index: number, updates: Partial<LineItem>) {
    setLineItems((prev) =>
      prev.map((li, i) => (i === index ? { ...li, ...updates } : li))
    )
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, emptyLineItem()])
  }

  function selectService(index: number, serviceId: string) {
    if (serviceId === "custom") {
      updateLineItem(index, {
        serviceId: undefined,
        name: "",
        description: "",
        unitPrice: 0,
        taxable: true,
      })
      return
    }
    const svc = services.find((s) => s.id === serviceId)
    if (!svc) return
    updateLineItem(index, {
      serviceId: svc.id,
      name: svc.name,
      description: svc.description || "",
      unitPrice: Number(svc.defaultPrice),
      taxable: svc.taxable,
    })
  }

  // ── Option management ───────────────────────────────────────────────────

  function enableOptions() {
    // Switch from flat line items to options mode.
    // Move the current flat line items into the first option.
    const firstOption: QuoteOption = {
      key: newOptionKey(),
      name: "Option 1",
      description: "",
      lineItems: lineItems.length > 0 ? [...lineItems] : [emptyLineItem()],
      expanded: true,
    }
    setOptions([firstOption])
    setUseOptions(true)
  }

  function disableOptions() {
    // Revert to flat mode. Move the first option's line items back to flat.
    if (options.length > 0) {
      setLineItems(options[0].lineItems.length > 0 ? [...options[0].lineItems] : [emptyLineItem()])
    }
    setOptions([])
    setUseOptions(false)
  }

  function addOption() {
    if (options.length >= 4) {
      toast.error("A quote can have a maximum of 4 options")
      return
    }
    setOptions((prev) => [
      ...prev,
      emptyOption(`Option ${prev.length + 1}`),
    ])
  }

  function removeOption(optIndex: number) {
    setOptions((prev) => {
      const updated = prev.filter((_, i) => i !== optIndex)
      // If only 1 option left, revert to flat mode
      if (updated.length <= 0) {
        setLineItems([emptyLineItem()])
        setUseOptions(false)
        return []
      }
      if (updated.length === 1) {
        // Keep as option mode but don't auto-revert -- user might want to add more
      }
      return updated
    })
  }

  function updateOption(optIndex: number, updates: Partial<QuoteOption>) {
    setOptions((prev) =>
      prev.map((opt, i) => (i === optIndex ? { ...opt, ...updates } : opt))
    )
  }

  function updateOptionLineItem(
    optIndex: number,
    liIndex: number,
    updates: Partial<LineItem>
  ) {
    setOptions((prev) =>
      prev.map((opt, oi) => {
        if (oi !== optIndex) return opt
        return {
          ...opt,
          lineItems: opt.lineItems.map((li, li2) =>
            li2 === liIndex ? { ...li, ...updates } : li
          ),
        }
      })
    )
  }

  function removeOptionLineItem(optIndex: number, liIndex: number) {
    setOptions((prev) =>
      prev.map((opt, oi) => {
        if (oi !== optIndex) return opt
        if (opt.lineItems.length <= 1) return opt
        return {
          ...opt,
          lineItems: opt.lineItems.filter((_, li2) => li2 !== liIndex),
        }
      })
    )
  }

  function addOptionLineItem(optIndex: number) {
    setOptions((prev) =>
      prev.map((opt, oi) => {
        if (oi !== optIndex) return opt
        return { ...opt, lineItems: [...opt.lineItems, emptyLineItem()] }
      })
    )
  }

  function selectOptionService(optIndex: number, liIndex: number, serviceId: string) {
    if (serviceId === "custom") {
      updateOptionLineItem(optIndex, liIndex, {
        serviceId: undefined,
        name: "",
        description: "",
        unitPrice: 0,
        taxable: true,
      })
      return
    }
    const svc = services.find((s) => s.id === serviceId)
    if (!svc) return
    updateOptionLineItem(optIndex, liIndex, {
      serviceId: svc.id,
      name: svc.name,
      description: svc.description || "",
      unitPrice: Number(svc.defaultPrice),
      taxable: svc.taxable,
    })
  }

  function toggleOptionExpanded(optIndex: number) {
    setOptions((prev) =>
      prev.map((opt, i) =>
        i === optIndex ? { ...opt, expanded: !opt.expanded } : opt
      )
    )
  }

  // ── Calculations ─────────────────────────────────────────────────────────

  // Calculate option totals for multi-option mode
  function calcOptionTotals(items: LineItem[]) {
    const sub = items.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0)
    const taxable = items.reduce(
      (sum, li) => (li.taxable ? sum + li.quantity * li.unitPrice : sum),
      0
    )
    const tax = taxable * orgSettings.taxRate
    return { subtotal: sub, taxAmount: tax, total: sub + tax }
  }

  // In options mode, show the lowest option total as the "starting from" price
  const optionTotals = useOptions
    ? options.map((opt) => calcOptionTotals(opt.lineItems))
    : []

  const lowestOptionTotal = useOptions && optionTotals.length > 0
    ? Math.min(...optionTotals.map((t) => t.total))
    : 0

  const subtotal = useOptions
    ? (optionTotals.length > 0 ? Math.min(...optionTotals.map((t) => t.subtotal)) : 0)
    : lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0)

  const taxableAmount = useOptions
    ? 0 // Not used directly in options mode
    : lineItems.reduce(
        (sum, li) => (li.taxable ? sum + li.quantity * li.unitPrice : sum),
        0
      )

  const taxAmount = useOptions
    ? (optionTotals.length > 0 ? Math.min(...optionTotals.map((t) => t.taxAmount)) : 0)
    : taxableAmount * orgSettings.taxRate

  const totalAmount = useOptions ? lowestOptionTotal : subtotal + taxAmount

  // ── Validation ───────────────────────────────────────────────────────────

  function validate(): string | null {
    if (!selectedCustomerId) return "Please select a customer"

    if (useOptions) {
      if (options.length === 0) return "Please add at least one option"
      for (const opt of options) {
        if (!opt.name.trim()) return "Each option must have a name"
        const validItems = opt.lineItems.filter((li) => li.name.trim() && li.unitPrice > 0)
        if (validItems.length === 0)
          return `Option "${opt.name}" must have at least one line item with a name and price`
      }
      return null
    }

    const validItems = lineItems.filter((li) => li.name.trim() && li.unitPrice > 0)
    if (validItems.length === 0)
      return "Please add at least one line item with a name and price"
    return null
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(asDraft: boolean) {
    const error = validate()
    if (error) {
      toast.error(error)
      return
    }

    setSaving(true)
    setSendAfterCreate(!asDraft)

    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + validDays)

    const data: any = {
      customerId: selectedCustomerId,
      propertyId: selectedPropertyId || undefined,
      lineItems: useOptions
        ? [] // Options mode: line items live inside each option
        : lineItems
            .filter((li) => li.name.trim())
            .map((li) => ({
              serviceId: li.serviceId,
              name: li.name,
              description: li.description || undefined,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
              taxable: li.taxable,
            })),
      customerMessage: customerMessage || undefined,
      internalNote: internalNote || undefined,
      validUntil: validUntil.toISOString(),
    }

    // Attach options if in multi-option mode
    if (useOptions && options.length > 0) {
      data.options = options.map((opt) => ({
        name: opt.name,
        description: opt.description || undefined,
        lineItems: opt.lineItems
          .filter((li) => li.name.trim())
          .map((li) => ({
            serviceId: li.serviceId,
            name: li.name,
            description: li.description || undefined,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            taxable: li.taxable,
          })),
      }))
    }

    if (mode === "edit" && initialData?.id) {
      const result = await updateQuote(initialData.id, data)
      if ("error" in result) {
        toast.error(result.error as string)
        setSaving(false)
        return
      }
      toast.success("Quote updated")
      router.push(`/quotes/${initialData.id}`)
    } else {
      const result = await createQuote(data)
      if ("error" in result) {
        toast.error(result.error as string)
        setSaving(false)
        return
      }
      if (asDraft) {
        toast.success("Quote saved as draft")
        router.push(`/quotes/${(result as any).quote.id}`)
      } else {
        toast.success("Quote created")
        router.push(`/quotes/${(result as any).quote.id}?action=send`)
      }
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

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
          <Link href="/quotes">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-[#0A2540]">
            {mode === "edit" ? "Edit Quote" : "New Quote"}
          </h1>
          <p className="text-sm text-[#8898AA] mt-0.5">
            {mode === "edit"
              ? "Update the details for this quote"
              : "Create a quote to send to your customer"}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column */}
        <div className="flex-1 space-y-6">
          {/* Section 1: Customer & Property */}
          <Card className="border-[#E3E8EE]">
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label className="text-sm font-medium text-[#0A2540] mb-1.5 block">
                  Customer <span className="text-red-500">*</span>
                </Label>
                <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerOpen}
                      className="w-full justify-between border-[#E3E8EE] h-10 text-left font-normal"
                    >
                      {selectedCustomer
                        ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}${selectedCustomer.email ? ` (${selectedCustomer.email})` : ""}`
                        : "Select a customer..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[min(460px,calc(100vw-2rem))] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search by name, email, or phone..."
                        value={customerSearch}
                        onValueChange={setCustomerSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No customers found.</CommandEmpty>
                        <CommandGroup>
                          {customers
                            .filter((c) => {
                              if (!customerSearch.trim()) return true
                              const q = customerSearch.toLowerCase()
                              return (
                                `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
                                (c.email && c.email.toLowerCase().includes(q)) ||
                                (c.phone && c.phone.includes(q))
                              )
                            })
                            .map((c) => (
                              <CommandItem
                                key={c.id}
                                value={c.id}
                                onSelect={() => {
                                  setSelectedCustomerId(c.id)
                                  setCustomerOpen(false)
                                  setCustomerSearch("")
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedCustomerId === c.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div>
                                  <p className="text-sm font-medium">
                                    {c.firstName} {c.lastName}
                                  </p>
                                  {(c.email || c.phone) && (
                                    <p className="text-xs text-[#8898AA]">
                                      {c.email}
                                      {c.email && c.phone && " \u00B7 "}
                                      {c.phone}
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

              {/* Property select */}
              {selectedCustomer && selectedCustomer.properties?.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-[#0A2540] mb-1.5 block">
                    Property
                  </Label>
                  <Select
                    value={selectedPropertyId}
                    onValueChange={setSelectedPropertyId}
                  >
                    <SelectTrigger className="border-[#E3E8EE] h-10">
                      <SelectValue placeholder="Select property (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCustomer.properties.map((prop) => (
                        <SelectItem key={prop.id} value={prop.id}>
                          {prop.addressLine1}, {prop.city}, {prop.state} {prop.zip}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Line Items / Options */}
          {!useOptions ? (
            /* ── Flat line items mode ──────────────────────────────────── */
            <Card className="border-[#E3E8EE]">
              <CardContent className="pt-6">
                <Label className="text-sm font-semibold text-[#0A2540] mb-3 block">
                  Line Items <span className="text-red-500">*</span>
                </Label>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left">
                        <th className="pb-2 text-xs font-semibold uppercase text-[#8898AA] w-[200px]">
                          Service
                        </th>
                        <th className="pb-2 text-xs font-semibold uppercase text-[#8898AA]">
                          Description
                        </th>
                        <th className="pb-2 text-xs font-semibold uppercase text-[#8898AA] w-[80px]">
                          Qty
                        </th>
                        <th className="pb-2 text-xs font-semibold uppercase text-[#8898AA] w-[120px]">
                          Unit Price
                        </th>
                        <th className="pb-2 text-xs font-semibold uppercase text-[#8898AA] w-[100px] text-right">
                          Total
                        </th>
                        <th className="pb-2 w-[40px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((li, index) => (
                        <tr key={li.key} className="align-top">
                          <td className="py-1.5 pr-2">
                            <Select
                              value={li.serviceId || "custom"}
                              onValueChange={(v) => selectService(index, v)}
                            >
                              <SelectTrigger className="border-[#E3E8EE] h-9 text-sm">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="custom">Custom Item</SelectItem>
                                {services
                                  .filter((s) => s.isActive)
                                  .map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-1.5 pr-2">
                            <Input
                              value={li.name}
                              onChange={(e) =>
                                updateLineItem(index, { name: e.target.value })
                              }
                              placeholder="Item name"
                              className="border-[#E3E8EE] h-9 text-sm"
                            />
                            <Input
                              value={li.description}
                              onChange={(e) =>
                                updateLineItem(index, { description: e.target.value })
                              }
                              placeholder="Description (optional)"
                              className="border-[#E3E8EE] h-9 text-sm mt-1.5"
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <Input
                              type="number"
                              min={0.01}
                              step={0.01}
                              value={li.quantity}
                              onChange={(e) =>
                                updateLineItem(index, {
                                  quantity: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="border-[#E3E8EE] h-9 text-sm"
                            />
                          </td>
                          <td className="py-1.5 pr-2">
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={li.unitPrice}
                              onChange={(e) =>
                                updateLineItem(index, {
                                  unitPrice: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="border-[#E3E8EE] h-9 text-sm"
                            />
                          </td>
                          <td className="py-1.5 pr-2 text-right text-sm font-medium text-[#0A2540] pt-3.5">
                            {formatCurrency(li.quantity * li.unitPrice)}
                          </td>
                          <td className="py-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-[#8898AA] hover:text-red-600"
                              disabled={lineItems.length <= 1}
                              onClick={() => removeLineItem(index)}
                              aria-label="Remove line item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#E3E8EE] text-[#425466]"
                    onClick={addLineItem}
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Line Item
                  </Button>
                  {mode === "create" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#E3E8EE] text-[#635BFF] hover:text-[#5851ea] hover:border-[#635BFF]"
                      onClick={enableOptions}
                    >
                      <Layers className="w-4 h-4 mr-1.5" />
                      Add Options
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            /* ── Multi-option mode ─────────────────────────────────────── */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-[#0A2540]">
                  Quote Options <span className="text-red-500">*</span>
                  <span className="text-xs font-normal text-[#8898AA] ml-2">
                    ({options.length}/4)
                  </span>
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-[#8898AA] hover:text-red-600"
                  onClick={disableOptions}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Remove Options
                </Button>
              </div>

              {options.map((opt, optIndex) => {
                const optTotals = calcOptionTotals(opt.lineItems)

                return (
                  <Card
                    key={opt.key}
                    className="border-[#E3E8EE] overflow-hidden"
                  >
                    {/* Option header */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-[#F6F8FA] border-b border-[#E3E8EE]">
                      <button
                        type="button"
                        onClick={() => toggleOptionExpanded(optIndex)}
                        className="flex items-center gap-1 text-[#8898AA] hover:text-[#425466]"
                      >
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 transition-transform",
                            !opt.expanded && "-rotate-90"
                          )}
                        />
                      </button>
                      <Input
                        value={opt.name}
                        onChange={(e) =>
                          updateOption(optIndex, { name: e.target.value })
                        }
                        placeholder="Option name"
                        className="border-[#E3E8EE] h-8 text-sm font-semibold text-[#0A2540] max-w-[200px] bg-white"
                      />
                      <Input
                        value={opt.description}
                        onChange={(e) =>
                          updateOption(optIndex, {
                            description: e.target.value,
                          })
                        }
                        placeholder="Description (optional)"
                        className="border-[#E3E8EE] h-8 text-sm text-[#425466] flex-1 bg-white"
                      />
                      <span className="text-sm font-semibold text-[#0A2540] whitespace-nowrap ml-2">
                        {formatCurrency(optTotals.total)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-[#8898AA] hover:text-red-600 shrink-0"
                        onClick={() => removeOption(optIndex)}
                        aria-label={`Remove ${opt.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Option body (collapsible) */}
                    {opt.expanded && (
                      <CardContent className="pt-4">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="text-left">
                                <th className="pb-2 text-xs font-semibold uppercase text-[#8898AA] w-[200px]">
                                  Service
                                </th>
                                <th className="pb-2 text-xs font-semibold uppercase text-[#8898AA]">
                                  Description
                                </th>
                                <th className="pb-2 text-xs font-semibold uppercase text-[#8898AA] w-[80px]">
                                  Qty
                                </th>
                                <th className="pb-2 text-xs font-semibold uppercase text-[#8898AA] w-[120px]">
                                  Unit Price
                                </th>
                                <th className="pb-2 text-xs font-semibold uppercase text-[#8898AA] w-[100px] text-right">
                                  Total
                                </th>
                                <th className="pb-2 w-[40px]"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {opt.lineItems.map((li, liIndex) => (
                                <tr key={li.key} className="align-top">
                                  <td className="py-1.5 pr-2">
                                    <Select
                                      value={li.serviceId || "custom"}
                                      onValueChange={(v) =>
                                        selectOptionService(optIndex, liIndex, v)
                                      }
                                    >
                                      <SelectTrigger className="border-[#E3E8EE] h-9 text-sm">
                                        <SelectValue placeholder="Select..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="custom">
                                          Custom Item
                                        </SelectItem>
                                        {services
                                          .filter((s) => s.isActive)
                                          .map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                              {s.name}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="py-1.5 pr-2">
                                    <Input
                                      value={li.name}
                                      onChange={(e) =>
                                        updateOptionLineItem(optIndex, liIndex, {
                                          name: e.target.value,
                                        })
                                      }
                                      placeholder="Item name"
                                      className="border-[#E3E8EE] h-9 text-sm"
                                    />
                                    <Input
                                      value={li.description}
                                      onChange={(e) =>
                                        updateOptionLineItem(optIndex, liIndex, {
                                          description: e.target.value,
                                        })
                                      }
                                      placeholder="Description (optional)"
                                      className="border-[#E3E8EE] h-9 text-sm mt-1.5"
                                    />
                                  </td>
                                  <td className="py-1.5 pr-2">
                                    <Input
                                      type="number"
                                      min={0.01}
                                      step={0.01}
                                      value={li.quantity}
                                      onChange={(e) =>
                                        updateOptionLineItem(optIndex, liIndex, {
                                          quantity:
                                            parseFloat(e.target.value) || 0,
                                        })
                                      }
                                      className="border-[#E3E8EE] h-9 text-sm"
                                    />
                                  </td>
                                  <td className="py-1.5 pr-2">
                                    <Input
                                      type="number"
                                      min={0}
                                      step={0.01}
                                      value={li.unitPrice}
                                      onChange={(e) =>
                                        updateOptionLineItem(optIndex, liIndex, {
                                          unitPrice:
                                            parseFloat(e.target.value) || 0,
                                        })
                                      }
                                      className="border-[#E3E8EE] h-9 text-sm"
                                    />
                                  </td>
                                  <td className="py-1.5 pr-2 text-right text-sm font-medium text-[#0A2540] pt-3.5">
                                    {formatCurrency(li.quantity * li.unitPrice)}
                                  </td>
                                  <td className="py-1.5">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-9 w-9 text-[#8898AA] hover:text-red-600"
                                      disabled={opt.lineItems.length <= 1}
                                      onClick={() =>
                                        removeOptionLineItem(optIndex, liIndex)
                                      }
                                      aria-label="Remove line item"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#E3E8EE] text-[#425466]"
                            onClick={() => addOptionLineItem(optIndex)}
                          >
                            <Plus className="w-4 h-4 mr-1.5" />
                            Add Line Item
                          </Button>
                          <div className="text-right text-xs text-[#8898AA] space-y-0.5">
                            <div>
                              Subtotal:{" "}
                              <span className="text-[#0A2540] font-medium">
                                {formatCurrency(optTotals.subtotal)}
                              </span>
                            </div>
                            <div>
                              Tax:{" "}
                              <span className="text-[#0A2540] font-medium">
                                {formatCurrency(optTotals.taxAmount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}

              {options.length < 4 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-dashed border-[#E3E8EE] text-[#635BFF] hover:text-[#5851ea] hover:border-[#635BFF] w-full"
                  onClick={addOption}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Option
                </Button>
              )}
            </div>
          )}

          {/* Section 3: Customer Message */}
          <Card className="border-[#E3E8EE]">
            <CardContent className="pt-6">
              <Label className="text-sm font-medium text-[#0A2540] mb-1.5 block">
                Customer Message
              </Label>
              <Textarea
                value={customerMessage}
                onChange={(e) => setCustomerMessage(e.target.value)}
                placeholder="Add a message that will be visible to the customer..."
                rows={3}
                className="border-[#E3E8EE] focus-visible:ring-[#635BFF] text-sm resize-none"
              />
            </CardContent>
          </Card>

          {/* Section 4: Internal Note */}
          <Card className="border-[#E3E8EE]">
            <CardContent className="pt-6">
              <Label className="text-sm font-medium text-[#0A2540] mb-1.5 block">
                Internal Note
              </Label>
              <Textarea
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Add an internal note (only visible to your team)..."
                rows={2}
                className="border-[#E3E8EE] focus-visible:ring-[#635BFF] text-sm resize-none"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column: Summary card */}
        <div className="w-full lg:w-[320px] flex-shrink-0">
          <div className="sticky top-6">
            <Card className="border-[#E3E8EE]">
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-sm font-semibold uppercase text-[#8898AA]">
                  Summary
                  {useOptions && (
                    <span className="text-xs font-normal normal-case ml-1">
                      (lowest option)
                    </span>
                  )}
                </h3>

                {useOptions && options.length > 0 ? (
                  <div className="space-y-2">
                    {options.map((opt, i) => {
                      const t = calcOptionTotals(opt.lineItems)
                      return (
                        <div
                          key={opt.key}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-[#425466] truncate mr-2">
                            {opt.name || `Option ${i + 1}`}
                          </span>
                          <span className="text-[#0A2540] font-medium whitespace-nowrap">
                            {formatCurrency(t.total)}
                          </span>
                        </div>
                      )
                    })}
                    <Separator className="bg-[#E3E8EE]" />
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-[#0A2540]">
                        Starting from
                      </span>
                      <span className="text-lg font-semibold text-[#0A2540]">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#425466]">Subtotal</span>
                      <span className="text-[#0A2540] font-medium">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#425466]">
                        Tax ({+(orgSettings.taxRate * 100).toFixed(2)}%)
                      </span>
                      <span className="text-[#0A2540] font-medium">
                        {formatCurrency(taxAmount)}
                      </span>
                    </div>
                    <Separator className="bg-[#E3E8EE]" />
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-[#0A2540]">
                        Total
                      </span>
                      <span className="text-lg font-semibold text-[#0A2540]">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>
                )}

                <Separator className="bg-[#E3E8EE]" />

                <div>
                  <Label className="text-sm font-medium text-[#0A2540] mb-1.5 block">
                    Valid for (days)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={validDays}
                    onChange={(e) =>
                      setValidDays(parseInt(e.target.value) || 30)
                    }
                    className="border-[#E3E8EE] h-9 text-sm"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  {mode === "edit" ? (
                    <Button
                      className="w-full bg-[#635BFF] hover:bg-[#5851ea] text-white"
                      disabled={saving}
                      onClick={() => handleSubmit(true)}
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : null}
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  ) : (
                    <>
                      <Button
                        className="w-full bg-[#635BFF] hover:bg-[#5851ea] text-white"
                        disabled={saving}
                        onClick={() => handleSubmit(false)}
                      >
                        {saving && !sendAfterCreate ? null : saving && sendAfterCreate ? (
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : null}
                        Send Quote
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-[#E3E8EE] text-[#425466]"
                        disabled={saving}
                        onClick={() => handleSubmit(true)}
                      >
                        {saving && !sendAfterCreate ? (
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : null}
                        Save as Draft
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
