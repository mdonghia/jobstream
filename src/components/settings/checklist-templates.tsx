"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Plus,
  Loader2,
  ClipboardList,
  Pencil,
  Trash2,
  X,
  Link2,
  GripVertical,
  Check,
  ChevronsUpDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import {
  createChecklistTemplate,
  updateChecklistTemplate,
  deleteChecklistTemplate,
  getChecklistTemplates,
  linkChecklistToService,
  unlinkChecklistFromService,
} from "@/actions/checklists"

// =============================================================================
// Types
// =============================================================================

interface ChecklistItem {
  id: string
  templateId: string
  label: string
  sortOrder: number
}

interface LinkedService {
  id: string
  name: string
}

interface ChecklistTemplateData {
  id: string
  organizationId: string
  name: string
  items: ChecklistItem[]
  services: LinkedService[]
  createdAt: string
  updatedAt: string
}

interface ChecklistTemplatesManagerProps {
  initialTemplates: ChecklistTemplateData[]
  services: { id: string; name: string }[]
}

// =============================================================================
// Multi-select combobox for linking items
// =============================================================================

function ServiceCombobox({
  options,
  selectedIds,
  onToggle,
  onRemove,
  placeholder = "Search...",
  emptyText = "No results found.",
}: {
  options: { id: string; name: string }[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  placeholder?: string
  emptyText?: string
}) {
  const [open, setOpen] = useState(false)
  const selectedItems = options.filter((o) => selectedIds.includes(o.id))

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-10 border-[#E3E8EE] text-sm font-normal"
          >
            <span className="text-[#8898AA]">
              {selectedIds.length > 0
                ? `${selectedIds.length} selected`
                : "Select..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selectedIds.includes(option.id)
                  return (
                    <CommandItem
                      key={option.id}
                      value={option.name}
                      onSelect={() => onToggle(option.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100 text-[#635BFF]" : "opacity-0"
                        )}
                      />
                      <span className="text-sm">{option.name}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected items as removable badges */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map((item) => (
            <Badge
              key={item.id}
              variant="secondary"
              className="bg-[#635BFF]/10 text-[#635BFF] ring-1 ring-inset ring-[#635BFF]/20 pr-1 gap-1"
            >
              {item.name}
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-[#635BFF]/20 transition-colors"
                aria-label={`Remove ${item.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Component
// =============================================================================

export function ChecklistTemplatesManager({
  initialTemplates,
  services,
}: ChecklistTemplatesManagerProps) {
  const [templates, setTemplates] =
    useState<ChecklistTemplateData[]>(initialTemplates)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingTemplate, setEditingTemplate] =
    useState<ChecklistTemplateData | null>(null)

  // Form state
  const [formName, setFormName] = useState("")
  const [formItems, setFormItems] = useState<string[]>([""])
  const [formServiceIds, setFormServiceIds] = useState<string[]>([])

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Link Services dialog state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkingTemplate, setLinkingTemplate] =
    useState<ChecklistTemplateData | null>(null)
  const [linkSaving, setLinkSaving] = useState(false)

  // ---------------------------------------------------------------------------
  // Refresh data from server
  // ---------------------------------------------------------------------------

  async function refreshTemplates() {
    const result = await getChecklistTemplates()
    if (!("error" in result)) {
      setTemplates(result.templates)
    }
  }

  // ---------------------------------------------------------------------------
  // Open dialogs
  // ---------------------------------------------------------------------------

  function openAddDialog() {
    setEditingTemplate(null)
    setFormName("")
    setFormItems([""])
    setFormServiceIds([])
    setDialogOpen(true)
  }

  function openEditDialog(template: ChecklistTemplateData) {
    setEditingTemplate(template)
    setFormName(template.name)
    setFormItems(
      template.items.length > 0
        ? template.items.map((item) => item.label)
        : [""]
    )
    setFormServiceIds(template.services.map((s) => s.id))
    setDialogOpen(true)
  }

  function openLinkDialog(template: ChecklistTemplateData) {
    setLinkingTemplate(template)
    setLinkDialogOpen(true)
  }

  // ---------------------------------------------------------------------------
  // Form item management
  // ---------------------------------------------------------------------------

  function addItem() {
    setFormItems((prev) => [...prev, ""])
  }

  function removeItem(index: number) {
    setFormItems((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  function updateItem(index: number, value: string) {
    setFormItems((prev) => prev.map((item, i) => (i === index ? value : item)))
  }

  // ---------------------------------------------------------------------------
  // Save (create or update)
  // ---------------------------------------------------------------------------

  async function handleSave() {
    if (!formName.trim()) {
      toast.error("Template name is required")
      return
    }

    const filteredItems = formItems.filter((item) => item.trim())
    if (filteredItems.length === 0) {
      toast.error("Add at least one checklist item")
      return
    }

    setSaving(true)
    try {
      if (editingTemplate) {
        const result = await updateChecklistTemplate(editingTemplate.id, {
          name: formName,
          items: filteredItems,
          serviceIds: formServiceIds,
        })
        if ("error" in result) {
          toast.error(result.error)
        } else {
          toast.success("Template updated")
          setDialogOpen(false)
          refreshTemplates()
        }
      } else {
        const result = await createChecklistTemplate({
          name: formName,
          items: filteredItems,
          serviceIds: formServiceIds,
        })
        if ("error" in result) {
          toast.error(result.error)
        } else {
          toast.success("Template created")
          setDialogOpen(false)
          refreshTemplates()
        }
      }
    } catch {
      toast.error("Failed to save template")
    } finally {
      setSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async function handleDelete() {
    if (!deleteId) return
    const result = await deleteChecklistTemplate(deleteId)
    if ("error" in result) {
      toast.error(result.error)
    } else {
      toast.success("Template deleted")
      refreshTemplates()
    }
    setDeleteId(null)
  }

  // ---------------------------------------------------------------------------
  // Link / Unlink services
  // ---------------------------------------------------------------------------

  async function handleToggleServiceLink(serviceId: string) {
    if (!linkingTemplate) return

    const isLinked = linkingTemplate.services.some((s) => s.id === serviceId)
    setLinkSaving(true)

    try {
      const result = isLinked
        ? await unlinkChecklistFromService(linkingTemplate.id, serviceId)
        : await linkChecklistToService(linkingTemplate.id, serviceId)

      if ("error" in result) {
        toast.error(result.error)
      } else {
        // Optimistically update the linking template's services
        const service = services.find((s) => s.id === serviceId)
        if (isLinked) {
          setLinkingTemplate((prev) =>
            prev
              ? {
                  ...prev,
                  services: prev.services.filter((s) => s.id !== serviceId),
                }
              : null
          )
        } else if (service) {
          setLinkingTemplate((prev) =>
            prev
              ? {
                  ...prev,
                  services: [
                    ...prev.services,
                    { id: service.id, name: service.name },
                  ],
                }
              : null
          )
        }
        // Also refresh the main list to keep everything in sync
        refreshTemplates()
      }
    } catch {
      toast.error("Failed to update service link")
    } finally {
      setLinkSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (templates.length === 0 && !dialogOpen) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0A2540]">
              Checklist Templates
            </h2>
            <p className="mt-1 text-sm text-[#425466]">
              Create reusable checklists and link them to services.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <ClipboardList className="h-16 w-16 text-[#8898AA] mb-4" />
          <h3 className="text-lg font-semibold text-[#0A2540] mb-2">
            No checklist templates yet
          </h3>
          <p className="text-sm text-[#425466] max-w-md mb-6">
            Create checklist templates to standardize work for your services.
            When a service with a linked checklist is added to a job, the
            checklist items auto-populate.
          </p>
          <Button
            onClick={openAddDialog}
            className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>

        {renderFormDialog()}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#0A2540]">
            Checklist Templates
          </h2>
          <p className="mt-1 text-sm text-[#425466]">
            {templates.length} template{templates.length !== 1 ? "s" : ""}{" "}
            configured.
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-lg border border-[#E3E8EE] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E3E8EE] bg-[#F6F8FA]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Template Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Linked Services
                </th>
                <th className="px-4 py-3 w-32 text-right text-xs font-semibold uppercase text-[#8898AA]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr
                  key={template.id}
                  className="border-b border-[#E3E8EE] last:border-b-0"
                >
                  {/* Name */}
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-[#0A2540]">
                      {template.name}
                    </p>
                  </td>

                  {/* Item count */}
                  <td className="px-4 py-3">
                    <Badge
                      variant="secondary"
                      className="bg-[#F6F8FA] text-[#425466] ring-1 ring-inset ring-[#E3E8EE]"
                    >
                      {template.items.length} item
                      {template.items.length !== 1 ? "s" : ""}
                    </Badge>
                  </td>

                  {/* Linked services */}
                  <td className="px-4 py-3">
                    {template.services.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {template.services.map((service) => (
                          <Badge
                            key={service.id}
                            variant="secondary"
                            className="bg-[#635BFF]/10 text-[#635BFF] ring-1 ring-inset ring-[#635BFF]/20"
                          >
                            {service.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-[#8898AA]">&mdash;</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openLinkDialog(template)}
                        aria-label="Link services"
                        title="Link Services"
                      >
                        <Link2 className="h-4 w-4 text-[#8898AA]" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(template)}
                        aria-label="Edit template"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4 text-[#8898AA]" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeleteId(template.id)}
                        aria-label="Delete template"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialogs */}
      {renderFormDialog()}
      {renderLinkDialog()}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this checklist template? This
              action cannot be undone. The template will be unlinked from all
              services.
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

  // ---------------------------------------------------------------------------
  // Form dialog (add / edit)
  // ---------------------------------------------------------------------------

  function renderFormDialog() {
    return (
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingTemplate(null)
            setFormName("")
            setFormItems([""])
            setFormServiceIds([])
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">
              {editingTemplate ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Update the name and items for this checklist template."
                : "Create a new checklist template with items that can be linked to services."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Template name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                Template Name *
              </Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. HVAC Inspection Checklist"
                className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              />
            </div>

            {/* Checklist items */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                Checklist Items *
              </Label>
              <div className="space-y-2">
                {formItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-[#8898AA] flex-shrink-0" />
                    <Input
                      value={item}
                      onChange={(e) => updateItem(index, e.target.value)}
                      placeholder={`Item ${index + 1}`}
                      className="h-9 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addItem()
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 flex-shrink-0"
                      onClick={() => removeItem(index)}
                      disabled={formItems.length <= 1}
                      aria-label="Remove item"
                    >
                      <X className="h-4 w-4 text-[#8898AA]" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="mt-2 border-[#E3E8EE] text-[#425466]"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Item
              </Button>
            </div>

            {/* Link Services */}
            {services.length > 0 && (
              <div className="space-y-1.5 border-t border-[#E3E8EE] pt-4">
                <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                  Link to Services
                </Label>
                <p className="text-xs text-[#8898AA] mb-2">
                  When a linked service is added to a job, these checklist items will auto-populate.
                </p>
                <ServiceCombobox
                  options={services}
                  selectedIds={formServiceIds}
                  onToggle={(id) => {
                    setFormServiceIds((prev) =>
                      prev.includes(id)
                        ? prev.filter((x) => x !== id)
                        : [...prev, id]
                    )
                  }}
                  onRemove={(id) => {
                    setFormServiceIds((prev) => prev.filter((x) => x !== id))
                  }}
                  placeholder="Search services..."
                  emptyText="No services found."
                />
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
              {editingTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // ---------------------------------------------------------------------------
  // Link Services dialog
  // ---------------------------------------------------------------------------

  function renderLinkDialog() {
    const linkedServiceIds = linkingTemplate?.services.map((s) => s.id) ?? []

    return (
      <Dialog
        open={linkDialogOpen}
        onOpenChange={(open) => {
          setLinkDialogOpen(open)
          if (!open) {
            setLinkingTemplate(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">
              Link Services
            </DialogTitle>
            <DialogDescription>
              {linkingTemplate
                ? `Select which services should use the "${linkingTemplate.name}" checklist. When a linked service is added to a job, these checklist items will auto-populate.`
                : "Select services to link."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {services.length === 0 ? (
              <div className="py-6 text-center text-sm text-[#8898AA]">
                No services found. Add services in the Services settings first.
              </div>
            ) : (
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={linkSaving}
                      className="w-full justify-between h-10 border-[#E3E8EE] text-sm font-normal"
                    >
                      <span className="text-[#8898AA]">
                        {linkedServiceIds.length > 0
                          ? `${linkedServiceIds.length} linked`
                          : "Select services..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search services..." />
                      <CommandList>
                        <CommandEmpty>No services found.</CommandEmpty>
                        <CommandGroup>
                          {services.map((service) => {
                            const isLinked = linkedServiceIds.includes(service.id)
                            return (
                              <CommandItem
                                key={service.id}
                                value={service.name}
                                disabled={linkSaving}
                                onSelect={() => handleToggleServiceLink(service.id)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    isLinked ? "opacity-100 text-[#635BFF]" : "opacity-0"
                                  )}
                                />
                                <span className="text-sm">{service.name}</span>
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Linked services as removable badges */}
                {linkingTemplate && linkingTemplate.services.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {linkingTemplate.services.map((service) => (
                      <Badge
                        key={service.id}
                        variant="secondary"
                        className="bg-[#635BFF]/10 text-[#635BFF] ring-1 ring-inset ring-[#635BFF]/20 pr-1 gap-1"
                      >
                        {service.name}
                        <button
                          type="button"
                          disabled={linkSaving}
                          onClick={() => handleToggleServiceLink(service.id)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-[#635BFF]/20 transition-colors disabled:opacity-50"
                          aria-label={`Unlink ${service.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLinkDialogOpen(false)}
              className="border-[#E3E8EE]"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }
}
