"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { invoiceSchema } from "@/lib/validations"

// =============================================================================
// Types
// =============================================================================

type GetInvoicesParams = {
  status?: string
  search?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  page?: number
  perPage?: number
}

// =============================================================================
// 1. getInvoices - List invoices with filters
// =============================================================================

export async function getInvoices(params: GetInvoicesParams = {}) {
  try {
    const user = await requireAuth()
    const {
      status,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      perPage = 25,
    } = params

    const where: any = { organizationId: user.organizationId, customer: { isArchived: false } }

    if (status === "OUTSTANDING") {
      where.status = { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] }
    } else if (status && status !== "ALL") {
      where.status = status
    }

    // Split on whitespace so multi-word searches like "David Brown" match across fields
    if (search && search.trim()) {
      const words = search.trim().split(/\s+/)
      where.AND = [
        ...(where.AND || []),
        ...words.map((word: string) => ({
          OR: [
            { invoiceNumber: { contains: word, mode: "insensitive" } },
            { customer: { firstName: { contains: word, mode: "insensitive" } } },
            { customer: { lastName: { contains: word, mode: "insensitive" } } },
          ],
        })),
      ]
    }

    const allowedSortFields = ["invoiceNumber", "createdAt", "total", "dueDate", "amountPaid"]
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt"
    const skip = (page - 1) * perPage

    const [total, invoices, statusCounts, summaryData] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        orderBy: { [orderByField]: sortOrder },
        skip,
        take: perPage,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.invoice.groupBy({
        by: ["status"],
        where: { organizationId: user.organizationId, customer: { isArchived: false } },
        _count: true,
      }),
      // Summary aggregations (excluding archived customers)
      Promise.all([
        // Outstanding
        prisma.invoice.aggregate({
          where: {
            organizationId: user.organizationId,
            customer: { isArchived: false },
            status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] },
          },
          _sum: { amountDue: true },
          _count: true,
        }),
        // Overdue
        prisma.invoice.aggregate({
          where: {
            organizationId: user.organizationId,
            customer: { isArchived: false },
            status: "OVERDUE",
          },
          _sum: { amountDue: true },
          _count: true,
        }),
        // Paid this month
        prisma.invoice.aggregate({
          where: {
            organizationId: user.organizationId,
            customer: { isArchived: false },
            status: "PAID",
            paidAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
          _sum: { total: true },
          _count: true,
        }),
      ]),
    ])

    const counts: Record<string, number> = {}
    statusCounts.forEach((s) => {
      counts[s.status] = s._count
    })

    const [outstanding, overdue, paidThisMonth] = summaryData

    return {
      invoices: invoices.map((i) => ({
        ...i,
        total: Number(i.total),
        amountPaid: Number(i.amountPaid),
        amountDue: Number(i.amountDue),
        subtotal: Number(i.subtotal),
        taxAmount: Number(i.taxAmount),
        discountAmount: Number(i.discountAmount),
      })),
      total,
      page,
      totalPages: Math.ceil(total / perPage),
      statusCounts: counts,
      summary: {
        outstanding: Number(outstanding._sum.amountDue || 0),
        outstandingCount: outstanding._count,
        overdue: Number(overdue._sum.amountDue || 0),
        overdueCount: overdue._count,
        paidThisMonth: Number(paidThisMonth._sum.total || 0),
      },
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getInvoices error:", error)
    return { error: "Failed to fetch invoices" }
  }
}

// =============================================================================
// 2. getInvoice - Get single invoice
// =============================================================================

export async function getInvoice(id: string) {
  try {
    const user = await requireAuth()

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        customer: { include: { properties: true } },
        job: { select: { id: true, jobNumber: true, title: true } },
        lineItems: { orderBy: { sortOrder: "asc" } },
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!invoice) return { error: "Invoice not found" }

    return {
      invoice: {
        ...invoice,
        total: Number(invoice.total),
        subtotal: Number(invoice.subtotal),
        taxAmount: Number(invoice.taxAmount),
        amountPaid: Number(invoice.amountPaid),
        amountDue: Number(invoice.amountDue),
        discountAmount: Number(invoice.discountAmount),
        discountValue: invoice.discountValue ? Number(invoice.discountValue) : null,
        lineItems: invoice.lineItems.map((li) => ({
          ...li,
          quantity: Number(li.quantity),
          unitPrice: Number(li.unitPrice),
          total: Number(li.total),
        })),
        payments: invoice.payments.map((p) => ({
          ...p,
          amount: Number(p.amount),
        })),
      },
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getInvoice error:", error)
    return { error: "Failed to fetch invoice" }
  }
}

