"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  updateCommunicationSettings,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
} from "@/actions/settings"

// ============================================================================
// Types
// ============================================================================

interface AutomationRuleData {
  id: string
  name: string
  trigger: string
  channel: string
  templateSubject: string | null
  templateContent: string
  delayMinutes: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface CommunicationsSettingsFormProps {
  settings: {
    commSmsEnabled: boolean
    commEmailEnabled: boolean
  }
  rules: AutomationRuleData[]
}

// ============================================================================
// Constants
// ============================================================================

const TRIGGER_LABELS: Record<string, string> = {
  JOB_SCHEDULED: "Job Scheduled",
  JOB_COMPLETED: "Job Completed",
  INVOICE_SENT: "Invoice Sent",
  INVOICE_OVERDUE: "Invoice Overdue",
  QUOTE_SENT: "Quote Sent",
  BOOKING_RECEIVED: "Booking Received",
  BOOKING_CONFIRMED: "Booking Confirmed",
}

const TRIGGER_OPTIONS = Object.entries(TRIGGER_LABELS).map(
  ([value, label]) => ({ value, label })
)

const CHANNEL_OPTIONS = [
  { value: "SMS", label: "SMS" },
  { value: "EMAIL", label: "Email" },
  { value: "BOTH", label: "Both" },
]

const EMPTY_RULE_FORM = {
  name: "",
  trigger: "JOB_COMPLETED",
  channel: "EMAIL",
  templateSubject: "",
  templateContent: "",
  delayMinutes: "0",
  isActive: true,
}

// ============================================================================
// Component
// ============================================================================

export function CommunicationsSettingsForm({
  settings,
  rules: initialRules,
}: CommunicationsSettingsFormProps) {
  const [saving, setSaving] = useState(false)

  // Channel settings
  const [smsEnabled, setSmsEnabled] = useState(settings.commSmsEnabled)
  const [emailEnabled, setEmailEnabled] = useState(settings.commEmailEnabled)

  // Automation rules
  const [rules, setRules] = useState<AutomationRuleData[]>(initialRules)

  // Rule dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRuleData | null>(null)
  const [ruleForm, setRuleForm] = useState(EMPTY_RULE_FORM)
  const [savingRule, setSavingRule] = useState(false)

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingRule, setDeletingRule] = useState<AutomationRuleData | null>(
    null
  )
  const [deletingInProgress, setDeletingInProgress] = useState(false)

  // -----------------------------------------------------------------------
  // Channel settings save
  // -----------------------------------------------------------------------

