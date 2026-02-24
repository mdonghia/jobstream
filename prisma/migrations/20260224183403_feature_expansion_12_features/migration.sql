-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "AutomationTrigger" ADD VALUE 'JOB_ON_MY_WAY';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "preferredTimeSlot" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "lastReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "reminderCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "arrivalWindowMinutes" INTEGER,
ADD COLUMN     "onMyWaySentAt" TIMESTAMP(3),
ADD COLUMN     "recurrenceCount" INTEGER,
ADD COLUMN     "subscriptionId" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "autoConvertQuoteToJob" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "autoInvoiceOnJobComplete" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bookingBufferMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "bookingMaxAdvanceDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "defaultArrivalWindow" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "invoiceReminderDays" TEXT NOT NULL DEFAULT '3,7,14',
ADD COLUMN     "invoiceRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "onMyWayNotificationEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "portalEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requireChecklistCompletion" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "selectedOptionId" TEXT;

-- AlterTable
ALTER TABLE "QuoteLineItem" ADD COLUMN     "quoteOptionId" TEXT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "costPrice" DECIMAL(65,30),
ADD COLUMN     "estimatedMinutes" INTEGER,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'service';

-- CreateTable
CREATE TABLE "QuoteOption" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChecklistTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visitFrequency" TEXT NOT NULL,
    "includedVisits" INTEGER,
    "serviceIds" TEXT[],
    "pricePerVisit" DECIMAL(65,30),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "servicePlanId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "nextVisitDate" TIMESTAMP(3),
    "parentJobId" TEXT,
    "notes" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ServiceChecklists" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ServiceChecklists_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "QuoteOption_quoteId_idx" ON "QuoteOption"("quoteId");

-- CreateIndex
CREATE INDEX "ChecklistTemplate_organizationId_idx" ON "ChecklistTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "ChecklistTemplateItem_templateId_idx" ON "ChecklistTemplateItem"("templateId");

-- CreateIndex
CREATE INDEX "PortalMessage_organizationId_idx" ON "PortalMessage"("organizationId");

-- CreateIndex
CREATE INDEX "PortalMessage_customerId_idx" ON "PortalMessage"("customerId");

-- CreateIndex
CREATE INDEX "ServicePlan_organizationId_idx" ON "ServicePlan"("organizationId");

-- CreateIndex
CREATE INDEX "Subscription_organizationId_idx" ON "Subscription"("organizationId");

-- CreateIndex
CREATE INDEX "Subscription_customerId_idx" ON "Subscription"("customerId");

-- CreateIndex
CREATE INDEX "_ServiceChecklists_B_index" ON "_ServiceChecklists"("B");

-- CreateIndex
CREATE INDEX "QuoteLineItem_quoteOptionId_idx" ON "QuoteLineItem"("quoteOptionId");

-- AddForeignKey
ALTER TABLE "QuoteOption" ADD CONSTRAINT "QuoteOption_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_quoteOptionId_fkey" FOREIGN KEY ("quoteOptionId") REFERENCES "QuoteOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplateItem" ADD CONSTRAINT "ChecklistTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalMessage" ADD CONSTRAINT "PortalMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalMessage" ADD CONSTRAINT "PortalMessage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePlan" ADD CONSTRAINT "ServicePlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_servicePlanId_fkey" FOREIGN KEY ("servicePlanId") REFERENCES "ServicePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceChecklists" ADD CONSTRAINT "_ServiceChecklists_A_fkey" FOREIGN KEY ("A") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceChecklists" ADD CONSTRAINT "_ServiceChecklists_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
