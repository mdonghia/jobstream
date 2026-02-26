"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { customerSchema, propertySchema } from "@/lib/validations"
import { z } from "zod"

// =============================================================================
// Types
// =============================================================================

type GetCustomersParams = {
  search?: string
  status?: "active" | "archived"
  tags?: string[]
  source?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  page?: number
  perPage?: number
}

// Helper: resolve the "activity date" sort -- GREATEST(customer.createdAt, most recent job createdAt)
// Returns sorted customer IDs for a given page using raw SQL.
async function getCustomerIdsByActivityDate(params: {
  where: any
  sortOrder: "asc" | "desc"
  skip: number
  take: number
  organizationId: string
  search?: string
  status?: string
  tags?: string[]
}): Promise<string[]> {
  const { organizationId, sortOrder, skip, take } = params

  // Build dynamic WHERE conditions for the raw query
  const conditions: string[] = [`c."organizationId" = '${organizationId}'`]

  if (params.status === "active") {
    conditions.push(`c."isArchived" = false`)
  } else if (params.status === "archived") {
    conditions.push(`c."isArchived" = true`)
  }

  if (params.tags && params.tags.length > 0) {
    // PostgreSQL array contains all: use @> operator
    const tagsLiteral = `ARRAY[${params.tags.map((t) => `'${t.replace(/'/g, "''")}'`).join(",")}]::text[]`
    conditions.push(`c."tags" @> ${tagsLiteral}`)
  }

  if (params.search && params.search.trim()) {
    const words = params.search.trim().split(/\s+/)
    for (const word of words) {
      const escaped = word.replace(/'/g, "''")
      conditions.push(
        `(c."firstName" ILIKE '%${escaped}%' OR c."lastName" ILIKE '%${escaped}%' OR c."email" ILIKE '%${escaped}%' OR c."phone" ILIKE '%${escaped}%')`
      )
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  const direction = sortOrder === "desc" ? "DESC" : "ASC"

  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(`
    SELECT c.id
    FROM "Customer" c
    LEFT JOIN LATERAL (
      SELECT MAX(j."createdAt") AS last_job_created
      FROM "Job" j
      WHERE j."customerId" = c.id
    ) job_agg ON true
    ${whereClause}
    ORDER BY GREATEST(c."createdAt", COALESCE(job_agg.last_job_created, c."createdAt")) ${direction}
    LIMIT ${take} OFFSET ${skip}
  `)

  return rows.map((r) => r.id)
}

// =============================================================================
// 1. getCustomers - List customers with search, filter, sort, pagination
// =============================================================================

export async function getCustomers(params: GetCustomersParams = {}) {
  try {
    const user = await requireAuth()
    const {
      search,
      status,
      tags,
      source,
      sortBy = "activityDate",
      sortOrder = "desc",
      page = 1,
      perPage = 25,
    } = params

    // Build the where clause
    const where: any = {
      organizationId: user.organizationId,
    }

    // Filter by archived status
    if (status === "active") {
      where.isArchived = false
    } else if (status === "archived") {
      where.isArchived = true
    }

    // Filter by tags - customer must have ALL specified tags
    if (tags && tags.length > 0) {
      where.tags = {
        hasEvery: tags,
      }
    }

    // Filter by source
    if (source) {
      where.source = source
    }

    // Search across firstName, lastName, email, phone
    // Split on whitespace so multi-word searches like "David Brown" match across fields
    if (search && search.trim()) {
      const words = search.trim().split(/\s+/)
      where.AND = [
        ...(where.AND || []),
        ...words.map((word: string) => ({
          OR: [
            { firstName: { contains: word, mode: "insensitive" } },
            { lastName: { contains: word, mode: "insensitive" } },
            { email: { contains: word, mode: "insensitive" } },
            { phone: { contains: word, mode: "insensitive" } },
          ],
        })),
      ]
    }

    // Calculate pagination
    const skip = (page - 1) * perPage

    // "activityDate" sort: GREATEST(customer.createdAt, last job createdAt)
    // This correctly interleaves brand-new customers and customers with recent jobs.
    // A customer added today with no jobs appears alongside a customer who just had
    // a job created -- both rank by their most recent activity timestamp.
    // Also used when sorting by "lastJobDate" since that column is computed.
    if (sortBy === "activityDate" || sortBy === "lastJobDate") {
      const [total, sortedIds] = await Promise.all([
        prisma.customer.count({ where }),
        getCustomerIdsByActivityDate({
          where,
          sortOrder,
          skip,
          take: perPage,
          organizationId: user.organizationId,
          search,
          status,
          tags,
        }),
      ])

      // Fetch full records for the page in one query, then restore the sort order
      const customers = await prisma.customer.findMany({
        where: { id: { in: sortedIds } },
        include: {
          properties: { select: { id: true } },
          invoices: { where: { status: "PAID" }, select: { total: true } },
          jobs: {
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      })

      // Re-order to match the SQL sort (findMany with id IN(...) does not preserve order)
      const customerMap = new Map(customers.map((c) => [c.id, c]))
      const orderedCustomers = sortedIds
        .map((id) => customerMap.get(id))
        .filter(Boolean) as typeof customers

      const customersWithStats = orderedCustomers.map((customer) => {
        const revenue = customer.invoices.reduce(
          (sum, inv) => sum + Number(inv.total),
          0
        )
        const lastJobDate = customer.jobs[0]?.createdAt ?? null
        const propertiesCount = customer.properties.length
        const { invoices, jobs, properties, ...rest } = customer
        return { ...rest, propertiesCount, revenue, lastJobDate }
      })

      const totalPages = Math.ceil(total / perPage)
      return { customers: customersWithStats, total, page, totalPages }
    }

    // Build the orderBy clause for non-activityDate sorts
    const allowedSortFields = [
      "firstName",
      "lastName",
      "email",
      "company",
      "createdAt",
      "updatedAt",
    ]
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : "firstName"
    const orderBy = { [orderByField]: sortOrder }

    // Run count and query in parallel
    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        orderBy,
        skip,
        take: perPage,
        include: {
          properties: {
            select: { id: true },
          },
          invoices: {
            where: { status: "PAID" },
            select: { total: true },
          },
          jobs: {
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
    ])

    // Transform results to include computed fields
    const customersWithStats = customers.map((customer) => {
      const revenue = customer.invoices.reduce(
        (sum, inv) => sum + Number(inv.total),
        0
      )
      const lastJobDate = customer.jobs[0]?.createdAt ?? null
      const propertiesCount = customer.properties.length

      // Remove the raw included relations from the response
      const { invoices, jobs, properties, ...rest } = customer

      return {
        ...rest,
        propertiesCount,
        revenue,
        lastJobDate,
      }
    })

    const totalPages = Math.ceil(total / perPage)

    return {
      customers: customersWithStats,
      total,
      page,
      totalPages,
    }
  } catch (error: any) {
    // Re-throw redirect errors from requireAuth
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("getCustomers error:", error)
    return { error: "Failed to fetch customers" }
  }
}

// =============================================================================
// 1b. searchCustomersWithProperties - Search customers with full property data
//     Used by the job builder combobox to show address details and auto-select
//     the primary property when a customer is chosen.
// =============================================================================

export async function searchCustomersWithProperties(search: string) {
  try {
    const user = await requireAuth()

    const where: any = {
      organizationId: user.organizationId,
      isArchived: false,
    }

    if (search.trim()) {
      const words = search.trim().split(/\s+/)
      where.AND = words.map((word: string) => ({
        OR: [
          { firstName: { contains: word, mode: "insensitive" } },
          { lastName: { contains: word, mode: "insensitive" } },
          { email: { contains: word, mode: "insensitive" } },
          { phone: { contains: word, mode: "insensitive" } },
        ],
      }))
    }

    const customers = await prisma.customer.findMany({
      where,
      take: 10,
      orderBy: { firstName: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        properties: {
          select: {
            id: true,
            addressLine1: true,
            city: true,
            state: true,
            zip: true,
            isPrimary: true,
          },
          orderBy: { isPrimary: "desc" },
        },
      },
    })

    return { customers }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    return { error: "Failed to search customers" }
  }
}

// =============================================================================
// 2. getCustomer - Get single customer with all relations
// =============================================================================

export async function getCustomer(id: string) {
  try {
    const user = await requireAuth()

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        properties: {
          orderBy: { isPrimary: "desc" },
        },
        quotes: {
          select: { id: true },
        },
        jobs: {
          select: { id: true },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            amountDue: true,
            dueDate: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        customerNotes: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!customer) {
      return { error: "Customer not found" }
    }

    return {
      customer: {
        ...customer,
        quotesCount: customer.quotes.length,
        jobsCount: customer.jobs.length,
      },
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("getCustomer error:", error)
    return { error: "Failed to fetch customer" }
  }
}

// =============================================================================
// 3. createCustomer - Create customer + optional properties
// =============================================================================

export async function createCustomer(
  data: z.infer<typeof customerSchema> & {
    properties?: z.infer<typeof propertySchema>[]
  }
) {
  try {
    const user = await requireAuth()

    // Validate customer data
    const customerResult = customerSchema.safeParse(data)
    if (!customerResult.success) {
      return { error: customerResult.error.issues[0].message }
    }

    // Validate each property if provided
    if (data.properties && data.properties.length > 0) {
      for (const prop of data.properties) {
        const propResult = propertySchema.safeParse(prop)
        if (!propResult.success) {
          return { error: propResult.error.issues[0].message }
        }
      }
    }

    // Create customer and properties in a transaction
    const customer = await prisma.$transaction(async (tx) => {
      const newCustomer = await tx.customer.create({
        data: {
          organizationId: user.organizationId,
          firstName: customerResult.data.firstName,
          lastName: customerResult.data.lastName,
          email: customerResult.data.email || null,
          phone: customerResult.data.phone || null,
          company: customerResult.data.company || null,
          source: customerResult.data.source || null,
          tags: customerResult.data.tags || [],
          notes: customerResult.data.notes || null,
        },
      })

      // Create associated properties
      if (data.properties && data.properties.length > 0) {
        for (const prop of data.properties) {
          await tx.property.create({
            data: {
              customerId: newCustomer.id,
              addressLine1: prop.addressLine1,
              addressLine2: prop.addressLine2 || null,
              city: prop.city,
              state: prop.state,
              zip: prop.zip,
              notes: prop.notes || null,
              isPrimary: prop.isPrimary ?? false,
            },
          })
        }
      }

      // Return the customer with properties included
      return tx.customer.findUnique({
        where: { id: newCustomer.id },
        include: { properties: true },
      })
    })

    return { customer }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("createCustomer error:", error)
    return { error: "Failed to create customer" }
  }
}

// =============================================================================
// 4. updateCustomer - Update customer fields
// =============================================================================

export async function updateCustomer(
  id: string,
  data: Partial<z.infer<typeof customerSchema>>,
  properties?: z.infer<typeof propertySchema>[]
) {
  try {
    const user = await requireAuth()

    // Verify the customer belongs to this organization
    const existing = await prisma.customer.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    })

    if (!existing) {
      return { error: "Customer not found" }
    }

    // Validate only the provided fields by making everything optional
    const partialSchema = customerSchema.partial()
    const result = partialSchema.safeParse(data)
    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    // Validate properties if provided
    if (properties && properties.length > 0) {
      for (const prop of properties) {
        const propResult = propertySchema.safeParse(prop)
        if (!propResult.success) {
          return { error: propResult.error.issues[0].message }
        }
      }
    }

    // Use a transaction to update customer and replace properties atomically
    const customer = await prisma.$transaction(async (tx) => {
      const updatedCustomer = await tx.customer.update({
        where: { id },
        data: result.data,
      })

      // If properties are provided, delete all existing and create new ones
      if (properties !== undefined) {
        await tx.property.deleteMany({
          where: { customerId: id },
        })

        if (properties.length > 0) {
          for (const prop of properties) {
            await tx.property.create({
              data: {
                customerId: id,
                addressLine1: prop.addressLine1,
                addressLine2: prop.addressLine2 || null,
                city: prop.city,
                state: prop.state,
                zip: prop.zip,
                notes: prop.notes || null,
                isPrimary: prop.isPrimary ?? false,
              },
            })
          }
        }
      }

      return updatedCustomer
    })

    return { customer }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("updateCustomer error:", error)
    return { error: "Failed to update customer" }
  }
}

// =============================================================================
// 5. archiveCustomer / unarchiveCustomer - Toggle isArchived
// =============================================================================

export async function archiveCustomer(id: string) {
  try {
    const user = await requireAuth()

    const existing = await prisma.customer.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    })

    if (!existing) {
      return { error: "Customer not found" }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: { isArchived: true },
    })

    return { customer }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("archiveCustomer error:", error)
    return { error: "Failed to archive customer" }
  }
}

