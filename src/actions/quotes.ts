"use server"

import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { quoteSchema } from "@/lib/validations"

// =============================================================================
// Types
// =============================================================================

type GetQuotesParams = {
  status?: string
  search?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  page?: number
  perPage?: number
}

// =============================================================================
// 1. getQuotes - List quotes with filters, search, sort, pagination
// =============================================================================

export async function getQuotes(params: GetQuotesParams = {}) {
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

    const where: any = {
      organizationId: user.organizationId,
      customer: { isArchived: false },
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
            { quoteNumber: { contains: word, mode: "insensitive" } },
            { customer: { firstName: { contains: word, mode: "insensitive" } } },
            { customer: { lastName: { contains: word, mode: "insensitive" } } },
          ],
        })),
      ]
    }

    const allowedSortFields = ["quoteNumber", "createdAt", "total", "validUntil"]
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt"

    const skip = (page - 1) * perPage

    const [total, quotes, statusCounts] = await Promise.all([
      prisma.quote.count({ where }),
      prisma.quote.findMany({
        where,
        orderBy: { [orderByField]: sortOrder },
        skip,
        take: perPage,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      // Get counts per status (excluding archived customers)
      prisma.quote.groupBy({
        by: ["status"],
        where: { organizationId: user.organizationId, customer: { isArchived: false } },
        _count: true,
      }),
    ])

    const counts: Record<string, number> = {}
    statusCounts.forEach((s) => {
      counts[s.status] = s._count
    })

    return {
      quotes: quotes.map((q) => ({
        ...q,
        total: Number(q.total),
        subtotal: Number(q.subtotal),
        taxAmount: Number(q.taxAmount),
      })),
      total,
      page,
      totalPages: Math.ceil(total / perPage),
      statusCounts: counts,
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getQuotes error:", error)
    return { error: "Failed to fetch quotes" }
  }
}

// =============================================================================
// 2. getQuote - Get single quote with all relations
// =============================================================================

export async function getQuote(id: string) {
  try {
    const user = await requireAuth()

    const quote = await prisma.quote.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        customer: {
          include: {
            properties: true,
          },
        },
        property: true,
        lineItems: {
          orderBy: { sortOrder: "asc" },
        },
        options: {
          include: { lineItems: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    if (!quote) {
      return { error: "Quote not found" }
    }

    // If quote is invoiced, fetch the linked invoice number for display
    let linkedInvoiceId: string | null = null
    let linkedInvoiceNumber: string | null = null
    const linkedInvoice = await prisma.invoice.findFirst({
      where: { quoteId: quote.id },
      select: { id: true, invoiceNumber: true },
    })
    if (linkedInvoice) {
      linkedInvoiceId = linkedInvoice.id
      linkedInvoiceNumber = linkedInvoice.invoiceNumber
    }

    return {
      quote: {
        ...quote,
        total: Number(quote.total),
        subtotal: Number(quote.subtotal),
        taxAmount: Number(quote.taxAmount),
        linkedInvoiceId,
        linkedInvoiceNumber,
        lineItems: quote.lineItems.map((li) => ({
          ...li,
          quantity: Number(li.quantity),
          unitPrice: Number(li.unitPrice),
          total: Number(li.total),
        })),
        options: quote.options.map((opt) => ({
          ...opt,
          subtotal: Number(opt.subtotal),
          taxAmount: Number(opt.taxAmount),
          total: Number(opt.total),
          lineItems: opt.lineItems.map((li) => ({
            ...li,
            quantity: Number(li.quantity),
            unitPrice: Number(li.unitPrice),
            total: Number(li.total),
          })),
        })),
      },
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getQuote error:", error)
    return { error: "Failed to fetch quote" }
  }
}

// =============================================================================
// 3. createQuote - Create a new quote with line items
// =============================================================================

export async function createQuote(data: {
  customerId: string
  propertyId?: string
  jobId?: string
  lineItems: {
    serviceId?: string
    name: string
    description?: string
    quantity: number
    unitPrice: number
    taxable: boolean
  }[]
  customerMessage?: string
  internalNote?: string
  validUntil: string | Date
  options?: {
    name: string
    description?: string
    lineItems: {
      serviceId?: string
      name: string
      description?: string
      quantity: number
      unitPrice: number
      taxable: boolean
    }[]
  }[]
}) {
  try {
    const user = await requireAuth()

    // Validate (options are validated separately below)
    const result = quoteSchema.safeParse(data)
    // If options are provided, lineItems may be empty so skip validation errors about lineItems
    if (!result.success && !(data.options && data.options.length > 0)) {
      return { error: result.error.issues[0].message }
    }

    // Validate options if provided
    if (data.options && data.options.length > 0) {
      if (data.options.length > 4) {
        return { error: "A quote can have a maximum of 4 options" }
      }
      for (const opt of data.options) {
        if (!opt.name || opt.name.trim().length === 0) {
          return { error: "Each option must have a name" }
        }
        if (!opt.lineItems || opt.lineItems.length === 0) {
          return { error: `Option "${opt.name}" must have at least one line item` }
        }
      }
    }

    // Verify customer belongs to org
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, organizationId: user.organizationId },
    })
    if (!customer) {
      return { error: "Customer not found" }
    }

    // Get org settings for tax rate and quote number
    const org = await prisma.organization.update({
      where: { id: user.organizationId },
      data: { nextQuoteNum: { increment: 1 } },
      select: { nextQuoteNum: true, quotePrefix: true, taxRate: true, quoteValidDays: true },
    })

    const quoteNumber = `${org.quotePrefix}-${org.nextQuoteNum - 1}`
    const taxRate = Number(org.taxRate)

    // ── Multi-option quote ────────────────────────────────────────────────
    if (data.options && data.options.length > 0) {
      // Calculate per-option totals to find the lowest for "starting from" display
      const optionCalculations = data.options.map((opt, optIndex) => {
        let optSubtotal = 0
        let optTaxable = 0
        const items = opt.lineItems.map((li, liIndex) => {
          const lineTotal = li.quantity * li.unitPrice
          optSubtotal += lineTotal
          if (li.taxable) optTaxable += lineTotal
          return {
            serviceId: li.serviceId || null,
            name: li.name,
            description: li.description || null,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            total: lineTotal,
            taxable: li.taxable,
            sortOrder: liIndex,
          }
        })
        const optTaxAmount = optTaxable * taxRate
        const optTotal = optSubtotal + optTaxAmount
        return {
          name: opt.name,
          description: opt.description || null,
          sortOrder: optIndex,
          subtotal: optSubtotal,
          taxAmount: optTaxAmount,
          total: optTotal,
          items,
        }
      })

      // Quote-level totals = lowest option total (for "starting from" display)
      const lowestOption = optionCalculations.reduce((min, opt) =>
        opt.total < min.total ? opt : min
      )

      const quote = await prisma.$transaction(async (tx) => {
        // Create the quote shell
        const newQuote = await tx.quote.create({
          data: {
            organizationId: user.organizationId,
            customerId: data.customerId,
            propertyId: data.propertyId || null,
            jobId: data.jobId || null,
            quoteNumber,
            status: "DRAFT",
            subtotal: lowestOption.subtotal,
            taxAmount: lowestOption.taxAmount,
            total: lowestOption.total,
            validUntil: new Date(data.validUntil),
            customerMessage: data.customerMessage || null,
            internalNote: data.internalNote || null,
          },
        })

        // Create each option with its line items
        for (const optCalc of optionCalculations) {
          const option = await tx.quoteOption.create({
            data: {
              quoteId: newQuote.id,
              name: optCalc.name,
              description: optCalc.description,
              subtotal: optCalc.subtotal,
              taxAmount: optCalc.taxAmount,
              total: optCalc.total,
              sortOrder: optCalc.sortOrder,
            },
          })

          // Create line items linked to this option AND the parent quote
          if (optCalc.items.length > 0) {
            await tx.quoteLineItem.createMany({
              data: optCalc.items.map((li) => ({
                quoteId: newQuote.id,
                quoteOptionId: option.id,
                serviceId: li.serviceId,
                name: li.name,
                description: li.description,
                quantity: li.quantity,
                unitPrice: li.unitPrice,
                total: li.total,
                taxable: li.taxable,
                sortOrder: li.sortOrder,
              })),
            })
          }
        }

        return newQuote
      })

      return { quote: { ...quote, total: Number(quote.total) } }
    }

    // ── Single / flat quote (backward compatible) ─────────────────────────
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

    const taxAmount = taxableAmount * taxRate
    const total = subtotal + taxAmount

    const quote = await prisma.quote.create({
      data: {
        organizationId: user.organizationId,
        customerId: data.customerId,
        propertyId: data.propertyId || null,
        jobId: data.jobId || null,
        quoteNumber,
        status: "DRAFT",
        subtotal: subtotal,
        taxAmount: taxAmount,
        total: total,
        validUntil: new Date(data.validUntil),
        customerMessage: data.customerMessage || null,
        internalNote: data.internalNote || null,
        lineItems: {
          create: lineItemsData,
        },
      },
      include: {
        lineItems: true,
      },
    })

    return { quote: { ...quote, total: Number(quote.total) } }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("createQuote error:", error)
    return { error: "Failed to create quote" }
  }
}

// =============================================================================
// 4. updateQuote - Update quote (only drafts can be fully edited)
// =============================================================================

export async function updateQuote(
  id: string,
  data: {
    customerId?: string
    propertyId?: string
    lineItems?: {
      serviceId?: string
      name: string
      description?: string
      quantity: number
      unitPrice: number
      taxable: boolean
    }[]
    customerMessage?: string
    internalNote?: string
    validUntil?: string | Date
  }
) {
  try {
    const user = await requireAuth()

    const existing = await prisma.quote.findFirst({
      where: { id, organizationId: user.organizationId },
    })
    if (!existing) return { error: "Quote not found" }
    if (existing.status !== "DRAFT") return { error: "Only draft quotes can be edited" }

    // Get tax rate
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { taxRate: true },
    })
    const taxRate = Number(org?.taxRate || 0)

    // If line items are being updated, recalculate totals
    if (data.lineItems) {
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

      const taxAmount = taxableAmount * taxRate
      const total = subtotal + taxAmount

      // Delete old line items and create new ones in a transaction
      await prisma.$transaction([
        prisma.quoteLineItem.deleteMany({ where: { quoteId: id } }),
        prisma.quote.update({
          where: { id },
          data: {
            customerId: data.customerId,
            propertyId: data.propertyId || null,
            subtotal: subtotal,
            taxAmount: taxAmount,
            total: total,
            validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
            customerMessage: data.customerMessage,
            internalNote: data.internalNote,
            lineItems: {
              create: lineItemsData,
            },
          },
        }),
      ])
    } else {
      await prisma.quote.update({
        where: { id },
        data: {
          customerId: data.customerId,
          propertyId: data.propertyId || null,
          validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
          customerMessage: data.customerMessage,
          internalNote: data.internalNote,
        },
      })
    }

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("updateQuote error:", error)
    return { error: "Failed to update quote" }
  }
}