// =============================================================================
// 3. createInvoice - Create a new invoice
// =============================================================================

export async function createInvoice(data: {
  customerId: string
  jobId?: string
  lineItems: {
    serviceId?: string
    name: string
    description?: string
    quantity: number
    unitPrice: number
    taxable: boolean
  }[]
  discountType?: string
  discountValue?: number
  customerNote?: string
  internalNote?: string
  dueDate: string | Date
}) {
  try {
    const user = await requireAuth()

    const result = invoiceSchema.safeParse(data)
    if (!result.success) {
      return { error: result.error.issues[0].message }
    }

    // Verify customer
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, organizationId: user.organizationId },
    })
    if (!customer) return { error: "Customer not found" }

    // Get org settings
    const org = await prisma.organization.update({
      where: { id: user.organizationId },
      data: { nextInvoiceNum: { increment: 1 } },
      select: { nextInvoiceNum: true, invoicePrefix: true, taxRate: true },
    })
    const invoiceNumber = `${org.invoicePrefix}-${org.nextInvoiceNum - 1}`
    const taxRate = Number(org.taxRate)

    // Calculate totals
    let subtotal = 0
    let taxableAmount = 0
    const lineItemsData = data.lineItems.map((li, index) => {
      const total = li.quantity * li.unitPrice
      subtotal += total
      if (li.taxable) taxableAmount += total
      return {
        serviceId: li.serviceId || null,
        name: li.name,
        description: li.description || null,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        total: total,
        taxable: li.taxable,
        sortOrder: index,
      }
    })

    // Calculate discount
    let discountAmount = 0
    if (data.discountType && data.discountValue) {
      if (data.discountType === "percentage") {
        discountAmount = subtotal * (data.discountValue / 100)
      } else {
        discountAmount = data.discountValue
      }
    }

    const afterDiscount = subtotal - discountAmount
    const taxableAfterDiscount = Math.max(0, taxableAmount - discountAmount)
    const taxAmount = taxableAfterDiscount * taxRate
    const total = afterDiscount + taxAmount

    const invoice = await prisma.invoice.create({
      data: {
        organizationId: user.organizationId,
        customerId: data.customerId,
        jobId: data.jobId || null,
        invoiceNumber,
        status: "DRAFT",
        subtotal: subtotal,
        discountType: data.discountType || null,
        discountValue: data.discountValue ? data.discountValue : null,
        discountAmount: discountAmount,
        taxAmount: taxAmount,
        total: total,
        amountPaid: 0,
        amountDue: total,
        dueDate: new Date(data.dueDate),
        customerNote: data.customerNote || null,
        internalNote: data.internalNote || null,
        lineItems: { create: lineItemsData },
      },
      include: { lineItems: true },
    })

    return { invoice: { ...invoice, total: Number(invoice.total) } }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("createInvoice error:", error)
    return { error: "Failed to create invoice" }
  }
}

// =============================================================================
// 4. sendInvoice - Send invoice to customer
// =============================================================================