export async function unarchiveCustomer(id: string) {
  try {
    const user = await requireAuth()

    const existing = await prisma.customer.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    })

    if (!existing) {
      return { error: "Customer not found" }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: { isArchived: false },
    })

    return { customer }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("unarchiveCustomer error:", error)
    return { error: "Failed to unarchive customer" }
  }
}

// =============================================================================
// 6. deleteCustomer - Hard delete (cascades to all associated records)
// =============================================================================

export async function deleteCustomer(id: string) {
  try {
    const user = await requireAuth()

    const existing = await prisma.customer.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
    })

    if (!existing) {
      return { error: "Customer not found" }
    }

    // Hard delete the customer. Cascading deletes are configured in the
    // Prisma schema (onDelete: Cascade) for properties, customer notes,
    // portal sessions, portal messages, scheduled messages, quotes,
    // jobs, and invoices -- so all associated records are removed.
    await prisma.customer.delete({
      where: { id },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("deleteCustomer error:", error)
    return { error: "Failed to delete customer" }
  }
}

// =============================================================================
// 7. addProperty - Add property to customer
// =============================================================================

export async function addProperty(
  customerId: string,
  data: z.infer<typeof propertySchema>
) {
  try {
    const user = await requireAuth()

    // Verify the customer belongs to this organization
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        organizationId: user.organizationId,
      },
    })

    if (!customer) {
      return { error: "Customer not found" }
    }

    const result = propertySchema.safeParse(data)
    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    const property = await prisma.property.create({
      data: {
        customerId,
        addressLine1: result.data.addressLine1,
        addressLine2: result.data.addressLine2 || null,
        city: result.data.city,
        state: result.data.state,
        zip: result.data.zip,
        notes: result.data.notes || null,
        isPrimary: result.data.isPrimary ?? false,
      },
    })

    return { property }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("addProperty error:", error)
    return { error: "Failed to add property" }
  }
}

