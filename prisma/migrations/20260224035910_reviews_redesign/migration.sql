-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_jobId_fkey";

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "googleAccessToken" TEXT,
ADD COLUMN     "googleAccountId" TEXT,
ADD COLUMN     "googleLastSyncAt" TIMESTAMP(3),
ADD COLUMN     "googleLocationId" TEXT,
ADD COLUMN     "googlePlaceId" TEXT,
ADD COLUMN     "googleRefreshToken" TEXT,
ADD COLUMN     "googleTokenExpiry" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "customerId",
DROP COLUMN "jobId",
DROP COLUMN "requestSentAt",
DROP COLUMN "respondedAt",
DROP COLUMN "responseContent",
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "hasOwnerReply" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ownerReplyDate" TIMESTAMP(3),
ADD COLUMN     "ownerReplyText" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewerPhoto" TEXT,
ALTER COLUMN "platform" SET DEFAULT 'google';

-- CreateTable
CREATE TABLE "ReviewRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "jobId" TEXT,
    "token" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clickedAt" TIMESTAMP(3),

    CONSTRAINT "ReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRequest_token_key" ON "ReviewRequest"("token");

-- CreateIndex
CREATE INDEX "ReviewRequest_organizationId_idx" ON "ReviewRequest"("organizationId");

-- CreateIndex
CREATE INDEX "ReviewRequest_token_idx" ON "ReviewRequest"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Review_organizationId_externalId_key" ON "Review"("organizationId", "externalId");

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
