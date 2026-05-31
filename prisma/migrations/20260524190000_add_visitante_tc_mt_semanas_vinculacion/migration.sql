-- Migration: add_visitante_tc_mt_semanas_vinculacion
-- Adds VISITANTE_TC and VISITANTE_MT, removes VISITANTE, adds semanasVinculacion.
--
-- PostgreSQL restrictions in play:
--   1. ALTER TYPE ADD VALUE cannot be used in the same transaction as the new values.
--      Solution: skip ADD VALUE entirely — just rename + recreate the type.
--   2. USING clause of ALTER COLUMN TYPE does not allow subqueries.
--      Solution: convert the array column to text[], UPDATE it, then cast back.

-- Step 1: Rename the old enum so the new one can take its name
ALTER TYPE "Modalidad" RENAME TO "Modalidad_old";

-- Step 2: Create the new enum (VISITANTE removed, VISITANTE_TC / VISITANTE_MT added)
CREATE TYPE "Modalidad" AS ENUM (
  'PLANTA_TC',
  'PLANTA_MT',
  'OCASIONAL_TC',
  'OCASIONAL_MT',
  'CATEDRA',
  'VISITANTE_TC',
  'VISITANTE_MT',
  'INVITADO'
);

-- Step 3: Migrate scalar columns — CASE in USING is allowed for scalar expressions
ALTER TABLE "docentes"
  ALTER COLUMN "modalidad" TYPE "Modalidad"
  USING CASE
    WHEN "modalidad"::text = 'VISITANTE' THEN 'VISITANTE_TC'::"Modalidad"
    ELSE "modalidad"::text::"Modalidad"
  END;

ALTER TABLE "parametros_modalidad"
  ALTER COLUMN "modalidad" TYPE "Modalidad"
  USING CASE
    WHEN "modalidad"::text = 'VISITANTE' THEN 'VISITANTE_TC'::"Modalidad"
    ELSE "modalidad"::text::"Modalidad"
  END;

-- Step 4: Array column — must go through text[] because USING forbids subqueries.
--   4a. Cast enum[] → text[]
ALTER TABLE "catalogo_actividades"
  ALTER COLUMN "aplicaSoloAModalidades" TYPE text[]
  USING "aplicaSoloAModalidades"::text[];

--   4b. Replace the string value in the text array
UPDATE "catalogo_actividades"
  SET "aplicaSoloAModalidades" = array_replace(
    "aplicaSoloAModalidades",
    'VISITANTE',
    'VISITANTE_TC'
  )
  WHERE 'VISITANTE' = ANY("aplicaSoloAModalidades");

--   4c. Cast text[] → new Modalidad[]
ALTER TABLE "catalogo_actividades"
  ALTER COLUMN "aplicaSoloAModalidades" TYPE "Modalidad"[]
  USING "aplicaSoloAModalidades"::"Modalidad"[];

-- Step 5: Drop the old enum (no columns reference it anymore)
DROP TYPE "Modalidad_old";

-- Step 6: Add semanasVinculacion to docentes (nullable)
ALTER TABLE "docentes" ADD COLUMN IF NOT EXISTS "semanasVinculacion" INTEGER;
