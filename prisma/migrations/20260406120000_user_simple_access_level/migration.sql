-- CreateEnum
CREATE TYPE "SimpleAccessLevel" AS ENUM (
  'colaboracao',
  'gerenciar',
  'acesso_total',
  'administrador',
  'gestor',
  'operacional',
  'financeiro'
);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "simpleAccessLevel" "SimpleAccessLevel";
