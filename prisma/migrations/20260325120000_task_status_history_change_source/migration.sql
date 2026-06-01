-- AlterTable
ALTER TABLE "TaskStatusHistory" ADD COLUMN "changeSource" TEXT;

-- CreateIndex
CREATE INDEX "TaskStatusHistory_taskId_idx" ON "TaskStatusHistory"("taskId");
