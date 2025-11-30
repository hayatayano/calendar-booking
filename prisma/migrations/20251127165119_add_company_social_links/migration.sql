-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SocialPlatform" ADD VALUE 'YOUTUBE';
ALTER TYPE "SocialPlatform" ADD VALUE 'LINKEDIN';
ALTER TYPE "SocialPlatform" ADD VALUE 'LINE';
ALTER TYPE "SocialPlatform" ADD VALUE 'WEBSITE';

-- CreateTable
CREATE TABLE "CompanySocialLink" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanySocialLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanySocialLink_companyId_idx" ON "CompanySocialLink"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySocialLink_companyId_platform_key" ON "CompanySocialLink"("companyId", "platform");

-- AddForeignKey
ALTER TABLE "CompanySocialLink" ADD CONSTRAINT "CompanySocialLink_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
