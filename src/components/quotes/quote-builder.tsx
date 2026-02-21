"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Loader2,
  Plus,
  Trash2,
  Search,
  Check,
  ChevronsUpDown,
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
import { createQuote } from "@/actions/quotes"
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

interface QuoteBuilderProps {
  services: ServiceItem[]
  customers: CustomerItem[]
  orgSettings: OrgSettings
  initialData?: {
    customerId?: string
    propertyId?: string
    lineItems?: LineItem[]
    customerMessage?: string
    internalNote?: string
    validDays?: number
  }
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

// ── Component ──────────────────────────────────────────────────────────────

export function QuoteBuilder({
  services,
  customers: initialCustomers,
  orgSettings,
  initialData,
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

  // ── Calculations ─────────────────────────────────────────────────────────

  const subtotal = lineItems.reduce(
    (sum, li) => sum + li.quantity * li.unitPrice,
    0
  )
  const taxableAmount = lineItems.reduce(
    (sum, li) => (li.taxable ? sum + li.quantity * li.unitPrice : sum),
    0
  )
  const taxRate = orgSettings.taxRate / 100
  const taxAmount = taxableAmount * taxRate
  const totalAmount = subtotal + taxAmount

  // ── Validation ───────────────────────────────────────────────────────────

  function validate(): string | null {
    if (!selectedCustomerId) return "Please select a customer"
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

    const data = {
      customerId: selectedCustomerId,
      propertyId: selectedPropertyId || undefined,
      lineItems: lineItems
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
      // Redirect to quote detail which will show the send modal
      toast.success("Quote created")
      router.push(`/quotes/${(result as any).quote.id}?action=send`)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#0A2540]">New Quote</h1>
        <p className="text-sm text-[#8898AA] mt-0.5">
          Create a quote to send to your customer
        </p>
      </div>

      <div className="flex gap-6">
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
                  <PopoverContent className="w-[460px] p-0" align="start">
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

          {/* Section 2: Line Items */}
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
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-[#E3E8EE] text-[#425466]"
                onClick={addLineItem}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Line Item
              </Button>
            </CardContent>
          </Card>

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
        <div className="w-[320px] flex-shrink-0">
          <div className="sticky top-6">
            <Card className="border-[#E3E8EE]">
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-sm font-semibold uppercase text-[#8898AA]">
                  Summary
                </h3>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#425466]">Subtotal</span>
                    <span className="text-[#0A2540] font-medium">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#425466]">
                      Tax ({orgSettings.taxRate}%)
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
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
