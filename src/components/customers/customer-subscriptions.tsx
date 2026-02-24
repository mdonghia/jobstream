"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  CalendarClock,
  Plus,
  Loader2,
  Pause,
  Play,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Label } from "@/components/ui/label"
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
  subscribeToPlan,
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  getCustomerSubscriptions,
} from "@/actions/service-plans"

// =============================================================================
// Types
// =============================================================================

interface SubscriptionItem {
  id: string
  status: string
  startDate: string | Date
  nextVisitDate: string | Date | null
  cancelledAt: string | Date | null
  servicePlan: {
    id: string
    name: string
    visitFrequency: string
    pricePerVisit: number | string | null
    description: string | null
  }
}

interface AvailablePlan {
  id: string
  name: string
  visitFrequency: string
  pricePerVisit: number | string | null
  isActive: boolean
  description: string | null
}

interface CustomerSubscriptionsProps {
  customerId: string
  initialSubscriptions: SubscriptionItem[]
  availablePlans: AvailablePlan[]
}

// =============================================================================
// Helpers
// =============================================================================

const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Every 2 Weeks",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  BIANNUALLY: "Every 6 Months",
  ANNUALLY: "Annually",
}

function statusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge
          variant="secondary"
          className="bg-green-50 text-green-700 ring-1 ring-inset ring-green-200"
        >
          Active
        </Badge>
      )
    case "PAUSED":
      return (
        <Badge
          variant="secondary"
          className="bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
        >
          Paused
        </Badge>
      )
    case "CANCELLED":
      return (
        <Badge
          variant="secondary"
          className="bg-red-50 text-red-700 ring-1 ring-inset ring-red-200"
        >
          Cancelled
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-700">
          {status}
        </Badge>
      )
  }
}

