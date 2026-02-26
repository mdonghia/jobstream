-- Replace CONVERTED with INVOICED in QuoteStatus enum.
-- Step 1: Update any existing CONVERTED quotes to APPROVED
UPDATE "Quote" SET "status" = 'APPROVED' WHERE "status" = 'CONVERTED';

-- Step 2: Rename the old enum, create a new one without CONVERTED but with INVOICED
ALTER TYPE "QuoteStatus" RENAME TO "QuoteStatus_old";
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'INVOICED', 'DECLINED', 'EXPIRED');

-- Step 3: Alter the column to use the new enum
ALTER TABLE "Quote" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Quote" ALTER COLUMN "status" TYPE "QuoteStatus" USING ("status"::text::"QuoteStatus");
ALTER TABLE "Quote" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Step 4: Drop the old enum
DROP TYPE "QuoteStatus_old";

-- Step 5: Add quoteId column to Invoice model
ALTER TABLE "Invoice" ADD COLUMN "quoteId" TEXT;

-- Step 6: Add foreign key constraint
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 7: Add index on quoteId
CREATE INDEX "Invoice_quoteId_idx" ON "Invoice"("quoteId");
