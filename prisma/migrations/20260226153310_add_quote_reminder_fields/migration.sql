-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "quoteReminderDays" TEXT NOT NULL DEFAULT '3,7,14',
ADD COLUMN     "quoteRemindersEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "lastReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "reminderCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Quote_organizationId_sentAt_idx" ON "Quote"("organizationId", "sentAt");
