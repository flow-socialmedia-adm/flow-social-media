-- CreateEnum
CREATE TYPE "AgencyMode" AS ENUM ('SOLO', 'TEAM');

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "hasSeenHomeTour" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mode" "AgencyMode" DEFAULT 'SOLO',
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showGuidedTour" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "ownerUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hasSeenTasksOnboarding" BOOLEAN NOT NULL DEFAULT false;
