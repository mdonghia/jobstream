"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  MapPin,
  Tag,
  Calendar,
  MoreHorizontal,
  Pencil,
  Archive,
  Trash2,
  Plus,
  FileText,
  Briefcase,
  Receipt,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
import { formatCurrency, formatDate, formatPhone, isJobUnscheduled } from "@/lib/utils"
import { formatPhoneNumber } from "@/lib/format-helpers"
import { toast } from "sonner"
import {
  archiveCustomer,
  unarchiveCustomer,
  deleteCustomer,
  updateCustomer,
  addProperty,
  deleteProperty,
  getAllTags,
} from "@/actions/customers"
import { CustomerForm } from "@/components/customers/customer-form"
import { ManageTagsDialog } from "@/components/customers/manage-tags-dialog"

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

interface CustomerDetailProps {
  customer: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    company: string | null
    tags: string[]
    notes: string | null
    isArchived: boolean
    createdAt: Date | string
    properties: Property[]
  }
  customerNotes: any[]
  stats: any
  quotes: any[]
  jobs: any[]
  invoices: any[]
  payments: any[]
}

export function CustomerDetail({
  customer,
  quotes,
  jobs,
  invoices,
}: CustomerDetailProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [allTags, setAllTags] = useState<string[]>([])
  const [manageTagsOpen, setManageTagsOpen] = useState(false)

  // Profile notes (the customer.notes field -- auto-saves on blur)
  const [profileNotes, setProfileNotes] = useState(customer.notes || "")
  const [profileNotesSaving, setProfileNotesSaving] = useState(false)
  const profileNotesOriginal = useRef(customer.notes || "")

  const handleProfileNotesBlur = useCallback(async () => {
    const trimmed = profileNotes.trim()
    // Only save if the value actually changed
    if (trimmed === profileNotesOriginal.current.trim()) return
    setProfileNotesSaving(true)
    const result = await updateCustomer(customer.id, { notes: trimmed || "" })
    if (result && "error" in result) {
      toast.error(result.error as string)
    } else {
      profileNotesOriginal.current = trimmed
      toast.success("Notes saved")
    }
    setProfileNotesSaving(false)
  }, [profileNotes, customer.id])

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
    const result = await deleteCustomer(customer.id)
    if (result && "error" in result) {
      toast.error(result.error as string)
      setDeleteDialogOpen(false)
      return
    }
    toast.success("Customer deleted")
    router.push("/customers")
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
                  onClick={() => setDeleteDialogOpen(true)}
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
            { value: "quotes", label: "Quotes" },
            { value: "jobs", label: "Jobs" },
            { value: "invoices", label: "Invoices" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="px-3 py-2 border-b-2 border-transparent -mb-px text-[#8898AA] hover:text-[#425466] data-[state=active]:border-[#635BFF] data-[state=active]:text-[#0A2540]"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Info */}
            <Card className="border-[#E3E8EE]">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold uppercase text-[#8898AA]">
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 pb-5">
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
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-[#8898AA]" />
                  <span className="text-sm text-[#425466]">
                    Customer since {formatDate(customer.createdAt)}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Tag className="w-4 h-4 text-[#8898AA] mt-0.5" />
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {customer.tags.length > 0 ? (
                      customer.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs bg-[#635BFF]/10 text-[#635BFF]"
                        >
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-[#8898AA]">No tags</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setManageTagsOpen(true)}
                      className="text-xs text-[#635BFF] hover:underline ml-1"
                    >
                      Manage Tags
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="border-[#E3E8EE]">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold uppercase text-[#8898AA] flex items-center gap-2">
                  Customer Notes
                  {profileNotesSaving && (
                    <span className="text-xs font-normal text-[#8898AA] normal-case">Saving...</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-5">
                <Textarea
                  value={profileNotes}
                  onChange={(e) => setProfileNotes(e.target.value)}
                  onBlur={handleProfileNotesBlur}
                  placeholder="Add notes about this customer..."
                  className="min-h-[120px] border-[#E3E8EE] focus-visible:ring-[#635BFF] text-sm text-[#425466] resize-y"
                />
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
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-[#0A2540]">
                              {prop.addressLine1}
                              {prop.addressLine2 && `, ${prop.addressLine2}`}
                            </p>
                            {prop.isPrimary && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#635BFF]/10 text-[#635BFF]">
                                Primary
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[#425466]">
                            {prop.city}, {prop.state} {prop.zip}
                          </p>
                          {prop.notes && (
                            <p className="text-xs text-[#8898AA] mt-1">{prop.notes}</p>
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
        </TabsContent>

        {/* Quotes Tab */}
        <TabsContent value="quotes" className="mt-6">
          {quotes.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-12 h-12 text-[#8898AA] mx-auto mb-3" />
              <p className="text-sm text-[#8898AA]">No quotes yet</p>
              <p className="text-xs text-[#8898AA] mt-1">
                Quotes are created from within a job
              </p>
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
          phone: formatPhoneNumber(customer.phone || ""),
          company: customer.company || "",
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this customer? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Tags Dialog */}
      <ManageTagsDialog
        open={manageTagsOpen}
        onOpenChange={setManageTagsOpen}
        onTagsChanged={async () => {
          // Refresh allTags after a change so the edit form gets updated suggestions
          const refreshed = await getAllTags()
          if (Array.isArray(refreshed)) setAllTags(refreshed)
          // Also refresh the page to reflect renamed/deleted tags on this customer
          router.refresh()
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
    INVOICED: "bg-purple-50 text-purple-700",
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
