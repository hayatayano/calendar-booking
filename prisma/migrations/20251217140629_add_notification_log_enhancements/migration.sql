-- AlterEnum
ALTER TYPE "NotificationStatus" ADD VALUE 'RETRYING';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'INVITATION';
ALTER TYPE "NotificationType" ADD VALUE 'SYSTEM';

-- DropForeignKey
ALTER TABLE "NotificationLog" DROP CONSTRAINT "NotificationLog_userId_fkey";

-- AlterTable
ALTER TABLE "NotificationLog" ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN     "maxRetries" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subject" TEXT,
ALTER COLUMN "bookingId" DROP NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- Add category column with default value for existing rows
ALTER TABLE "NotificationLog" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'booking';

-- Add updatedAt column with default value for existing rows
ALTER TABLE "NotificationLog" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "NotificationLog_companyId_idx" ON "NotificationLog"("companyId");

-- CreateIndex
CREATE INDEX "NotificationLog_category_idx" ON "NotificationLog"("category");

-- CreateIndex
CREATE INDEX "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
