"use client"

import { useState } from "react"
import { format } from "date-fns"
import {
  CheckCircle2,
  Clock,
  Download,
  CreditCard,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface LineItem {
  id: string
  name: string
  description: string | null
  quantity: number
  unitPrice: number
  total: number
}

interface Payment {
  id: string
  amount: number
  method: string
  status: string
  createdAt: string
  reference: string | null
}

interface InvoiceData {
  id: string
  invoiceNumber: string
  status: string
  issueDate: string
  dueDate: string
  subtotal: number
  taxAmount: number
  discountAmount: number
  total: number
  amountPaid: number
  amountDue: number
  accessToken: string
  notes: string | null
  lineItems: LineItem[]
  payments: Payment[]
  customer: {
    firstName: string
    lastName: string
    email: string
    phone: string | null
  }
  organization: {
    name: string
    email: string
    phone: string | null
    logo: string | null
    slug: string
    stripeAccountId: string | null
    stripeOnboarded: boolean
  }
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  DRAFT: {
    label: "Draft",
    color: "bg-gray-100 text-gray-700",
    icon: <Clock className="w-4 h-4" />,
  },
  SENT: {
    label: "Sent",
    color: "bg-blue-100 text-blue-700",
    icon: <Clock className="w-4 h-4" />,
  },
  VIEWED: {
    label: "Viewed",
    color: "bg-blue-100 text-blue-700",
    icon: <Clock className="w-4 h-4" />,
  },
  PAID: {
    label: "Paid",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  PARTIALLY_PAID: {
    label: "Partially Paid",
    color: "bg-yellow-100 text-yellow-700",
    icon: <AlertCircle className="w-4 h-4" />,
  },
  OVERDUE: {
    label: "Overdue",
    color: "bg-red-100 text-red-700",
    icon: <AlertCircle className="w-4 h-4" />,
  },
  VOID: {
    label: "Void",
    color: "bg-gray-100 text-gray-500",
    icon: <Clock className="w-4 h-4" />,
  },
}

export function InvoicePortalView({ invoice }: { invoice: InvoiceData }) {
  const [paying, setPaying] = useState(false)
  const status = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.SENT
  const canPay =
    invoice.amountDue > 0 &&
    invoice.organization.stripeAccountId &&
    invoice.organization.stripeOnboarded

  async function handlePayOnline() {
    setPaying(true)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceToken: invoice.accessToken }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || "Failed to start payment")
      }
    } catch {
      toast.error("Failed to start payment")
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {invoice.status === "PAID" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <p className="text-sm font-medium text-green-800">
            This invoice has been paid in full. Thank you!
          </p>
        </div>
      )}

      {/* Invoice Card */}
      <div className="bg-white rounded-xl border border-[#E3E8EE] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#E3E8EE]">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-[#8898AA]">
                Invoice
              </p>
              <h1 className="text-2xl font-bold text-[#0A2540]">
                {invoice.invoiceNumber}
              </h1>
            </div>
            <Badge className={`${status.color} gap-1.5 text-xs`}>
              {status.icon}
              {status.label}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-[#8898AA] text-xs">Issue Date</p>
              <p className="text-[#0A2540] font-medium">
                {format(new Date(invoice.issueDate), "MMM d, yyyy")}
              </p>
            </div>
            <div>
              <p className="text-[#8898AA] text-xs">Due Date</p>
              <p className="text-[#0A2540] font-medium">
                {format(new Date(invoice.dueDate), "MMM d, yyyy")}
              </p>
            </div>
            <div>
              <p className="text-[#8898AA] text-xs">Amount Due</p>
              <p className="text-2xl font-bold text-[#0A2540]">
                ${invoice.amountDue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="px-6 py-4 border-b border-[#E3E8EE] bg-[#F6F8FA]">
          <p className="text-xs font-semibold uppercase text-[#8898AA] mb-1">
            Bill To
          </p>
          <p className="text-sm font-medium text-[#0A2540]">
            {invoice.customer.firstName} {invoice.customer.lastName}
          </p>
          {invoice.customer.email && (
            <p className="text-sm text-[#425466]">{invoice.customer.email}</p>
          )}
        </div>

        {/* Line Items */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E3E8EE] bg-[#F6F8FA]">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Item
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-[#8898AA]">
                  Qty
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-[#8898AA]">
                  Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-[#8898AA]">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[#E3E8EE] last:border-0"
                >
                  <td className="px-6 py-3">
                    <p className="text-sm font-medium text-[#0A2540]">
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="text-xs text-[#8898AA] mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right text-sm text-[#425466]">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-3 text-right text-sm text-[#425466]">
                    ${item.unitPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-[#0A2540]">
                    ${item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-6 py-4 border-t border-[#E3E8EE] bg-[#F6F8FA]">
          <div className="max-w-xs ml-auto space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-[#425466]">Subtotal</span>
              <span className="text-[#0A2540]">
                ${invoice.subtotal.toFixed(2)}
              </span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[#425466]">Discount</span>
                <span className="text-green-600">
                  -${invoice.discountAmount.toFixed(2)}
                </span>
              </div>
            )}
            {invoice.taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[#425466]">Tax</span>
                <span className="text-[#0A2540]">
                  ${invoice.taxAmount.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold border-t border-[#E3E8EE] pt-2 mt-2">
              <span className="text-[#0A2540]">Total</span>
              <span className="text-[#0A2540]">
                ${invoice.total.toFixed(2)}
              </span>
            </div>
            {invoice.amountPaid > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[#425466]">Amount Paid</span>
                <span className="text-green-600">
                  -${invoice.amountPaid.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t border-[#E3E8EE] pt-2 mt-2">
              <span className="text-[#0A2540]">Amount Due</span>
              <span className="text-[#0A2540]">
                ${invoice.amountDue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="px-6 py-4 border-t border-[#E3E8EE]">
            <p className="text-xs font-semibold uppercase text-[#8898AA] mb-1">
              Notes
            </p>
            <p className="text-sm text-[#425466] whitespace-pre-wrap">
              {invoice.notes}
            </p>
          </div>
        )}
      </div>

      {/* Payment History */}
      {invoice.payments.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E3E8EE] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E3E8EE]">
            <h2 className="text-sm font-semibold text-[#0A2540]">
              Payment History
            </h2>
          </div>
          <div className="divide-y divide-[#E3E8EE]">
            {invoice.payments.map((p) => (
              <div
                key={p.id}
                className="px-6 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-[#0A2540]">
                    ${p.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-[#8898AA]">
                    {format(new Date(p.createdAt), "MMM d, yyyy")} via{" "}
                    {p.method}
                  </p>
                </div>
                <Badge
                  className={
                    p.status === "COMPLETED"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }
                >
                  {p.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {canPay && invoice.status !== "PAID" && (
          <Button
            onClick={handlePayOnline}
            disabled={paying}
            className="bg-[#635BFF] hover:bg-[#5851ea] text-white flex-1 h-12 text-base"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            {paying ? "Redirecting..." : `Pay $${invoice.amountDue.toFixed(2)} Now`}
          </Button>
        )}
        <Button
          variant="outline"
          className="border-[#E3E8EE] text-[#425466] h-12"
          onClick={() =>
            window.open(
              `/api/pdf/portal/invoice/${invoice.accessToken}`,
              "_blank"
            )
          }
        >
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* From section */}
      <div className="text-center text-xs text-[#8898AA] space-y-0.5">
        <p>
          From <span className="font-medium">{invoice.organization.name}</span>
        </p>
        {invoice.organization.email && <p>{invoice.organization.email}</p>}
        {invoice.organization.phone && <p>{invoice.organization.phone}</p>}
      </div>
    </div>
  )
}
