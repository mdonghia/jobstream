import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { prisma } from "@/lib/db"
import { QuotePDF } from "@/lib/pdf/quote-pdf"
import React from "react"

// Public route - no auth required (uses access token)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const quote = await prisma.quote.findFirst({
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

    if (!quote) {
      return new NextResponse("Quote not found", { status: 404 })
    }

    const pdfData = {
      quote: {
        quoteNumber: quote.quoteNumber,
        createdAt: quote.createdAt.toISOString(),
        validUntil: quote.validUntil.toISOString(),
        status: quote.status,
        subtotal: Number(quote.subtotal),
        taxAmount: Number(quote.taxAmount),
        total: Number(quote.total),
        customerMessage: quote.customerMessage,
        lineItems: quote.lineItems.map((li) => ({
          name: li.name,
          description: li.description,
          quantity: Number(li.quantity),
          unitPrice: Number(li.unitPrice),
          total: Number(li.total),
        })),
        customer: quote.customer,
      },
      organization: quote.organization,
    }

    const buffer = await renderToBuffer(
      React.createElement(QuotePDF, pdfData) as any
    )

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${quote.quoteNumber}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error("PDF generation error:", error)
    return new NextResponse("Failed to generate PDF", { status: 500 })
  }
}
