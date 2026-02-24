"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Plus,
  Loader2,
  MoreHorizontal,
  CalendarClock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
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
import {
  createServicePlan,
  updateServicePlan,
  deleteServicePlan,
  getServicePlans,
} from "@/actions/service-plans"

// =============================================================================
// Types
// =============================================================================

interface ServicePlanItem {
  id: string
  name: string
  description: string | null
  visitFrequency: string
  includedVisits: number | null
  serviceIds: string[]
  pricePerVisit: number | string | null
  isActive: boolean
  createdAt: string | Date
  _count: { subscriptions: number }
}

interface AvailableService {
  id: string
  name: string
  defaultPrice: number
  isActive: boolean
}

interface ServicePlansManagerProps {
  initialPlans: ServicePlanItem[]
  availableServices: AvailableService[]
}

// =============================================================================
// Frequency display helpers
// =============================================================================

const FREQUENCY_OPTIONS = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Every 2 Weeks" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "BIANNUALLY", label: "Every 6 Months" },
  { value: "ANNUALLY", label: "Annually" },
]

function getFrequencyLabel(value: string): string {
  return FREQUENCY_OPTIONS.find((f) => f.value === value)?.label || value
}

function formatCurrency(amount: number | string | null): string {
  if (amount === null || amount === undefined) return "--"
  return `$${Number(amount).toFixed(2)}`
}

// =============================================================================
// Component
// =============================================================================

