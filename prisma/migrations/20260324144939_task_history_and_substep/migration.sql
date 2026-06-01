-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "bornAsForecast" BOOLEAN,
ADD COLUMN     "convertedToPostAt" TIMESTAMP(3),
ADD COLUMN     "currentActionId" TEXT,
ADD COLUMN     "origin" TEXT;

-- CreateTable
CREATE TABLE "TaskStatusHistory" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "statusId" TEXT NOT NULL,
    "userId" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskStatusHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TaskStatusHistory" ADD CONSTRAINT "TaskStatusHistory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