// =============================================================================
// 5. sendQuote - Send quote to customer (changes status to SENT)
// =============================================================================

export async function sendQuote(id: string, options?: { email?: boolean; sms?: boolean }) {
  try {
    const user = await requireAuth()

    const quote = await prisma.quote.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        customer: true,
        lineItems: true,
      },
    })
    if (!quote) return { error: "Quote not found" }
    if (quote.status !== "DRAFT" && quote.status !== "SENT") {
      return { error: "Quote cannot be sent in its current status" }
    }

    // Update status
    await prisma.quote.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    })

    // Get org for branding
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true, slug: true },
    })

    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${org?.slug}/quotes/${quote.accessToken}`

    let emailSent = false
    let smsSent = false
    const errors: string[] = []

    const { isNotificationEnabled } = await import("@/lib/notification-check")

    // Send email if configured
    if (await isNotificationEnabled(user.organizationId, "quote_sent", "email")) {
      if (options?.email !== false && quote.customer.email && process.env.SENDGRID_API_KEY) {
        try {
          const sgMail = await import("@sendgrid/mail")
          sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)
          await sgMail.default.send({
            to: quote.customer.email,
            from: {
              email: process.env.SENDGRID_FROM_EMAIL || "noreply@jobstream.app",
              name: org?.name || "JobStream",
            },
            subject: `Quote from ${org?.name || "JobStream"}`,
            html: `
              <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
                <h2>Hi ${quote.customer.firstName},</h2>
                <p>${org?.name} has sent you a quote for <strong>$${Number(quote.total).toFixed(2)}</strong>.</p>
                <a href="${portalUrl}" style="display: inline-block; background: #635BFF; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">View Quote</a>
                <p style="color: #8898AA; font-size: 12px; margin-top: 24px;">This quote is valid until ${new Date(quote.validUntil).toLocaleDateString()}.</p>
              </div>
            `,
          })

          emailSent = true

          // Log communication
          await prisma.communicationLog.create({
            data: {
              organizationId: user.organizationId,
              customerId: quote.customerId,
              type: "EMAIL",
              direction: "OUTBOUND",
              recipientAddress: quote.customer.email,
              subject: `Quote from ${org?.name}`,
              content: `Quote ${quote.quoteNumber} sent for $${Number(quote.total).toFixed(2)}`,
              status: "SENT",
              triggeredBy: "manual",
            },
          })
        } catch (e: any) {
          console.error("Failed to send quote email:", e)
          errors.push(`Email failed: ${e?.message || "Unknown error"}`)
        }
      } else if (options?.email !== false && quote.customer.email && !process.env.SENDGRID_API_KEY) {
        errors.push("Email not configured: SendGrid API key is missing")
      }
    }

    // Send SMS if configured
    if (await isNotificationEnabled(user.organizationId, "quote_sent", "sms")) {
      if (options?.sms !== false && quote.customer.phone && process.env.TWILIO_ACCOUNT_SID) {
        try {
          const twilio = await import("twilio")
          const client = twilio.default(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
          )
          // Ensure phone number is in E.164 format (+1XXXXXXXXXX)
          let toPhone = quote.customer.phone.replace(/\D/g, "")
          if (toPhone.length === 10) toPhone = "1" + toPhone
          if (!toPhone.startsWith("+")) toPhone = "+" + toPhone

          await client.messages.create({
            body: `Hi ${quote.customer.firstName}, ${org?.name} sent you a quote for $${Number(quote.total).toFixed(2)}. View it here: ${portalUrl}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: toPhone,
          })

          smsSent = true

          await prisma.communicationLog.create({
            data: {
              organizationId: user.organizationId,
              customerId: quote.customerId,
              type: "SMS",
              direction: "OUTBOUND",
              recipientAddress: quote.customer.phone,
              content: `Quote ${quote.quoteNumber} sent for $${Number(quote.total).toFixed(2)}`,
              status: "SENT",
              triggeredBy: "manual",
            },
          })
        } catch (e: any) {
          console.error("Failed to send quote SMS:", e)
          errors.push(`SMS failed: ${e?.message || "Unknown error"}`)
        }
      } else if (options?.sms !== false && quote.customer.phone && !process.env.TWILIO_ACCOUNT_SID) {
        errors.push("SMS not configured: Twilio credentials are missing")
      }
    }

    return { success: true, emailSent, smsSent, errors }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("sendQuote error:", error)
    return { error: "Failed to send quote" }
  }
}