function formatDate(date: string | Date | null): string {
  if (!date) return "--"
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// =============================================================================
// Component
// =============================================================================

export function CustomerSubscriptions({
  customerId,
  initialSubscriptions,
  availablePlans,
}: CustomerSubscriptionsProps) {
  const [subscriptions, setSubscriptions] =
    useState<SubscriptionItem[]>(initialSubscriptions)
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState("")
  const [subscribing, setSubscribing] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)

  // Active plans that can be subscribed to
  const activePlans = availablePlans.filter((p) => p.isActive)

  // ---------------------------------------------------------------------------
  // Refresh
  // ---------------------------------------------------------------------------

  async function refresh() {
    const result = await getCustomerSubscriptions(customerId)
    if (!("error" in result)) {
      setSubscriptions(result.subscriptions)
    }
  }

  // ---------------------------------------------------------------------------
  // Subscribe
  // ---------------------------------------------------------------------------

  async function handleSubscribe() {
    if (!selectedPlanId) {
      toast.error("Please select a plan")
      return
    }
    setSubscribing(true)
    try {
      const result = await subscribeToPlan(selectedPlanId, customerId)
      if ("error" in result) {
        toast.error(result.error as string)
      } else {
        toast.success("Customer subscribed to plan")
        setSubscribeDialogOpen(false)
        setSelectedPlanId("")
        refresh()
      }
    } catch {
      toast.error("Failed to subscribe")
    } finally {
      setSubscribing(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Pause
  // ---------------------------------------------------------------------------

  async function handlePause(subId: string) {
    setActionLoading(subId)
    try {
      const result = await pauseSubscription(subId)
      if ("error" in result) {
        toast.error(result.error as string)
      } else {
        toast.success("Subscription paused")
        refresh()
      }
    } catch {
      toast.error("Failed to pause subscription")
    } finally {
      setActionLoading(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Resume
  // ---------------------------------------------------------------------------

  async function handleResume(subId: string) {
    setActionLoading(subId)
    try {
      const result = await resumeSubscription(subId)
      if ("error" in result) {
        toast.error(result.error as string)
      } else {
        toast.success("Subscription resumed")
        refresh()
      }
    } catch {
      toast.error("Failed to resume subscription")
    } finally {
      setActionLoading(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Cancel
  // ---------------------------------------------------------------------------

  async function handleCancel() {
    if (!cancelId) return
    setActionLoading(cancelId)
    try {
      const result = await cancelSubscription(cancelId)
      if ("error" in result) {
        toast.error(result.error as string)
      } else {
        toast.success(
          `Subscription cancelled${result.cancelled ? `. ${result.cancelled} future job(s) cancelled.` : ""}`
        )
        setCancelId(null)
        refresh()
      }
    } catch {
      toast.error("Failed to cancel subscription")
    } finally {
      setActionLoading(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Card className="border-[#E3E8EE]">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold uppercase text-[#8898AA]">
          Service Plans
        </CardTitle>
        {activePlans.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="border-[#E3E8EE] text-[#425466]"
            onClick={() => setSubscribeDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Subscribe to Plan
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {subscriptions.length === 0 ? (
          <div className="py-6 text-center">
            <CalendarClock className="w-10 h-10 text-[#8898AA] mx-auto mb-2" />
            <p className="text-sm text-[#8898AA]">No plan subscriptions</p>
            {activePlans.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-[#E3E8EE]"
                onClick={() => setSubscribeDialogOpen(true)}
              >
                Subscribe to Plan
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-3 rounded-lg border border-[#E3E8EE]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[#0A2540]">
                      {sub.servicePlan.name}
                    </span>
                    {statusBadge(sub.status)}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[#8898AA]">
                    <span>
                      {FREQUENCY_LABELS[sub.servicePlan.visitFrequency] ||
                        sub.servicePlan.visitFrequency}
                    </span>
                    {sub.nextVisitDate && sub.status === "ACTIVE" && (
                      <span>
                        Next visit: {formatDate(sub.nextVisitDate)}
                      </span>
                    )}
                    {sub.cancelledAt && (
                      <span>Cancelled: {formatDate(sub.cancelledAt)}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                  {sub.status === "ACTIVE" && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={actionLoading === sub.id}
                        onClick={() => handlePause(sub.id)}
                        title="Pause subscription"
                      >
                        {actionLoading === sub.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-[#8898AA]" />
                        ) : (
                          <Pause className="h-4 w-4 text-amber-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={actionLoading === sub.id}
                        onClick={() => setCancelId(sub.id)}
                        title="Cancel subscription"
                      >
                        <XCircle className="h-4 w-4 text-red-500" />
                      </Button>
                    </>
                  )}
                  {sub.status === "PAUSED" && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={actionLoading === sub.id}
                        onClick={() => handleResume(sub.id)}
                        title="Resume subscription"
                      >
                        {actionLoading === sub.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-[#8898AA]" />
                        ) : (
                          <Play className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={actionLoading === sub.id}
                        onClick={() => setCancelId(sub.id)}
                        title="Cancel subscription"
                      >
                        <XCircle className="h-4 w-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Subscribe Dialog */}
      <Dialog
        open={subscribeDialogOpen}
        onOpenChange={(open) => {
          setSubscribeDialogOpen(open)
          if (!open) setSelectedPlanId("")
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">
              Subscribe to Service Plan
            </DialogTitle>
            <DialogDescription>
              Select a plan to subscribe this customer. A recurring job will be
              created automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-[#8898AA]">
                Select Plan *
              </Label>
              <Select
                value={selectedPlanId}
                onValueChange={setSelectedPlanId}
              >
                <SelectTrigger className="h-10 w-full border-[#E3E8EE] focus-visible:ring-[#635BFF]">
                  <SelectValue placeholder="Choose a plan..." />
                </SelectTrigger>
                <SelectContent>
                  {activePlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <div className="flex items-center gap-2">
                        <span>{plan.name}</span>
                        <span className="text-xs text-[#8898AA]">
                          ({FREQUENCY_LABELS[plan.visitFrequency] || plan.visitFrequency})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPlanId && (
              <div className="rounded-lg bg-[#F6F8FA] p-3">
                {(() => {
                  const plan = activePlans.find((p) => p.id === selectedPlanId)
                  if (!plan) return null
                  return (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-[#0A2540]">
                        {plan.name}
                      </p>
                      {plan.description && (
                        <p className="text-xs text-[#425466]">
                          {plan.description}
                        </p>
                      )}
                      <p className="text-xs text-[#8898AA]">
                        Frequency:{" "}
                        {FREQUENCY_LABELS[plan.visitFrequency] ||
                          plan.visitFrequency}
                      </p>
                      {plan.pricePerVisit && (
                        <p className="text-xs text-[#8898AA]">
                          Price per visit: $
                          {Number(plan.pricePerVisit).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubscribeDialogOpen(false)}
              className="border-[#E3E8EE]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubscribe}
              disabled={subscribing || !selectedPlanId}
              className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
            >
              {subscribing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Subscribe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog
        open={!!cancelId}
        onOpenChange={(open) => {
          if (!open) setCancelId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this subscription? Future scheduled
              jobs will also be cancelled. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#E3E8EE]">
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
