-- CreateEnum
CREATE TYPE "Modalidad" AS ENUM ('TCP', 'TCO', 'MTP', 'MTC', 'CATEDRA');

-- CreateEnum
CREATE TYPE "EstadoFormulario" AS ENUM ('BORRADOR', 'ENVIADO');

-- CreateTable
CREATE TABLE "docentes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "facultad" TEXT NOT NULL,
    "programa" TEXT NOT NULL,
    "celular" TEXT,
    "modalidad" "Modalidad" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "docentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos_guardados" (
    "id" TEXT NOT NULL,
    "docenteId" TEXT NOT NULL,
    "numeroCurso" TEXT NOT NULL,
    "nombreCurso" TEXT NOT NULL,
    "subgrupo" TEXT,
    "sede" TEXT,
    "horasPresenciales" INTEGER,
    "creditos" INTEGER,
    "semanas" INTEGER,

    CONSTRAINT "cursos_guardados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendas_semestrales" (
    "id" TEXT NOT NULL,
    "docenteId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoFormulario" NOT NULL DEFAULT 'BORRADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agendas_semestrales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos_agenda" (
    "id" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "numeroCurso" TEXT NOT NULL,
    "nombreCurso" TEXT NOT NULL,
    "subgrupo" TEXT,
    "sede" TEXT,
    "horasPresenciales" INTEGER NOT NULL,
    "creditos" INTEGER NOT NULL,
    "semanas" INTEGER NOT NULL,
    "dedicacionPeriodo" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "cursos_agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horarios_curso" (
    "id" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "lunes" TEXT,
    "martes" TEXT,
    "miercoles" TEXT,
    "jueves" TEXT,
    "viernes" TEXT,
    "sabado" TEXT,
    "domingo" TEXT,

    CONSTRAINT "horarios_curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actividades_docencia" (
    "id" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "dedicacionPeriodo" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "actividades_docencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actividades_investigacion" (
    "id" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "dedicacionPeriodo" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "actividades_investigacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actividades_proyeccion_social" (
    "id" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "dedicacionPeriodo" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "actividades_proyeccion_social_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actividades_gestion" (
    "id" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "dedicacionPeriodo" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "actividades_gestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoreos" (
    "id" TEXT NOT NULL,
    "docenteId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoFormulario" NOT NULL DEFAULT 'BORRADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitoreos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoreo_actividades_basicas" (
    "id" TEXT NOT NULL,
    "monitoreoId" TEXT NOT NULL,
    "actividadesDesarrolladas" TEXT NOT NULL,
    "periodoEjecucion" TEXT,
    "observaciones" TEXT,

    CONSTRAINT "monitoreo_actividades_basicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoreo_actividades_complementarias" (
    "id" TEXT NOT NULL,
    "monitoreoId" TEXT NOT NULL,
    "actividadesDesarrolladas" TEXT NOT NULL,
    "periodoEjecucion" TEXT,
    "observaciones" TEXT,

    CONSTRAINT "monitoreo_actividades_complementarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoreo_actividades_administrativas" (
    "id" TEXT NOT NULL,
    "monitoreoId" TEXT NOT NULL,
    "actividadesDesarrolladas" TEXT NOT NULL,
    "periodoEjecucion" TEXT,
    "observaciones" TEXT,

    CONSTRAINT "monitoreo_actividades_administrativas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoreo_actividades_desarrollo" (
    "id" TEXT NOT NULL,
    "monitoreoId" TEXT NOT NULL,
    "actividadesDesarrolladas" TEXT NOT NULL,
    "periodoEjecucion" TEXT,
    "observaciones" TEXT,

    CONSTRAINT "monitoreo_actividades_desarrollo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "docentes_email_key" ON "docentes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "docentes_cedula_key" ON "docentes"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "agendas_semestrales_docenteId_periodo_key" ON "agendas_semestrales"("docenteId", "periodo");

-- CreateIndex
CREATE UNIQUE INDEX "monitoreos_docenteId_periodo_key" ON "monitoreos"("docenteId", "periodo");

-- AddForeignKey
ALTER TABLE "cursos_guardados" ADD CONSTRAINT "cursos_guardados_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "docentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendas_semestrales" ADD CONSTRAINT "agendas_semestrales_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "docentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos_agenda" ADD CONSTRAINT "cursos_agenda_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "agendas_semestrales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horarios_curso" ADD CONSTRAINT "horarios_curso_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos_agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades_docencia" ADD CONSTRAINT "actividades_docencia_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "agendas_semestrales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades_investigacion" ADD CONSTRAINT "actividades_investigacion_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "agendas_semestrales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades_proyeccion_social" ADD CONSTRAINT "actividades_proyeccion_social_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "agendas_semestrales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades_gestion" ADD CONSTRAINT "actividades_gestion_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "agendas_semestrales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoreos" ADD CONSTRAINT "monitoreos_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "docentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoreo_actividades_basicas" ADD CONSTRAINT "monitoreo_actividades_basicas_monitoreoId_fkey" FOREIGN KEY ("monitoreoId") REFERENCES "monitoreos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoreo_actividades_complementarias" ADD CONSTRAINT "monitoreo_actividades_complementarias_monitoreoId_fkey" FOREIGN KEY ("monitoreoId") REFERENCES "monitoreos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoreo_actividades_administrativas" ADD CONSTRAINT "monitoreo_actividades_administrativas_monitoreoId_fkey" FOREIGN KEY ("monitoreoId") REFERENCES "monitoreos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoreo_actividades_desarrollo" ADD CONSTRAINT "monitoreo_actividades_desarrollo_monitoreoId_fkey" FOREIGN KEY ("monitoreoId") REFERENCES "monitoreos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