export function ServicePlansManager({
  initialPlans,
  availableServices,
}: ServicePlansManagerProps) {
  const [plans, setPlans] = useState<ServicePlanItem[]>(initialPlans)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingPlan, setEditingPlan] = useState<ServicePlanItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formFrequency, setFormFrequency] = useState("MONTHLY")
  const [formIncludedVisits, setFormIncludedVisits] = useState("")
  const [formServiceIds, setFormServiceIds] = useState<string[]>([])
  const [formPricePerVisit, setFormPricePerVisit] = useState("")
  const [formActive, setFormActive] = useState(true)

  // ---------------------------------------------------------------------------
  // Refresh data
  // ---------------------------------------------------------------------------

  async function refreshPlans() {
    const result = await getServicePlans()
    if (!("error" in result)) {
      setPlans(result.plans)
    }
  }

  // ---------------------------------------------------------------------------
  // Dialog open/close helpers
  // ---------------------------------------------------------------------------

  function openAddDialog() {
    setEditingPlan(null)
    resetForm()
    setDialogOpen(true)
  }

  function openEditDialog(plan: ServicePlanItem) {
    setEditingPlan(plan)
    setFormName(plan.name)
    setFormDescription(plan.description || "")
    setFormFrequency(plan.visitFrequency)
    setFormIncludedVisits(
      plan.includedVisits != null ? String(plan.includedVisits) : ""
    )
    setFormServiceIds(plan.serviceIds || [])
    setFormPricePerVisit(
      plan.pricePerVisit != null ? String(Number(plan.pricePerVisit)) : ""
    )
    setFormActive(plan.isActive)
    setDialogOpen(true)
  }

  function resetForm() {
    setFormName("")
    setFormDescription("")
    setFormFrequency("MONTHLY")
    setFormIncludedVisits("")
    setFormServiceIds([])
    setFormPricePerVisit("")
    setFormActive(true)
  }

  // ---------------------------------------------------------------------------
  // Save (create or update)
  // ---------------------------------------------------------------------------

  async function handleSave() {
    if (!formName.trim()) {
      toast.error("Plan name is required")
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        visitFrequency: formFrequency,
        includedVisits: formIncludedVisits
          ? Number(formIncludedVisits)
          : undefined,
        serviceIds: formServiceIds,
        pricePerVisit: formPricePerVisit
          ? Number(formPricePerVisit)
          : undefined,
        isActive: formActive,
      }

      if (editingPlan) {
        const result = await updateServicePlan(editingPlan.id, payload)
        if ("error" in result) {
          toast.error(result.error)
        } else {
          toast.success("Service plan updated")
          setDialogOpen(false)
          refreshPlans()
        }
      } else {
        const result = await createServicePlan(payload)
        if ("error" in result) {
          toast.error(result.error)
        } else {
          toast.success("Service plan created")
          setDialogOpen(false)
          refreshPlans()
        }
      }
    } catch {
      toast.error("Failed to save service plan")
    } finally {
      setSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Toggle active
  // ---------------------------------------------------------------------------

  async function handleToggleActive(plan: ServicePlanItem) {
    const result = await updateServicePlan(plan.id, {
      isActive: !plan.isActive,
    })
    if ("error" in result) {
      toast.error(result.error)
    } else {
      toast.success(plan.isActive ? "Plan deactivated" : "Plan activated")
      refreshPlans()
    }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async function handleDelete() {
    if (!deleteId) return
    setDeleteError(null)
    const result = await deleteServicePlan(deleteId)
    if ("error" in result) {
      setDeleteError(result.error as string)
    } else {
      toast.success("Service plan deleted")
      setDeleteId(null)
      refreshPlans()
    }
  }

  // ---------------------------------------------------------------------------
  // Toggle service checkbox
  // ---------------------------------------------------------------------------

  function toggleService(serviceId: string) {
    setFormServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (plans.length === 0 && !dialogOpen) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0A2540]">
              Service Plans
            </h2>
            <p className="mt-1 text-sm text-[#425466]">
              Create membership plans to offer recurring services to your
              customers.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <CalendarClock className="h-16 w-16 text-[#8898AA] mb-4" />
          <h3 className="text-lg font-semibold text-[#0A2540] mb-2">
            No service plans yet
          </h3>
          <p className="text-sm text-[#425466] max-w-md mb-6">
            Create plans with recurring visit schedules to offer memberships to
            your customers. Each visit is invoiced individually when completed.
          </p>
          <Button
            onClick={openAddDialog}
            className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Plan
          </Button>
        </div>

        {renderDialog()}
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
            Service Plans
          </h2>
          <p className="mt-1 text-sm text-[#425466]">
            {plans.length} plan{plans.length !== 1 ? "s" : ""} configured.
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Plan
        </Button>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-lg border border-[#E3E8EE] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E3E8EE] bg-[#F6F8FA]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Plan Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Visit Frequency
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Price / Visit
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Active Subscribers
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Status
                </th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr
                  key={plan.id}
                  className="border-b border-[#E3E8EE] last:border-b-0"
                >
                  {/* Name + description */}
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-[#0A2540]">
                        {plan.name}
                      </p>
                      {plan.description && (
                        <p className="mt-0.5 text-xs text-[#8898AA] line-clamp-1">
                          {plan.description}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Frequency */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-[#425466]">
                      {getFrequencyLabel(plan.visitFrequency)}
                    </span>
                  </td>

                  {/* Price per visit */}
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-[#0A2540]">
                      {formatCurrency(plan.pricePerVisit)}
                    </span>
                  </td>

                  {/* Subscriber count */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-[#425466]">
                      {plan._count.subscriptions}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {plan.isActive ? (
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="More actions"
                        >
                          <MoreHorizontal className="h-4 w-4 text-[#8898AA]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openEditDialog(plan)}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(plan)}
                        >
                          {plan.isActive ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => {
                            setDeleteError(null)
                            setDeleteId(plan.id)
                          }}
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
          if (!open) {
            setDeleteId(null)
            setDeleteError(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this service plan? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-sm text-red-600 px-1">{deleteError}</p>
          )}
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
  // Dialog render helper
  // ---------------------------------------------------------------------------

  function renderDialog() {
    const activeServices = availableServices.filter((s) => s.isActive)

    return (
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingPlan(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">
              {editingPlan ? "Edit Service Plan" : "Create Service Plan"}
            </DialogTitle>
            <DialogDescription>
              {editingPlan
                ? "Update the details of this plan. Changes do not affect existing subscriptions."
                : "Create a new service plan to offer recurring services."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                Plan Name *
              </Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Monthly Lawn Care"
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
                placeholder="What is included in this plan..."
                className="min-h-[80px] border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              />
            </div>

            {/* Visit Frequency */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                Visit Frequency *
              </Label>
              <Select value={formFrequency} onValueChange={setFormFrequency}>
                <SelectTrigger className="h-10 w-full border-[#E3E8EE] focus-visible:ring-[#635BFF]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Included Visits */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                Included Visits (optional)
              </Label>
              <Input
                type="number"
                min="1"
                value={formIncludedVisits}
                onChange={(e) => setFormIncludedVisits(e.target.value)}
                placeholder="Leave blank for unlimited"
                className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
              />
            </div>

            {/* Price Per Visit */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                Price Per Visit
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8898AA]">
                  $
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formPricePerVisit}
                  onChange={(e) => setFormPricePerVisit(e.target.value)}
                  placeholder="0.00"
                  className="h-10 pl-7 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                />
              </div>
              <p className="text-xs text-[#8898AA]">
                If set, this overrides individual service prices for plan
                subscribers.
              </p>
            </div>

            {/* Included Services */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                Included Services
              </Label>
              {activeServices.length === 0 ? (
                <p className="text-sm text-[#8898AA]">
                  No active services found. Add services in Settings &gt;
                  Services first.
                </p>
              ) : (
                <div className="max-h-[200px] overflow-y-auto border border-[#E3E8EE] rounded-lg p-2 space-y-1">
                  {activeServices.map((svc) => (
                    <label
                      key={svc.id}
                      className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-[#F6F8FA] cursor-pointer"
                    >
                      <Checkbox
                        checked={formServiceIds.includes(svc.id)}
                        onCheckedChange={() => toggleService(svc.id)}
                      />
                      <span className="text-sm text-[#0A2540] flex-1">
                        {svc.name}
                      </span>
                      <span className="text-xs text-[#8898AA]">
                        ${svc.defaultPrice.toFixed(2)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-2 pt-2">
              <Switch checked={formActive} onCheckedChange={setFormActive} />
              <Label className="text-sm text-[#425466]">Active</Label>
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
              {editingPlan ? "Save Changes" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }
}