// =============================================================================
// 8. updateProperty - Update property
// =============================================================================

export async function updateProperty(
  propertyId: string,
  data: Partial<z.infer<typeof propertySchema>>
) {
  try {
    const user = await requireAuth()

    // Verify ownership through the customer's organization
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        customer: {
          organizationId: user.organizationId,
        },
      },
    })

    if (!property) {
      return { error: "Property not found" }
    }

    const partialSchema = propertySchema.partial()
    const result = partialSchema.safeParse(data)
    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: result.data,
    })

    return { property: updated }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("updateProperty error:", error)
    return { error: "Failed to update property" }
  }
}

// =============================================================================
// 9. deleteProperty - Delete property
// =============================================================================

export async function deleteProperty(propertyId: string) {
  try {
    const user = await requireAuth()

    // Verify ownership through the customer's organization
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        customer: {
          organizationId: user.organizationId,
        },
      },
    })

    if (!property) {
      return { error: "Property not found" }
    }

    await prisma.property.delete({
      where: { id: propertyId },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("deleteProperty error:", error)
    return { error: "Failed to delete property" }
  }
}

// =============================================================================
// 10. addCustomerNote - Add note to customer
// =============================================================================

export async function addCustomerNote(customerId: string, content: string) {
  try {
    const user = await requireAuth()

    // Verify the customer belongs to this organization
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        organizationId: user.organizationId,
      },
    })

    if (!customer) {
      return { error: "Customer not found" }
    }

    if (!content || !content.trim()) {
      return { error: "Note content is required" }
    }

    const note = await prisma.customerNote.create({
      data: {
        customerId,
        userId: user.id,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    })

    return { note }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("addCustomerNote error:", error)
    return { error: "Failed to add note" }
  }
}

