-- Unify VisitStatus and SchedulingType into a single status field.
-- Add UNSCHEDULED and ANYTIME to VisitStatus enum, migrate data, then drop schedulingType.

-- Step 1: Add new values to VisitStatus enum
ALTER TYPE "VisitStatus" ADD VALUE IF NOT EXISTS 'UNSCHEDULED';
ALTER TYPE "VisitStatus" ADD VALUE IF NOT EXISTS 'ANYTIME';

-- Step 2: Migrate data - merge schedulingType into status
-- If schedulingType is UNSCHEDULED and status is SCHEDULED, set status to UNSCHEDULED
-- If schedulingType is ANYTIME and status is SCHEDULED, set status to ANYTIME
-- Otherwise keep the existing status (EN_ROUTE, IN_PROGRESS, COMPLETED, CANCELLED stay as-is)
UPDATE "Visit"
SET "status" = 'UNSCHEDULED'
WHERE "schedulingType" = 'UNSCHEDULED' AND "status" = 'SCHEDULED';

UPDATE "Visit"
SET "status" = 'ANYTIME'
WHERE "schedulingType" = 'ANYTIME' AND "status" = 'SCHEDULED';

-- Step 3: Drop the schedulingType column and enum
ALTER TABLE "Visit" DROP COLUMN "schedulingType";
DROP TYPE "SchedulingType";

-- Step 4: Update default for status column
ALTER TABLE "Visit" ALTER COLUMN "status" SET DEFAULT 'UNSCHEDULED';
