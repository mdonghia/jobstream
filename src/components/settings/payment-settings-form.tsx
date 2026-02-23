"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, CreditCard, CheckCircle2, XCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  updatePaymentSettings,
  disconnectStripeAccount,
  verifyStripeConnection,
} from "@/actions/settings"

// ============================================================================
// Types
// ============================================================================

interface PaymentSettingsFormProps {
  settings: {
    stripeAccountId: string | null
    stripeOnboarded: boolean
    paymentOnlineEnabled: boolean
  }
}

// ============================================================================
// Component
// ============================================================================

export function PaymentSettingsForm({ settings }: PaymentSettingsFormProps) {
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [pendingVerify, setPendingVerify] = useState(false)
  const [verifying, setVerifying] = useState(false)

  // Stripe connection state
  const [stripeConnected, setStripeConnected] = useState(
    settings.stripeOnboarded && !!settings.stripeAccountId
  )
  const [stripeAccountId, setStripeAccountId] = useState(
    settings.stripeAccountId
  )

  // Online payment toggle
  const [onlineEnabled, setOnlineEnabled] = useState(
    settings.paymentOnlineEnabled
  )

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  function maskAccountId(id: string | null): string {
    if (!id) return ""
    if (id.length <= 8) return id
    return id.slice(0, 4) + "****" + id.slice(-4)
  }

  // -----------------------------------------------------------------------
  // Connect Stripe (opens in new tab)
  // -----------------------------------------------------------------------

  async function handleConnect() {
    setConnecting(true)
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer")
        setPendingVerify(true)
      }
    } catch {
      toast.error("Failed to connect to Stripe. Please try again.")
    } finally {
      setConnecting(false)
    }
  }

  // -----------------------------------------------------------------------
  // Verify Stripe Connection
  // -----------------------------------------------------------------------

  async function handleVerify() {
    setVerifying(true)
    try {
      const result = await verifyStripeConnection()
      if ("error" in result) {
        toast.error(result.error)
      } else if (result.connected) {
        toast.success("Stripe account verified and connected!")
        setStripeConnected(true)
        setStripeAccountId(result.stripeAccountId ?? null)
        setPendingVerify(false)
      } else {
        toast.info(
          result.message ||
            "Onboarding not yet complete. Please finish the Stripe setup in the other tab."
        )
      }
    } catch {
      toast.error("Failed to verify connection")
    } finally {
      setVerifying(false)
    }
  }

  // -----------------------------------------------------------------------
  // Disconnect Stripe
  // -----------------------------------------------------------------------

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const result = await disconnectStripeAccount()
      if ("error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Stripe account disconnected")
        setStripeConnected(false)
        setStripeAccountId(null)
        setOnlineEnabled(false)
      }
    } catch {
      toast.error("Failed to disconnect Stripe")
    } finally {
      setDisconnecting(false)
    }
  }

  // -----------------------------------------------------------------------
  // Save
  // -----------------------------------------------------------------------

  async function handleSave() {
    setSaving(true)
    try {
      const result = await updatePaymentSettings({
        paymentOnlineEnabled: onlineEnabled,
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
  // Shared styles
  // -----------------------------------------------------------------------

  const labelClass = "text-xs font-semibold uppercase text-[#8898AA]"

  return (
    <div className="space-y-8">
      {/* ----------------------------------------------------------------- */}
      {/* Stripe Connect */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Stripe Connection
        </h2>
        <p className="mt-1 text-sm text-[#425466]">
          Connect your Stripe account to accept online payments from customers.
        </p>

        <div className="mt-4 rounded-lg border border-[#E3E8EE] p-6">
          {stripeConnected ? (
            /* ---- Connected state ---- */
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#0A2540]">
                      Stripe Account
                    </span>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                      Connected
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-[#425466]">
                    Account ID: {maskAccountId(stripeAccountId)}
                  </p>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Disconnect
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect Stripe?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will disconnect your Stripe account and disable online
                      payments. Customers will no longer be able to pay invoices
                      online. You can reconnect at any time.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDisconnect}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {disconnecting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Disconnect
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : pendingVerify ? (
            /* ---- Pending verification state ---- */
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-[#0A2540]">
                    Stripe onboarding in progress
                  </p>
                  <p className="mt-0.5 text-sm text-[#425466]">
                    Complete the setup in the new tab, then verify your
                    connection here.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPendingVerify(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleVerify}
                  disabled={verifying}
                  className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
                >
                  {verifying && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Verify Connection
                </Button>
              </div>
            </div>
          ) : (
            /* ---- Not connected state ---- */
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-[#8898AA]" />
                <div>
                  <p className="text-sm font-medium text-[#0A2540]">
                    No Stripe account connected
                  </p>
                  <p className="mt-0.5 text-sm text-[#425466]">
                    Connect your Stripe account to start accepting credit card
                    and ACH payments online.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
              >
                {connecting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <CreditCard className="mr-2 h-4 w-4" />
                Connect with Stripe
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Online Payments */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-[#E3E8EE] pt-8">
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Online Payments
        </h2>
        <p className="mt-1 text-sm text-[#425466]">
          Allow customers to pay invoices online.
        </p>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-[#E3E8EE] p-4">
          <div>
            <Label className={labelClass}>Enable Online Payments</Label>
            <p className="mt-1 text-sm text-[#425466]">
              When enabled, customers can pay invoices online via credit card.
            </p>
            {!stripeConnected && (
              <p className="mt-1 text-xs text-amber-600">
                Connect your Stripe account first to enable online payments.
              </p>
            )}
          </div>
          <Switch
            checked={onlineEnabled}
            onCheckedChange={setOnlineEnabled}
            disabled={!stripeConnected}
            aria-label="Enable online payments"
          />
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Accepted Payment Methods */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-[#E3E8EE] pt-8">
        <h2 className="text-lg font-semibold text-[#0A2540]">
          Accepted Payment Methods
        </h2>
        <p className="mt-1 text-sm text-[#425466]">
          Payment methods available for invoices. Card payments require an active
          Stripe connection with online payments enabled.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Cash - always available */}
          <div className="flex items-center gap-3 rounded-lg border border-[#E3E8EE] p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
              <span className="text-lg">$</span>
            </div>
            <div>
              <p className="text-sm font-medium text-[#0A2540]">Cash</p>
              <p className="text-xs text-green-600">Available</p>
            </div>
          </div>

          {/* Check - always available */}
          <div className="flex items-center gap-3 rounded-lg border border-[#E3E8EE] p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
              <span className="text-lg">&#9745;</span>
            </div>
            <div>
              <p className="text-sm font-medium text-[#0A2540]">Check</p>
              <p className="text-xs text-green-600">Available</p>
            </div>
          </div>

          {/* ACH - always available */}
          <div className="flex items-center gap-3 rounded-lg border border-[#E3E8EE] p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
              <span className="text-lg">&#127974;</span>
            </div>
            <div>
              <p className="text-sm font-medium text-[#0A2540]">ACH</p>
              <p className="text-xs text-green-600">Available</p>
            </div>
          </div>

          {/* Card - requires Stripe + online enabled */}
          <div
            className={`flex items-center gap-3 rounded-lg border p-4 ${
              stripeConnected && onlineEnabled
                ? "border-[#E3E8EE]"
                : "border-dashed border-[#E3E8EE] opacity-50"
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                stripeConnected && onlineEnabled ? "bg-green-50" : "bg-gray-50"
              }`}
            >
              <CreditCard
                className={`h-5 w-5 ${
                  stripeConnected && onlineEnabled
                    ? "text-green-600"
                    : "text-gray-400"
                }`}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-[#0A2540]">Card</p>
              <p
                className={`text-xs ${
                  stripeConnected && onlineEnabled
                    ? "text-green-600"
                    : "text-[#8898AA]"
                }`}
              >
                {stripeConnected && onlineEnabled
                  ? "Available"
                  : "Requires Stripe"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Save Button */}
      {/* ----------------------------------------------------------------- */}
      <div className="border-t border-[#E3E8EE] pt-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  )
}
