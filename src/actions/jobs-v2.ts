"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { computeJobFilterTab, type JobFilterTab } from "@/lib/job-filter-tab"

// Re-export type for convenience
export type { JobFilterTab } from "@/lib/job-filter-tab"

// =============================================================================
// Shared query helpers
// =============================================================================

/**
 * The include clause used to load all the relations needed for tab computation
 * and the return shape. Shared across getJobsV2, getJobTabCounts, and
 * getJobSearchResults so they stay consistent.
 */
const jobIncludeForV2 = {
  customer: {
    select: { id: true, firstName: true, lastName: true },
  },
  property: {
    select: { id: true, addressLine1: true, addressLine2: true, city: true, state: true, zip: true },
  },
  visits: {
    select: {
      id: true,
      visitNumber: true,
      status: true,
      scheduledStart: true,
            purpose: true,
      assignments: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, color: true },
          },
        },
      },
    },
    orderBy: { visitNumber: "asc" as const },
  },
  // quote = the quote this job was created FROM (Job.quoteId -> Quote)
  quote: {
    select: { id: true, quoteNumber: true, total: true, sentAt: true, status: true, validUntil: true },
  },
  // quotesInContext = quotes created FOR this job (Quote.jobId -> Job)
  quotesInContext: {
    select: { id: true, quoteNumber: true, total: true, sentAt: true, status: true, validUntil: true },
  },
  invoices: {
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      amountDue: true,
      dueDate: true,
      status: true,
    },
  },
  lineItems: {
    select: { total: true },
    orderBy: { sortOrder: "asc" as const },
  },
} as const

/**
 * Serialize Decimal fields to plain numbers for client components.
 * Prisma returns Decimal objects for Decimal columns; Next.js cannot
 * serialize them across the server/client boundary.
 */
function serializeJob(job: any) {
  return {
    id: job.id,
    jobNumber: job.jobNumber,
    title: job.title,
    isEmergency: job.isEmergency,
    isRecurring: job.isRecurring,
    createdAt: job.createdAt,
    customer: job.customer,
    visits: job.visits.map((v: any) => ({
      id: v.id,
      visitNumber: v.visitNumber,
      status: v.status,
      scheduledStart: v.scheduledStart,
      purpose: v.purpose,
      assignments: v.assignments,
    })),
    quotes: [
      ...(job.quote
        ? [
            {
              id: job.quote.id,
              quoteNumber: job.quote.quoteNumber,
              total: Number(job.quote.total),
              sentAt: job.quote.sentAt,
              status: job.quote.status,
              validUntil: job.quote.validUntil,
            },
          ]
        : []),
      ...job.quotesInContext.map((q: any) => ({
        id: q.id,
        quoteNumber: q.quoteNumber,
        total: Number(q.total),
        sentAt: q.sentAt,
        status: q.status,
        validUntil: q.validUntil,
      })),
    ],
    invoices: job.invoices.map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      total: Number(inv.total),
      amountDue: Number(inv.amountDue),
      dueDate: inv.dueDate,
      status: inv.status,
    })),
    lineItems: job.lineItems.map((li: any) => ({
      total: Number(li.total),
    })),
  }
}

// =============================================================================
// 2. getJobsV2 -- List jobs filtered by tab, with search & pagination
// =============================================================================

export async function getJobsV2(params: {
  tab: JobFilterTab
  search?: string
  page?: number
  perPage?: number
}) {
  try {
    const user = await requireAuth()
    const { tab, search, page = 1, perPage = 25 } = params

    // ----- Build an approximate WHERE clause to reduce the initial set -----
    // These are *approximations* -- the final classification is done in JS
    // via computeJobFilterTab. The goal is to keep the DB result set small.
    const where: any = {
      organizationId: user.organizationId,
    }

    switch (tab) {
      case "quoted":
        where.OR = [
          { quotesInContext: { some: { status: "SENT" } } },
          { quote: { status: "SENT" } },
        ]
        break
      case "unscheduled":
        where.visits = {
          some: {
            status: "UNSCHEDULED",
          },
        }
        break
      case "scheduled":
        where.visits = {
          some: {
            status: { in: ["SCHEDULED", "EN_ROUTE", "IN_PROGRESS"] },
          },
        }
        break
      case "needs_invoicing":
        // Jobs where all visits are completed -- we'll refine in JS
        where.visits = {
          every: {
            status: { in: ["COMPLETED", "CANCELLED"] },
          },
        }
        // Must have at least one visit
        where.visits = {
          ...where.visits,
          some: { status: "COMPLETED" },
        }
        break
      case "awaiting_payment":
        where.invoices = {
          some: {
            status: { in: ["SENT", "VIEWED", "OVERDUE", "PARTIALLY_PAID"] },
          },
        }
        break
      case "closed":
        // Broad -- will be refined in JS
        break
    }

    // ----- Search -----
    if (search && search.trim()) {
      const words = search.trim().split(/\s+/)
      where.AND = [
        ...(where.AND || []),
        ...words.map((word: string) => ({
          OR: [
            { jobNumber: { contains: word, mode: "insensitive" } },
            { title: { contains: word, mode: "insensitive" } },
            { customer: { firstName: { contains: word, mode: "insensitive" } } },
            { customer: { lastName: { contains: word, mode: "insensitive" } } },
            { quote: { quoteNumber: { contains: word, mode: "insensitive" } } },
            { property: { addressLine1: { contains: word, mode: "insensitive" } } },
            { property: { city: { contains: word, mode: "insensitive" } } },
          ],
        })),
      ]
    }

    // ----- Fetch all candidate jobs (with relations) -----
    const allCandidates = await prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: jobIncludeForV2,
    })

    // ----- Exact classification in JS -----
    const matchingJobs = allCandidates.filter((job) => {
      const computed = computeJobFilterTab({
        isRecurring: job.isRecurring,
        visits: job.visits.map((v) => ({ status: v.status })),
        quotesInContext: job.quotesInContext.map((q) => ({ status: q.status })),
        quote: job.quote ? { status: job.quote.status } : null,
        invoices: job.invoices.map((inv) => ({ status: inv.status, amountDue: inv.amountDue })),
      })
      return computed === tab
    })

    // ----- Paginate -----
    const total = matchingJobs.length
    const totalPages = Math.ceil(total / perPage)
    const skip = (page - 1) * perPage
    const pagedJobs = matchingJobs.slice(skip, skip + perPage)

    // ----- Compute tab counts in parallel with the main query -----
    // We compute counts from the full candidate set for the requested tab,
    // but for a complete count across ALL tabs, call getJobTabCounts separately.
    // Here we do a lightweight count by fetching all org jobs once.
    const tabCounts = await computeTabCountsForOrg(user.organizationId)

    return {
      jobs: pagedJobs.map(serializeJob),
      total,
      page,
      totalPages,
      tabCounts,
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getJobsV2 error:", error)
    return { error: "Failed to fetch jobs" }
  }
}

