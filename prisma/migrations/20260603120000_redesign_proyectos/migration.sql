-- Migration: redesign_proyectos
-- Reemplaza ProyectoDocente (1 docente por proyecto) por Proyecto + ParticipanteProyecto
-- (proyecto compartido con varios participantes, rol y horas por participante).
-- Preserva los datos existentes: cada proyecto_docente se convierte en un Proyecto
-- (creador = su docente) + un ParticipanteProyecto (ese docente, con su rol).

-- ===== 1. Crear tablas nuevas =====
CREATE TABLE "proyectos" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoProyecto" NOT NULL,
    "entidadConvocatoria" TEXT,
    "periodoInicio" TEXT,
    "estado" "EstadoFormulario" NOT NULL DEFAULT 'BORRADOR',
    "observacionesAdmin" TEXT,
    "creadorId" TEXT NOT NULL,
    "revisadoPor" TEXT,
    "revisadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proyectos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "participantes_proyecto" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "docenteId" TEXT NOT NULL,
    "rol" "RolEnProyecto" NOT NULL,
    "horasAsignadas" INTEGER,

    CONSTRAINT "participantes_proyecto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "proyectos_estado_idx" ON "proyectos"("estado");
CREATE INDEX "participantes_proyecto_docenteId_idx" ON "participantes_proyecto"("docenteId");
CREATE UNIQUE INDEX "participantes_proyecto_proyectoId_docenteId_key" ON "participantes_proyecto"("proyectoId", "docenteId");

ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_creadorId_fkey" FOREIGN KEY ("creadorId") REFERENCES "docentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "participantes_proyecto" ADD CONSTRAINT "participantes_proyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "participantes_proyecto" ADD CONSTRAINT "participantes_proyecto_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "docentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===== 2. Copiar datos existentes =====
INSERT INTO "proyectos" (
  "id","titulo","descripcion","tipo","entidadConvocatoria","periodoInicio",
  "estado","observacionesAdmin","creadorId","revisadoPor","revisadoEn","createdAt","updatedAt"
)
SELECT
  "id","titulo","descripcion","tipo","entidadConvocatoria","periodoInicio",
  "estado","observacionesAdmin","docenteId","revisadoPor","revisadoEn","createdAt","updatedAt"
FROM "proyectos_docente";

INSERT INTO "participantes_proyecto" ("id","proyectoId","docenteId","rol","horasAsignadas")
SELECT gen_random_uuid()::text, "id", "docenteId", "rolDocente", NULL
FROM "proyectos_docente";

-- ===== 3. Eliminar la tabla vieja =====
ALTER TABLE "proyectos_docente" DROP CONSTRAINT "proyectos_docente_docenteId_fkey";
DROP TABLE "proyectos_docente";
