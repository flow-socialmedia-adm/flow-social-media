-- Colunas de responsabilidade por cliente/planejamento (User) — parte do modelo de funções v2
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "canBeClientOwner" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "canBePlanningOwner" BOOLEAN NOT NULL DEFAULT true;
