-- Migration: fix_cargo_ambito_cruzado
-- Corrige datos antiguos donde `cargoAmbitoValor` no coincidía con el programa/facultad
-- propio del docente (ej. un Jefe de Programa de "Ing. Civil" guardado como ámbito
-- "Ing. Agrícola"). La regla es: el ámbito del cargo SIEMPRE es el del propio docente.
-- Esto corrige tanto el display (perfil, gestión) como el SCOPE de autoridad
-- (getAutoridadAcademica usa cargoAmbitoValor). Mapeo según CARGO_AMBITO (src/lib/constants.ts).

-- Jefe de Programa → su propio programa.
UPDATE "docentes"
SET "cargoAmbitoValor" = "programa"
WHERE "cargoAdministrativo" = true
  AND "tipoCargo" = 'JEFE_PROGRAMA'
  AND "cargoAmbitoValor" IS DISTINCT FROM "programa";

-- Cargos de ámbito facultad → su propia facultad.
UPDATE "docentes"
SET "cargoAmbitoValor" = "facultad"
WHERE "cargoAdministrativo" = true
  AND "tipoCargo" IN (
    'DECANO',
    'COORD_INVESTIGACION',
    'COORD_EMPRENDIMIENTO',
    'COORD_AUTOEVALUACION',
    'COORD_AREA'
  )
  AND "cargoAmbitoValor" IS DISTINCT FROM "facultad";

-- Cargos sin ámbito (o sin cargo) → ámbito en NULL.
UPDATE "docentes"
SET "cargoAmbitoValor" = NULL
WHERE "cargoAmbitoValor" IS NOT NULL
  AND (
    "cargoAdministrativo" = false
    OR "tipoCargo" IS NULL
    OR "tipoCargo" NOT IN (
      'JEFE_PROGRAMA',
      'DECANO',
      'COORD_INVESTIGACION',
      'COORD_EMPRENDIMIENTO',
      'COORD_AUTOEVALUACION',
      'COORD_AREA'
    )
  );
