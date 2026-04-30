-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('SUPERADMIN', 'ADMIN', 'DOCENTE');

-- CreateEnum
CREATE TYPE "Modalidad" AS ENUM ('PLANTA_TC', 'PLANTA_MT', 'OCASIONAL_TC', 'OCASIONAL_MT', 'CATEDRA', 'VISITANTE', 'INVITADO');

-- CreateEnum
CREATE TYPE "Sede" AS ENUM ('NEIVA', 'PITALITO', 'GARZON', 'LA_PLATA');

-- CreateEnum
CREATE TYPE "TipoCurso" AS ENUM ('TEORICO', 'TEORICO_PRACTICO', 'PRACTICO');

-- CreateEnum
CREATE TYPE "CategoriaActividad" AS ENUM ('DOCENCIA', 'INVESTIGACION', 'PROYECCION_SOCIAL', 'GESTION');

-- CreateEnum
CREATE TYPE "UnidadTope" AS ENUM ('NINGUNA', 'COHORTE', 'ESTUDIANTE', 'PROYECTO', 'FACULTAD', 'SEDE');

-- CreateEnum
CREATE TYPE "ComponenteCurricular" AS ENUM ('BASICO_INSTITUCIONAL', 'BASICO_FACULTAD', 'COMPLEMENTARIO_INSTITUCIONAL', 'COMPLEMENTARIO_FACULTAD', 'COMPLEMENTARIO_PROGRAMA', 'POSGRADO');

