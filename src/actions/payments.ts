"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"

// =============================================================================
// Types
// =============================================================================

type GetPaymentsParams = {
  dateFrom?: string
  dateTo?: string
  method?: string
  status?: string
  search?: string
  page?: number
  perPage?: number
}

// =============================================================================
// 1. getPayments - List payments with filters and summary stats
// =============================================================================

export async function getPayments(params: GetPaymentsParams = {}) {
  try {
    const user = await requireAuth()
    const {
      dateFrom,
      dateTo,
      method,
      status,
      search,
      page = 1,
      perPage = 25,
    } = params

    const where: any = { organizationId: user.organizationId }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(dateTo)
    }

    if (method && method !== "ALL") {
      where.method = method
    }

    if (status && status !== "ALL") {
      where.status = status
    }

    if (search && search.trim()) {
      where.OR = [
        { reference: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        { invoice: { invoiceNumber: { contains: search, mode: "insensitive" } } },
        { invoice: { customer: { firstName: { contains: search, mode: "insensitive" } } } },
        { invoice: { customer: { lastName: { contains: search, mode: "insensitive" } } } },
      ]
    }

    const skip = (page - 1) * perPage

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    const [total, payments, receivedThisMonth, receivedLastMonth, outstanding, overdue] =
      await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: perPage,
          include: {
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                total: true,
                customer: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
          },
        }),
        // Received this month
        prisma.payment.aggregate({
          where: {
            organizationId: user.organizationId,
            status: "COMPLETED",
            createdAt: { gte: thisMonthStart },
          },
          _sum: { amount: true },
        }),
        // Received last month
        prisma.payment.aggregate({
          where: {
            organizationId: user.organizationId,
            status: "COMPLETED",
            createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
          },
          _sum: { amount: true },
        }),
        // Outstanding (sum of unpaid invoices)
        prisma.invoice.aggregate({
          where: {
            organizationId: user.organizationId,
            status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] },
          },
          _sum: { amountDue: true },
        }),
        // Overdue (sum of overdue invoices)
        prisma.invoice.aggregate({
          where: {
            organizationId: user.organizationId,
            status: "OVERDUE",
          },
          _sum: { amountDue: true },
        }),
      ])

    return {
      payments: payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
        invoice: p.invoice
          ? {
              ...p.invoice,
              total: Number(p.invoice.total),
            }
          : null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / perPage),
      summary: {
        receivedThisMonth: Number(receivedThisMonth._sum.amount || 0),
        receivedLastMonth: Number(receivedLastMonth._sum.amount || 0),
        outstanding: Number(outstanding._sum.amountDue || 0),
        overdue: Number(overdue._sum.amountDue || 0),
      },
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getPayments error:", error)
    return { error: "Failed to fetch payments" }
  }
}

// =============================================================================
// 2. getPaymentStats - Get payment summary statistics for the dashboard
// =============================================================================

export async function getPaymentStats() {
  try {
    const user = await requireAuth()

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    const [receivedThisMonth, receivedLastMonth, outstanding, overdue] =
      await Promise.all([
        prisma.payment.aggregate({
          where: {
            organizationId: user.organizationId,
            status: "COMPLETED",
            createdAt: { gte: thisMonthStart },
          },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: {
            organizationId: user.organizationId,
            status: "COMPLETED",
            createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
          },
          _sum: { amount: true },
        }),
        prisma.invoice.aggregate({
          where: {
            organizationId: user.organizationId,
            status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] },
          },
          _sum: { amountDue: true },
        }),
        prisma.invoice.aggregate({
          where: {
            organizationId: user.organizationId,
            status: "OVERDUE",
          },
          _sum: { amountDue: true },
        }),
      ])

    return {
      stats: {
        receivedThisMonth: Number(receivedThisMonth._sum.amount || 0),
        receivedLastMonth: Number(receivedLastMonth._sum.amount || 0),
        outstanding: Number(outstanding._sum.amountDue || 0),
        overdue: Number(overdue._sum.amountDue || 0),
      },
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getPaymentStats error:", error)
    return { error: "Failed to fetch payment stats" }
  }
}
