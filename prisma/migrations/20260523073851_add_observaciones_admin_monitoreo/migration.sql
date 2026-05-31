-- Migration: add_observaciones_admin_monitoreo
--
-- Añade la columna `observacionesAdmin` (text nullable) al modelo Monitoreo.
-- Esta migración ya estaba aplicada en la BD compartida cuando se descubrió
-- que faltaba localmente. Se reconstruye aquí para sincronizar el historial.
-- Debe marcarse como aplicada con `prisma migrate resolve --applied` (no se
-- re-ejecuta sobre la BD compartida).

ALTER TABLE "monitoreos" ADD COLUMN "observacionesAdmin" TEXT;
