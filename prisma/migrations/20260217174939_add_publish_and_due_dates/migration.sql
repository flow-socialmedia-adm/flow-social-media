-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "isProvisionalDueDate" BOOLEAN DEFAULT false,
ADD COLUMN     "isProvisionalPublishDate" BOOLEAN DEFAULT false,
ADD COLUMN     "publishDate" TIMESTAMP(3);
