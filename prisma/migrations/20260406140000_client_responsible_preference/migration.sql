-- CreateEnum
CREATE TYPE "ClientResponsibleMode" AS ENUM ('default_member', 'per_client_planning');

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN "clientResponsibleMode" "ClientResponsibleMode" NOT NULL DEFAULT 'per_client_planning';
ALTER TABLE "Agency" ADD COLUMN "defaultClientOwnerUserId" TEXT;
