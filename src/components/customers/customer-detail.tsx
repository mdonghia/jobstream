"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  MapPin,
  Tag,
  Globe,
  Calendar,
  MoreHorizontal,
  Pencil,
  Archive,
  Trash2,
  Plus,
  FileText,
  Briefcase,
  Receipt,
  CreditCard,
  MessageSquare,
  StickyNote,
  Send,
  Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { formatCurrency, formatDate, formatPhone, formatRelativeTime, isJobUnscheduled } from "@/lib/utils"
import { toast } from "sonner"
import {
  archiveCustomer,
  unarchiveCustomer,
  deleteCustomer,
  updateCustomer,
  addCustomerNote,
  addProperty,
  deleteProperty,
  getAllTags,
} from "@/actions/customers"
import { sendOwnerReply } from "@/actions/portal"
import { CustomerForm } from "@/components/customers/customer-form"
import { Textarea } from "@/components/ui/textarea"

interface Property {
  id: string
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  zip: string
  notes: string | null
  isPrimary: boolean
}

interface CustomerNote {
  id: string
  content: string
  createdAt: Date | string
  user: {
    firstName: string
    lastName: string
  }
}

interface CustomerStats {
  totalRevenue: number
  totalJobs: number
  totalQuotes: number
  openInvoicesCount: number
  openInvoicesAmount: number
}

interface CommunicationEntry {
  id: string
  type: string
  direction: string
  recipientAddress: string | null
  subject: string | null
  content: string | null
  status: string
  triggeredBy: string | null
  createdAt: Date | string
}

interface PortalMessageEntry {
  id: string
  content: string
  isFromOwner: boolean
  isRead: boolean
  createdAt: Date | string
}

interface ActivityEventEntry {
  id: string
  eventType: string
  title: string
  description: string | null
  createdAt: Date | string
  jobId: string
  job: { id: string; jobNumber: string; title: string } | null
  user: { id: string; firstName: string; lastName: string } | null
}

interface CustomerDetailProps {
  customer: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    company: string | null
    source: string | null
    tags: string[]
    notes: string | null
    isArchived: boolean
    createdAt: Date | string
    properties: Property[]
  }
  customerNotes: CustomerNote[]
  communications: CommunicationEntry[]
  stats: CustomerStats
  quotes: any[]
  jobs: any[]
  invoices: any[]
  payments: any[]
  portalMessages?: PortalMessageEntry[]
  recentActivityEvents?: ActivityEventEntry[]
}

