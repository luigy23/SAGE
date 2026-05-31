-- Migration: ventanas_periodo
-- Añade 4 columnas nullable para las ventanas de diligenciamiento:
--   - agendaDesde / agendaHasta   → ventana FO-19 (configurada por Admin)
--   - monitoreoDesde / monitoreoHasta → ventana FO-20 (configurada por Admin)
-- Nullable: períodos existentes no se bloquean; Admin las configura cuando sea necesario.

ALTER TABLE "periodos_academicos"
  ADD COLUMN "agendaDesde"    TIMESTAMP(3),
  ADD COLUMN "agendaHasta"    TIMESTAMP(3),
  ADD COLUMN "monitoreoDesde" TIMESTAMP(3),
  ADD COLUMN "monitoreoHasta" TIMESTAMP(3);