-- CreateEnum
CREATE TYPE "EstadoFormulario" AS ENUM ('BORRADOR', 'ENVIADO', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "EstadoCuenta" AS ENUM ('PENDIENTE', 'ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "EstadoPeriodo" AS ENUM ('ABIERTO', 'CERRADO');

-- CreateTable
CREATE TABLE "periodos_academicos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoPeriodo" NOT NULL DEFAULT 'ABIERTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periodos_academicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos_maestro" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "creditos" INTEGER NOT NULL,
    "tipo" "TipoCurso" NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "componente" "ComponenteCurricular",
    "facultad" TEXT,
    "creditosT" INTEGER,
    "creditosP" INTEGER,
    "horasSemT" INTEGER,
    "horasSemP" INTEGER,
    "horasSemI" INTEGER,
    "acuerdoOrigen" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cursos_maestro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "docentes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'DOCENTE',
    "estadoCuenta" "EstadoCuenta" NOT NULL DEFAULT 'PENDIENTE',
    "sedeBase" "Sede" NOT NULL,
    "modalidad" "Modalidad" NOT NULL,
    "facultad" TEXT NOT NULL,
    "programa" TEXT NOT NULL,
    "celular" TEXT,
    "doctorado" BOOLEAN NOT NULL DEFAULT false,
    "cargoAdministrativo" BOOLEAN NOT NULL DEFAULT false,
    "tipoCargo" TEXT,
    "proyectosActivos" BOOLEAN NOT NULL DEFAULT false,
    "perfilVerificado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "docentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos_guardados" (
    "id" TEXT NOT NULL,
    "docenteId" TEXT NOT NULL,
    "cursoMaestroId" TEXT,
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
    "estado" "EstadoFormulario" NOT NULL DEFAULT 'BORRADOR',
    "observacionesAdmin" TEXT,
    "rehabilitada" BOOLEAN NOT NULL DEFAULT false,
    "rehabilitadaCount" INTEGER NOT NULL DEFAULT 0,
    "ultimaRehabilitacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agendas_semestrales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos_agenda" (
    "id" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "cursoMaestroId" TEXT,
    "numeroCurso" TEXT NOT NULL,
    "nombreCurso" TEXT NOT NULL,
    "subgrupo" TEXT,
    "creditos" INTEGER NOT NULL,
    "sede" TEXT,
    "horasPresenciales" INTEGER NOT NULL,
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
CREATE TABLE "parametros_globales" (
    "id" TEXT NOT NULL,
    "periodoId" TEXT,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT,
    "articuloOrigen" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "parametros_globales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametros_modalidad" (
    "id" TEXT NOT NULL,
    "periodoId" TEXT,
    "modalidad" "Modalidad" NOT NULL,
    "sedeAplicable" "Sede",
    "horasSemanalMax" INTEGER NOT NULL,
    "horasSemestralMax" INTEGER NOT NULL,
    "horasSemestralEstricto" BOOLEAN NOT NULL DEFAULT true,
    "minDocencia" INTEGER,
    "minDocenciaConProyectos" INTEGER,
    "maxInvProySocSemanal" INTEGER,
    "requiereAprobacionCA" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametros_modalidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formulas_curso" (
    "id" TEXT NOT NULL,
    "periodoId" TEXT,
    "tipoCurso" "TipoCurso" NOT NULL,
    "facultad" TEXT,
    "factorHoras" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "constanteSuma" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "maxCreditosTrabajoIndep" INTEGER,
    "articuloOrigen" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formulas_curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogo_actividades" (
    "id" TEXT NOT NULL,
    "categoria" "CategoriaActividad" NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "topeSemestralH" INTEGER,
    "topePorUnidad" "UnidadTope" NOT NULL DEFAULT 'NINGUNA',
    "unidadMax" INTEGER,
    "topeSemanalHPorUnidad" DOUBLE PRECISION,
    "cantidadMaxSimultaneos" INTEGER,
    "restriccionTemporalAnos" INTEGER,
    "aplicaUnoPorFacultad" BOOLEAN NOT NULL DEFAULT false,
    "aplicaUnoPorSede" BOOLEAN NOT NULL DEFAULT false,
    "requiereResolucionRector" BOOLEAN NOT NULL DEFAULT false,
    "requiereProyectoAprobado" BOOLEAN NOT NULL DEFAULT false,
    "aplicaSoloAModalidades" "Modalidad"[],
    "aplicaAPregrado" BOOLEAN NOT NULL DEFAULT true,
    "aplicaAPosgrado" BOOLEAN NOT NULL DEFAULT true,
    "articuloOrigen" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalogo_actividades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargos_administrativos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "horasAsignadas" INTEGER NOT NULL,
    "excluyeTopeGestion20" BOOLEAN NOT NULL DEFAULT false,
    "requiereResolucionRector" BOOLEAN NOT NULL DEFAULT false,
    "articuloOrigen" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cargos_administrativos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rehabilitaciones_agenda" (
    "id" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "rehabilitadoPor" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "estadoOriginal" "EstadoFormulario" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,

    CONSTRAINT "rehabilitaciones_agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoreos" (
    "id" TEXT NOT NULL,
    "docenteId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "estado" "EstadoFormulario" NOT NULL DEFAULT 'BORRADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agendaId" TEXT NOT NULL,

    CONSTRAINT "monitoreos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes_docencia" (
    "id" TEXT NOT NULL,
    "monitoreoId" TEXT NOT NULL,
    "cursoAgendaId" TEXT NOT NULL,
    "horasEjecutadas" DOUBLE PRECISION NOT NULL,
    "productosEntregados" TEXT,

    CONSTRAINT "reportes_docencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes_actividad_docencia" (
    "id" TEXT NOT NULL,
    "monitoreoId" TEXT NOT NULL,
    "actividadDocenciaId" TEXT NOT NULL,
    "horasEjecutadas" DOUBLE PRECISION NOT NULL,
    "productosEntregados" TEXT,

    CONSTRAINT "reportes_actividad_docencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes_investigacion" (
    "id" TEXT NOT NULL,
    "monitoreoId" TEXT NOT NULL,
    "actividadInvestigacionId" TEXT NOT NULL,
    "horasEjecutadas" DOUBLE PRECISION NOT NULL,
    "productosEntregados" TEXT,

    CONSTRAINT "reportes_investigacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes_proyeccion" (
    "id" TEXT NOT NULL,
    "monitoreoId" TEXT NOT NULL,
    "actividadProyeccionSocialId" TEXT NOT NULL,
    "horasEjecutadas" DOUBLE PRECISION NOT NULL,
    "productosEntregados" TEXT,

    CONSTRAINT "reportes_proyeccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes_gestion" (
    "id" TEXT NOT NULL,
    "monitoreoId" TEXT NOT NULL,
    "actividadGestionId" TEXT NOT NULL,
    "horasEjecutadas" DOUBLE PRECISION NOT NULL,
    "productosEntregados" TEXT,

    CONSTRAINT "reportes_gestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "periodos_academicos_nombre_key" ON "periodos_academicos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "cursos_maestro_codigo_key" ON "cursos_maestro"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "docentes_email_key" ON "docentes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "docentes_cedula_key" ON "docentes"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "agendas_semestrales_docenteId_periodo_key" ON "agendas_semestrales"("docenteId", "periodo");

-- CreateIndex
CREATE UNIQUE INDEX "actividades_docencia_agendaId_nombre_key" ON "actividades_docencia"("agendaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "actividades_investigacion_agendaId_nombre_key" ON "actividades_investigacion"("agendaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "actividades_proyeccion_social_agendaId_nombre_key" ON "actividades_proyeccion_social"("agendaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "actividades_gestion_agendaId_nombre_key" ON "actividades_gestion"("agendaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "parametros_globales_periodoId_clave_key" ON "parametros_globales"("periodoId", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "parametros_modalidad_periodoId_modalidad_sedeAplicable_key" ON "parametros_modalidad"("periodoId", "modalidad", "sedeAplicable");

-- CreateIndex
CREATE UNIQUE INDEX "formulas_curso_periodoId_tipoCurso_facultad_key" ON "formulas_curso"("periodoId", "tipoCurso", "facultad");

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_actividades_categoria_nombre_key" ON "catalogo_actividades"("categoria", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "cargos_administrativos_codigo_key" ON "cargos_administrativos"("codigo");

-- CreateIndex
CREATE INDEX "rehabilitaciones_agenda_agendaId_idx" ON "rehabilitaciones_agenda"("agendaId");

-- CreateIndex
CREATE INDEX "rehabilitaciones_agenda_rehabilitadoPor_idx" ON "rehabilitaciones_agenda"("rehabilitadoPor");

-- CreateIndex
CREATE UNIQUE INDEX "monitoreos_agendaId_key" ON "monitoreos"("agendaId");

-- CreateIndex
CREATE UNIQUE INDEX "monitoreos_docenteId_periodo_key" ON "monitoreos"("docenteId", "periodo");

-- CreateIndex
CREATE UNIQUE INDEX "reportes_docencia_cursoAgendaId_key" ON "reportes_docencia"("cursoAgendaId");

-- CreateIndex
CREATE UNIQUE INDEX "reportes_actividad_docencia_actividadDocenciaId_key" ON "reportes_actividad_docencia"("actividadDocenciaId");

-- CreateIndex
CREATE UNIQUE INDEX "reportes_investigacion_actividadInvestigacionId_key" ON "reportes_investigacion"("actividadInvestigacionId");

-- CreateIndex
CREATE UNIQUE INDEX "reportes_proyeccion_actividadProyeccionSocialId_key" ON "reportes_proyeccion"("actividadProyeccionSocialId");

-- CreateIndex
CREATE UNIQUE INDEX "reportes_gestion_actividadGestionId_key" ON "reportes_gestion"("actividadGestionId");

-- AddForeignKey
ALTER TABLE "cursos_guardados" ADD CONSTRAINT "cursos_guardados_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "docentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos_guardados" ADD CONSTRAINT "cursos_guardados_cursoMaestroId_fkey" FOREIGN KEY ("cursoMaestroId") REFERENCES "cursos_maestro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendas_semestrales" ADD CONSTRAINT "agendas_semestrales_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "docentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos_agenda" ADD CONSTRAINT "cursos_agenda_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "agendas_semestrales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos_agenda" ADD CONSTRAINT "cursos_agenda_cursoMaestroId_fkey" FOREIGN KEY ("cursoMaestroId") REFERENCES "cursos_maestro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "parametros_globales" ADD CONSTRAINT "parametros_globales_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodos_academicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parametros_modalidad" ADD CONSTRAINT "parametros_modalidad_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodos_academicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formulas_curso" ADD CONSTRAINT "formulas_curso_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "periodos_academicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rehabilitaciones_agenda" ADD CONSTRAINT "rehabilitaciones_agenda_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "agendas_semestrales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoreos" ADD CONSTRAINT "monitoreos_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "docentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoreos" ADD CONSTRAINT "monitoreos_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "agendas_semestrales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_docencia" ADD CONSTRAINT "reportes_docencia_monitoreoId_fkey" FOREIGN KEY ("monitoreoId") REFERENCES "monitoreos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_docencia" ADD CONSTRAINT "reportes_docencia_cursoAgendaId_fkey" FOREIGN KEY ("cursoAgendaId") REFERENCES "cursos_agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_actividad_docencia" ADD CONSTRAINT "reportes_actividad_docencia_monitoreoId_fkey" FOREIGN KEY ("monitoreoId") REFERENCES "monitoreos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_actividad_docencia" ADD CONSTRAINT "reportes_actividad_docencia_actividadDocenciaId_fkey" FOREIGN KEY ("actividadDocenciaId") REFERENCES "actividades_docencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_investigacion" ADD CONSTRAINT "reportes_investigacion_monitoreoId_fkey" FOREIGN KEY ("monitoreoId") REFERENCES "monitoreos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_investigacion" ADD CONSTRAINT "reportes_investigacion_actividadInvestigacionId_fkey" FOREIGN KEY ("actividadInvestigacionId") REFERENCES "actividades_investigacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_proyeccion" ADD CONSTRAINT "reportes_proyeccion_monitoreoId_fkey" FOREIGN KEY ("monitoreoId") REFERENCES "monitoreos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_proyeccion" ADD CONSTRAINT "reportes_proyeccion_actividadProyeccionSocialId_fkey" FOREIGN KEY ("actividadProyeccionSocialId") REFERENCES "actividades_proyeccion_social"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_gestion" ADD CONSTRAINT "reportes_gestion_monitoreoId_fkey" FOREIGN KEY ("monitoreoId") REFERENCES "monitoreos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_gestion" ADD CONSTRAINT "reportes_gestion_actividadGestionId_fkey" FOREIGN KEY ("actividadGestionId") REFERENCES "actividades_gestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
