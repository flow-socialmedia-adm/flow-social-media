-- CreateEnum
CREATE TYPE "AgencyOperationMode" AS ENUM ('solo', 'lean', 'structured');

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN "operationMode" "AgencyOperationMode" NOT NULL DEFAULT 'solo';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "userFunctions" JSONB NOT NULL DEFAULT '[]';
