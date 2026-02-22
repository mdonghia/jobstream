-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "bookingEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bookingServices" JSONB,
ADD COLUMN     "bookingSlotDuration" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "commEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "commSmsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "paymentOnlineEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewAutoRequest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewFacebookUrl" TEXT,
ADD COLUMN     "reviewGoogleUrl" TEXT,
ADD COLUMN     "reviewRequestDelay" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "reviewYelpUrl" TEXT;
