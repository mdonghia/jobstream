/*
  Warnings:

  - You are about to drop the column `googleAccessToken` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `googleAccountId` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `googleLocationId` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `googleRefreshToken` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `googleTokenExpiry` on the `Organization` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "googleAccessToken",
DROP COLUMN "googleAccountId",
DROP COLUMN "googleLocationId",
DROP COLUMN "googleRefreshToken",
DROP COLUMN "googleTokenExpiry",
ADD COLUMN     "googleBusinessAddr" TEXT,
ADD COLUMN     "googleBusinessName" TEXT;