// =============================================================================
// 6. approveQuote - Customer approves a quote (called from portal)
// =============================================================================

export async function approveQuote(accessToken: string) {
  try {
    const quote = await prisma.quote.findFirst({
      where: { accessToken },
      include: { customer: true },
    })
    if (!quote) return { error: "Quote not found" }
    if (quote.status !== "SENT") return { error: "Quote cannot be approved in its current status" }

    const now = new Date()
    if (now > quote.validUntil) {
      return { error: "This quote has expired" }
    }

    // Atomic update: only update if status is still SENT (prevents race conditions)
    const result = await prisma.quote.updateMany({
      where: { id: quote.id, status: "SENT" },
      data: {
        status: "APPROVED",
        approvedAt: now,
      },
    })

    if (result.count === 0) {
      return { error: "Quote was already processed" }
    }

    // V2: If quote has jobId, create Visit on existing Job
    if (quote.jobId) {
      try {
        const { createVisitFromApprovedQuote } = await import("@/actions/visits")
        await createVisitFromApprovedQuote(quote.organizationId, quote.id, quote.jobId)
      } catch (e) {
        console.error("Failed to create visit from approved quote:", e)
        // Don't fail the approval
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error("approveQuote error:", error)
    return { error: "Failed to approve quote" }
  }
}

// =============================================================================
// 6b. approveQuoteWithOption - Customer selects an option and approves (portal)
// =============================================================================

export async function approveQuoteWithOption(
  accessToken: string,
  selectedOptionId?: string
) {
  try {
    // If the customer selected an option, persist it before approval
    if (selectedOptionId) {
      const quote = await prisma.quote.findFirst({
        where: { accessToken },
        include: { options: true },
      })
      if (!quote) return { error: "Quote not found" }

      // Verify the selected option belongs to this quote
      const validOption = quote.options.find((o) => o.id === selectedOptionId)
      if (!validOption) {
        return { error: "Invalid option selected" }
      }

      // Set the selectedOptionId on the quote
      await prisma.quote.update({
        where: { id: quote.id },
        data: { selectedOptionId },
      })
    }

    // Delegate to existing approval logic
    return await approveQuote(accessToken)
  } catch (error: any) {
    console.error("approveQuoteWithOption error:", error)
    return { error: "Failed to approve quote" }
  }
}

// =============================================================================
// 7. declineQuote - Customer declines a quote (called from portal)
// =============================================================================

export async function declineQuote(accessToken: string, reason?: string) {
  try {
    const quote = await prisma.quote.findFirst({
      where: { accessToken },
    })
    if (!quote) return { error: "Quote not found" }
    if (quote.status !== "SENT") return { error: "Quote cannot be declined in its current status" }

    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: "DECLINED",
        declinedAt: new Date(),
        declineReason: reason || null,
      },
    })

    return { success: true }
  } catch (error: any) {
    console.error("declineQuote error:", error)
    return { error: "Failed to decline quote" }
  }
}

