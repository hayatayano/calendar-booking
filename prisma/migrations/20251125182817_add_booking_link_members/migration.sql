-- CreateEnum
CREATE TYPE "BookingCondition" AS ENUM ('ALL', 'ANY');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'VIEWER');

-- AlterTable
ALTER TABLE "BookingLink" ADD COLUMN     "bookingCondition" "BookingCondition" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "roundRobinEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BookingLinkMember" (
    "id" TEXT NOT NULL,
    "bookingLinkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingLinkMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingLinkMember_bookingLinkId_idx" ON "BookingLinkMember"("bookingLinkId");

-- CreateIndex
CREATE INDEX "BookingLinkMember_userId_idx" ON "BookingLinkMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingLinkMember_bookingLinkId_userId_key" ON "BookingLinkMember"("bookingLinkId", "userId");

-- AddForeignKey
ALTER TABLE "BookingLinkMember" ADD CONSTRAINT "BookingLinkMember_bookingLinkId_fkey" FOREIGN KEY ("bookingLinkId") REFERENCES "BookingLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingLinkMember" ADD CONSTRAINT "BookingLinkMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