  async function handleSaveChannels() {
    setSaving(true)
    try {
      const result = await updateCommunicationSettings({
        commSmsEnabled: smsEnabled,
        commEmailEnabled: emailEnabled,
      })
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Settings saved")
      }
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  // -----------------------------------------------------------------------
  // Rule dialog open/close
  // -----------------------------------------------------------------------

  function openAddDialog() {
    setEditingRule(null)
    setRuleForm(EMPTY_RULE_FORM)
    setDialogOpen(true)
  }

  function openEditDialog(rule: AutomationRuleData) {
    setEditingRule(rule)
    setRuleForm({
      name: rule.name,
      trigger: rule.trigger,
      channel: rule.channel,
      templateSubject: rule.templateSubject || "",
      templateContent: rule.templateContent,
      delayMinutes: String(rule.delayMinutes),
      isActive: rule.isActive,
    })
    setDialogOpen(true)
  }

  // -----------------------------------------------------------------------
  // Rule save (create or update)
  // -----------------------------------------------------------------------

  async function handleSaveRule() {
    if (!ruleForm.name.trim()) {
      toast.error("Rule name is required")
      return
    }
    if (!ruleForm.templateContent.trim()) {
      toast.error("Template content is required")
      return
    }

    setSavingRule(true)
    try {
      if (editingRule) {
        // Update existing rule
        const result = await updateAutomationRule(editingRule.id, {
          name: ruleForm.name,
          trigger: ruleForm.trigger,
          channel: ruleForm.channel,
          templateSubject:
            ruleForm.channel !== "SMS" ? ruleForm.templateSubject : null,
          templateContent: ruleForm.templateContent,
          delayMinutes: Number(ruleForm.delayMinutes) || 0,
          isActive: ruleForm.isActive,
        })

        if ("error" in result) {
          toast.error(result.error)
          return
        }

        setRules((prev) =>
          prev.map((r) => (r.id === editingRule.id ? result.rule : r))
        )
        toast.success("Rule updated")
      } else {
        // Create new rule
        const result = await createAutomationRule({
          name: ruleForm.name,
          trigger: ruleForm.trigger,
          channel: ruleForm.channel,
          templateSubject:
            ruleForm.channel !== "SMS" ? ruleForm.templateSubject : undefined,
          templateContent: ruleForm.templateContent,
          delayMinutes: Number(ruleForm.delayMinutes) || 0,
          isActive: ruleForm.isActive,
        })

        if ("error" in result) {
          toast.error(result.error)
          return
        }

        setRules((prev) => [...prev, result.rule])
        toast.success("Rule created")
      }

      setDialogOpen(false)
    } catch {
      toast.error("Failed to save rule")
    } finally {
      setSavingRule(false)
    }
  }

  // -----------------------------------------------------------------------
  // Rule toggle active
  // -----------------------------------------------------------------------

  async function handleToggleActive(rule: AutomationRuleData) {
    const newActive = !rule.isActive
    // Optimistic update
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, isActive: newActive } : r))
    )

    try {
      const result = await updateAutomationRule(rule.id, {
        isActive: newActive,
      })
      if ("error" in result) {
        toast.error(result.error)
        // Revert
        setRules((prev) =>
          prev.map((r) =>
            r.id === rule.id ? { ...r, isActive: !newActive } : r
          )
        )
      }
    } catch {
      toast.error("Failed to update rule")
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id ? { ...r, isActive: !newActive } : r
        )
      )
    }
  }

  // -----------------------------------------------------------------------
  // Rule delete
  // -----------------------------------------------------------------------

  function openDeleteDialog(rule: AutomationRuleData) {
    setDeletingRule(rule)
    setDeleteDialogOpen(true)
  }

  async function handleDeleteRule() {
    if (!deletingRule) return

    setDeletingInProgress(true)
    try {
      const result = await deleteAutomationRule(deletingRule.id)
      if ("error" in result) {
        toast.error(result.error)
      } else {
        setRules((prev) => prev.filter((r) => r.id !== deletingRule.id))
        toast.success("Rule deleted")
      }
    } catch {
      toast.error("Failed to delete rule")
    } finally {
      setDeletingInProgress(false)
      setDeleteDialogOpen(false)
      setDeletingRule(null)
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  function channelIncludesEmail(channel: string): boolean {
    return channel === "EMAIL" || channel === "BOTH"
  }

  function formatDelay(minutes: number): string {
    if (minutes === 0) return "Immediate"
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (remainingMinutes === 0) return `${hours}h`
    return `${hours}h ${remainingMinutes}m`
  }

  // -----------------------------------------------------------------------
  // Shared styles
  // -----------------------------------------------------------------------

  const labelClass = "text-xs font-semibold uppercase text-[#8898AA]"
  const inputClass = "h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"

  return (
    <div className="space-y-8">
      {/* ----------------------------------------------------------------- */}
      {/* Channel Settings */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Channel Settings
        </h2>
        <p className="mt-1 text-sm text-[#425466]">
          Enable or disable communication channels for your organization.
        </p>

        <div className="mt-4 space-y-3">
          {/* SMS Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-[#E3E8EE] p-4">
            <div>
              <Label className={labelClass}>SMS Notifications</Label>
              <p className="mt-1 text-sm text-[#425466]">
                Send text message notifications to customers. Requires Twilio
                integration to be configured.
              </p>
            </div>
            <Switch
              checked={smsEnabled}
              onCheckedChange={setSmsEnabled}
              aria-label="Enable SMS notifications"
            />
          </div>

          {/* Email Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-[#E3E8EE] p-4">
            <div>
              <Label className={labelClass}>Email Notifications</Label>
              <p className="mt-1 text-sm text-[#425466]">
                Send email notifications to customers. Requires SendGrid
                integration to be configured.
              </p>
            </div>
            <Switch
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
              aria-label="Enable email notifications"
            />
          </div>
        </div>

        {/* Save channels button */}
        <div className="mt-4">
          <Button
            onClick={handleSaveChannels}
            disabled={saving}
            className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Channel Settings
          </Button>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Automation Rules */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-[#E3E8EE] pt-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0A2540]">
              Automation Rules
            </h2>
            <p className="mt-1 text-sm text-[#425466]">
              Set up automated messages that fire on specific triggers.
            </p>
          </div>
          <Button
            onClick={openAddDialog}
            className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Rule
          </Button>
        </div>

        {rules.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-[#E3E8EE] p-8 text-center">
            <p className="text-sm text-[#8898AA]">
              No automation rules configured. Click &quot;Add Rule&quot; to create
              your first automated message.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-[#E3E8EE]">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F6F8FA]">
                  <TableHead className="text-xs font-semibold uppercase text-[#8898AA]">
                    Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-[#8898AA]">
                    Trigger
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-[#8898AA]">
                    Channel
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-[#8898AA]">
                    Delay
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-[#8898AA]">
                    Active
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-[#8898AA] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium text-[#0A2540]">
                      {rule.name}
                    </TableCell>
                    <TableCell className="text-sm text-[#425466]">
                      {TRIGGER_LABELS[rule.trigger] || rule.trigger}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {rule.channel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-[#425466]">
                      {formatDelay(rule.delayMinutes)}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => handleToggleActive(rule)}
                        aria-label={`Toggle ${rule.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(rule)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4 text-[#8898AA]" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(rule)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Add/Edit Rule Dialog */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit Automation Rule" : "Add Automation Rule"}
            </DialogTitle>
            <DialogDescription>
              {editingRule
                ? "Update the automation rule configuration."
                : "Create a new automation rule to send messages automatically."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className={labelClass}>Rule Name *</Label>
              <Input
                value={ruleForm.name}
                onChange={(e) =>
                  setRuleForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Job Completion Follow-up"
                className={inputClass}
              />
            </div>

            {/* Trigger */}
            <div className="space-y-1.5">
              <Label className={labelClass}>Trigger *</Label>
              <Select
                value={ruleForm.trigger}
                onValueChange={(val) =>
                  setRuleForm((prev) => ({ ...prev, trigger: val }))
                }
              >
                <SelectTrigger className="h-10 w-full border-[#E3E8EE] focus-visible:ring-[#635BFF]">
                  <SelectValue placeholder="Select trigger" />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Channel */}
            <div className="space-y-1.5">
              <Label className={labelClass}>Channel *</Label>
              <Select
                value={ruleForm.channel}
                onValueChange={(val) =>
                  setRuleForm((prev) => ({ ...prev, channel: val }))
                }
              >
                <SelectTrigger className="h-10 w-full border-[#E3E8EE] focus-visible:ring-[#635BFF]">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template Subject (only when channel includes email) */}
            {channelIncludesEmail(ruleForm.channel) && (
              <div className="space-y-1.5">
                <Label className={labelClass}>Email Subject</Label>
                <Input
                  value={ruleForm.templateSubject}
                  onChange={(e) =>
                    setRuleForm((prev) => ({
                      ...prev,
                      templateSubject: e.target.value,
                    }))
                  }
                  placeholder="e.g., Your job has been scheduled"
                  className={inputClass}
                />
              </div>
            )}

            {/* Template Content */}
            <div className="space-y-1.5">
              <Label className={labelClass}>Template Content *</Label>
              <Textarea
                value={ruleForm.templateContent}
                onChange={(e) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    templateContent: e.target.value,
                  }))
                }
                placeholder="Hi {{customerName}}, your job {{jobNumber}} has been..."
                className="min-h-24 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                rows={4}
              />
              <p className="text-xs text-[#8898AA]">
                Available variables:{" "}
                <code className="rounded bg-[#F6F8FA] px-1 py-0.5 text-xs">
                  {"{{customerName}}"}
                </code>{" "}
                <code className="rounded bg-[#F6F8FA] px-1 py-0.5 text-xs">
                  {"{{jobNumber}}"}
                </code>{" "}
                <code className="rounded bg-[#F6F8FA] px-1 py-0.5 text-xs">
                  {"{{invoiceNumber}}"}
                </code>{" "}
                <code className="rounded bg-[#F6F8FA] px-1 py-0.5 text-xs">
                  {"{{quoteNumber}}"}
                </code>{" "}
                <code className="rounded bg-[#F6F8FA] px-1 py-0.5 text-xs">
                  {"{{businessName}}"}
                </code>
              </p>
            </div>

            {/* Delay */}
            <div className="space-y-1.5">
              <Label className={labelClass}>Delay (minutes)</Label>
              <Input
                type="number"
                min="0"
                value={ruleForm.delayMinutes}
                onChange={(e) =>
                  setRuleForm((prev) => ({
                    ...prev,
                    delayMinutes: e.target.value,
                  }))
                }
                placeholder="0"
                className={`${inputClass} max-w-[200px]`}
              />
              <p className="text-xs text-[#8898AA]">
                Set to 0 for immediate delivery, or enter minutes to delay after
                the trigger fires.
              </p>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-lg border border-[#E3E8EE] p-3">
              <Label className="text-sm font-medium text-[#0A2540]">
                Active
              </Label>
              <Switch
                checked={ruleForm.isActive}
                onCheckedChange={(checked) =>
                  setRuleForm((prev) => ({ ...prev, isActive: checked }))
                }
                aria-label="Rule active"
              />
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
              onClick={handleSaveRule}
              disabled={savingRule}
              className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
            >
              {savingRule && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingRule ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------- */}
      {/* Delete Confirmation Dialog */}
      {/* ----------------------------------------------------------------- */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingRule?.name}&quot;?
              This action cannot be undone. Any scheduled messages from this rule
              will still be sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRule}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingInProgress && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
