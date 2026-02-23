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

    // Split on whitespace so multi-word searches like "David Brown" match across fields
    if (search && search.trim()) {
      const words = search.trim().split(/\s+/)
      where.AND = [
        ...(where.AND || []),
        ...words.map((word: string) => ({
          OR: [
            { reference: { contains: word, mode: "insensitive" } },
            { notes: { contains: word, mode: "insensitive" } },
            { invoice: { invoiceNumber: { contains: word, mode: "insensitive" } } },
            { invoice: { customer: { firstName: { contains: word, mode: "insensitive" } } } },
            { invoice: { customer: { lastName: { contains: word, mode: "insensitive" } } } },
          ],
        })),
      ]
    }

    const skip = (page - 1) * perPage

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [total, payments, receivedThisMonth, outstanding, overdue] =
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

    const [receivedThisMonth, outstanding, overdue] =
      await Promise.all([
        prisma.payment.aggregate({
          where: {
            organizationId: user.organizationId,
            status: "COMPLETED",
            createdAt: { gte: thisMonthStart },
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

// =============================================================================
// 3. getOutstandingInvoices - Fetch invoices that still have a balance due
// =============================================================================

export async function getOutstandingInvoices() {
  try {
    const user = await requireAuth()
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId: user.organizationId,
        status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] },
      },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        amountPaid: true,
        amountDue: true,
        customer: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })
    return {
      invoices: invoices.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        total: Number(i.total),
        amountPaid: Number(i.amountPaid),
        amountDue: Number(i.amountDue),
        customerName: `${i.customer.firstName} ${i.customer.lastName}`,
      })),
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    return { error: "Failed to fetch outstanding invoices" }
  }
}

// =============================================================================
// 4. updatePayment - Edit a manual (non-Stripe) payment
// =============================================================================

export async function updatePayment(
  id: string,
  data: {
    amount?: number
    method?: string
    reference?: string | null
    notes?: string | null
  }
) {
  try {
    const user = await requireAuth()

    const payment = await prisma.payment.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { invoice: true },
    })
    if (!payment) return { error: "Payment not found" }
    if (payment.stripePaymentId) return { error: "Cannot edit Stripe payments" }

    const oldAmount = Number(payment.amount)
    const newAmount = data.amount ?? oldAmount
    const amountDiff = newAmount - oldAmount

    const invoice = payment.invoice
    const newInvoiceAmountPaid = Number(invoice.amountPaid) + amountDiff
    const newInvoiceAmountDue = Number(invoice.total) - newInvoiceAmountPaid

    // Validate: new amount must be positive and not exceed what's available
    if (newAmount <= 0) return { error: "Amount must be greater than 0" }
    if (newInvoiceAmountDue < 0) return { error: "Amount exceeds the remaining balance" }

    const newInvoiceStatus =
      newInvoiceAmountDue <= 0
        ? ("PAID" as const)
        : newInvoiceAmountPaid > 0
          ? ("PARTIALLY_PAID" as const)
          : ("SENT" as const)

    await prisma.$transaction([
      prisma.payment.update({
        where: { id },
        data: {
          amount: newAmount,
          method: (data.method as any) ?? payment.method,
          reference: data.reference !== undefined ? data.reference : payment.reference,
          notes: data.notes !== undefined ? data.notes : payment.notes,
        },
      }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: Math.max(0, newInvoiceAmountPaid),
          amountDue: Math.max(0, newInvoiceAmountDue),
          status: newInvoiceStatus,
          paidAt: newInvoiceStatus === "PAID" ? new Date() : null,
        },
      }),
    ])

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("updatePayment error:", error)
    return { error: "Failed to update payment" }
  }
}

// =============================================================================
// 5. deletePayment - Delete a manual (non-Stripe) payment
// =============================================================================

export async function deletePayment(id: string) {
  try {
    const user = await requireAuth()

    const payment = await prisma.payment.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { invoice: true },
    })
    if (!payment) return { error: "Payment not found" }
    if (payment.stripePaymentId) return { error: "Cannot delete Stripe payments" }

    const invoice = payment.invoice
    const paymentAmount = Number(payment.amount)
    const newInvoiceAmountPaid = Math.max(0, Number(invoice.amountPaid) - paymentAmount)
    const newInvoiceAmountDue = Number(invoice.total) - newInvoiceAmountPaid

    const newInvoiceStatus =
      newInvoiceAmountDue <= 0
        ? ("PAID" as const)
        : newInvoiceAmountPaid > 0
          ? ("PARTIALLY_PAID" as const)
          : ("SENT" as const)

    await prisma.$transaction([
      prisma.payment.delete({ where: { id } }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: Math.max(0, newInvoiceAmountPaid),
          amountDue: Math.max(0, newInvoiceAmountDue),
          status: newInvoiceStatus,
          paidAt: newInvoiceStatus === "PAID" ? new Date() : null,
        },
      }),
    ])

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("deletePayment error:", error)
    return { error: "Failed to delete payment" }
  }
}
