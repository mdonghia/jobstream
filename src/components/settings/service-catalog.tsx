"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import {
  MoreHorizontal,
  Plus,
  Loader2,
  Package,
  Check,
  Minus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { SERVICE_UNITS } from "@/lib/constants"
import { formatCurrency } from "@/lib/utils"
import {
  createService,
  updateService,
  deleteService,
  getServices,
} from "@/actions/settings"

// ============================================================================
// Types
// ============================================================================

interface ServiceItem {
  id: string
  name: string
  description: string | null
  category: string | null
  defaultPrice: number | string
  unit: string
  taxable: boolean
  isActive: boolean
  sortOrder: number
  createdAt: Date | string
}

interface ServiceCatalogProps {
  initialServices: ServiceItem[]
}

// ============================================================================
// Unit label helper
// ============================================================================

function getUnitLabel(unit: string): string {
  const found = SERVICE_UNITS.find((u) => u.value === unit)
  return found ? found.label : unit
}

// ============================================================================
// Component
// ============================================================================

export function ServiceCatalog({ initialServices }: ServiceCatalogProps) {
  const [services, setServices] = useState<ServiceItem[]>(initialServices)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingService, setEditingService] = useState<ServiceItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formCategory, setFormCategory] = useState("")
  const [formPrice, setFormPrice] = useState("")
  const [formUnit, setFormUnit] = useState("flat")
  const [formTaxable, setFormTaxable] = useState(true)
  const [formActive, setFormActive] = useState(true)

  // Derive existing categories for the combobox-style category input
  const existingCategories = useMemo(() => {
    const cats = new Set<string>()
    services.forEach((s) => {
      if (s.category) cats.add(s.category)
    })
    return Array.from(cats).sort()
  }, [services])

  // -----------------------------------------------------------------------
  // Refresh
  // -----------------------------------------------------------------------

  async function refreshServices() {
    const result = await getServices()
    if (!("error" in result)) {
      setServices(
        result.services.map((s) => ({
          ...s,
          defaultPrice: Number(s.defaultPrice),
        }))
      )
    }
  }

  // -----------------------------------------------------------------------
  // Open dialog for add / edit
  // -----------------------------------------------------------------------

  function openAddDialog() {
    setEditingService(null)
    resetForm()
    setDialogOpen(true)
  }

  function openEditDialog(service: ServiceItem) {
    setEditingService(service)
    setFormName(service.name)
    setFormDescription(service.description || "")
    setFormCategory(service.category || "")
    setFormPrice(String(Number(service.defaultPrice)))
    setFormUnit(service.unit)
    setFormTaxable(service.taxable)
    setFormActive(service.isActive)
    setDialogOpen(true)
  }

  function resetForm() {
    setFormName("")
    setFormDescription("")
    setFormCategory("")
    setFormPrice("")
    setFormUnit("flat")
    setFormTaxable(true)
    setFormActive(true)
  }

  // -----------------------------------------------------------------------
  // Save (create or update)
  // -----------------------------------------------------------------------

  async function handleSave() {
    if (!formName.trim()) {
      toast.error("Service name is required")
      return
    }
    if (!formPrice || Number(formPrice) < 0) {
      toast.error("Please enter a valid price")
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        category: formCategory.trim() || undefined,
        defaultPrice: Number(formPrice),
        unit: formUnit as "flat" | "hourly" | "per_sqft" | "per_unit",
        taxable: formTaxable,
        isActive: formActive,
      }

      if (editingService) {
        const result = await updateService(editingService.id, payload)
        if ("error" in result) {
          toast.error(result.error)
        } else {
          toast.success("Service updated")
          setDialogOpen(false)
          refreshServices()
        }
      } else {
        const result = await createService(payload)
        if ("error" in result) {
          toast.error(result.error)
        } else {
          toast.success("Service created")
          setDialogOpen(false)
          refreshServices()
        }
      }
    } catch {
      toast.error("Failed to save service")
    } finally {
      setSaving(false)
    }
  }

  // -----------------------------------------------------------------------
  // Toggle active
  // -----------------------------------------------------------------------

  async function handleToggleActive(service: ServiceItem) {
    const result = await updateService(service.id, {
      isActive: !service.isActive,
    })
    if ("error" in result) {
      toast.error(result.error)
    } else {
      toast.success(
        service.isActive ? "Service deactivated" : "Service activated"
      )
      refreshServices()
    }
  }

  // -----------------------------------------------------------------------
  // Delete
  // -----------------------------------------------------------------------

  async function handleDelete() {
    if (!deleteId) return
    const result = await deleteService(deleteId)
    if ("error" in result) {
      toast.error(result.error)
    } else {
      toast.success("Service deleted")
      refreshServices()
    }
    setDeleteId(null)
  }

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------

  if (services.length === 0 && !dialogOpen) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0A2540]">Services</h2>
            <p className="mt-1 text-sm text-[#425466]">
              Manage the services your business offers.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <Package className="h-16 w-16 text-[#8898AA] mb-4" />
          <h3 className="text-lg font-semibold text-[#0A2540] mb-2">
            No services yet
          </h3>
          <p className="text-sm text-[#425466] max-w-md mb-6">
            Add the services you offer to quickly add them to quotes, jobs, and
            invoices.
          </p>
          <Button
            onClick={openAddDialog}
            className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Button>
        </div>

        {/* Dialog still available even in empty state */}
        {renderDialog()}
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#0A2540]">Services</h2>
          <p className="mt-1 text-sm text-[#425466]">
            {services.length} service{services.length !== 1 ? "s" : ""} in your
            catalog.
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-lg border border-[#E3E8EE] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E3E8EE] bg-[#F6F8FA]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Service
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Taxable
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Status
                </th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr
                  key={service.id}
                  className="border-b border-[#E3E8EE] last:border-b-0"
                >
                  {/* Name + description */}
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-[#0A2540]">
                        {service.name}
                      </p>
                      {service.description && (
                        <p className="mt-0.5 text-xs text-[#8898AA] line-clamp-1">
                          {service.description}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3">
                    {service.category ? (
                      <Badge
                        variant="secondary"
                        className="bg-[#F6F8FA] text-[#425466] ring-1 ring-inset ring-[#E3E8EE]"
                      >
                        {service.category}
                      </Badge>
                    ) : (
                      <span className="text-sm text-[#8898AA]">&mdash;</span>
                    )}
                  </td>

                  {/* Price + unit */}
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-[#0A2540]">
                      {formatCurrency(Number(service.defaultPrice))}
                    </span>
                    <span className="ml-1 text-xs text-[#8898AA]">
                      / {getUnitLabel(service.unit)}
                    </span>
                  </td>

                  {/* Taxable */}
                  <td className="px-4 py-3">
                    {service.taxable ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Minus className="h-4 w-4 text-[#8898AA]" />
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {service.isActive ? (
                      <Badge
                        variant="secondary"
                        className="bg-green-50 text-green-700 ring-1 ring-inset ring-green-200"
                      >
                        Active
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-200"
                      >
                        Inactive
                      </Badge>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4 text-[#8898AA]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openEditDialog(service)}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(service)}
                        >
                          {service.isActive ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteId(service.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      {renderDialog()}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this service? This action cannot be
              undone. If the service is used in existing quotes, jobs, or
              invoices, you will need to deactivate it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#E3E8EE]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )

  // -----------------------------------------------------------------------
  // Dialog render helper
  // -----------------------------------------------------------------------

  function renderDialog() {
    return (
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingService(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">
              {editingService ? "Edit Service" : "Add Service"}
            </DialogTitle>
            <DialogDescription>
              {editingService
                ? "Update the details of this service."
                : "Add a new service to your catalog."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                Name *
              </Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Lawn Mowing"
                className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                Description
              </Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description of the service..."
                className="min-h-[80px] border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              />
            </div>

            {/* Category (combobox-style: type or select existing) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                Category
              </Label>
              <div className="relative">
                <Input
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="Type or select a category..."
                  list="category-suggestions"
                  className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                />
                <datalist id="category-suggestions">
                  {existingCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Price + Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                  Default Price *
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8898AA]">
                    $
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="0.00"
                    className="h-10 pl-7 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                  Unit Type *
                </Label>
                <Select value={formUnit} onValueChange={setFormUnit}>
                  <SelectTrigger className="h-10 w-full border-[#E3E8EE] focus-visible:ring-[#635BFF]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Taxable + Active toggles */}
            <div className="flex items-center gap-8 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formTaxable}
                  onCheckedChange={setFormTaxable}
                />
                <Label className="text-sm text-[#425466]">Taxable</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formActive} onCheckedChange={setFormActive} />
                <Label className="text-sm text-[#425466]">Active</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-[#E3E8EE]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingService ? "Save Changes" : "Add Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }
}