export async function sendInvoice(id: string, options?: { email?: boolean; sms?: boolean }) {
  try {
    const user = await requireAuth()

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { customer: true },
    })
    if (!invoice) return { error: "Invoice not found" }
    if (!["DRAFT", "SENT", "VIEWED", "OVERDUE"].includes(invoice.status)) {
      return { error: "Invoice cannot be sent in its current status" }
    }

    const newStatus = invoice.status === "DRAFT" ? "SENT" : invoice.status
    await prisma.invoice.update({
      where: { id },
      data: {
        status: newStatus,
        sentAt: invoice.sentAt || new Date(),
      },
    })

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true, slug: true },
    })

    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${org?.slug}/invoices/${invoice.accessToken}`

    let emailSent = false
    const errors: string[] = []

    const { isNotificationEnabled } = await import("@/lib/notification-check")

    // Send email
    if (await isNotificationEnabled(user.organizationId, "invoice_sent", "email")) {
      if (options?.email !== false && invoice.customer.email && process.env.SENDGRID_API_KEY) {
        try {
          const sgMail = await import("@sendgrid/mail")
          sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)
          await sgMail.default.send({
            to: invoice.customer.email,
            from: {
              email: process.env.SENDGRID_FROM_EMAIL || "noreply@jobstream.app",
              name: org?.name || "JobStream",
            },
            subject: `Invoice from ${org?.name || "JobStream"}`,
            html: `
              <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
                <h2>Hi ${invoice.customer.firstName},</h2>
                <p>${org?.name} has sent you an invoice for <strong>$${Number(invoice.total).toFixed(2)}</strong>.</p>
                <p>Due by ${new Date(invoice.dueDate).toLocaleDateString()}</p>
                <a href="${portalUrl}" style="display: inline-block; background: #635BFF; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">View & Pay Invoice</a>
              </div>
            `,
          })

          emailSent = true

          await prisma.communicationLog.create({
            data: {
              organizationId: user.organizationId,
              customerId: invoice.customerId,
              type: "EMAIL",
              direction: "OUTBOUND",
              recipientAddress: invoice.customer.email,
              subject: `Invoice from ${org?.name}`,
              content: `Invoice ${invoice.invoiceNumber} sent for $${Number(invoice.total).toFixed(2)}`,
              status: "SENT",
              triggeredBy: "manual",
            },
          })
        } catch (e: any) {
          console.error("Failed to send invoice email:", e)
          errors.push(`Email failed: ${e?.message || "Unknown error"}`)
        }
      } else if (options?.email !== false && invoice.customer.email && !process.env.SENDGRID_API_KEY) {
        errors.push("Email not configured: SendGrid API key is missing")
      }
    }

    return { success: true, emailSent, errors }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("sendInvoice error:", error)
    return { error: "Failed to send invoice" }
  }
}

// =============================================================================
// 5. recordPayment - Record a manual payment
// =============================================================================

export async function recordPayment(data: {
  invoiceId: string
  amount: number
  method: string
  reference?: string
  notes?: string
  date?: string | Date
}) {
  try {
    const user = await requireAuth()

    const invoice = await prisma.invoice.findFirst({
      where: { id: data.invoiceId, organizationId: user.organizationId },
    })
    if (!invoice) return { error: "Invoice not found" }
    if (invoice.status === "PAID" || invoice.status === "VOID") {
      return { error: "Invoice is already paid or voided" }
    }

    if (data.amount <= 0) return { error: "Amount must be greater than 0" }
    if (data.amount > Number(invoice.amountDue)) {
      return { error: "Amount exceeds the remaining balance" }
    }

    const newAmountPaid = Number(invoice.amountPaid) + data.amount
    const newAmountDue = Number(invoice.total) - newAmountPaid
    const newStatus = newAmountDue <= 0 ? "PAID" : "PARTIALLY_PAID"

    await prisma.$transaction([
      prisma.payment.create({
        data: {
          organizationId: user.organizationId,
          invoiceId: data.invoiceId,
          amount: data.amount,
          method: data.method as any,
          status: "COMPLETED",
          reference: data.reference || null,
          notes: data.notes || null,
          processedAt: data.date ? new Date(data.date) : new Date(),
        },
      }),
      prisma.invoice.update({
        where: { id: data.invoiceId },
        data: {
          amountPaid: newAmountPaid,
          amountDue: Math.max(0, newAmountDue),
          status: newStatus,
          paidAt: newStatus === "PAID" ? new Date() : undefined,
        },
      }),
    ])

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("recordPayment error:", error)
    return { error: "Failed to record payment" }
  }
}

// =============================================================================
// 6. voidInvoice - Void an invoice
// =============================================================================

export async function voidInvoice(id: string) {
  try {
    const user = await requireAuth()

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: user.organizationId },
    })
    if (!invoice) return { error: "Invoice not found" }
    if (invoice.status === "VOID") return { error: "Invoice is already voided" }

    await prisma.invoice.update({
      where: { id },
      data: { status: "VOID" },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    return { error: "Failed to void invoice" }
  }
}

// =============================================================================
// 7. getInvoiceByToken - Public access for portal
// =============================================================================

export async function getInvoiceByToken(token: string) {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { accessToken: token },
      include: {
        customer: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
        lineItems: { orderBy: { sortOrder: "asc" } },
        payments: { orderBy: { createdAt: "desc" } },
        organization: {
          select: { name: true, email: true, phone: true, logo: true, slug: true, stripeAccountId: true, stripeOnboarded: true },
        },
      },
    })

    if (!invoice) return { error: "Invoice not found" }

    // Mark as viewed if currently SENT
    if (invoice.status === "SENT") {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "VIEWED", viewedAt: new Date() },
      })
    }

    return {
      invoice: {
        ...invoice,
        issueDate: invoice.sentAt || invoice.createdAt,
        total: Number(invoice.total),
        subtotal: Number(invoice.subtotal),
        taxAmount: Number(invoice.taxAmount),
        amountPaid: Number(invoice.amountPaid),
        amountDue: Number(invoice.amountDue),
        discountAmount: Number(invoice.discountAmount),
        discountValue: invoice.discountValue ? Number(invoice.discountValue) : null,
        lineItems: invoice.lineItems.map((li) => ({
          ...li,
          quantity: Number(li.quantity),
          unitPrice: Number(li.unitPrice),
          total: Number(li.total),
        })),
        payments: invoice.payments.map((p) => ({
          ...p,
          amount: Number(p.amount),
        })),
      },
    }
  } catch (error: any) {
    console.error("getInvoiceByToken error:", error)
    return { error: "Failed to fetch invoice" }
  }
}

// =============================================================================
// 7b. verifyStripePayment - Verify a Stripe checkout session and record payment
// =============================================================================

export async function verifyStripePayment(
  invoiceToken: string,
  sessionId: string
) {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { accessToken: invoiceToken },
      include: {
        organization: {
          select: { stripeAccountId: true },
        },
      },
    })

    if (!invoice || !invoice.organization.stripeAccountId) {
      return { verified: false }
    }

    // Check if this payment was already recorded (idempotency)
    const existingPayment = await prisma.payment.findFirst({
      where: {
        invoiceId: invoice.id,
        reference: { contains: sessionId },
      },
    })

    if (existingPayment) {
      // Already recorded (by webhook or previous verification)
      return { verified: true }
    }

    // Retrieve the checkout session from the connected Stripe account
    const { getStripe } = await import("@/lib/stripe")
    const stripe = getStripe()
    if (!stripe) return { verified: false }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      stripeAccount: invoice.organization.stripeAccountId,
    })

    if (session.payment_status !== "paid") {
      return { verified: false }
    }

    const amountPaid = (session.amount_total || 0) / 100
    const newAmountPaid = Number(invoice.amountPaid) + amountPaid
    const newAmountDue = Math.max(0, Number(invoice.total) - newAmountPaid)
    const isPaid = newAmountDue <= 0

    await prisma.$transaction([
      prisma.payment.create({
        data: {
          organizationId: invoice.organizationId,
          invoiceId: invoice.id,
          amount: amountPaid,
          method: "CARD",
          status: "COMPLETED",
          reference: `stripe:${session.payment_intent || session.id}`,
          processedAt: new Date(),
        },
      }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          status: isPaid ? "PAID" : "PARTIALLY_PAID",
          paidAt: isPaid ? new Date() : undefined,
        },
      }),
    ])

    // Notify the org owner
    const orgOwner = await prisma.user.findFirst({
      where: { organizationId: invoice.organizationId, role: "OWNER" },
      select: { id: true },
    })

    if (orgOwner) {
      await prisma.notification.create({
        data: {
          organizationId: invoice.organizationId,
          userId: orgOwner.id,
          title: "Payment Received",
          message: `Online payment of $${amountPaid.toFixed(2)} received for invoice ${invoice.invoiceNumber}`,
          linkUrl: `/invoices/${invoice.id}`,
        },
      })
    }

    return { verified: true }
  } catch (error: any) {
    console.error("verifyStripePayment error:", error)
    return { verified: false }
  }
}

// =============================================================================
// 8. adjustInvoiceTotal - Adjust the total on an invoice (e.g. agreed discount)
// =============================================================================

export async function adjustInvoiceTotal(data: {
  invoiceId: string
  newTotal: number
  reason?: string
}) {
  try {
    const user = await requireAuth()

    const invoice = await prisma.invoice.findFirst({
      where: { id: data.invoiceId, organizationId: user.organizationId },
    })
    if (!invoice) return { error: "Invoice not found" }

    if (invoice.status === "VOID") {
      return { error: "Cannot adjust a voided invoice" }
    }
    if (invoice.status === "PAID") {
      return { error: "Cannot adjust a fully paid invoice" }
    }

    if (data.newTotal < 0) {
      return { error: "Total cannot be negative" }
    }

    const amountPaid = Number(invoice.amountPaid)

    if (data.newTotal < amountPaid) {
      return {
        error: `New total cannot be less than the amount already paid (${amountPaid.toFixed(2)})`,
      }
    }

    const newAmountDue = data.newTotal - amountPaid
    const newStatus = newAmountDue <= 0 ? "PAID" : invoice.status

    await prisma.invoice.update({
      where: { id: data.invoiceId },
      data: {
        total: data.newTotal,
        amountDue: Math.max(0, newAmountDue),
        status: newStatus,
        paidAt: newStatus === "PAID" ? new Date() : undefined,
        internalNote: data.reason
          ? [invoice.internalNote, `[Total adjusted to $${data.newTotal.toFixed(2)}: ${data.reason}]`]
              .filter(Boolean)
              .join("\n")
          : invoice.internalNote,
      },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("adjustInvoiceTotal error:", error)
    return { error: "Failed to adjust invoice total" }
  }
}

// =============================================================================
// 9. createInvoiceFromJob - Pre-fill invoice from a completed job
// =============================================================================

export async function createInvoiceFromJob(jobId: string) {
  try {
    const user = await requireAuth()

    const job = await prisma.job.findFirst({
      where: { id: jobId, organizationId: user.organizationId },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
        customer: true,
      },
    })
    if (!job) return { error: "Job not found" }

    // Get org settings
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { taxRate: true, invoiceDueDays: true },
    })

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (org?.invoiceDueDays || 30))

    // Return pre-fill data (don't create the invoice yet - let the user review)
    return {
      prefill: {
        customerId: job.customerId,
        jobId: job.id,
        lineItems: job.lineItems.map((li) => ({
          serviceId: li.serviceId,
          name: li.name,
          description: li.description,
          quantity: Number(li.quantity),
          unitPrice: Number(li.unitPrice),
          taxable: li.taxable,
        })),
        dueDate: dueDate.toISOString(),
      },
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    return { error: "Failed to prepare invoice from job" }
  }
}

// =============================================================================
// 10. sendInvoiceReminder - Send a payment reminder for an outstanding invoice
// =============================================================================

export async function createAndSendInvoiceFromJob(
  jobId: string,
  organizationId: string
): Promise<{ invoiceId?: string; skipped?: boolean; error?: string }> {
  try {
    // Check if an invoice already exists for this job (prevent duplicates)
    const existingInvoice = await prisma.invoice.findFirst({
      where: { jobId, organizationId },
    })
    if (existingInvoice) {
      return { invoiceId: existingInvoice.id }
    }

    // Look up the job with line items and customer
    const job = await prisma.job.findFirst({
      where: { id: jobId, organizationId },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
        customer: true,
      },
    })
    if (!job) return { error: "Job not found" }

    // Check if job has line items with total > 0
    if (!job.lineItems.length) return { skipped: true }
    const lineItemsTotal = job.lineItems.reduce(
      (sum, li) => sum + Number(li.quantity) * Number(li.unitPrice),
      0
    )
    if (lineItemsTotal <= 0) return { skipped: true }

    // Get org settings
    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: { nextInvoiceNum: { increment: 1 } },
      select: {
        nextInvoiceNum: true,
        invoicePrefix: true,
        taxRate: true,
        invoiceDueDays: true,
        name: true,
        slug: true,
      },
    })
    const invoiceNumber = `${org.invoicePrefix}-${org.nextInvoiceNum - 1}`
    const taxRate = Number(org.taxRate)

    // Calculate totals (same pattern as createInvoice)
    let subtotal = 0
    let taxableAmount = 0
    const lineItemsData = job.lineItems.map((li, index) => {
      const total = Number(li.quantity) * Number(li.unitPrice)
      subtotal += total
      if (li.taxable) taxableAmount += total
      return {
        serviceId: li.serviceId || null,
        name: li.name,
        description: li.description || null,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
        total: total,
        taxable: li.taxable,
        sortOrder: index,
      }
    })

    const taxAmount = taxableAmount * taxRate
    const total = subtotal + taxAmount

    // Calculate due date
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (org.invoiceDueDays || 30))

    // Create the invoice with status SENT (not DRAFT) since it's auto-generated
    const invoice = await prisma.invoice.create({
      data: {
        organizationId,
        customerId: job.customerId,
        jobId: job.id,
        invoiceNumber,
        status: "SENT",
        subtotal,
        taxAmount,
        total,
        amountPaid: 0,
        amountDue: total,
        dueDate,
        sentAt: new Date(),
        internalNote: `Auto-created from job ${job.jobNumber} on completion`,
        lineItems: { create: lineItemsData },
      },
    })

    // Send email via SendGrid if customer has email and SENDGRID_API_KEY is set
    const { isNotificationEnabled } = await import("@/lib/notification-check")

    if (await isNotificationEnabled(organizationId, "invoice_sent", "email")) {
      if (job.customer.email && process.env.SENDGRID_API_KEY) {
        try {
          const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${org.slug}/invoices/${invoice.accessToken}`

          const sgMail = await import("@sendgrid/mail")
          sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)
          await sgMail.default.send({
            to: job.customer.email,
            from: {
              email: process.env.SENDGRID_FROM_EMAIL || "noreply@jobstream.app",
              name: org.name || "JobStream",
            },
            subject: `Invoice from ${org.name || "JobStream"}`,
            html: `
              <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
                <h2>Hi ${job.customer.firstName},</h2>
                <p>${org.name} has sent you an invoice for <strong>$${total.toFixed(2)}</strong>.</p>
                <p>Due by ${dueDate.toLocaleDateString()}</p>
                <a href="${portalUrl}" style="display: inline-block; background: #635BFF; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">View & Pay Invoice</a>
              </div>
            `,
          })

          // Log the communication
          await prisma.communicationLog.create({
            data: {
              organizationId,
              customerId: job.customerId,
              type: "EMAIL",
              direction: "OUTBOUND",
              recipientAddress: job.customer.email,
              subject: `Invoice from ${org.name}`,
              content: `Auto-invoice ${invoiceNumber} sent for $${total.toFixed(2)} (Job ${job.jobNumber} completed)`,
              status: "SENT",
              triggeredBy: "auto_invoice",
            },
          })
        } catch (e: any) {
          console.error("Failed to send auto-invoice email:", e)
          // Don't fail the whole operation if email fails
        }
      }
    }

    // Create notification for org owner
    const orgOwner = await prisma.user.findFirst({
      where: { organizationId, role: "OWNER" },
      select: { id: true },
    })

    if (orgOwner) {
      await prisma.notification.create({
        data: {
          organizationId,
          userId: orgOwner.id,
          title: "Invoice Auto-Created",
          message: `Invoice #${invoiceNumber} auto-created for Job #${job.jobNumber}`,
          linkUrl: `/invoices/${invoice.id}`,
        },
      })
    }

    return { invoiceId: invoice.id }
  } catch (error: any) {
    console.error("createAndSendInvoiceFromJob error:", error)
    return { error: "Failed to auto-create invoice from job" }
  }
}

