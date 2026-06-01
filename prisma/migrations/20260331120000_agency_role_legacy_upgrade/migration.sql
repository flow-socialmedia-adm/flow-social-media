-- Reparo para bases que ainda têm AgencyRole legado (accessType / canHandle*).
-- Instalações novas: tabela já vem no formato v2 — o bloco retorna sem executar SQL que referencia colunas antigas.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "canBeClientOwner" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "canBePlanningOwner" BOOLEAN NOT NULL DEFAULT true;

DO $legacy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'AgencyRole' AND column_name = 'accessType'
  ) THEN
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE "AgencyRole" ADD COLUMN IF NOT EXISTS "accessLevel" TEXT';
  EXECUTE 'ALTER TABLE "AgencyRole" ADD COLUMN IF NOT EXISTS "permissions" JSONB';
  EXECUTE 'ALTER TABLE "AgencyRole" ADD COLUMN IF NOT EXISTS "flags" JSONB';
  EXECUTE 'ALTER TABLE "AgencyRole" ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false';
  EXECUTE 'ALTER TABLE "AgencyRole" ADD COLUMN IF NOT EXISTS "systemKey" TEXT';
  EXECUTE 'ALTER TABLE "AgencyRole" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP';

  EXECUTE $u$
    UPDATE "AgencyRole" SET "accessLevel" = COALESCE(
      "accessLevel",
      CASE CAST("accessType" AS TEXT)
        WHEN 'admin' THEN 'ADMIN'
        WHEN 'manager' THEN 'MANAGER'
        WHEN 'operational' THEN 'OPERATIONAL'
        WHEN 'financial' THEN 'FINANCIAL'
        ELSE 'OPERATIONAL'
      END
    ) WHERE "accessLevel" IS NULL
  $u$;

  EXECUTE 'UPDATE "AgencyRole" SET "accessLevel" = ''OPERATIONAL'' WHERE "accessLevel" IS NULL';

  EXECUTE 'UPDATE "AgencyRole" SET "permissions" = COALESCE("permissions", ''{}''::jsonb)';
  EXECUTE $f$
    UPDATE "AgencyRole" SET "flags" = COALESCE(
      "flags",
      jsonb_build_object(
        'canBeResponsiblePosts', COALESCE("canHandlePosts", true),
        'canBeResponsibleTasks', COALESCE("canHandleTasks", true),
        'canBeResponsibleClients', true,
        'canBeResponsiblePlanning', true
      )
    )
  $f$;

  EXECUTE 'ALTER TABLE "AgencyRole" ALTER COLUMN "accessLevel" SET NOT NULL';
  EXECUTE 'ALTER TABLE "AgencyRole" ALTER COLUMN "permissions" SET NOT NULL';
  EXECUTE 'ALTER TABLE "AgencyRole" ALTER COLUMN "flags" SET NOT NULL';

  EXECUTE $p1$ UPDATE "AgencyRole" SET "permissions" = '{"clients":"edit","planning":"edit","posts":"edit","tasks":"edit","agenda":"edit","financial":"edit","contracts":"edit","team":"edit","settings":"edit"}'::jsonb WHERE "permissions" = '{}'::jsonb AND "accessLevel" = 'ADMIN' $p1$;
  EXECUTE $p2$ UPDATE "AgencyRole" SET "permissions" = '{"clients":"edit","planning":"edit","posts":"edit","tasks":"edit","agenda":"edit","financial":"view","contracts":"view","team":"view","settings":"none"}'::jsonb WHERE "permissions" = '{}'::jsonb AND "accessLevel" = 'MANAGER' $p2$;
  EXECUTE $p3$ UPDATE "AgencyRole" SET "permissions" = '{"clients":"view","planning":"edit","posts":"edit","tasks":"edit","agenda":"edit","financial":"none","contracts":"none","team":"none","settings":"none"}'::jsonb WHERE "permissions" = '{}'::jsonb AND "accessLevel" = 'OPERATIONAL' $p3$;
  EXECUTE $p4$ UPDATE "AgencyRole" SET "permissions" = '{"clients":"none","planning":"none","posts":"none","tasks":"none","agenda":"none","financial":"edit","contracts":"edit","team":"none","settings":"none"}'::jsonb WHERE "permissions" = '{}'::jsonb AND "accessLevel" = 'FINANCIAL' $p4$;
  EXECUTE $p5$ UPDATE "AgencyRole" SET "permissions" = '{"clients":"view","planning":"view","posts":"view","tasks":"view","agenda":"view","financial":"view","contracts":"view","team":"view","settings":"none"}'::jsonb WHERE "permissions" = '{}'::jsonb AND "accessLevel" = 'VIEWER' $p5$;

  EXECUTE 'ALTER TABLE "AgencyRole" DROP COLUMN IF EXISTS "accessType"';
  EXECUTE 'ALTER TABLE "AgencyRole" DROP COLUMN IF EXISTS "canHandlePosts"';
  EXECUTE 'ALTER TABLE "AgencyRole" DROP COLUMN IF EXISTS "canHandleTasks"';

  EXECUTE 'DROP TYPE IF EXISTS "AgencyRoleAccessType"';
END $legacy$;

CREATE UNIQUE INDEX IF NOT EXISTS "AgencyRole_agencyId_systemKey_key" ON "AgencyRole"("agencyId", "systemKey");