// =============================================================================
// 8. getApprovedQuotesForCustomer - Get approved quotes for invoice linking
// =============================================================================

export async function getApprovedQuotesForCustomer(customerId: string) {
  try {
    const user = await requireAuth()

    const quotes = await prisma.quote.findMany({
      where: {
        customerId,
        organizationId: user.organizationId,
        status: "APPROVED",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        quoteNumber: true,
        total: true,
        createdAt: true,
      },
    })

    return {
      quotes: quotes.map((q) => ({
        ...q,
        total: Number(q.total),
      })),
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("getApprovedQuotesForCustomer error:", error)
    return { error: "Failed to fetch approved quotes" }
  }
}

// =============================================================================
// 9. duplicateQuote - Create a copy of an existing quote as a new draft
// =============================================================================

export async function duplicateQuote(quoteId: string) {
  try {
    const user = await requireAuth()

    const original = await prisma.quote.findFirst({
      where: { id: quoteId, organizationId: user.organizationId },
      include: { lineItems: { orderBy: { sortOrder: "asc" } } },
    })
    if (!original) return { error: "Quote not found" }

    // Get next quote number
    const org = await prisma.organization.update({
      where: { id: user.organizationId },
      data: { nextQuoteNum: { increment: 1 } },
      select: { nextQuoteNum: true, quotePrefix: true, quoteValidDays: true },
    })
    const quoteNumber = `${org.quotePrefix}-${org.nextQuoteNum - 1}`

    const quote = await prisma.quote.create({
      data: {
        organizationId: user.organizationId,
        customerId: original.customerId,
        propertyId: original.propertyId,
        quoteNumber,
        status: "DRAFT",
        subtotal: original.subtotal,
        taxAmount: original.taxAmount,
        total: original.total,
        validUntil: new Date(Date.now() + (org.quoteValidDays || 30) * 24 * 60 * 60 * 1000),
        customerMessage: original.customerMessage,
        internalNote: original.internalNote,
        lineItems: {
          create: original.lineItems.map((li) => ({
            serviceId: li.serviceId,
            name: li.name,
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            total: li.total,
            taxable: li.taxable,
            sortOrder: li.sortOrder,
          })),
        },
      },
    })

    return { quoteId: quote.id }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("duplicateQuote error:", error)
    return { error: "Failed to duplicate quote" }
  }
}

// =============================================================================
// 10. deleteQuote - Delete a draft quote
// =============================================================================

export async function deleteQuote(id: string) {
  try {
    const user = await requireAuth()

    const quote = await prisma.quote.findFirst({
      where: { id, organizationId: user.organizationId },
    })
    if (!quote) return { error: "Quote not found" }
    if (quote.status !== "DRAFT") return { error: "Only draft quotes can be deleted" }

    await prisma.$transaction([
      prisma.quoteLineItem.deleteMany({ where: { quoteId: id } }),
      prisma.quote.delete({ where: { id } }),
    ])

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    console.error("deleteQuote error:", error)
    return { error: "Failed to delete quote" }
  }
}

// =============================================================================
// 11. markQuoteApproved / markQuoteDeclined - Manual status change by owner
// =============================================================================

export async function markQuoteApproved(id: string) {
  try {
    const user = await requireAuth()
    const quote = await prisma.quote.findFirst({
      where: { id, organizationId: user.organizationId },
    })
    if (!quote) return { error: "Quote not found" }
    if (quote.status !== "SENT") return { error: "Only sent quotes can be marked as approved" }

    await prisma.quote.update({
      where: { id },
      data: { status: "APPROVED", approvedAt: new Date() },
    })

    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    return { error: "Failed to update quote" }
  }
}

export async function markQuoteDeclined(id: string, reason?: string) {
  try {
    const user = await requireAuth()
    const quote = await prisma.quote.findFirst({
      where: { id, organizationId: user.organizationId },
    })
    if (!quote) return { error: "Quote not found" }
    if (quote.status !== "SENT") return { error: "Only sent quotes can be marked as declined" }

    await prisma.quote.update({
      where: { id },
      data: { status: "DECLINED", declinedAt: new Date(), declineReason: reason || null },
    })
    return { success: true }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error
    return { error: "Failed to update quote" }
  }
}

// =============================================================================
// 12. getQuoteByToken - Public access for portal (no auth required)
// =============================================================================

export async function getQuoteByToken(token: string) {
  try {
    const quote = await prisma.quote.findFirst({
      where: { accessToken: token },
      include: {
        customer: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
        property: true,
        lineItems: { orderBy: { sortOrder: "asc" } },
        options: {
          include: { lineItems: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
        organization: {
          select: { name: true, email: true, phone: true, logo: true, slug: true },
        },
      },
    })

    if (!quote) return { error: "Quote not found" }

    return {
      quote: {
        ...quote,
        total: Number(quote.total),
        subtotal: Number(quote.subtotal),
        taxAmount: Number(quote.taxAmount),
        lineItems: quote.lineItems.map((li) => ({
          ...li,
          quantity: Number(li.quantity),
          unitPrice: Number(li.unitPrice),
          total: Number(li.total),
        })),
        options: quote.options.map((opt) => ({
          ...opt,
          subtotal: Number(opt.subtotal),
          taxAmount: Number(opt.taxAmount),
          total: Number(opt.total),
          lineItems: opt.lineItems.map((li) => ({
            ...li,
            quantity: Number(li.quantity),
            unitPrice: Number(li.unitPrice),
            total: Number(li.total),
          })),
        })),
      },
    }
  } catch (error: any) {
    console.error("getQuoteByToken error:", error)
    return { error: "Failed to fetch quote" }
  }
}