// =============================================================================
// 10. sendInvoiceReminder - Send a payment reminder for an outstanding invoice
// =============================================================================

export async function sendInvoiceReminder(id: string) {
  try {
    const user = await requireAuth()

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { customer: true },
    })

    if (!invoice) return { error: "Invoice not found" }

    if (!["SENT", "VIEWED", "OVERDUE", "PARTIALLY_PAID"].includes(invoice.status)) {
      return { error: "Cannot send reminder for this invoice" }
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true, slug: true },
    })

    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${org?.slug}/invoices/${invoice.accessToken}`
    const daysOverdue = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      )
    )

    const { isNotificationEnabled } = await import("@/lib/notification-check")

    if (await isNotificationEnabled(user.organizationId, "invoice_reminder", "email")) {
      if (
        invoice.customer.email &&
        process.env.SENDGRID_API_KEY
      ) {
        try {
          const sgMail = await import("@sendgrid/mail")
          sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)
          await sgMail.default.send({
            to: invoice.customer.email,
            from: {
              email: process.env.SENDGRID_FROM_EMAIL || "noreply@jobstream.app",
              name: org?.name || "JobStream",
            },
            subject: `Payment Reminder: Invoice ${invoice.invoiceNumber}`,
            html: `<div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
              <h2>Hi ${invoice.customer.firstName},</h2>
              <p>This is a friendly reminder that invoice <strong>${invoice.invoiceNumber}</strong> for <strong>$${Number(invoice.amountDue).toFixed(2)}</strong> is ${daysOverdue > 0 ? `${daysOverdue} days past due` : "due soon"}.</p>
              <p>Please take a moment to review and submit payment.</p>
              <a href="${portalUrl}" style="display: inline-block; background: #635BFF; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">View & Pay Invoice</a>
              <p style="color: #8898AA; font-size: 12px;">If you've already submitted payment, please disregard this message.</p>
            </div>`,
          })
        } catch (e) {
          console.error("Failed to send reminder email:", e)
        }
      } else {
        console.log(`[DEV] Reminder would be sent to: ${invoice.customer.email}`)
      }

      await prisma.communicationLog.create({
        data: {
          organizationId: user.organizationId,
          customerId: invoice.customerId,
          type: "EMAIL",
          direction: "OUTBOUND",
          recipientAddress: invoice.customer.email || "",
          subject: `Payment Reminder: Invoice ${invoice.invoiceNumber}`,
          content: `Payment reminder for $${Number(invoice.amountDue).toFixed(2)}`,
          status: process.env.SENDGRID_API_KEY ? "SENT" : "QUEUED",
          triggeredBy: "reminder",
        },
      })
    }

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("sendInvoiceReminder error:", error)
    return { error: "Failed to send reminder" }
  }
}

// =============================================================================
// 11. getInvoicesV2 - Invoice list with 6 tab filters for v2 UI
// =============================================================================

type InvoiceTab = "draft" | "sent" | "overdue" | "partially_paid" | "paid" | "cancelled"

const TAB_STATUS_MAP: Record<InvoiceTab, string[]> = {
  draft: ["DRAFT"],
  sent: ["SENT", "VIEWED"],
  overdue: ["OVERDUE"],
  partially_paid: ["PARTIALLY_PAID"],
  paid: ["PAID"],
  cancelled: ["VOID"],
}

export async function getInvoicesV2(params: {
  tab: InvoiceTab
  search?: string
  page?: number
  perPage?: number
}) {
  try {
    const user = await requireAuth()
    const { tab, search, page = 1, perPage = 25 } = params

    const statuses = TAB_STATUS_MAP[tab]
    const where: any = {
      organizationId: user.organizationId,
      customer: { isArchived: false },
      status: { in: statuses },
    }

    // Split on whitespace so multi-word searches match across fields
    if (search && search.trim()) {
      const words = search.trim().split(/\s+/)
      where.AND = [
        ...(where.AND || []),
        ...words.map((word: string) => ({
          OR: [
            { invoiceNumber: { contains: word, mode: "insensitive" } },
            { customer: { firstName: { contains: word, mode: "insensitive" } } },
            { customer: { lastName: { contains: word, mode: "insensitive" } } },
          ],
        })),
      ]
    }

    const skip = (page - 1) * perPage

    const [total, invoices, statusCounts] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
        include: {
          customer: { select: { id: true, firstName: true, lastName: true } },
          job: { select: { id: true, jobNumber: true } },
          payments: { orderBy: { createdAt: "desc" } },
        },
      }),
      // Get counts per status for all tabs (excluding archived customers)
      prisma.invoice.groupBy({
        by: ["status"],
        where: { organizationId: user.organizationId, customer: { isArchived: false } },
        _count: true,
      }),
    ])

    // Build tab counts from status group-by
    const rawCounts: Record<string, number> = {}
    statusCounts.forEach((s) => {
      rawCounts[s.status] = s._count
    })

    const tabCounts: Record<InvoiceTab, number> = {
      draft: rawCounts.DRAFT ?? 0,
      sent: (rawCounts.SENT ?? 0) + (rawCounts.VIEWED ?? 0),
      overdue: rawCounts.OVERDUE ?? 0,
      partially_paid: rawCounts.PARTIALLY_PAID ?? 0,
      paid: rawCounts.PAID ?? 0,
      cancelled: rawCounts.VOID ?? 0,
    }

    return {
      invoices: invoices.map((i) => ({
        ...i,
        total: Number(i.total),
        amountPaid: Number(i.amountPaid),
        amountDue: Number(i.amountDue),
        subtotal: Number(i.subtotal),
        taxAmount: Number(i.taxAmount),
        discountAmount: Number(i.discountAmount),
        payments: i.payments.map((p) => ({
          ...p,
          amount: Number(p.amount),
        })),
      })),
      total,
      page,
      totalPages: Math.ceil(total / perPage),
      tabCounts,
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getInvoicesV2 error:", error)
    return { error: "Failed to fetch invoices" }
  }
}