export function CustomerDetail({
  customer,
  customerNotes: initialNotes,
  communications,
  stats,
  quotes,
  jobs,
  invoices,
  payments,
  portalMessages = [],
  recentActivityEvents = [],
}: CustomerDetailProps) {
  const router = useRouter()
  const [notes, setNotes] = useState(initialNotes)
  const [noteInput, setNoteInput] = useState("")
  const [noteSaving, setNoteSaving] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [allTags, setAllTags] = useState<string[]>([])
  const [messages, setMessages] = useState<PortalMessageEntry[]>(portalMessages)
  const [replyContent, setReplyContent] = useState("")
  const [replySending, setReplySending] = useState(false)

  // Build a lookup of document numbers -> detail page URLs
  const docLinks = useMemo(() => {
    const map = new Map<string, string>()
    for (const q of quotes) if (q.quoteNumber) map.set(q.quoteNumber, `/quotes/${q.id}`)
    for (const j of jobs) if (j.jobNumber) map.set(j.jobNumber, `/jobs/${j.id}`)
    for (const inv of invoices) if (inv.invoiceNumber) map.set(inv.invoiceNumber, `/invoices/${inv.id}`)
    return map
  }, [quotes, jobs, invoices])

  // Replace QTE-XXXX / JOB-XXXX / INV-XXXX in text with clickable links
  function linkifyContent(text: string) {
    const pattern = /((?:QTE|JOB|INV)-\d+)/g
    const parts = text.split(pattern)
    return parts.map((part, i) => {
      const href = docLinks.get(part)
      if (href) {
        return (
          <Link key={i} href={href} className="text-[#635BFF] hover:underline font-medium">
            {part}
          </Link>
        )
      }
      return part
    })
  }

  useEffect(() => {
    getAllTags().then((tags) => {
      if (Array.isArray(tags)) setAllTags(tags)
    })
  }, [])

  async function handleArchive() {
    const result = customer.isArchived
      ? await unarchiveCustomer(customer.id)
      : await archiveCustomer(customer.id)
    if (result && "error" in result) {
      toast.error(result.error as string)
      return
    }
    toast.success(customer.isArchived ? "Customer restored" : "Customer archived")
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete ${customer.firstName} ${customer.lastName}? This cannot be undone.`)) {
      return
    }
    const result = await deleteCustomer(customer.id)
    if (result && "error" in result) {
      toast.error(result.error as string)
      return
    }
    toast.success("Customer deleted")
    router.push("/customers")
  }

  async function handleAddNote() {
    if (!noteInput.trim()) return
    setNoteSaving(true)
    const result = await addCustomerNote(customer.id, noteInput.trim())
    if (result && "error" in result) {
      toast.error(result.error as string)
    } else if (result && "note" in result) {
      setNotes((prev) => [result.note as CustomerNote, ...prev])
      setNoteInput("")
      toast.success("Note added")
    }
    setNoteSaving(false)
  }

  async function handleDeleteProperty(propertyId: string) {
    if (!confirm("Delete this property?")) return
    const result = await deleteProperty(propertyId)
    if (result && "error" in result) {
      toast.error(result.error as string)
      return
    }
    toast.success("Property deleted")
    router.refresh()
  }

  async function handleSave(
    customerData: {
      firstName: string
      lastName: string
      email: string
      phone: string
      company: string
      source: string
      tags: string[]
      notes: string
    },
    properties: {
      addressLine1: string
      addressLine2: string
      city: string
      state: string
      zip: string
      notes: string
      isPrimary: boolean
    }[]
  ) {
    // Update the customer fields
    const result = await updateCustomer(customer.id, customerData)
    if (result && "error" in result) {
      toast.error(result.error as string)
      return
    }

    // Handle properties: delete all existing, then create new ones
    // This ensures a clean sync between form state and database
    for (const existing of customer.properties) {
      const delResult = await deleteProperty(existing.id)
      if (delResult && "error" in delResult) {
        toast.error(delResult.error as string)
        return
      }
    }

    for (const prop of properties) {
      const addResult = await addProperty(customer.id, {
        addressLine1: prop.addressLine1,
        addressLine2: prop.addressLine2 || "",
        city: prop.city,
        state: prop.state,
        zip: prop.zip,
        notes: prop.notes || "",
        isPrimary: prop.isPrimary,
      })
      if (addResult && "error" in addResult) {
        toast.error(addResult.error as string)
        return
      }
    }

    toast.success("Customer updated")
    router.refresh()
  }

  async function handleSendReply() {
    if (!replyContent.trim()) return
    setReplySending(true)

    try {
      // We need the orgId -- derive it from the URL context
      // The customer page is within the dashboard which requires auth,
      // so we call the server action which uses requireAuth() internally
      // We pass a dummy orgId and let the server action validate via requireAuth
      const result = await sendOwnerReply(customer.id, replyContent.trim())
      if (result && "error" in result && result.error) {
        toast.error(result.error)
      } else {
        // Optimistically add the message to the local list
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            content: replyContent.trim(),
            isFromOwner: true,
            isRead: true,
            createdAt: new Date().toISOString(),
          },
        ])
        setReplyContent("")
        toast.success("Reply sent")
      }
    } catch {
      toast.error("Failed to send reply")
    } finally {
      setReplySending(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 text-sm text-[#8898AA] hover:text-[#635BFF] mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Customers
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#0A2540]">
                {customer.firstName} {customer.lastName}
              </h1>
              {customer.isArchived && (
                <Badge variant="secondary" className="bg-amber-50 text-amber-700">
                  Archived
                </Badge>
              )}
            </div>
            {customer.company && (
              <p className="text-sm text-[#425466] mt-0.5">{customer.company}</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="border-[#E3E8EE] text-[#425466]"
              asChild
            >
              <Link href={`/quotes/new?customerId=${customer.id}`}>
                <FileText className="w-4 h-4 mr-1.5" />
                Create Quote
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-[#E3E8EE] text-[#425466]"
              asChild
            >
              <Link href={`/jobs/new?customerId=${customer.id}`}>
                <Briefcase className="w-4 h-4 mr-1.5" />
                Create Job
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 border-[#E3E8EE]" aria-label="More actions">
                  <MoreHorizontal className="w-4 h-4 text-[#425466]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleArchive}>
                  <Archive className="w-4 h-4 mr-2" />
                  {customer.isArchived ? "Unarchive" : "Archive"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-transparent rounded-none w-full justify-start h-auto p-0 gap-1 border-b border-[#E3E8EE] overflow-x-auto overflow-y-hidden">
          {[
            { value: "overview", label: "Overview" },
            { value: "quotes", label: "Quotes", count: quotes.length },
            { value: "jobs", label: "Jobs", count: jobs.length },
            { value: "invoices", label: "Invoices", count: invoices.length },
            { value: "payments", label: "Payments", count: payments.length },
            { value: "messages", label: "Messages", count: messages.length },
            { value: "communications", label: "Communications" },
            { value: "notes", label: "Notes", count: notes.length },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="px-3 py-2 border-b-2 border-transparent -mb-px text-[#8898AA] hover:text-[#425466] data-[state=active]:border-[#635BFF] data-[state=active]:text-[#0A2540]"
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Info */}
            <Card className="border-[#E3E8EE]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase text-[#8898AA]">
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customer.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-[#8898AA]" />
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-sm text-[#635BFF] hover:underline"
                    >
                      {customer.email}
                    </a>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-[#8898AA]" />
                    <a
                      href={`tel:${customer.phone}`}
                      className="text-sm text-[#635BFF] hover:underline"
                    >
                      {formatPhone(customer.phone)}
                    </a>
                  </div>
                )}
                {customer.company && (
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-[#8898AA]" />
                    <span className="text-sm text-[#425466]">{customer.company}</span>
                  </div>
                )}
                {customer.source && (
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-[#8898AA]" />
                    <span className="text-sm text-[#425466] capitalize">Source: {customer.source}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-[#8898AA]" />
                  <span className="text-sm text-[#425466]">
                    Customer since {formatDate(customer.createdAt)}
                  </span>
                </div>
                {customer.tags.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Tag className="w-4 h-4 text-[#8898AA] mt-0.5" />
                    <div className="flex flex-wrap gap-1.5">
                      {customer.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs bg-[#635BFF]/10 text-[#635BFF]"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {customer.notes && (
                  <>
                    <Separator className="bg-[#E3E8EE]" />
                    <p className="text-sm text-[#425466]">{customer.notes}</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="border-[#E3E8EE]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase text-[#8898AA]">
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-[#F6F8FA]">
                    <p className="text-xs text-[#8898AA] mb-1">Lifetime Revenue</p>
                    <p className="text-lg font-semibold text-[#0A2540]">
                      {formatCurrency(stats.totalRevenue)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F6F8FA]">
                    <p className="text-xs text-[#8898AA] mb-1">Total Jobs</p>
                    <p className="text-lg font-semibold text-[#0A2540]">{stats.totalJobs}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F6F8FA]">
                    <p className="text-xs text-[#8898AA] mb-1">Total Quotes</p>
                    <p className="text-lg font-semibold text-[#0A2540]">{stats.totalQuotes}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F6F8FA]">
                    <p className="text-xs text-[#8898AA] mb-1">Open Invoices</p>
                    <p className="text-lg font-semibold text-[#0A2540]">
                      {stats.openInvoicesCount}
                    </p>
                    {stats.openInvoicesAmount > 0 && (
                      <p className="text-xs text-[#8898AA]">
                        {formatCurrency(stats.openInvoicesAmount)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Properties */}
          <Card className="border-[#E3E8EE] mt-6">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold uppercase text-[#8898AA]">
                Properties
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="border-[#E3E8EE] text-[#425466]"
                onClick={() => setEditOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Property
              </Button>
            </CardHeader>
            <CardContent>
              {customer.properties.length === 0 ? (
                <p className="text-sm text-[#8898AA]">No properties added yet.</p>
              ) : (
                <div className="space-y-3">
                  {customer.properties.map((prop) => (
                    <div
                      key={prop.id}
                      className="flex items-start justify-between p-3 rounded-lg border border-[#E3E8EE]"
                    >
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-[#8898AA] mt-0.5" />
                        <div>
                          <p className="text-sm text-[#0A2540]">
                            {prop.addressLine1}
                            {prop.addressLine2 && `, ${prop.addressLine2}`}
                          </p>
                          <p className="text-sm text-[#425466]">
                            {prop.city}, {prop.state} {prop.zip}
                          </p>
                          {prop.notes && (
                            <p className="text-xs text-[#8898AA] mt-1">{prop.notes}</p>
                          )}
                          {prop.isPrimary && (
                            <Badge
                              variant="secondary"
                              className="mt-1 text-xs bg-green-50 text-green-700"
                            >
                              Primary
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-[#8898AA] hover:text-red-600"
                        onClick={() => handleDeleteProperty(prop.id)}
                        aria-label="Delete property"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity (v2) */}
          {recentActivityEvents.length > 0 && (
            <Card className="border-[#E3E8EE] mt-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase text-[#8898AA] flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivityEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-[#E3E8EE]"
                    >
                      <div className="w-7 h-7 rounded-full bg-[#F6F8FA] border border-[#E3E8EE] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Briefcase className="w-3.5 h-3.5 text-[#8898AA]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0A2540]">
                          {event.title}
                        </p>
                        {event.description && (
                          <p className="text-xs text-[#425466] mt-0.5">
                            {event.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {event.job && (
                            <Link
                              href={`/jobs/${event.job.id}`}
                              className="text-xs text-[#635BFF] hover:underline font-medium"
                            >
                              {event.job.jobNumber}
                            </Link>
                          )}
                          {event.user && (
                            <span className="text-xs text-[#8898AA]">
                              {event.user.firstName} {event.user.lastName}
                            </span>
                          )}
                          <span className="text-xs text-[#8898AA]">
                            {formatRelativeTime(event.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Quotes Tab */}
        <TabsContent value="quotes" className="mt-6">
          {quotes.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-12 h-12 text-[#8898AA] mx-auto mb-3" />
              <p className="text-sm text-[#8898AA]">No quotes yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-[#E3E8EE]"
                asChild
              >
                <Link href={`/quotes/new?customerId=${customer.id}`}>New Quote</Link>
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-[#E3E8EE] overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Quote #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Valid Until</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote: any) => (
                    <tr
                      key={quote.id}
                      className="border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50 cursor-pointer"
                      onClick={() => router.push(`/quotes/${quote.id}`)}
                    >
                      <td className="px-4 py-3 text-sm font-mono text-[#635BFF]">{quote.quoteNumber}</td>
                      <td className="px-4 py-3 text-sm text-[#0A2540]">{formatCurrency(quote.total)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={quote.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-[#425466]">{formatDate(quote.createdAt)}</td>
                      <td className="px-4 py-3 text-sm text-[#425466]">{formatDate(quote.validUntil)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="mt-6">
          {jobs.length === 0 ? (
            <div className="py-12 text-center">
              <Briefcase className="w-12 h-12 text-[#8898AA] mx-auto mb-3" />
              <p className="text-sm text-[#8898AA]">No jobs yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-[#E3E8EE]"
                asChild
              >
                <Link href={`/jobs/new?customerId=${customer.id}`}>New Job</Link>
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-[#E3E8EE] overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[450px]">
                <thead>
                  <tr className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Job #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Scheduled</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job: any) => (
                    <tr
                      key={job.id}
                      className="border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50 cursor-pointer"
                      onClick={() => router.push(`/jobs/${job.id}`)}
                    >
                      <td className="px-4 py-3 text-sm font-mono text-[#635BFF]">{job.jobNumber}</td>
                      <td className="px-4 py-3 text-sm text-[#0A2540]">{job.title}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={isJobUnscheduled(job.scheduledStart) && job.status === "SCHEDULED" ? "UNSCHEDULED" : job.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-[#425466]">
                        {isJobUnscheduled(job.scheduledStart) ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs px-2 py-0.5">
                            Unscheduled
                          </span>
                        ) : (
                          formatDate(job.scheduledStart!)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="mt-6">
          {invoices.length === 0 ? (
            <div className="py-12 text-center">
              <Receipt className="w-12 h-12 text-[#8898AA] mx-auto mb-3" />
              <p className="text-sm text-[#8898AA]">No invoices yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-[#E3E8EE]"
                asChild
              >
                <Link href={`/invoices/new?customerId=${customer.id}`}>New Invoice</Link>
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-[#E3E8EE] overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Issued</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice: any) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50 cursor-pointer"
                      onClick={() => router.push(`/invoices/${invoice.id}`)}
                    >
                      <td className="px-4 py-3 text-sm font-mono text-[#635BFF]">{invoice.invoiceNumber}</td>
                      <td className="px-4 py-3 text-sm text-[#0A2540]">{formatCurrency(invoice.total)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-[#425466]">{formatDate(invoice.createdAt)}</td>
                      <td className="px-4 py-3 text-sm text-[#425466]">{formatDate(invoice.dueDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-6">
          {payments.length === 0 ? (
            <div className="py-12 text-center">
              <CreditCard className="w-12 h-12 text-[#8898AA] mx-auto mb-3" />
              <p className="text-sm text-[#8898AA]">No payments yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-[#E3E8EE] overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment: any) => (
                    <tr key={payment.id} className="border-b border-[#E3E8EE]">
                      <td className="px-4 py-3 text-sm text-[#425466]">{formatDate(payment.createdAt)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-[#635BFF]">
                        {payment.invoice?.invoiceNumber || "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#0A2540]">{formatCurrency(payment.amount)}</td>
                      <td className="px-4 py-3 text-sm text-[#425466] capitalize">
                        {payment.method?.toLowerCase()}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={payment.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="mt-6">
          <div className="space-y-4">
            {/* Message thread */}
            <div className="bg-white rounded-lg border border-[#E3E8EE] p-4 space-y-3 max-h-[500px] overflow-y-auto">
              {messages.length === 0 ? (
                <div className="py-8 text-center">
                  <MessageSquare className="w-10 h-10 text-[#8898AA] mx-auto mb-2" />
                  <p className="text-sm text-[#8898AA]">No portal messages yet</p>
                  <p className="text-xs text-[#8898AA] mt-1">
                    Messages from the customer portal will appear here
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isFromOwner ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg px-4 py-2.5 ${
                        msg.isFromOwner
                          ? "bg-[#635BFF] text-white"
                          : "bg-[#F6F8FA] text-[#0A2540] border border-[#E3E8EE]"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium ${msg.isFromOwner ? "text-white/80" : "text-[#8898AA]"}`}>
                          {msg.isFromOwner ? "You" : `${customer.firstName} ${customer.lastName}`}
                        </span>
                        <span className={`text-xs ${msg.isFromOwner ? "text-white/60" : "text-[#8898AA]"}`}>
                          {formatRelativeTime(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {!msg.isFromOwner && (
                        <span className={`text-xs mt-1 inline-block ${msg.isRead ? "text-[#8898AA]" : "text-[#635BFF] font-medium"}`}>
                          {msg.isRead ? "Read" : "Unread"}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply input */}
            <div className="flex gap-3 items-end">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={messages.length === 0 ? "Send a message to this customer..." : "Type your reply..."}
                rows={2}
                className="resize-none border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendReply()
                  }
                }}
              />
              <Button
                onClick={handleSendReply}
                disabled={replySending || !replyContent.trim()}
                className="bg-[#635BFF] hover:bg-[#5851ea] text-white shrink-0"
              >
                {replySending ? "Sending..." : (
                  <>
                    <Send className="w-4 h-4 mr-1.5" />
                    {messages.length === 0 ? "Send" : "Reply"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications" className="mt-6">
          {communications.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare className="w-12 h-12 text-[#8898AA] mx-auto mb-3" />
              <p className="text-sm text-[#8898AA]">No communications yet</p>
              <p className="text-xs text-[#8898AA] mt-1">
                Communications will appear here when you send quotes, invoices, or messages
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {communications.map((comm) => (
                <div
                  key={comm.id}
                  className="p-3 rounded-lg border border-[#E3E8EE] flex items-start gap-3"
                >
                  <div className="mt-0.5">
                    {comm.type === "EMAIL" ? (
                      <Mail className="w-4 h-4 text-[#635BFF]" />
                    ) : (
                      <Phone className="w-4 h-4 text-[#635BFF]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-[#0A2540]">
                        {comm.type === "EMAIL" ? "Email" : "SMS"}{" "}
                        {comm.direction === "OUTBOUND" ? "sent" : "received"}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          comm.status === "SENT"
                            ? "border-green-200 bg-green-50 text-green-700 text-[10px]"
                            : comm.status === "FAILED"
                            ? "border-red-200 bg-red-50 text-red-700 text-[10px]"
                            : "border-yellow-200 bg-yellow-50 text-yellow-700 text-[10px]"
                        }
                      >
                        {comm.status}
                      </Badge>
                      <span className="text-xs text-[#8898AA]">
                        {formatRelativeTime(comm.createdAt)}
                      </span>
                    </div>
                    {comm.subject && (
                      <p className="text-sm text-[#0A2540] mt-1">{linkifyContent(comm.subject)}</p>
                    )}
                    {comm.content && (
                      <p className="text-sm text-[#425466] mt-0.5 line-clamp-2">{linkifyContent(comm.content)}</p>
                    )}
                    {comm.recipientAddress && (
                      <p className="text-xs text-[#8898AA] mt-1">
                        To: {comm.recipientAddress}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-6">
          <div className="space-y-4">
            {/* Add Note */}
            <div className="flex gap-3">
              <Input
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add a note..."
                className="h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddNote()
                  }
                }}
              />
              <Button
                onClick={handleAddNote}
                disabled={noteSaving || !noteInput.trim()}
                className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
              >
                {noteSaving ? "Saving..." : "Save"}
              </Button>
            </div>

            {/* Notes List */}
            {notes.length === 0 ? (
              <div className="py-8 text-center">
                <StickyNote className="w-10 h-10 text-[#8898AA] mx-auto mb-2" />
                <p className="text-sm text-[#8898AA]">No notes yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-lg border border-[#E3E8EE]"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-medium text-[#0A2540]">
                        {note.user.firstName} {note.user.lastName}
                      </span>
                      <span className="text-xs text-[#8898AA]">
                        {formatRelativeTime(note.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-[#425466]">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <CustomerForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleSave}
        title="Edit Customer"
        allTags={allTags}
        initialData={{
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email || "",
          phone: customer.phone || "",
          company: customer.company || "",
          source: customer.source || "",
          tags: customer.tags,
          notes: customer.notes || "",
          properties: customer.properties.map((p) => ({
            addressLine1: p.addressLine1,
            addressLine2: p.addressLine2 || "",
            city: p.city,
            state: p.state,
            zip: p.zip,
            notes: p.notes || "",
            isPrimary: p.isPrimary,
          })),
        }}
      />
    </div>
  )
}

// Inline status badge for this component
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    SENT: "bg-blue-50 text-blue-700",
    APPROVED: "bg-green-50 text-green-700",
    DECLINED: "bg-red-50 text-red-700",
    CONVERTED: "bg-green-50 text-green-700",
    EXPIRED: "bg-amber-50 text-amber-700",
    SCHEDULED: "bg-gray-100 text-gray-700",
    IN_PROGRESS: "bg-blue-50 text-blue-700",
    COMPLETED: "bg-green-50 text-green-700",
    CANCELLED: "bg-amber-50 text-amber-700",
    PAID: "bg-green-50 text-green-700",
    PARTIALLY_PAID: "bg-blue-50 text-blue-700",
    OVERDUE: "bg-red-50 text-red-700",
    VOID: "bg-gray-100 text-gray-700",
    VIEWED: "bg-blue-50 text-blue-700",
    PENDING: "bg-gray-100 text-gray-700",
    FAILED: "bg-red-50 text-red-700",
    REFUNDED: "bg-amber-50 text-amber-700",
  }

  const displayName = status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[status] || "bg-gray-100 text-gray-700"}`}
    >
      {displayName}
    </span>
  )
}
