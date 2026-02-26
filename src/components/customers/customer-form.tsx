"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { US_STATES } from "@/lib/constants"
import { formatPhoneNumber } from "@/lib/format-helpers"
import { AddressAutocomplete, type ParsedAddress } from "@/components/ui/address-autocomplete"
import { toast } from "sonner"
import { useAutoSave } from "@/hooks/use-auto-save"
import { AutoSaveIndicator } from "@/components/shared/auto-save-indicator"
import { ManageTagsDialog } from "@/components/customers/manage-tags-dialog"
import { getAllTags } from "@/actions/customers"

interface PropertyFormData {
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  zip: string
  notes: string
  isPrimary: boolean
}

interface CustomerFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  company: string
  tags: string[]
  notes: string
}

interface CustomerFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (customer: CustomerFormData, properties: PropertyFormData[]) => Promise<void>
  initialData?: CustomerFormData & { properties?: PropertyFormData[] }
  title?: string
  allTags?: string[]
}

const emptyProperty: PropertyFormData = {
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zip: "",
  notes: "",
  isPrimary: false,
}

export function CustomerForm({
  open,
  onOpenChange,
  onSave,
  initialData,
  title = "Add Customer",
  allTags = [],
}: CustomerFormProps) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [customer, setCustomer] = useState<CustomerFormData>(
    initialData || {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      tags: [],
      notes: "",
    }
  )
  const [properties, setProperties] = useState<PropertyFormData[]>(
    initialData?.properties || [{ ...emptyProperty, isPrimary: true }]
  )
  const [tagInput, setTagInput] = useState("")
  const [propertiesExpanded, setPropertiesExpanded] = useState(true)
  const [manageTagsOpen, setManageTagsOpen] = useState(false)
  const [currentAllTags, setCurrentAllTags] = useState<string[]>(allTags)

  // Determine if this is an edit form (not a create form)
  const isEditing = title !== "Add Customer" && !!initialData

  // Build the auto-save data payload (customer + properties)
  const autoSaveData = useMemo(
    () => ({ customer, properties }),
    [customer, properties]
  )

  // Auto-save handler: calls onSave with current form data
  const handleAutoSave = useCallback(
    async (data: { customer: CustomerFormData; properties: PropertyFormData[] }) => {
      // Run the same validation as handleSubmit
      if (!data.customer.firstName.trim() || !data.customer.lastName.trim()) return
      const nonEmptyProps = data.properties.filter((p) => p.addressLine1.trim())
      await onSave(data.customer, nonEmptyProps)
    },
    [onSave]
  )

  // Auto-save hook (only active in edit mode)
  const { status: autoSaveStatus, saveNow } = useAutoSave({
    data: autoSaveData,
    onSave: handleAutoSave,
    enabled: isEditing && open,
    debounceMs: 1500,
  })

  function resetForm() {
    setCustomer({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      tags: [],
      notes: "",
    })
    setProperties([{ ...emptyProperty, isPrimary: true }])
    setErrors({})
    setTagInput("")
  }

  function handleClose() {
    if (!loading) {
      resetForm()
      onOpenChange(false)
    }
  }

  function addTag() {
    const tag = tagInput.trim()
    if (tag && !customer.tags.includes(tag)) {
      setCustomer({ ...customer, tags: [...customer.tags, tag] })
      setTagInput("")
    }
  }

  function removeTag(tag: string) {
    setCustomer({ ...customer, tags: customer.tags.filter((t) => t !== tag) })
  }

  function addProperty() {
    setProperties([...properties, { ...emptyProperty }])
  }

  function removeProperty(index: number) {
    if (properties.length <= 1) return
    const updated = properties.filter((_, i) => i !== index)
    // Ensure at least one is primary
    if (!updated.some((p) => p.isPrimary) && updated.length > 0) {
      updated[0].isPrimary = true
    }
    setProperties(updated)
  }

  function updateProperty(index: number, field: keyof PropertyFormData, value: string | boolean) {
    const updated = [...properties]
    updated[index] = { ...updated[index], [field]: value }
    setProperties(updated)
  }

  async function handleSubmit() {
    setLoading(true)
    setErrors({})

    // Basic validation
    const newErrors: Record<string, string> = {}
    if (!customer.firstName.trim()) newErrors.firstName = "First name is required"
    if (!customer.lastName.trim()) newErrors.lastName = "Last name is required"
    if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      newErrors.email = "Please enter a valid email"
    }

    // Validate non-empty properties
    const nonEmptyProps = properties.filter((p) => p.addressLine1.trim())
    nonEmptyProps.forEach((prop, i) => {
      if (!prop.city.trim()) newErrors[`property_${i}_city`] = "City is required"
      if (!prop.state.trim()) newErrors[`property_${i}_state`] = "State is required"
      if (!prop.zip.trim()) newErrors[`property_${i}_zip`] = "ZIP is required"
      else if (!/^\d{5}(-\d{4})?$/.test(prop.zip)) newErrors[`property_${i}_zip`] = "Invalid ZIP"
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setLoading(false)
      return
    }

    try {
      await onSave(customer, nonEmptyProps)
      resetForm()
      onOpenChange(false)
    } catch {
      toast.error("Failed to save customer")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <SheetTitle className="text-[#0A2540]">{title}</SheetTitle>
            {isEditing && <AutoSaveIndicator status={autoSaveStatus} />}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6 px-6">
          {/* Contact Information */}
          <div>
            <h3 className="text-xs font-semibold uppercase text-[#8898AA] mb-3">
              Contact Information
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-xs font-semibold uppercase text-[#8898AA]">
                    First Name *
                  </Label>
                  <Input
                    id="firstName"
                    value={customer.firstName}
                    onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })}
                    className={`h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF] ${errors.firstName ? "border-red-500" : ""}`}
                  />
                  {errors.firstName && <p className="text-xs text-red-600">{errors.firstName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-xs font-semibold uppercase text-[#8898AA]">
                    Last Name *
                  </Label>
                  <Input
                    id="lastName"
                    value={customer.lastName}
                    onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })}
                    className={`h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF] ${errors.lastName ? "border-red-500" : ""}`}
                  />
                  {errors.lastName && <p className="text-xs text-red-600">{errors.lastName}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold uppercase text-[#8898AA]">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  placeholder="customer@example.com"
                  className={`h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF] ${errors.email ? "border-red-500" : ""}`}
                />
                {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold uppercase text-[#8898AA]">
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={customer.phone}
                  onChange={(e) =>
                    setCustomer({ ...customer, phone: formatPhoneNumber(e.target.value) })
                  }
                  placeholder="717-405-8253"
                  className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="company" className="text-xs font-semibold uppercase text-[#8898AA]">
                  Company
                </Label>
                <Input
                  id="company"
                  value={customer.company}
                  onChange={(e) => setCustomer({ ...customer, company: e.target.value })}
                  className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-[#E3E8EE]" />

          {/* Additional Details */}
          <div>
            <h3 className="text-xs font-semibold uppercase text-[#8898AA] mb-3">
              Additional Details
            </h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase text-[#8898AA]">Tags</Label>
                  <button
                    type="button"
                    onClick={() => setManageTagsOpen(true)}
                    className="text-xs text-[#635BFF] hover:underline"
                  >
                    Manage Tags
                  </button>
                </div>
                <div className="relative">
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addTag()
                        }
                      }}
                      placeholder="Type to search or add tags"
                      className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTag}
                      className="h-10 border-[#E3E8EE]"
                    >
                      Add
                    </Button>
                  </div>
                  {tagInput.trim() && (() => {
                    const suggestions = currentAllTags.filter(
                      (t) =>
                        t.toLowerCase().includes(tagInput.trim().toLowerCase()) &&
                        !customer.tags.includes(t)
                    )
                    return suggestions.length > 0 ? (
                      <div className="absolute z-10 mt-1 w-full max-h-32 overflow-y-auto rounded-md border border-[#E3E8EE] bg-white shadow-md">
                        {suggestions.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className="w-full px-3 py-1.5 text-left text-sm text-[#425466] hover:bg-[#F6F8FA]"
                            onClick={() => {
                              setCustomer({ ...customer, tags: [...customer.tags, tag] })
                              setTagInput("")
                            }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    ) : null
                  })()}
                </div>
                {customer.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {customer.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#635BFF]/10 text-[#635BFF]"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-red-600"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs font-semibold uppercase text-[#8898AA]">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={customer.notes}
                  onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                  placeholder="Internal notes about this customer..."
                  className="border-[#E3E8EE] focus-visible:ring-[#635BFF] min-h-[80px]"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-[#E3E8EE]" />

          {/* Properties */}
          <div>
            <button
              type="button"
              onClick={() => setPropertiesExpanded(!propertiesExpanded)}
              className="flex items-center justify-between w-full"
            >
              <h3 className="text-xs font-semibold uppercase text-[#8898AA]">
                Service Address
              </h3>
              {propertiesExpanded ? (
                <ChevronUp className="w-4 h-4 text-[#8898AA]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#8898AA]" />
              )}
            </button>

            {propertiesExpanded && (
              <div className="mt-3 space-y-4">
                {properties.map((prop, index) => (
                  <div key={index} className="p-3 rounded-lg border border-[#E3E8EE] space-y-3">
                    {properties.length > 1 && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-[#425466]">
                          Property {index + 1}
                        </span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={prop.isPrimary}
                              onChange={() => {
                                const updated = properties.map((p, i) => ({
                                  ...p,
                                  isPrimary: i === index,
                                }))
                                setProperties(updated)
                              }}
                              className="w-3.5 h-3.5 rounded border-[#E3E8EE] text-[#635BFF] focus:ring-[#635BFF]"
                            />
                            <span className="text-xs text-[#425466]">Primary</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => removeProperty(index)}
                            className="text-[#8898AA] hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                        Address *
                      </Label>
                      <AddressAutocomplete
                        value={prop.addressLine1}
                        onChange={(val) => updateProperty(index, "addressLine1", val)}
                        onAddressSelect={(addr: ParsedAddress) => {
                          const updated = [...properties]
                          updated[index] = {
                            ...updated[index],
                            addressLine1: addr.addressLine1,
                            city: addr.city,
                            state: addr.state,
                            zip: addr.zip,
                          }
                          setProperties(updated)
                        }}
                        placeholder="Street address"
                        className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                      />
                    </div>

                    <Input
                      value={prop.addressLine2}
                      onChange={(e) => updateProperty(index, "addressLine2", e.target.value)}
                      placeholder="Apt, suite, unit (optional)"
                      className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                    />

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                          City *
                        </Label>
                        <Input
                          value={prop.city}
                          onChange={(e) => updateProperty(index, "city", e.target.value)}
                          className={`h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF] ${errors[`property_${index}_city`] ? "border-red-500" : ""}`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                          State *
                        </Label>
                        <Select
                          value={prop.state}
                          onValueChange={(v) => updateProperty(index, "state", v)}
                        >
                          <SelectTrigger className={`h-10 border-[#E3E8EE] focus:ring-[#635BFF] ${errors[`property_${index}_state`] ? "border-red-500" : ""}`}>
                            <SelectValue placeholder="State" />
                          </SelectTrigger>
                          <SelectContent>
                            {US_STATES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                          ZIP *
                        </Label>
                        <Input
                          value={prop.zip}
                          onChange={(e) => updateProperty(index, "zip", e.target.value)}
                          className={`h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF] ${errors[`property_${index}_zip`] ? "border-red-500" : ""}`}
                          maxLength={10}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                        Property Notes
                      </Label>
                      <Input
                        value={prop.notes}
                        onChange={(e) => updateProperty(index, "notes", e.target.value)}
                        placeholder="Gate code, access instructions, etc."
                        className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addProperty}
                  className="flex items-center gap-1.5 text-sm text-[#635BFF] hover:underline"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Property
                </button>
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="mt-6 flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 border-[#E3E8EE] text-[#425466]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-[#635BFF] hover:bg-[#5851ea] text-white"
          >
            {loading ? "Saving..." : title === "Add Customer" ? "Save Customer" : "Update Customer"}
          </Button>
        </SheetFooter>
      </SheetContent>

      {/* Manage Tags Dialog */}
      <ManageTagsDialog
        open={manageTagsOpen}
        onOpenChange={setManageTagsOpen}
        onTagsChanged={async () => {
          // Refresh the tag list after a tag is added/renamed/deleted
          const refreshed = await getAllTags()
          if (Array.isArray(refreshed)) {
            setCurrentAllTags(refreshed)
          }
        }}
      />
    </Sheet>
  )
}
