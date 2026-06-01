-- AgencyRole no formato final (accessLevel + permissions + flags + system roles)
-- Sem enum legado accessType / canHandlePosts / canHandleTasks

CREATE TABLE "AgencyRole" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "flags" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "systemKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyRole_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgencyRole_agencyId_idx" ON "AgencyRole"("agencyId");

CREATE UNIQUE INDEX "AgencyRole_agencyId_systemKey_key" ON "AgencyRole"("agencyId", "systemKey");

ALTER TABLE "User" ADD COLUMN "agencyRoleId" TEXT;

ALTER TABLE "AgencyRole" ADD CONSTRAINT "AgencyRole_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" ADD CONSTRAINT "User_agencyRoleId_fkey" FOREIGN KEY ("agencyRoleId") REFERENCES "AgencyRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
