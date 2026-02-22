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
      sortBy = "firstName",
      sortOrder = "asc",
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
    if (search && search.trim()) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ]
    }

    // Build the orderBy clause
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

    // Calculate pagination
    const skip = (page - 1) * perPage

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
            select: { scheduledStart: true },
            orderBy: { scheduledStart: "desc" },
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
      const lastJobDate = customer.jobs[0]?.scheduledStart ?? null
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
  data: Partial<z.infer<typeof customerSchema>>
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

    const customer = await prisma.customer.update({
      where: { id },
      data: result.data,
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
// 6. deleteCustomer - Hard delete (only if no related records exist)
// =============================================================================

export async function deleteCustomer(id: string) {
  try {
    const user = await requireAuth()

    const existing = await prisma.customer.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        quotes: { select: { id: true }, take: 1 },
        jobs: { select: { id: true }, take: 1 },
        invoices: { select: { id: true }, take: 1 },
      },
    })

    if (!existing) {
      return { error: "Customer not found" }
    }

    // Prevent deletion if related records exist
    if (existing.quotes.length > 0) {
      return { error: "Cannot delete customer with existing quotes. Archive instead." }
    }
    if (existing.jobs.length > 0) {
      return { error: "Cannot delete customer with existing jobs. Archive instead." }
    }
    if (existing.invoices.length > 0) {
      return { error: "Cannot delete customer with existing invoices. Archive instead." }
    }

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
