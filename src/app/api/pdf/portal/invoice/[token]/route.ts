import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { prisma } from "@/lib/db"
import { InvoicePDF } from "@/lib/pdf/invoice-pdf"
import React from "react"

// Public route - no auth required (uses access token)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const invoice = await prisma.invoice.findFirst({
      where: { accessToken: token },
      include: {
        customer: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
        lineItems: { orderBy: { sortOrder: "asc" } },
        organization: {
          select: {
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            zip: true,
          },
        },
      },
    })

    if (!invoice) {
      return new NextResponse("Invoice not found", { status: 404 })
    }

    const pdfData = {
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.createdAt.toISOString(),
        dueDate: invoice.dueDate.toISOString(),
        status: invoice.status,
        subtotal: Number(invoice.subtotal),
        taxAmount: Number(invoice.taxAmount),
        discountAmount: Number(invoice.discountAmount),
        total: Number(invoice.total),
        amountPaid: Number(invoice.amountPaid),
        amountDue: Number(invoice.amountDue),
        notes: invoice.customerNote,
        lineItems: invoice.lineItems.map((li) => ({
          name: li.name,
          description: li.description,
          quantity: Number(li.quantity),
          unitPrice: Number(li.unitPrice),
          total: Number(li.total),
        })),
        customer: invoice.customer,
      },
      organization: invoice.organization,
    }

    const buffer = await renderToBuffer(
      React.createElement(InvoicePDF, pdfData) as any
    )

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error("PDF generation error:", error)
    return new NextResponse("Failed to generate PDF", { status: 500 })
  }
}
