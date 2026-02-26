/**
 * V2 Data Migration: Backfill Visit records from existing Job data.
 *
 * This script is IDEMPOTENT -- safe to run multiple times. It skips
 * jobs that already have a Visit and uses upserts where applicable.
 *
 * Run with: npx tsx prisma/v2-migration.ts
 */

import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"

// -- Standalone Prisma client (outside Next.js) --------------------------------

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// -- Helpers -------------------------------------------------------------------

type JobStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
type VisitStatus = "UNSCHEDULED" | "ANYTIME" | "SCHEDULED" | "EN_ROUTE" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"

function mapJobToVisitStatus(status: JobStatus, scheduledStart: Date, createdAt: Date): VisitStatus {
  // For jobs that have progressed past scheduling, keep their status
  if (status === "IN_PROGRESS") return "IN_PROGRESS"
  if (status === "COMPLETED") return "COMPLETED"
  if (status === "CANCELLED") return "CANCELLED"

  // For SCHEDULED jobs, determine if they're actually unscheduled
  const year2000 = new Date("2000-01-01T00:00:00Z")
  if (scheduledStart < year2000) return "UNSCHEDULED"
  const diffMs = Math.abs(scheduledStart.getTime() - createdAt.getTime())
  if (diffMs <= 60_000) return "UNSCHEDULED"
  return "SCHEDULED"
}

// -- Counters ------------------------------------------------------------------

const counters = {
  visitsCreated: 0,
  visitsSkipped: 0,
  visitAssignmentsCreated: 0,
  visitAssignmentsSkipped: 0,
  timeEntriesUpdated: 0,
  timeEntriesSkipped: 0,
  jobsMarkedEmergency: 0,
  quotesBackfilled: 0,
  quotesSkipped: 0,
}

// -- Main migration ------------------------------------------------------------

async function main() {
  console.log("=== V2 Migration: Backfill Visits from Jobs ===\n")

  const BATCH_SIZE = 50

  // -----------------------------------------------------------------------
  // Steps A-D: Process jobs in batches
  // -----------------------------------------------------------------------

  const totalJobs = await prisma.job.count()
  console.log(`Found ${totalJobs} total jobs to process.\n`)

  let cursor: string | undefined
  let processed = 0

  while (true) {
    const jobs = await prisma.job.findMany({
      take: BATCH_SIZE,
      ...(cursor
        ? { skip: 1, cursor: { id: cursor } }
        : {}),
      orderBy: { id: "asc" },
      include: {
        assignments: true,
        timeEntries: true,
      },
    })

    if (jobs.length === 0) break

    for (const job of jobs) {
      // -- A: Create Visit (if not already present) --------------------------

      const existingVisit = await prisma.visit.findFirst({
        where: { jobId: job.id },
      })

      let visitId: string

      if (existingVisit) {
        visitId = existingVisit.id
        counters.visitsSkipped++
      } else {
        const visit = await prisma.visit.create({
          data: {
            jobId: job.id,
            organizationId: job.organizationId,
            visitNumber: 1,
            purpose: "SERVICE",
            status: mapJobToVisitStatus(job.status as JobStatus, job.scheduledStart, job.createdAt),
            scheduledStart: job.scheduledStart,
            scheduledEnd: job.scheduledEnd,
            actualStart: job.actualStart,
            actualEnd: job.actualEnd,
            arrivalWindowMinutes: job.arrivalWindowMinutes,
            onMyWaySentAt: job.onMyWaySentAt,
            completionNotes: job.completionNotes,
          },
        })
        visitId = visit.id
        counters.visitsCreated++
      }

      // -- B: Copy JobAssignment entries to VisitAssignment ------------------

      for (const assignment of job.assignments) {
        const existing = await prisma.visitAssignment.findUnique({
          where: {
            visitId_userId: {
              visitId,
              userId: assignment.userId,
            },
          },
        })

        if (existing) {
          counters.visitAssignmentsSkipped++
        } else {
          await prisma.visitAssignment.create({
            data: {
              visitId,
              userId: assignment.userId,
              organizationId: job.organizationId,
            },
          })
          counters.visitAssignmentsCreated++
        }
      }

      // -- C: Backfill TimeEntry.visitId ------------------------------------

      for (const entry of job.timeEntries) {
        if (entry.visitId) {
          counters.timeEntriesSkipped++
        } else {
          await prisma.timeEntry.update({
            where: { id: entry.id },
            data: { visitId },
          })
          counters.timeEntriesUpdated++
        }
      }

      // -- D: Set Job.isEmergency from priority ------------------------------

      if (job.priority === "URGENT" && !job.isEmergency) {
        await prisma.job.update({
          where: { id: job.id },
          data: { isEmergency: true },
        })
        counters.jobsMarkedEmergency++
      }
    }

    processed += jobs.length
    cursor = jobs[jobs.length - 1].id
    console.log(`  Processed ${processed} / ${totalJobs} jobs...`)
  }

  // -----------------------------------------------------------------------
  // Step E: Backfill Quote.jobId from convertedToJobId
  // -----------------------------------------------------------------------

  console.log("\nBackfilling Quote.jobId from convertedToJobId...")

  const quotesToBackfill = await prisma.quote.findMany({
    where: {
      convertedToJobId: { not: null },
    },
    select: {
      id: true,
      convertedToJobId: true,
      jobId: true,
    },
  })

  for (const quote of quotesToBackfill) {
    if (quote.jobId) {
      // Already has a jobId set -- skip for idempotency
      counters.quotesSkipped++
    } else {
      await prisma.quote.update({
        where: { id: quote.id },
        data: { jobId: quote.convertedToJobId },
      })
      counters.quotesBackfilled++
    }
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------

  console.log("\n=== Migration Summary ===")
  console.log(`  Visits created:             ${counters.visitsCreated}`)
  console.log(`  Visits skipped (existed):    ${counters.visitsSkipped}`)
  console.log(`  VisitAssignments created:    ${counters.visitAssignmentsCreated}`)
  console.log(`  VisitAssignments skipped:    ${counters.visitAssignmentsSkipped}`)
  console.log(`  TimeEntries updated:         ${counters.timeEntriesUpdated}`)
  console.log(`  TimeEntries skipped:         ${counters.timeEntriesSkipped}`)
  console.log(`  Jobs marked emergency:       ${counters.jobsMarkedEmergency}`)
  console.log(`  Quotes backfilled (jobId):   ${counters.quotesBackfilled}`)
  console.log(`  Quotes skipped (had jobId):  ${counters.quotesSkipped}`)
  console.log("\nDone.")
}

main()
  .catch((err) => {
    console.error("Migration failed:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
