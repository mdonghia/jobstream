"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Users, Search, MoreHorizontal, Archive, Briefcase, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { CustomerForm } from "./customer-form"
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils"
import { formatPhoneNumber } from "@/lib/format-helpers"
import { toast } from "sonner"
import {
  createCustomer,
  updateCustomer,
  archiveCustomer,
  unarchiveCustomer,
  getCustomers,
  getCustomer,
  getAllTags,
} from "@/actions/customers"

interface CustomerRow {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  company: string | null
  notes: string | null
  tags: string[]
  isArchived: boolean
  propertiesCount: number
  revenue: number
  lastJobDate: Date | string | null
}

interface CustomerListProps {
  initialCustomers: CustomerRow[]
  initialTotal: number
  initialPage: number
  initialTotalPages: number
  initialTags: string[]
}

export function CustomerList({
  initialCustomers,
  initialTotal,
  initialPage,
  initialTotalPages,
  initialTags,
}: CustomerListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [customers, setCustomers] = useState(initialCustomers)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [allTags, setAllTags] = useState(initialTags)
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "active")
  const [tagFilter, setTagFilter] = useState(searchParams.get("tag") || "all")
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "firstName")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    (searchParams.get("sortOrder") as "asc" | "desc") || "asc"
  )

  const [formOpen, setFormOpen] = useState(searchParams.get("action") === "new")
  const [editingCustomer, setEditingCustomer] = useState<CustomerRow | null>(null)
  const [editingProperties, setEditingProperties] = useState<any[] | undefined>(undefined)

  async function handleEditClick(customer: CustomerRow) {
    // Fetch full customer data including properties BEFORE opening the form
    // to avoid a race condition where the form initializes with empty properties
    let props: any[] | undefined
    try {
      const result = await getCustomer(customer.id)
      if ("customer" in result && result.customer) {
        props = result.customer.properties.map((p: any) => ({
          addressLine1: p.addressLine1,
          addressLine2: p.addressLine2 || "",
          city: p.city,
          state: p.state,
          zip: p.zip,
          notes: p.notes || "",
          isPrimary: p.isPrimary,
        }))
      }
    } catch {
      // If fetch fails, properties will just be empty
    }
    setEditingProperties(props)
    setEditingCustomer(customer)
  }

  const fetchCustomers = useCallback(
    async (params?: {
      search?: string
      status?: string
      tag?: string
      sortBy?: string
      sortOrder?: "asc" | "desc"
      page?: number
    }) => {
      setLoading(true)
      try {
        const result = await getCustomers({
          search: params?.search ?? search,
          status: (params?.status ?? status) as "active" | "archived",
          tags:
            (params?.tag ?? tagFilter) === "all" ? undefined : [params?.tag ?? tagFilter],
          sortBy: params?.sortBy ?? sortBy,
          sortOrder: params?.sortOrder ?? sortOrder,
          page: params?.page ?? page,
          perPage: 25,
        })
        if ("error" in result) {
          toast.error(result.error as string)
        } else {
          setCustomers(result.customers as any)
          setTotal(result.total)
          setPage(result.page)
          setTotalPages(result.totalPages)
        }
      } catch {
        toast.error("Failed to load customers")
      } finally {
        setLoading(false)
      }
    },
    [search, status, tagFilter, sortBy, sortOrder, page]
  )

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers({ search, page: 1 })
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function handleSort(column: string) {
    const newOrder = sortBy === column && sortOrder === "asc" ? "desc" : "asc"
    setSortBy(column)
    setSortOrder(newOrder)
    fetchCustomers({ sortBy: column, sortOrder: newOrder })
  }

  function handleFilterChange(key: string, value: string) {
    if (key === "status") setStatus(value)
    if (key === "tag") setTagFilter(value)
    fetchCustomers({ [key]: value, page: 1 })
    setPage(1)
  }

  async function handleCreateCustomer(
    customerData: any,
    properties: any[]
  ) {
    const result = await createCustomer({
      ...customerData,
      properties,
    })
    if (result && "error" in result) {
      toast.error(result.error as string)
      throw new Error(result.error as string)
    }
    toast.success("Customer created")
    fetchCustomers()
    const tags = await getAllTags()
    if (Array.isArray(tags)) setAllTags(tags)
  }

  async function handleUpdateCustomer(
    customerData: any,
    properties: any[]
  ) {
    if (!editingCustomer) return
    const result = await updateCustomer(editingCustomer.id, customerData, properties)
    if (result && "error" in result) {
      toast.error(result.error as string)
      throw new Error(result.error as string)
    }
    toast.success("Customer updated")
    setEditingCustomer(null)
    setEditingProperties(undefined)
    fetchCustomers()
    const tags = await getAllTags()
    if (Array.isArray(tags)) setAllTags(tags)
  }

  async function handleArchive(id: string, isArchived: boolean) {
    const result = isArchived ? await unarchiveCustomer(id) : await archiveCustomer(id)
    if (result && "error" in result) {
      toast.error(result.error as string)
      return
    }
    toast.success(isArchived ? "Customer restored" : "Customer archived")
    fetchCustomers()
  }

  const SortHeader = ({
    column,
    children,
  }: {
    column: string
    children: React.ReactNode
  }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA] cursor-pointer hover:text-[#425466] select-none"
      onClick={() => handleSort(column)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortBy === column && (
          <span className="text-[#635BFF]">{sortOrder === "asc" ? "\u2191" : "\u2193"}</span>
        )}
      </span>
    </th>
  )

  // Empty state
  if (total === 0 && !search && status === "active" && tagFilter === "all") {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Users className="w-16 h-16 text-[#8898AA] mb-4" />
          <h2 className="text-lg font-semibold text-[#0A2540] mb-2">No customers yet</h2>
          <p className="text-sm text-[#425466] max-w-md">
            Add your first customer to start creating quotes and scheduling jobs.
          </p>
          <Button
            onClick={() => setFormOpen(true)}
            className="mt-4 bg-[#635BFF] hover:bg-[#5851ea] text-white"
          >
            Add Customer
          </Button>
        </div>
        <CustomerForm
          open={formOpen}
          onOpenChange={setFormOpen}
          onSave={handleCreateCustomer}
        />
      </>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#0A2540]">Customers</h1>
          <p className="text-sm text-[#8898AA] mt-0.5">{total} total</p>
        </div>
        <Button
          onClick={() => setFormOpen(true)}
          className="bg-[#635BFF] hover:bg-[#5851ea] text-white"
        >
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8898AA]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers by name, email, or phone..."
          className="pl-10 h-10 border-[#E3E8EE] focus-visible:ring-[#635BFF]"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={status} onValueChange={(v) => handleFilterChange("status", v)}>
          <SelectTrigger className="w-[130px] h-9 border-[#E3E8EE] text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        {allTags.length > 0 && (
          <Select value={tagFilter} onValueChange={(v) => handleFilterChange("tag", v)}>
            <SelectTrigger className="w-[130px] h-9 border-[#E3E8EE] text-sm">
              <SelectValue placeholder="Tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {allTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#E3E8EE] overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`w-full ${loading ? "opacity-50" : ""}`}>
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#E3E8EE]">
                <SortHeader column="firstName">Name</SortHeader>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Properties
                </th>
                <SortHeader column="revenue">Revenue</SortHeader>
                <SortHeader column="lastJobDate">Last Job</SortHeader>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-[#8898AA]">
                  Tags
                </th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-[#E3E8EE] hover:bg-[#F6F8FA]/50 cursor-pointer"
                  onClick={() => router.push(`/customers/${customer.id}`)}
                >
                  <td className="px-4 py-3">
                    <div>
                      <Link
                        href={`/customers/${customer.id}`}
                        className="text-sm font-medium text-[#0A2540] hover:text-[#635BFF]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {customer.firstName} {customer.lastName}
                      </Link>
                      {customer.company && (
                        <p className="text-xs text-[#8898AA]">{customer.company}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#425466]">
                    {customer.email || "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#425466]">
                    {customer.phone ? formatPhone(customer.phone) : "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#425466]">
                    {customer.propertiesCount || 0}{" "}
                    {(customer.propertiesCount || 0) === 1 ? "property" : "properties"}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-[#0A2540]">
                    {formatCurrency(customer.revenue || 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#425466]">
                    {customer.lastJobDate
                      ? formatDate(customer.lastJobDate)
                      : "No jobs yet"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {customer.tags?.slice(0, 2).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs bg-[#635BFF]/10 text-[#635BFF] hover:bg-[#635BFF]/20"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {customer.tags?.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{customer.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                          <MoreHorizontal className="w-4 h-4 text-[#8898AA]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEditClick(customer)}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/jobs/new?customerId=${customer.id}`}>
                            <Briefcase className="w-4 h-4 mr-2" />
                            Create Job
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleArchive(customer.id, customer.isArchived)}
                        >
                          <Archive className="w-4 h-4 mr-2" />
                          {customer.isArchived ? "Unarchive" : "Archive"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E3E8EE]">
            <p className="text-sm text-[#8898AA]">
              Showing {(page - 1) * 25 + 1} to {Math.min(page * 25, total)} of {total} results
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage(page - 1)
                  fetchCustomers({ page: page - 1 })
                }}
                className="h-8 border-[#E3E8EE]"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => {
                  setPage(page + 1)
                  fetchCustomers({ page: page + 1 })
                }}
                className="h-8 border-[#E3E8EE]"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* No results with filters */}
        {customers.length === 0 && (search || status !== "active") && (
          <div className="py-12 text-center">
            <p className="text-sm text-[#8898AA]">No customers match your filters.</p>
          </div>
        )}
      </div>

      {/* Add Customer Form */}
      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={handleCreateCustomer}
        allTags={allTags}
      />

      {/* Edit Customer Form */}
      {editingCustomer && (
        <CustomerForm
          open={!!editingCustomer}
          onOpenChange={(open) => {
            if (!open) {
              setEditingCustomer(null)
              setEditingProperties(undefined)
            }
          }}
          onSave={handleUpdateCustomer}
          title="Edit Customer"
          allTags={allTags}
          initialData={{
            firstName: editingCustomer.firstName,
            lastName: editingCustomer.lastName,
            email: editingCustomer.email || "",
            phone: formatPhoneNumber(editingCustomer.phone || ""),
            company: editingCustomer.company || "",
            tags: editingCustomer.tags || [],
            notes: editingCustomer.notes || "",
            properties: editingProperties,
          }}
        />
      )}
    </>
  )
}
