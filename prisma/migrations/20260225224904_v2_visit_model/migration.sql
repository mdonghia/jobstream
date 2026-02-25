-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('SCHEDULED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SchedulingType" AS ENUM ('SCHEDULED', 'ANYTIME', 'UNSCHEDULED');

-- CreateEnum
CREATE TYPE "VisitPurpose" AS ENUM ('DIAGNOSTIC', 'SERVICE', 'FOLLOW_UP', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "JobSource" AS ENUM ('PHONE', 'BOOKING_TOOL', 'ONLINE', 'OTHER');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "isEmergency" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source" "JobSource";

-- AlterTable
ALTER TABLE "JobLineItem" ADD COLUMN     "visitId" TEXT;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "jobId" TEXT;

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "visitId" TEXT;

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "visitNumber" INTEGER NOT NULL,
    "purpose" "VisitPurpose" NOT NULL DEFAULT 'SERVICE',
    "status" "VisitStatus" NOT NULL DEFAULT 'SCHEDULED',
    "schedulingType" "SchedulingType" NOT NULL DEFAULT 'UNSCHEDULED',
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "arrivalWindowMinutes" INTEGER,
    "onMyWaySentAt" TIMESTAMP(3),
    "notes" TEXT,
    "completionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitAssignment" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "visitId" TEXT,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Visit_jobId_idx" ON "Visit"("jobId");

-- CreateIndex
CREATE INDEX "Visit_organizationId_idx" ON "Visit"("organizationId");

-- CreateIndex
CREATE INDEX "Visit_jobId_status_idx" ON "Visit"("jobId", "status");

-- CreateIndex
CREATE INDEX "Visit_organizationId_scheduledStart_idx" ON "Visit"("organizationId", "scheduledStart");

-- CreateIndex
CREATE INDEX "Visit_organizationId_status_scheduledStart_idx" ON "Visit"("organizationId", "status", "scheduledStart");

-- CreateIndex
CREATE INDEX "VisitAssignment_visitId_idx" ON "VisitAssignment"("visitId");

-- CreateIndex
CREATE INDEX "VisitAssignment_organizationId_idx" ON "VisitAssignment"("organizationId");

-- CreateIndex
CREATE INDEX "VisitAssignment_organizationId_userId_idx" ON "VisitAssignment"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "VisitAssignment_visitId_userId_key" ON "VisitAssignment"("visitId", "userId");

-- CreateIndex
CREATE INDEX "ActivityEvent_jobId_createdAt_idx" ON "ActivityEvent"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_organizationId_idx" ON "ActivityEvent"("organizationId");

-- CreateIndex
CREATE INDEX "ActivityEvent_organizationId_createdAt_idx" ON "ActivityEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "JobLineItem_visitId_idx" ON "JobLineItem"("visitId");

-- CreateIndex
CREATE INDEX "TimeEntry_visitId_idx" ON "TimeEntry"("visitId");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobLineItem" ADD CONSTRAINT "JobLineItem_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitAssignment" ADD CONSTRAINT "VisitAssignment_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitAssignment" ADD CONSTRAINT "VisitAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitAssignment" ADD CONSTRAINT "VisitAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
