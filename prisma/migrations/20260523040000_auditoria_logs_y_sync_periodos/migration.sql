-- Migration: auditoria_logs_y_sync_periodos
--
-- Esta migración sincroniza el historial con el estado real de la BD compartida.
-- Cubre dos cambios que ya existen en la BD pero no estaban registrados:
--
--   1. Sistema de auditoría centralizada (modelo AuditoriaLog + enums)
--      Introducido en commit 490af8e pero olvidaron incluir la migración.
--
--   2. Reversión del unique partial index sobre periodos_academicos.estado
--      y cambio del default ABIERTO. La migración 20260522220000 había
--      forzado CERRADO + unique constraint; el equipo decidió revertirlo
--      directamente en la BD compartida. Esta migración lo formaliza.
--
-- IMPORTANTE: Marcar como aplicada con `prisma migrate resolve --applied`
-- en cualquier entorno donde estos cambios ya existan en la BD.

-- ==========================================
-- 1. AUDITORÍA CENTRALIZADA
-- ==========================================

-- CreateEnum
CREATE TYPE "TipoEntidad" AS ENUM (
  'PARAMETRO_GLOBAL',
  'PARAMETROS_MODALIDAD',
  'USUARIO_ROL',
  'USUARIO_ESTADO',
  'PERIODO',
  'AGENDA',
  'MONITOREO',
  'CURSO_MAESTRO'
);

-- CreateEnum
CREATE TYPE "AccionAuditoria" AS ENUM (
  'CREAR',
  'ACTUALIZAR',
  'CAMBIAR_ROL',
  'CAMBIAR_ESTADO',
  'REHABILITAR'
);

-- CreateTable
CREATE TABLE "auditoria_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRol" "Rol" NOT NULL,
    "actorNombre" TEXT NOT NULL,
    "entidad" "TipoEntidad" NOT NULL,
    "accion" "AccionAuditoria" NOT NULL,
    "recursoId" TEXT,
    "recursoDesc" TEXT,
    "antes" JSONB,
    "despues" JSONB,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auditoria_logs_actorId_idx" ON "auditoria_logs"("actorId");

-- CreateIndex
CREATE INDEX "auditoria_logs_entidad_creadoEn_idx" ON "auditoria_logs"("entidad", "creadoEn");

-- CreateIndex
CREATE INDEX "auditoria_logs_accion_idx" ON "auditoria_logs"("accion");

-- ==========================================
-- 2. SYNC periodos_academicos
-- ==========================================

-- Eliminar unique partial index introducido por 20260522220000_periodos_unicidad_abierto.
-- El equipo decidió permitir múltiples períodos en estado ABIERTO simultáneamente.
DROP INDEX IF EXISTS "periodos_academicos_one_abierto";

-- Volver al default ABIERTO (los períodos nacen abiertos por defecto).
ALTER TABLE "periodos_academicos" ALTER COLUMN "estado" SET DEFAULT 'ABIERTO';
