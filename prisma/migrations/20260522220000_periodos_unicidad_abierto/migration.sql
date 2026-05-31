-- Migration: periodos_unicidad_abierto
-- Garantiza que solo puede existir UN período con estado 'ABIERTO' a la vez.
-- El partial unique index ignora los CERRADOS (puede haber N cerrados sin problema).
-- Reversible: DROP INDEX "periodos_academicos_one_abierto";

CREATE UNIQUE INDEX "periodos_academicos_one_abierto"
ON "periodos_academicos"("estado")
WHERE "estado" = 'ABIERTO';

-- Cambiar default de ABIERTO → CERRADO: nuevos períodos nacen cerrados.
-- El admin debe abrirlos explícitamente una vez que esté listo.
ALTER TABLE "periodos_academicos" ALTER COLUMN "estado" SET DEFAULT 'CERRADO';
