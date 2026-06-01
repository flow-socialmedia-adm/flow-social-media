-- Enums
CREATE TYPE "Role" AS ENUM ('owner', 'admin', 'editor');
CREATE TYPE "PlanTier" AS ENUM ('plan_1', 'plan_2', 'plan_3');
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'past_due', 'canceled');
CREATE TYPE "Currency" AS ENUM ('BRL', 'USD', 'EUR');
CREATE TYPE "ClientType" AS ENUM ('company', 'individual');
CREATE TYPE "PostType" AS ENUM ('static', 'video', 'carousel', 'reels', 'story');
CREATE TYPE "WorkflowCategory" AS ENUM ('client', 'general');
CREATE TYPE "FinancialType" AS ENUM ('income', 'expense');
CREATE TYPE "FinancialStatus" AS ENUM ('pending', 'paid', 'overdue');
CREATE TYPE "Recurrence" AS ENUM ('monthly', 'yearly', 'none');

-- Tables
CREATE TABLE "Agency" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "cnpj" TEXT,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "addressJson" JSONB,
  "logoUrl" TEXT,
  "brandColor" TEXT NOT NULL DEFAULT 'Indigo',
  "baseCurrency" "Currency" NOT NULL,
  "planTier" "PlanTier" NOT NULL,
  "subscriptionStatus" "SubscriptionStatus" NOT NULL,
  "maxUsers" INTEGER NOT NULL DEFAULT 3,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE "User" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agencyId" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "avatarUrl" TEXT,
  "role" "Role" NOT NULL,
  "permissions" JSONB,
  "jobTitle" TEXT,
  "phone" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT "User_agency_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "User_email_agency_unique" ON "User" ("email", "agencyId");

CREATE TABLE "Client" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agencyId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT,
  "avatarUrl" TEXT,
  "type" "ClientType" NOT NULL,
  "document" TEXT,
  "currency" "Currency" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "addressJson" JSONB,
  "brandGuideJson" JSONB,
  "socialLinksJson" JSONB,
  "accessCredentialsJson" JSONB,
  "contractJson" JSONB,
  "notes" TEXT,
  CONSTRAINT "Client_agency_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Workflow" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agencyId" UUID NOT NULL,
  "category" "WorkflowCategory" NOT NULL,
  "name" TEXT NOT NULL,
  "isCustom" BOOLEAN NOT NULL DEFAULT FALSE,
  "statusesJson" JSONB NOT NULL,
  CONSTRAINT "Workflow_agency_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Task" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agencyId" UUID NOT NULL,
  "clientId" UUID,
  "title" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "postType" "PostType",
  "workflowId" TEXT NOT NULL,
  "statusId" TEXT NOT NULL,
  "description" TEXT,
  CONSTRAINT "Task_agency_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Task_client_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "FinancialEntry" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agencyId" UUID NOT NULL,
  "clientId" UUID,
  "type" "FinancialType" NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "value" NUMERIC(18,4) NOT NULL,
  "currency" "Currency" NOT NULL,
  "dueDate" DATE NOT NULL,
  "paymentDate" DATE,
  "status" "FinancialStatus" NOT NULL,
  "recurrence" "Recurrence" NOT NULL,
  "supplier" TEXT,
  CONSTRAINT "Financial_agency_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Financial_client_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ActivityLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "agencyId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "actionKey" TEXT NOT NULL,
  "targetName" TEXT,
  "detailsJson" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT "Activity_agency_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Activity_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ExchangeRate" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "date" DATE NOT NULL,
  "base" "Currency" NOT NULL,
  "target" "Currency" NOT NULL,
  "rate" NUMERIC(18,8) NOT NULL
);
CREATE UNIQUE INDEX "ExchangeRate_unique_comp" ON "ExchangeRate" ("date", "base", "target");

