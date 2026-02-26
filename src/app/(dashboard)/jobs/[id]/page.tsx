import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-utils"
import { JobDetailV2 } from "@/components/jobs/job-detail-v2"
import { prisma } from "@/lib/db"

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireAuth()
  const { id } = await params

  // Serialize Prisma Dates/Decimals for client component
  const serialize = (obj: any) => JSON.parse(JSON.stringify(obj))

  const job = await prisma.job.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      customer: { include: { properties: true } },
      property: true,
      quote: {
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          total: true,
          sentAt: true,
          approvedAt: true,
        },
      },
      quotesInContext: {
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          total: true,
          sentAt: true,
          approvedAt: true,
        },
      },
      visits: {
        include: {
          assignments: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  color: true,
                },
              },
            },
          },
        },
        orderBy: { visitNumber: "asc" },
      },
      lineItems: { orderBy: { sortOrder: "asc" } },
      invoices: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          amountDue: true,
          dueDate: true,
          amountPaid: true,
        },
      },
      notes: {
        include: {
          user: {
            select: { firstName: true, lastName: true, avatar: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              color: true,
            },
          },
        },
      },
    },
  })

  if (!job) {
    notFound()
  }

  return (
    <JobDetailV2
      job={serialize(job)}
      currentUserId={user.id}
    />
  )
}
