-- AlterTable
ALTER TABLE "Task" ADD COLUMN "createdByUserId" TEXT,
ADD COLUMN "executionOwnerUserId" TEXT;

-- AlterTable
ALTER TABLE "TaskStatusHistory" ADD COLUMN "detailJson" JSONB;
