import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth-utils"
import { getJob } from "@/actions/jobs"
import { JobDetail } from "@/components/jobs/job-detail"
import { JobDetailV2 } from "@/components/jobs/job-detail-v2"
import { featureFlags } from "@/lib/feature-flags"
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

  // ---- V2 path: unified job detail with visits, quotes, activity ----
  if (featureFlags.v2Visits) {
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

  // ---- V1 path: existing job detail ----
  const result = await getJob(id)
  if (!result || "error" in result) {
    notFound()
  }

  return (
    <JobDetail
      job={serialize((result as any).job)}
      currentUserId={user.id}
    />
  )
}