// =============================================================================
// 11. getCustomerNotes - Get notes with user info
// =============================================================================

export async function getCustomerNotes(customerId: string) {
  try {
    const user = await requireAuth()

    // Verify the customer belongs to this organization
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        organizationId: user.organizationId,
      },
    })

    if (!customer) {
      return { error: "Customer not found" }
    }

    const notes = await prisma.customerNote.findMany({
      where: { customerId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return { notes }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("getCustomerNotes error:", error)
    return { error: "Failed to fetch notes" }
  }
}

// =============================================================================
// 12. getAllTags - Get all unique tags used across customers
// =============================================================================

export async function getAllTags() {
  try {
    const user = await requireAuth()

    const customers = await prisma.customer.findMany({
      where: { organizationId: user.organizationId },
      select: { tags: true },
    })

    // Collect all unique tags across every customer
    const tagSet = new Set<string>()
    for (const customer of customers) {
      for (const tag of customer.tags) {
        tagSet.add(tag)
      }
    }

    const tags = Array.from(tagSet).sort()

    return tags
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("getAllTags error:", error)
    return { error: "Failed to fetch tags" }
  }
}

// =============================================================================
// 13. getCustomerStats - Get lifetime stats for a customer
// =============================================================================

export async function getCustomerStats(customerId: string) {
  try {
    const user = await requireAuth()

    // Verify the customer belongs to this organization
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        organizationId: user.organizationId,
      },
    })

    if (!customer) {
      return { error: "Customer not found" }
    }

    // Run all queries in parallel for performance
    const [paidInvoiceAgg, totalJobs, totalQuotes, openInvoices] =
      await Promise.all([
        // Total revenue: sum of PAID invoice totals
        prisma.invoice.aggregate({
          where: {
            customerId,
            organizationId: user.organizationId,
            status: "PAID",
          },
          _sum: { total: true },
        }),

        // Total jobs count
        prisma.job.count({
          where: {
            customerId,
            organizationId: user.organizationId,
          },
        }),

        // Total quotes count
        prisma.quote.count({
          where: {
            customerId,
            organizationId: user.organizationId,
          },
        }),

        // Open invoices (not PAID, not VOID, not DRAFT)
        prisma.invoice.findMany({
          where: {
            customerId,
            organizationId: user.organizationId,
            status: {
              in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"],
            },
          },
          select: {
            id: true,
            amountDue: true,
          },
        }),
      ])

    const totalRevenue = Number(paidInvoiceAgg._sum.total ?? 0)
    const openInvoicesCount = openInvoices.length
    const openInvoicesAmount = openInvoices.reduce(
      (sum, inv) => sum + Number(inv.amountDue),
      0
    )

    return {
      stats: {
        totalRevenue,
        totalJobs,
        totalQuotes,
        openInvoicesCount,
        openInvoicesAmount,
      },
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error
    }
    console.error("getCustomerStats error:", error)
    return { error: "Failed to fetch customer stats" }
  }
}
