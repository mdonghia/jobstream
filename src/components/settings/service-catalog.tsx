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
  Tags,
  Pencil,
  Trash2,
  X,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
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
  renameServiceCategory,
  deleteServiceCategory,
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
  costPrice: number | string | null
  type: string
  estimatedMinutes: number | null
  sku: string | null
  checklists?: { id: string; name: string }[]
}

interface ChecklistTemplateOption {
  id: string
  name: string
}

interface ServiceCatalogProps {
  initialServices: ServiceItem[]
  checklistTemplates?: ChecklistTemplateOption[]
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

export function ServiceCatalog({ initialServices, checklistTemplates = [] }: ServiceCatalogProps) {
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
  const [formCostPrice, setFormCostPrice] = useState("")
  const [formEstimatedMinutes, setFormEstimatedMinutes] = useState("")
  const [formSku, setFormSku] = useState("")
  const [formChecklistIds, setFormChecklistIds] = useState<string[]>([])

  // Manage Categories dialog state
  const [categoriesDialogOpen, setCategoriesDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null)
  const [localCategories, setLocalCategories] = useState<string[]>([])

  // Derive existing categories from services in the database
  const existingCategories = useMemo(() => {
    const cats = new Set<string>()
    services.forEach((s) => {
      if (s.category) cats.add(s.category)
    })
    return Array.from(cats).sort()
  }, [services])

  // Merge database categories with locally-added ones for the full list
  const allCategories = useMemo(() => {
    const merged = new Set([...existingCategories, ...localCategories])
    return Array.from(merged).sort()
  }, [existingCategories, localCategories])

  // Count services per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    services.forEach((s) => {
      if (s.category) {
        counts[s.category] = (counts[s.category] || 0) + 1
      }
    })
    return counts
  }, [services])


  // -----------------------------------------------------------------------
  // Refresh
  // -----------------------------------------------------------------------

  async function refreshServices() {
    const result = await getServices()
    if (!("error" in result)) {
      setServices(
        result.services.map((s: any) => ({
          ...s,
          defaultPrice: Number(s.defaultPrice),
          costPrice: s.costPrice != null ? Number(s.costPrice) : null,
          type: s.type ?? "service",
          estimatedMinutes: s.estimatedMinutes ?? null,
          sku: s.sku ?? null,
          checklists: s.checklists ?? [],
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
    setFormCostPrice(service.costPrice != null ? String(Number(service.costPrice)) : "")
    setFormEstimatedMinutes(service.estimatedMinutes != null ? String(service.estimatedMinutes) : "")
    setFormSku(service.sku || "")
    setFormChecklistIds(service.checklists?.map((c) => c.id) ?? [])
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
    setFormCostPrice("")
    setFormEstimatedMinutes("")
    setFormSku("")
    setFormChecklistIds([])
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
        costPrice: formCostPrice ? Number(formCostPrice) : null,
        estimatedMinutes: formEstimatedMinutes ? Number(formEstimatedMinutes) : null,
        sku: formSku.trim() || null,
      }

      if (editingService) {
        const result = await updateService(editingService.id, payload, formChecklistIds)
        if ("error" in result) {
          toast.error(result.error)
        } else {
          toast.success("Service updated")
          setDialogOpen(false)
          refreshServices()
        }
      } else {
        const result = await createService(payload, formChecklistIds)
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
  // Category management
  // -----------------------------------------------------------------------

  function handleAddCategory() {
    const name = newCategoryName.trim()
    if (!name) return

    if (allCategories.includes(name)) {
      toast.error("That category already exists")
      return
    }

    setLocalCategories((prev) => [...prev, name].sort())
    setNewCategoryName("")
    toast.success(`Category "${name}" added`)
  }

  async function handleRenameCategory(oldName: string) {
    const newName = renameValue.trim()
    if (!newName) {
      toast.error("Category name cannot be empty")
      return
    }
    if (newName === oldName) {
      setRenamingCategory(null)
      return
    }

    setCategoryLoading(true)
    try {
      const result = await renameServiceCategory(oldName, newName)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        // Also rename in localCategories if it was a locally-added one
        setLocalCategories((prev) =>
          prev.map((c) => (c === oldName ? newName : c)).sort()
        )
        toast.success(
          `Renamed "${oldName}" to "${newName}" across ${result.updated} service${result.updated !== 1 ? "s" : ""}`
        )
        setRenamingCategory(null)
        await refreshServices()
      }
    } catch {
      toast.error("Failed to rename category")
    } finally {
      setCategoryLoading(false)
    }
  }

  async function handleDeleteCategory(name: string) {
    setCategoryLoading(true)
    try {
      // If this is a locally-added category (no services use it), just remove locally
      if (!categoryCounts[name]) {
        setLocalCategories((prev) => prev.filter((c) => c !== name))
        toast.success(`Category "${name}" removed`)
        setDeletingCategory(null)
        setCategoryLoading(false)
        return
      }

      const result = await deleteServiceCategory(name)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        setLocalCategories((prev) => prev.filter((c) => c !== name))
        toast.success(
          `Removed "${name}" from ${result.updated} service${result.updated !== 1 ? "s" : ""}`
        )
        setDeletingCategory(null)
        await refreshServices()
      }
    } catch {
      toast.error("Failed to delete category")
    } finally {
      setCategoryLoading(false)
    }
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

        {/* Dialogs still available even in empty state */}
        {renderDialog()}
        {renderCategoriesDialog()}
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#0A2540]">Services</h2>
          <p className="mt-1 text-sm text-[#425466]">
            {services.length} item{services.length !== 1 ? "s" : ""} in your
            catalog.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => setCategoriesDialogOpen(true)}
            className="border-[#E3E8EE] text-[#425466]"
          >
            <Tags className="mr-2 h-4 w-4" />
            Manage Categories
          </Button>
          <Button
            onClick={openAddDialog}
            className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-lg border border-[#E3E8EE] bg-white">
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
                  Duration
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

                  {/* Duration */}
                  <td className="px-4 py-3">
                    {service.estimatedMinutes ? (
                      <span className="text-sm text-[#425466] flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-[#8898AA]" />
                        {service.estimatedMinutes} min
                      </span>
                    ) : (
                      <span className="text-sm text-[#8898AA]">&mdash;</span>
                    )}
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
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
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

      {/* Manage Categories Dialog */}
      {renderCategoriesDialog()}

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
  // Manage Categories dialog render
  // -----------------------------------------------------------------------

  function renderCategoriesDialog() {
    return (
      <>
        <Dialog
          open={categoriesDialogOpen}
          onOpenChange={(open) => {
            setCategoriesDialogOpen(open)
            if (!open) {
              setRenamingCategory(null)
              setNewCategoryName("")
              setDeletingCategory(null)
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[#0A2540]">
                Manage Categories
              </DialogTitle>
              <DialogDescription>
                Add, rename, or remove service categories. Changes to existing
                categories apply to all services that use them.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Add new category */}
              <div className="flex gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name..."
                  className="h-9 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddCategory()
                    }
                  }}
                />
                <Button
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  size="sm"
                  className="bg-[#635BFF] hover:bg-[#5851ea] text-white h-9 px-3"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Category list */}
              {allCategories.length === 0 ? (
                <div className="py-6 text-center text-sm text-[#8898AA]">
                  No categories yet. Add one above.
                </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto space-y-1">
                  {allCategories.map((cat) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-[#F6F8FA] group"
                    >
                      {renamingCategory === cat ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="h-8 text-sm border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                handleRenameCategory(cat)
                              }
                              if (e.key === "Escape") {
                                setRenamingCategory(null)
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRenameCategory(cat)}
                            disabled={categoryLoading}
                            className="h-8 w-8 p-0"
                          >
                            {categoryLoading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setRenamingCategory(null)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-3.5 w-3.5 text-[#8898AA]" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium text-[#0A2540] truncate">
                              {cat}
                            </span>
                            <span className="text-xs text-[#8898AA] flex-shrink-0">
                              {categoryCounts[cat]
                                ? `${categoryCounts[cat]} service${categoryCounts[cat] !== 1 ? "s" : ""}`
                                : "unused"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRenamingCategory(cat)
                                setRenameValue(cat)
                              }}
                              className="h-7 w-7 p-0"
                              aria-label={`Rename ${cat}`}
                            >
                              <Pencil className="h-3.5 w-3.5 text-[#8898AA]" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeletingCategory(cat)}
                              className="h-7 w-7 p-0"
                              aria-label={`Delete ${cat}`}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete category confirmation */}
        <AlertDialog
          open={!!deletingCategory}
          onOpenChange={(open) => {
            if (!open) setDeletingCategory(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Category</AlertDialogTitle>
              <AlertDialogDescription>
                {deletingCategory && categoryCounts[deletingCategory]
                  ? `This will remove the "${deletingCategory}" category from ${categoryCounts[deletingCategory]} service${categoryCounts[deletingCategory] !== 1 ? "s" : ""}. The services themselves will not be deleted.`
                  : `Remove the "${deletingCategory}" category?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-[#E3E8EE]">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  deletingCategory && handleDeleteCategory(deletingCategory)
                }
                disabled={categoryLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {categoryLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

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

          <div className="grid gap-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
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
                  {allCategories.map((cat) => (
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

            {/* Cost Price + Margin */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                Cost Price
              </Label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8898AA]">
                    $
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(e.target.value)}
                    placeholder="0.00"
                    className="h-10 pl-7 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                  />
                </div>
                {formCostPrice && formPrice && Number(formPrice) > 0 && (
                  <span
                    className={`text-sm font-medium whitespace-nowrap ${
                      Number(formPrice) > Number(formCostPrice)
                        ? "text-green-600"
                        : Number(formPrice) < Number(formCostPrice)
                        ? "text-red-600"
                        : "text-[#8898AA]"
                    }`}
                  >
                    Margin:{" "}
                    {Math.round(
                      ((Number(formPrice) - Number(formCostPrice)) /
                        Number(formPrice)) *
                        100
                    )}
                    %
                  </span>
                )}
              </div>
            </div>

            {/* Estimated Duration */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                Estimated Duration (minutes)
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8898AA]" />
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={formEstimatedMinutes}
                  onChange={(e) => setFormEstimatedMinutes(e.target.value)}
                  placeholder="e.g. 60"
                  className="h-10 pl-9 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                />
              </div>
            </div>

            {/* SKU */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                SKU
              </Label>
              <Input
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                placeholder="e.g. SVC-LAWN-001"
                className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              />
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

            {/* Linked Checklists */}
            {checklistTemplates.length > 0 && (
              <div className="space-y-1.5 border-t border-[#E3E8EE] pt-4">
                <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                  Linked Checklists
                </Label>
                <p className="text-xs text-[#8898AA] mb-2">
                  When this service is added to a job, the linked checklist items will auto-populate.
                </p>
                <div className="max-h-[160px] overflow-y-auto space-y-1 rounded-md border border-[#E3E8EE] p-2">
                  {checklistTemplates.map((template) => {
                    const isChecked = formChecklistIds.includes(template.id)
                    return (
                      <label
                        key={template.id}
                        className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-[#F6F8FA] cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormChecklistIds((prev) => [...prev, template.id])
                            } else {
                              setFormChecklistIds((prev) =>
                                prev.filter((id) => id !== template.id)
                              )
                            }
                          }}
                          className="data-[state=checked]:bg-[#635BFF] data-[state=checked]:border-[#635BFF]"
                        />
                        <span className="text-sm font-medium text-[#0A2540]">
                          {template.name}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
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