// =============================================================================
// 3. getJobTabCounts -- Badge counts for each tab
// =============================================================================

export async function getJobTabCounts(): Promise<Record<JobFilterTab, number>> {
  try {
    const user = await requireAuth()
    return await computeTabCountsForOrg(user.organizationId)
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getJobTabCounts error:", error)
    // Return zeroes on failure so the UI doesn't break
    return {
      unscheduled: 0,
      scheduled: 0,
      quoted: 0,
      needs_invoicing: 0,
      awaiting_payment: 0,
      closed: 0,
    }
  }
}

/**
 * Internal helper: fetch all jobs for an org and bucket them into tabs.
 *
 * Performance note: This fetches all jobs with minimal relations. For orgs
 * with thousands of jobs, this should be replaced with SQL-level aggregation.
 * For the current scale (most orgs have < 1000 jobs) this is acceptable.
 */
async function computeTabCountsForOrg(
  organizationId: string
): Promise<Record<JobFilterTab, number>> {
  const jobs = await prisma.job.findMany({
    where: { organizationId },
    select: {
      isRecurring: true,
      visits: {
        select: { status: true },
      },
      quote: {
        select: { status: true },
      },
      quotesInContext: {
        select: { status: true },
      },
      invoices: {
        select: { status: true, amountDue: true },
      },
    },
  })

  const counts: Record<JobFilterTab, number> = {
    unscheduled: 0,
    scheduled: 0,
    quoted: 0,
    needs_invoicing: 0,
    awaiting_payment: 0,
    closed: 0,
  }

  for (const job of jobs) {
    const tab = computeJobFilterTab({
      isRecurring: job.isRecurring,
      visits: job.visits.map((v) => ({ status: v.status })),
      quotesInContext: job.quotesInContext.map((q) => ({ status: q.status })),
      quote: job.quote ? { status: job.quote.status } : null,
      invoices: job.invoices.map((inv) => ({ status: inv.status, amountDue: inv.amountDue })),
    })
    counts[tab]++
  }

  return counts
}

// =============================================================================
// 4. getJobSearchResults -- Cross-tab search for the search bar
// =============================================================================

export async function getJobSearchResults(query: string) {
  try {
    const user = await requireAuth()

    if (!query || !query.trim()) {
      return { jobs: [] }
    }

    const words = query.trim().split(/\s+/)

    const where: any = {
      organizationId: user.organizationId,
      AND: words.map((word: string) => ({
        OR: [
          { jobNumber: { contains: word, mode: "insensitive" } },
          { title: { contains: word, mode: "insensitive" } },
          { customer: { firstName: { contains: word, mode: "insensitive" } } },
          { customer: { lastName: { contains: word, mode: "insensitive" } } },
          { quote: { quoteNumber: { contains: word, mode: "insensitive" } } },
          { property: { addressLine1: { contains: word, mode: "insensitive" } } },
          { property: { city: { contains: word, mode: "insensitive" } } },
        ],
      })),
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: jobIncludeForV2,
    })

    const results = jobs.map((job) => {
      const tab = computeJobFilterTab({
        isRecurring: job.isRecurring,
        visits: job.visits.map((v) => ({ status: v.status })),
        quotesInContext: job.quotesInContext.map((q) => ({ status: q.status })),
        quote: job.quote ? { status: job.quote.status } : null,
        invoices: job.invoices.map((inv) => ({ status: inv.status, amountDue: inv.amountDue })),
      })

      return {
        ...serializeJob(job),
        tab,
      }
    })

    return { jobs: results }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getJobSearchResults error:", error)
    return { error: "Failed to search jobs" }
  }
}
