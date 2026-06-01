-- CreateEnum
CREATE TYPE "DefaultOwnerStrategy" AS ENUM ('AGENCY_OWNER', 'MANUAL');

-- CreateEnum
CREATE TYPE "OperationalRole" AS ENUM ('SOCIAL_MEDIA', 'DESIGNER', 'VIDEO_EDITOR', 'ATENDIMENTO', 'GESTOR', 'APROVACAO', 'OUTRO');

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN "defaultOwnerStrategy" "DefaultOwnerStrategy" NOT NULL DEFAULT 'AGENCY_OWNER';

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN "allowStageOwners" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "operationalRole" "OperationalRole" NOT NULL DEFAULT 'OUTRO';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "canBeTaskOwner" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "canBePostOwner" BOOLEAN NOT NULL DEFAULT true;
