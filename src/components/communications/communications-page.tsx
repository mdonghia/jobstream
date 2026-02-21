"use client"

import { useState, useCallback, useEffect } from "react"
import {
  MessageSquare,
  Mail,
  Phone,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { format } from "date-fns"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Communication {
  id: string
  customerId: string | null
  customerName: string | null
  type: "SMS" | "EMAIL" | "BOTH"
  direction: "INBOUND" | "OUTBOUND"
  recipientAddress: string | null
  subject: string | null
  content: string
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED" | "BOUNCED"
  failureReason: string | null
  triggeredBy: string | null
  createdAt: string
}

interface CommunicationsPageProps {
  initialCommunications?: Communication[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const typeIcons: Record<string, React.ReactNode> = {
  SMS: <Phone className="w-3.5 h-3.5" />,
  EMAIL: <Mail className="w-3.5 h-3.5" />,
  BOTH: <MessageSquare className="w-3.5 h-3.5" />,
}

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  QUEUED: {
    label: "Queued",
    color: "text-[#425466]",
    bg: "bg-[#F6F8FA] border-[#E3E8EE]",
  },
  SENT: {
    label: "Sent",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  DELIVERED: {
    label: "Delivered",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
  },
  FAILED: {
    label: "Failed",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
  },
  BOUNCED: {
    label: "Bounced",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CommunicationsPage({
  initialCommunications = [],
}: CommunicationsPageProps) {
  const [communications, setCommunications] =
    useState<Communication[]>(initialCommunications)
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [directionFilter, setDirectionFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Fetch communications
  const fetchCommunications = useCallback(async () => {
    try {
      const mod = await import("@/actions/communications").catch(() => null)
      if (mod?.getCommunications) {
        setLoading(true)
        const result = await mod.getCommunications({
          search: search || undefined,
          type: typeFilter !== "all" ? typeFilter : undefined,
          direction: directionFilter !== "all" ? directionFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        })
        if (result && !("error" in result)) {
          setCommunications((result.communications ?? []).map((c: any) => ({
            ...c,
            customerName: c.customer
              ? `${c.customer.firstName} ${c.customer.lastName}`
              : null,
            createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
          })))
        }
        setLoading(false)
      }
    } catch {
      // Server actions not yet available
    }
  }, [search, typeFilter, directionFilter, statusFilter, dateFrom, dateTo])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCommunications()
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchCommunications])

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#0A2540]">
          Communications
        </h1>
        <p className="text-sm text-[#8898AA] mt-0.5">
          SMS and email communication history
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-t-lg border border-b-0 border-[#E3E8EE] p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8898AA]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name..."
              className="pl-10 h-9 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[110px] h-9 border-[#E3E8EE] text-sm">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={directionFilter}
              onValueChange={setDirectionFilter}
            >
              <SelectTrigger className="w-[120px] h-9 border-[#E3E8EE] text-sm">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="OUTBOUND">Sent</SelectItem>
                <SelectItem value="INBOUND">Received</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-[130px] h-9 border-[#E3E8EE] text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="QUEUED">Queued</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="BOUNCED">Bounced</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 w-[140px] border-[#E3E8EE] text-sm"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 w-[140px] border-[#E3E8EE] text-sm"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        className={`bg-white rounded-b-lg border border-[#E3E8EE] overflow-hidden ${loading ? "opacity-50" : ""}`}
      >
        {communications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="w-12 h-12 text-[#8898AA] mb-3" />
            <h3 className="text-sm font-semibold text-[#0A2540] mb-1">
              No communications found
            </h3>
            <p className="text-sm text-[#8898AA]">
              {search ||
              typeFilter !== "all" ||
              directionFilter !== "all" ||
              statusFilter !== "all"
                ? "Try adjusting your filters."
                : "SMS and email communications with your customers will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                    Date / Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA] w-16">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA] w-16">
                    Dir
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                    Content Preview
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                    Status
                  </th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {communications.map((comm) => {
                  const statusCfg = statusConfig[comm.status]
                  const isFailed =
                    comm.status === "FAILED" || comm.status === "BOUNCED"
                  const isExpanded = expandedId === comm.id

                  return (
                    <>
                      <tr
                        key={comm.id}
                        className={`border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50 cursor-pointer ${
                          isFailed ? "bg-red-50/30" : ""
                        }`}
                        onClick={() => toggleExpand(comm.id)}
                      >
                        <td className="px-4 py-3 text-sm text-[#425466] whitespace-nowrap">
                          {format(
                            new Date(comm.createdAt),
                            "MMM d, yyyy h:mm a"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-[#0A2540]">
                          {comm.customerName ?? (
                            <span className="text-[#8898AA]">Unknown</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className={`inline-flex items-center gap-1 text-xs ${
                              comm.type === "SMS"
                                ? "text-green-700"
                                : comm.type === "EMAIL"
                                  ? "text-blue-700"
                                  : "text-[#425466]"
                            }`}
                          >
                            {typeIcons[comm.type]}
                            {comm.type}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {comm.direction === "OUTBOUND" ? (
                            <ArrowUpRight className="w-4 h-4 text-[#635BFF]" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4 text-amber-600" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#425466] max-w-[300px] truncate">
                          {comm.subject && (
                            <span className="font-medium mr-1">
                              {comm.subject}:
                            </span>
                          )}
                          {comm.content.length > 80
                            ? comm.content.slice(0, 80) + "..."
                            : comm.content}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`${statusCfg.bg} ${statusCfg.color} text-xs`}
                          >
                            {isFailed && (
                              <AlertCircle className="w-3 h-3 mr-0.5" />
                            )}
                            {statusCfg.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-[#8898AA]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[#8898AA]" />
                          )}
                        </td>
                      </tr>

                      {/* Expanded content */}
                      {isExpanded && (
                        <tr
                          key={`${comm.id}-expanded`}
                          className="border-b border-[#E3E8EE]"
                        >
                          <td colSpan={7} className="px-4 py-4 bg-[#F6F8FA]">
                            <div className="max-w-2xl">
                              {comm.subject && (
                                <p className="text-sm font-semibold text-[#0A2540] mb-2">
                                  Subject: {comm.subject}
                                </p>
                              )}
                              <p className="text-sm text-[#425466] whitespace-pre-wrap">
                                {comm.content}
                              </p>
                              {comm.recipientAddress && (
                                <p className="text-xs text-[#8898AA] mt-3">
                                  To: {comm.recipientAddress}
                                </p>
                              )}
                              {comm.triggeredBy && (
                                <p className="text-xs text-[#8898AA] mt-1">
                                  Triggered by: {comm.triggeredBy}
                                </p>
                              )}
                              {isFailed && comm.failureReason && (
                                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                  <AlertCircle className="w-3 h-3 inline mr-1" />
                                  Failure reason: {comm.failureReason}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
