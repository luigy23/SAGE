-- Migration: periodo_id_fk
-- Integridad referencial híbrida de períodos: se agrega periodoId (FK a
-- periodos_academicos) a agendas y monitoreos, manteniendo el string `periodo`
-- denormalizado. El backfill auto-asigna el id cruzando por el nombre existente,
-- sin perder datos. periodoId queda NULL solo si el nombre no existe como registro.

-- 1. Columnas nullables
ALTER TABLE "agendas_semestrales" ADD COLUMN "periodoId" TEXT;
ALTER TABLE "monitoreos" ADD COLUMN "periodoId" TEXT;

-- 2. Backfill por el texto existente
UPDATE "agendas_semestrales" a
  SET "periodoId" = p.id
  FROM "periodos_academicos" p
  WHERE p.nombre = a.periodo;

UPDATE "monitoreos" m
  SET "periodoId" = p.id
  FROM "periodos_academicos" p
  WHERE p.nombre = m.periodo;

-- 3. Índices
CREATE INDEX "agendas_semestrales_periodoId_idx" ON "agendas_semestrales"("periodoId");
CREATE INDEX "monitoreos_periodoId_idx" ON "monitoreos"("periodoId");

-- 4. Llaves foráneas (integridad)
ALTER TABLE "agendas_semestrales" ADD CONSTRAINT "agendas_semestrales_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodos_academicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "monitoreos" ADD CONSTRAINT "monitoreos_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodos_academicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
