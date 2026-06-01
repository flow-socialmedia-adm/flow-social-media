-- CreateEnum
CREATE TYPE "MemberInviteStatus" AS ENUM ('pending_invite', 'active', 'disabled');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "inviteStatus" "MemberInviteStatus" NOT NULL DEFAULT 'active';
ALTER TABLE "User" ADD COLUMN "invitePublicId" TEXT;
ALTER TABLE "User" ADD COLUMN "inviteTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "inviteExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "invitedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "activatedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "passwordResetPublicId" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordResetTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);

ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

CREATE UNIQUE INDEX "User_invitePublicId_key" ON "User"("invitePublicId");
CREATE INDEX "User_invitePublicId_idx" ON "User"("invitePublicId");
CREATE INDEX "User_passwordResetPublicId_idx" ON "User"("passwordResetPublicId");
