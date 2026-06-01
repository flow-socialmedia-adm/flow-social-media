-- Backfill publishDate / dueDate from existing "date" for records that have NULL in the new columns.
-- Posts (clientId IS NOT NULL): set publishDate = date, isProvisionalPublishDate = true.
-- Tarefas gerais (clientId IS NULL): set dueDate = date, isProvisionalDueDate = true.

UPDATE "Task"
SET "publishDate" = "date", "isProvisionalPublishDate" = true
WHERE "clientId" IS NOT NULL AND "publishDate" IS NULL;

UPDATE "Task"
SET "dueDate" = "date", "isProvisionalDueDate" = true
WHERE "clientId" IS NULL AND "dueDate" IS NULL;
