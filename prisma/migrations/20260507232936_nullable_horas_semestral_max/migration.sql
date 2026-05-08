-- AlterTable: hacer horasSemestralMax nullable.
-- Semántica nueva: NULL = derivado en runtime (horasSemanalMax × semanasPeriodo).
-- Solo PLANTA_TC=880 y PLANTA_MT=440 conservan valor fijo (Acuerdo 048 Art. 4a/4b).
ALTER TABLE "parametros_modalidad" ALTER COLUMN "horasSemestralMax" DROP NOT NULL;

-- DataMigration: resetear a NULL las modalidades cuyo tope semestral es derivado
-- según el Acuerdo 048 (Art. 4c/4d/4e/4f). PLANTA_TC y PLANTA_MT NO se tocan: la
-- norma fija explícitamente sus 880/440 horas semestrales.
UPDATE "parametros_modalidad"
SET "horasSemestralMax" = NULL
WHERE "modalidad" IN ('OCASIONAL_TC', 'OCASIONAL_MT', 'CATEDRA', 'VISITANTE', 'INVITADO');
