/**
 * Seed inicial — SAGE
 *
 * Carga los valores normativos por defecto (Acuerdo 048/2018, 033/2024 y CA 009/2026)
 * en las nuevas tablas paramétricas. El SUPERADMIN podrá editarlos posteriormente.
 *
 * Uso: `npx prisma db seed`
 *
 * Este seed es idempotente — usa upsert por claves únicas.
 */

import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// =====================================================================
// 1. PARÁMETROS GLOBALES (default permanente — periodoId=null)
// =====================================================================

const parametrosGlobales = [
  {
    clave: "semanas_periodo",
    valor: "22",
    tipo: "int",
    descripcion: "Semanas por período académico",
    articuloOrigen: "Acuerdo 048/2018 Art. 4",
  },
  {
    clave: "horas_por_credito",
    valor: "48",
    tipo: "int",
    descripcion: "Horas totales de trabajo del estudiante por crédito académico",
    articuloOrigen: "Acuerdo 033/2024 Art. 15",
  },
  {
    clave: "horas_semanales_estudiante_min",
    valor: "40",
    tipo: "int",
    descripcion: "Horas semanales mínimas de trabajo del estudiante",
    articuloOrigen: "Acuerdo 033/2024 Art. 16 Par. 2",
  },
  {
    clave: "horas_semanales_estudiante_max",
    valor: "51",
    tipo: "int",
    descripcion: "Horas semanales máximas de trabajo del estudiante",
    articuloOrigen: "Acuerdo 033/2024 Art. 16 Par. 2",
  },
  {
    clave: "tolerancia_validacion_semanal",
    valor: "0.5",
    tipo: "float",
    descripcion: "Tolerancia (h/sem) al validar carga semestral total",
    articuloOrigen: "Interno",
  },
  {
    clave: "limite_gestion_porcentaje",
    valor: "0.20",
    tipo: "float",
    descripcion: "Tope máximo del tiempo en gestión académico-administrativa",
    articuloOrigen: "Acuerdo 048/2018 Art. 10",
  },
  {
    clave: "min_visitante_docencia_porcentaje",
    valor: "0.60",
    tipo: "float",
    descripcion: "Mínimo de la agenda en docencia para profesores visitantes",
    articuloOrigen: "Acuerdo 048/2018 Art. 3 Par. 3",
  },
  {
    clave: "min_estudiantes_subgrupo",
    valor: "10",
    tipo: "int",
    descripcion: "Mínimo de estudiantes por subgrupo en cursos divididos",
    articuloOrigen: "Acuerdo 048/2018 Art. 7",
  },
  {
    clave: "umbral_excepcion_subgrupo",
    valor: "20",
    tipo: "int",
    descripcion: "Umbral por debajo del cual no aplica el mínimo de subgrupo",
    articuloOrigen: "Acuerdo 048/2018 Art. 7",
  },
  {
    clave: "factor_preparacion_default",
    valor: "1.5",
    tipo: "float",
    descripcion: "Factor multiplicador de horas presenciales para tiempo de preparación",
    articuloOrigen: "Acuerdo 048/2018 Art. 3 Par. 4 (T-P)",
  },
  {
    clave: "horas_tutoria_default",
    valor: "1",
    tipo: "int",
    descripcion: "Horas semanales de tutoría sumadas a la fórmula docente",
    articuloOrigen: "Acuerdo 048/2018 Art. 3 Par. 4",
  },
] as const

// =====================================================================
// 2. PARÁMETROS POR MODALIDAD (default permanente)
// =====================================================================

// `horasSemestralMax: null` significa derivado en runtime (horasSemanalMax × semanasPeriodo).
// Solo PLANTA_TC/MT lo tienen fijado por norma (Art. 4a/4b: "880/440 horas en 22 semanas").
const parametrosModalidad = [
  // Planta TC — Art. 4a: tope semestral fijo por norma
  {
    modalidad: "PLANTA_TC" as const,
    sedeAplicable: null,
    horasSemanalMax: 40,
    horasSemestralMax: 880 as number | null,
    horasSemestralEstricto: true,
    minDocencia: 432,
    minDocenciaConProyectos: 288,
    maxInvProySocSemanal: null,
  },
  // Planta MT — Art. 4b: tope semestral fijo por norma
  {
    modalidad: "PLANTA_MT" as const,
    sedeAplicable: null,
    horasSemanalMax: 20,
    horasSemestralMax: 440 as number | null,
    horasSemestralEstricto: true,
    minDocencia: 240,
    minDocenciaConProyectos: 144,
    maxInvProySocSemanal: null,
  },
  // Ocasional TC — Art. 4c: "40 h/sem durante el período" (derivado)
  {
    modalidad: "OCASIONAL_TC" as const,
    sedeAplicable: null,
    horasSemanalMax: 40,
    horasSemestralMax: null as number | null,
    horasSemestralEstricto: true,
    minDocencia: 432,
    minDocenciaConProyectos: 288,
    maxInvProySocSemanal: null,
  },
  // Ocasional MT — Art. 4c (derivado)
  {
    modalidad: "OCASIONAL_MT" as const,
    sedeAplicable: null,
    horasSemanalMax: 20,
    horasSemestralMax: null as number | null,
    horasSemestralEstricto: true,
    minDocencia: 240,
    minDocenciaConProyectos: 144,
    maxInvProySocSemanal: null,
  },
  // Cátedra Neiva — Art. 4d: "HASTA 16 h/sem" (tope máximo derivado)
  {
    modalidad: "CATEDRA" as const,
    sedeAplicable: "NEIVA" as const,
    horasSemanalMax: 16,
    horasSemestralMax: null as number | null,
    horasSemestralEstricto: true,
    minDocencia: null,
    minDocenciaConProyectos: null,
    maxInvProySocSemanal: 4, // Art. 3 Par. 2
  },
  // Cátedra sedes regionales — Art. 4d: "HASTA 19 h/sem" (derivado)
  {
    modalidad: "CATEDRA" as const,
    sedeAplicable: "PITALITO" as const,
    horasSemanalMax: 19,
    horasSemestralMax: null as number | null,
    horasSemestralEstricto: true,
    minDocencia: null,
    minDocenciaConProyectos: null,
    maxInvProySocSemanal: 4,
  },
  {
    modalidad: "CATEDRA" as const,
    sedeAplicable: "GARZON" as const,
    horasSemanalMax: 19,
    horasSemestralMax: null as number | null,
    horasSemestralEstricto: true,
    minDocencia: null,
    minDocenciaConProyectos: null,
    maxInvProySocSemanal: 4,
  },
  {
    modalidad: "CATEDRA" as const,
    sedeAplicable: "LA_PLATA" as const,
    horasSemanalMax: 19,
    horasSemestralMax: null as number | null,
    horasSemestralEstricto: true,
    minDocencia: null,
    minDocenciaConProyectos: null,
    maxInvProySocSemanal: 4,
  },
  // Visitante — Art. 4e: "según tipo de dedicación" (derivado).
  // El mínimo 60 % docencia (Art. 3 Par. 3) se calcula sobre el total derivado, no aquí.
  {
    modalidad: "VISITANTE" as const,
    sedeAplicable: null,
    horasSemanalMax: 40,
    horasSemestralMax: null as number | null,
    horasSemestralEstricto: false,
    minDocencia: null,
    minDocenciaConProyectos: null,
    maxInvProySocSemanal: null,
  },
  // Invitado — Art. 4f: "hasta 100% según vinculación" (derivado)
  {
    modalidad: "INVITADO" as const,
    sedeAplicable: null,
    horasSemanalMax: 40,
    horasSemestralMax: null as number | null,
    horasSemestralEstricto: false,
    minDocencia: null,
    minDocenciaConProyectos: null,
    maxInvProySocSemanal: null,
    requiereAprobacionCA: true,
  },
] as const

// =====================================================================
// 3. FÓRMULAS POR TIPO DE CURSO × FACULTAD (Art. 3 Par. 4)
// =====================================================================

const formulasCurso = [
  // Default global (todas las facultades excepto Salud/Ciencias Naturales/Educ. Ambiental)
  // T-P: (h * 1.5) + 1
  {
    tipoCurso: "TEORICO_PRACTICO" as const,
    facultad: null,
    factorHoras: 1.5,
    constanteSuma: 1,
    maxCreditosTrabajoIndep: null,
    articuloOrigen: "Acuerdo 048/2018 Art. 3 Par. 4 (default)",
  },
  // T: (h * 1.5) + 1 — usado actualmente como default heurístico
  {
    tipoCurso: "TEORICO" as const,
    facultad: null,
    factorHoras: 1.5,
    constanteSuma: 1,
    maxCreditosTrabajoIndep: null,
    articuloOrigen: "Acuerdo 048/2018 Art. 3 Par. 4 (default)",
  },
  // Práctico — relación 1:3 (033/2024 Art. 17), aproximado como factor 1
  {
    tipoCurso: "PRACTICO" as const,
    facultad: null,
    factorHoras: 1,
    constanteSuma: 0,
    maxCreditosTrabajoIndep: null,
    articuloOrigen: "Acuerdo 033/2024 Art. 17 num. 3",
  },
  // Excepción Facultad de Salud — T: (h * 2) + 1
  {
    tipoCurso: "TEORICO" as const,
    facultad: "Salud",
    factorHoras: 2,
    constanteSuma: 1,
    maxCreditosTrabajoIndep: 3,
    articuloOrigen: "Acuerdo 048/2018 Art. 3 Par. 4 (Salud)",
  },
  {
    tipoCurso: "TEORICO_PRACTICO" as const,
    facultad: "Salud",
    factorHoras: 1.5,
    constanteSuma: 1,
    maxCreditosTrabajoIndep: 3,
    articuloOrigen: "Acuerdo 048/2018 Art. 3 Par. 4 (Salud)",
  },
  // Ciencias Naturales y Educación Ambiental — mismas fórmulas
  {
    tipoCurso: "TEORICO" as const,
    facultad: "Ciencias Exactas y Naturales",
    factorHoras: 2,
    constanteSuma: 1,
    maxCreditosTrabajoIndep: 3,
    articuloOrigen: "Acuerdo 048/2018 Art. 3 Par. 4",
  },
  {
    tipoCurso: "TEORICO_PRACTICO" as const,
    facultad: "Ciencias Exactas y Naturales",
    factorHoras: 1.5,
    constanteSuma: 1,
    maxCreditosTrabajoIndep: 3,
    articuloOrigen: "Acuerdo 048/2018 Art. 3 Par. 4",
  },
] as const

// =====================================================================
// 4. CARGOS ADMINISTRATIVOS (Art. 11 — Administrativas)
// =====================================================================

const cargosAdministrativos = [
  { codigo: "RECTOR", nombre: "Rector", horasAsignadas: 880, excluyeTopeGestion20: true },
  { codigo: "VICERRECTOR_ACADEMICO", nombre: "Vicerrector Académico", horasAsignadas: 880, excluyeTopeGestion20: true },
  { codigo: "VICERRECTOR_ADMINISTRATIVO", nombre: "Vicerrector Administrativo", horasAsignadas: 880, excluyeTopeGestion20: true },
  { codigo: "VICERRECTOR_INV_PS", nombre: "Vicerrector de Investigación y Proyección Social", horasAsignadas: 880, excluyeTopeGestion20: true },
  { codigo: "DECANO", nombre: "Decano", horasAsignadas: 880, excluyeTopeGestion20: true },
  { codigo: "ASESOR_VICERRECTOR", nombre: "Asesor de Vicerrectoría", horasAsignadas: 440, excluyeTopeGestion20: true },
  { codigo: "ASESOR_RECTOR", nombre: "Asesor del Rector", horasAsignadas: 440, excluyeTopeGestion20: true, requiereResolucionRector: true },
  { codigo: "JEFE_PROGRAMA", nombre: "Jefe de Programa", horasAsignadas: 660, excluyeTopeGestion20: true },
  { codigo: "JEFE_DEPARTAMENTO", nombre: "Jefe de Departamento", horasAsignadas: 330, excluyeTopeGestion20: true },
  { codigo: "COORD_PROGRAMA_SEDE", nombre: "Coordinación de programas en Sedes Regionales", horasAsignadas: 132, requiereResolucionRector: true },
  { codigo: "COORD_GRANJA_USCO", nombre: "Coordinación Granja Experimental USCO", horasAsignadas: 440 },
  { codigo: "REP_CONSEJO_ACADEMICO", nombre: "Representación al Consejo Académico", horasAsignadas: 132 },
  { codigo: "REP_CONSEJO_SUPERIOR", nombre: "Representación al Consejo Superior Universitario", horasAsignadas: 132 },
  { codigo: "REP_CONSEJO_FACULTAD", nombre: "Representación al Consejo de Facultad", horasAsignadas: 64 },
  { codigo: "REP_CSED", nombre: "Representación al CSED", horasAsignadas: 64 },
  { codigo: "REP_CAP", nombre: "Representación al CAP", horasAsignadas: 64 },
] as const

// =====================================================================
// 5. CATÁLOGO DE ACTIVIDADES (Art. 11)
// =====================================================================

const catalogoActividades = [
  // ========== DOCENCIA ==========
  {
    categoria: "DOCENCIA" as const,
    nombre: "Consejería Académica",
    topeSemestralH: 48,
    topePorUnidad: "COHORTE" as const,
    unidadMax: 2,
    descripcion: "Hasta 2 cohortes simultáneas, hasta sexto semestre",
    articuloOrigen: "Art. 11 — Docencia",
  },
  {
    categoria: "DOCENCIA" as const,
    nombre: "Asesoría de Práctica Profesional / Docente",
    topeSemanalHPorUnidad: 2,
    topePorUnidad: "ESTUDIANTE" as const,
    descripcion: "2 h/sem por estudiante",
    articuloOrigen: "Art. 11 — Docencia",
  },
  {
    categoria: "DOCENCIA" as const,
    nombre: "Asesoría de modalidades de grado distintas a tesis y monografías",
    topeSemanalHPorUnidad: 2,
    topePorUnidad: "ESTUDIANTE" as const,
    descripcion: "2 h/sem por estudiante o proyecto",
    articuloOrigen: "Art. 11 — Docencia",
  },
  {
    categoria: "DOCENCIA" as const,
    nombre: "Comité Autoevaluación y Acreditación del Programa",
    topeSemestralH: 600,
    descripcion: "Por período académico y por programa",
    articuloOrigen: "Art. 11 — Docencia",
  },
  {
    categoria: "DOCENCIA" as const,
    nombre: "Comité Acreditación Institucional",
    topeSemestralH: 64,
    aplicaUnoPorFacultad: true,
    articuloOrigen: "Art. 11 — Docencia",
  },
  {
    categoria: "DOCENCIA" as const,
    nombre: "Representación al Comité de Currículo de Facultad",
    topeSemestralH: 64,
    articuloOrigen: "Art. 11 — Docencia",
  },
  {
    categoria: "DOCENCIA" as const,
    nombre: "Coordinación de Currículo de Facultad y Comité Central de Currículo",
    topeSemestralH: 80,
    articuloOrigen: "Art. 11 — Docencia",
  },
  {
    categoria: "DOCENCIA" as const,
    nombre: "Reuniones de Programa o Departamento",
    topeSemestralH: 88,
    articuloOrigen: "Art. 11 — Docencia",
  },
  {
    categoria: "DOCENCIA" as const,
    nombre: "Coordinación de Programas de Postgrados subsidiados",
    topeSemestralH: 220,
    articuloOrigen: "Art. 11 — Docencia",
  },
  {
    categoria: "DOCENCIA" as const,
    nombre: "Coordinación de la Escuela de Formación Pedagógica",
    topeSemestralH: 220,
    articuloOrigen: "Art. 11 — Docencia",
  },
  {
    categoria: "DOCENCIA" as const,
    nombre: "Participación en la Escuela de Formación Pedagógica",
    topeSemestralH: 88,
    articuloOrigen: "Art. 11 — Docencia",
  },
  {
    categoria: "DOCENCIA" as const,
    nombre: "Coordinación de Laboratorios de Docencia",
    topeSemestralH: 44,
    articuloOrigen: "Art. 11 — Docencia",
  },

  // ========== INVESTIGACIÓN ==========
  {
    categoria: "INVESTIGACION" as const,
    nombre: "Coordinación de Investigación en la Facultad / COCEIN",
    topeSemestralH: 220,
    aplicaUnoPorFacultad: true,
    articuloOrigen: "Art. 11 — Investigación",
  },
  {
    categoria: "INVESTIGACION" as const,
    nombre: "Coordinación de Investigación en las Sedes",
    topeSemestralH: 88,
    aplicaUnoPorSede: true,
    articuloOrigen: "Art. 11 — Investigación",
  },
  {
    categoria: "INVESTIGACION" as const,
    nombre: "Dirección de grupo de investigación categorizado",
    topeSemestralH: 32,
    articuloOrigen: "Art. 11 — Investigación",
  },
  {
    categoria: "INVESTIGACION" as const,
    nombre: "Investigador Principal",
    topeSemestralH: 220,
    requiereProyectoAprobado: true,
    articuloOrigen: "Art. 11 — Investigación",
  },
  {
    categoria: "INVESTIGACION" as const,
    nombre: "Coinvestigador",
    topeSemestralH: 176,
    requiereProyectoAprobado: true,
    articuloOrigen: "Art. 11 — Investigación",
  },
  {
    categoria: "INVESTIGACION" as const,
    nombre: "Coordinación de Centros de Investigación / Emprendimiento e Innovación",
    topeSemestralH: 220,
    restriccionTemporalAnos: 2,
    descripcion: "Mínimo 3 grupos adscritos para Centros de Investigación. Máximo 2 años (luego autofinanciado)",
    articuloOrigen: "Art. 11 + Art. 12 Par. 2",
  },
  {
    categoria: "INVESTIGACION" as const,
    nombre: "Dirección de trabajos de grado pregrado",
    topeSemanalHPorUnidad: 2,
    topePorUnidad: "PROYECTO" as const,
    cantidadMaxSimultaneos: 3,
    descripcion: "Máx. 3 trabajos simultáneos. Máx. 2 períodos por trabajo",
    articuloOrigen: "Art. 11 — Investigación",
  },
  {
    categoria: "INVESTIGACION" as const,
    nombre: "Dirección de trabajos de grado postgrado no autofinanciado",
    topeSemanalHPorUnidad: 4,
    topePorUnidad: "PROYECTO" as const,
    cantidadMaxSimultaneos: 3,
    aplicaAPregrado: false,
    aplicaAPosgrado: true,
    descripcion: "Máx. 3 trabajos simultáneos. Máx. 2 períodos por trabajo",
    articuloOrigen: "Art. 11 — Investigación",
  },
  {
    categoria: "INVESTIGACION" as const,
    nombre: "Tutor de Semilleros de Investigación",
    topeSemestralH: 44,
    articuloOrigen: "Art. 11 — Investigación",
  },
  {
    categoria: "INVESTIGACION" as const,
    nombre: "Jurado Evaluador de trabajo de Investigación como modalidad de grado",
    topeSemestralH: 12,
    descripcion: "Valor fijo (no es techo)",
    articuloOrigen: "Art. 11 — Investigación",
  },
  {
    categoria: "INVESTIGACION" as const,
    nombre: "Estudios de Doctorado",
    topeSemestralH: 220,
    articuloOrigen: "Art. 11 — Investigación",
  },
  {
    categoria: "INVESTIGACION" as const,
    nombre: "Comisiones de estudio",
    topeSemestralH: 880,
    articuloOrigen: "Art. 11 — Investigación",
  },
  {
    categoria: "INVESTIGACION" as const,
    nombre: "Editor y miembro Comité Editorial Revistas Científico-Académicas",
    topeSemestralH: 110,
    aplicaUnoPorFacultad: true,
    articuloOrigen: "Art. 11 — Investigación",
  },
  {
    categoria: "INVESTIGACION" as const,
    nombre: "Miembro del Comité Editorial Universidad Surcolombiana",
    topeSemestralH: 44,
    aplicaUnoPorFacultad: true,
    articuloOrigen: "Art. 11 — Investigación",
  },
  {
    categoria: "INVESTIGACION" as const,
    nombre: "Coordinación Editorial Surcolombiana",
    topeSemestralH: 220,
    articuloOrigen: "Art. 11 — Investigación",
  },

  // ========== PROYECCIÓN SOCIAL ==========
  {
    categoria: "PROYECCION_SOCIAL" as const,
    nombre: "Coordinación de Proyección Social e Internacionalización de Facultad",
    topeSemestralH: 220,
    aplicaUnoPorFacultad: true,
    articuloOrigen: "Art. 11 — Proyección Social",
  },
  {
    categoria: "PROYECCION_SOCIAL" as const,
    nombre: "Coordinador proyectos de proyección social aprobados por convocatoria institucional",
    topeSemestralH: 220,
    requiereProyectoAprobado: true,
    articuloOrigen: "Art. 11 — Proyección Social",
  },
  {
    categoria: "PROYECCION_SOCIAL" as const,
    nombre: "Cogestor proyectos de proyección social aprobados por convocatoria institucional",
    topeSemestralH: 110,
    requiereProyectoAprobado: true,
    articuloOrigen: "Art. 11 — Proyección Social",
  },
  {
    categoria: "PROYECCION_SOCIAL" as const,
    nombre: "Coordinador de Proyectos Institucionales",
    topeSemestralH: 220,
    articuloOrigen: "Art. 11 — Proyección Social",
  },
  {
    categoria: "PROYECCION_SOCIAL" as const,
    nombre: "Cogestor de Proyectos Institucionales",
    topeSemestralH: 110,
    articuloOrigen: "Art. 11 — Proyección Social",
  },
  {
    categoria: "PROYECCION_SOCIAL" as const,
    nombre: "Coordinación de prácticas y pasantías de programas profesionales",
    topeSemestralH: 90,
    articuloOrigen: "Art. 11 — Proyección Social",
  },
  {
    categoria: "PROYECCION_SOCIAL" as const,
    nombre: "Coordinación de prácticas y pasantías de Licenciaturas",
    topeSemestralH: 132,
    descripcion: "+44h adicionales al coordinador de facultad",
    articuloOrigen: "Art. 11 — Proyección Social",
  },
  {
    categoria: "PROYECCION_SOCIAL" as const,
    nombre: "Coordinación de internado rotatorio del programa de Medicina",
    topeSemestralH: 220,
    articuloOrigen: "Art. 11 — Proyección Social",
  },
  {
    categoria: "PROYECCION_SOCIAL" as const,
    nombre: "Coordinación del Laboratorio de Audiovisuales",
    topeSemestralH: 110,
    articuloOrigen: "Art. 11 — Proyección Social",
  },
  {
    categoria: "PROYECCION_SOCIAL" as const,
    nombre: "Coordinación del Herbario y Museos",
    topeSemestralH: 110,
    articuloOrigen: "Art. 11 — Proyección Social",
  },
  {
    categoria: "PROYECCION_SOCIAL" as const,
    nombre: "Coordinación de Consultorios y Centros de Prácticas",
    topeSemestralH: 220,
    articuloOrigen: "Art. 11 — Proyección Social",
  },
] as const

// =====================================================================
// EJECUCIÓN
// =====================================================================

/**
 * Helper idempotente para tablas con compound unique que incluye un campo nullable.
 * Prisma 7 no acepta `null` en compound `where`, así que usamos findFirst + create/update.
 */
async function upsertWhereNull<T extends { id: string }>(
  findFn: () => Promise<T | null>,
  createFn: () => Promise<T>,
  updateFn: (id: string) => Promise<T>
) {
  const existing = await findFn()
  if (existing) return updateFn(existing.id)
  return createFn()
}

async function main() {
  console.log("🌱 Sembrando reglas paramétricas (Acuerdo 048/2018, 033/2024)...\n")

  // 1. Parámetros globales
  for (const p of parametrosGlobales) {
    await upsertWhereNull(
      () => prisma.parametroGlobal.findFirst({ where: { periodoId: null, clave: p.clave } }),
      () => prisma.parametroGlobal.create({ data: { ...p, periodoId: null } }),
      (id) =>
        prisma.parametroGlobal.update({
          where: { id },
          data: {
            valor: p.valor,
            tipo: p.tipo,
            descripcion: p.descripcion,
            articuloOrigen: p.articuloOrigen,
          },
        })
    )
  }
  console.log(`✓ ${parametrosGlobales.length} parámetros globales`)

  // 2. Parámetros por modalidad
  for (const p of parametrosModalidad) {
    await upsertWhereNull(
      () =>
        prisma.parametrosModalidad.findFirst({
          where: {
            periodoId: null,
            modalidad: p.modalidad,
            sedeAplicable: p.sedeAplicable ?? null,
          },
        }),
      () => prisma.parametrosModalidad.create({ data: { ...p, periodoId: null } }),
      (id) => prisma.parametrosModalidad.update({ where: { id }, data: p })
    )
  }
  console.log(`✓ ${parametrosModalidad.length} parámetros por modalidad`)

  // 3. Fórmulas por tipo de curso × facultad
  for (const f of formulasCurso) {
    await upsertWhereNull(
      () =>
        prisma.formulaCurso.findFirst({
          where: {
            periodoId: null,
            tipoCurso: f.tipoCurso,
            facultad: f.facultad ?? null,
          },
        }),
      () => prisma.formulaCurso.create({ data: { ...f, periodoId: null } }),
      (id) => prisma.formulaCurso.update({ where: { id }, data: f })
    )
  }
  console.log(`✓ ${formulasCurso.length} fórmulas por tipo de curso`)

  // 4. Cargos administrativos
  for (const c of cargosAdministrativos) {
    await prisma.cargoAdministrativo.upsert({
      where: { codigo: c.codigo },
      create: { ...c, articuloOrigen: "Art. 11 — Administrativas" },
      update: { ...c, articuloOrigen: "Art. 11 — Administrativas" },
    })
  }
  console.log(`✓ ${cargosAdministrativos.length} cargos administrativos`)

  // 5. Catálogo de actividades
  for (const a of catalogoActividades) {
    await prisma.catalogoActividad.upsert({
      where: { categoria_nombre: { categoria: a.categoria, nombre: a.nombre } },
      create: a,
      update: a,
    })
  }
  console.log(`✓ ${catalogoActividades.length} actividades del catálogo`)

  // 6. Catálogo Maestro de Cursos
  //    - 18 cursos del Componente Básico de Ingeniería (Acuerdo CA 009/2026 Art. 5)
  //    - 5 cursos del Componente Básico Institucional (Acuerdo 033/2024 Art. 19)
  const cursosMaestro = [
    // Componente Básico Institucional (033/2024 Art. 19)
    {
      codigo: "CBINS001",
      nombre: "Constitución Política y Cultura de Paz",
      creditos: 2,
      tipo: "TEORICO" as const,
      componente: "BASICO_INSTITUCIONAL" as const,
      facultad: null,
      creditosT: 2,
      creditosP: null,
      horasSemT: 3,
      horasSemP: null,
      horasSemI: 3,
      acuerdoOrigen: "Acuerdo 033/2024 Art. 19",
    },
    {
      codigo: "CBINS002",
      nombre: "Ética y Bioética",
      creditos: 1,
      tipo: "TEORICO" as const,
      componente: "BASICO_INSTITUCIONAL" as const,
      facultad: null,
      creditosT: 1,
      creditosP: null,
      horasSemT: 2,
      horasSemP: null,
      horasSemI: 1,
      acuerdoOrigen: "Acuerdo 033/2024 Art. 19",
    },
    {
      codigo: "CBINS003",
      nombre: "Medio Ambiente",
      creditos: 1,
      tipo: "TEORICO" as const,
      componente: "BASICO_INSTITUCIONAL" as const,
      facultad: null,
      creditosT: 1,
      creditosP: null,
      horasSemT: 2,
      horasSemP: null,
      horasSemI: 1,
      acuerdoOrigen: "Acuerdo 033/2024 Art. 19",
    },
    {
      codigo: "CBINS004",
      nombre: "Comunicación Lingüística",
      creditos: 2,
      tipo: "TEORICO" as const,
      componente: "BASICO_INSTITUCIONAL" as const,
      facultad: null,
      creditosT: 2,
      creditosP: null,
      horasSemT: 3,
      horasSemP: null,
      horasSemI: 3,
      acuerdoOrigen: "Acuerdo 033/2024 Art. 19",
    },
    {
      codigo: "CBINS005",
      nombre: "Cátedra Surcolombiana",
      creditos: 1,
      tipo: "TEORICO" as const,
      componente: "BASICO_INSTITUCIONAL" as const,
      facultad: null,
      creditosT: 1,
      creditosP: null,
      horasSemT: 2,
      horasSemP: null,
      horasSemI: 1,
      acuerdoOrigen: "Acuerdo 033/2024 Art. 19 (no suma al plan)",
    },

    // Componente Básico de Ingeniería (CA 009/2026 Art. 5) — 18 cursos
    { codigo: "CBI001", nombre: "Fundamentos de Matemáticas", creditos: 3, tipo: "TEORICO" as const, componente: "BASICO_FACULTAD" as const, facultad: "Ingeniería", creditosT: 3, creditosP: null, horasSemT: 4, horasSemP: null, horasSemI: 5, acuerdoOrigen: "CA 009/2026 Art. 5" },
    { codigo: "CBI002", nombre: "Cálculo Diferencial", creditos: 3, tipo: "TEORICO" as const, componente: "BASICO_FACULTAD" as const, facultad: "Ingeniería", creditosT: 3, creditosP: null, horasSemT: 4, horasSemP: null, horasSemI: 5, acuerdoOrigen: "CA 009/2026 Art. 5" },
    { codigo: "CBI003", nombre: "Cálculo Integral", creditos: 3, tipo: "TEORICO" as const, componente: "BASICO_FACULTAD" as const, facultad: "Ingeniería", creditosT: 3, creditosP: null, horasSemT: 4, horasSemP: null, horasSemI: 5, acuerdoOrigen: "CA 009/2026 Art. 5" },
    { codigo: "CBI004", nombre: "Física Mecánica", creditos: 3, tipo: "TEORICO_PRACTICO" as const, componente: "BASICO_FACULTAD" as const, facultad: "Ingeniería", creditosT: 2, creditosP: 1, horasSemT: 3, horasSemP: 2, horasSemI: 4, acuerdoOrigen: "CA 009/2026 Art. 5" },
    { codigo: "CBI005", nombre: "Oscilaciones y Ondas", creditos: 3, tipo: "TEORICO_PRACTICO" as const, componente: "BASICO_FACULTAD" as const, facultad: "Ingeniería", creditosT: 2, creditosP: 1, horasSemT: 3, horasSemP: 2, horasSemI: 4, acuerdoOrigen: "CA 009/2026 Art. 5" },
    { codigo: "CBI006", nombre: "Física Electromagnética", creditos: 3, tipo: "TEORICO_PRACTICO" as const, componente: "BASICO_FACULTAD" as const, facultad: "Ingeniería", creditosT: 2, creditosP: 1, horasSemT: 3, horasSemP: 2, horasSemI: 4, acuerdoOrigen: "CA 009/2026 Art. 5" },
    { codigo: "CBI007", nombre: "Álgebra Lineal", creditos: 3, tipo: "TEORICO" as const, componente: "BASICO_FACULTAD" as const, facultad: "Ingeniería", creditosT: 3, creditosP: null, horasSemT: 4, horasSemP: null, horasSemI: 5, acuerdoOrigen: "CA 009/2026 Art. 5" },
    { codigo: "CBI008", nombre: "Cálculo Vectorial", creditos: 3, tipo: "TEORICO" as const, componente: "BASICO_FACULTAD" as const, facultad: "Ingeniería", creditosT: 3, creditosP: null, horasSemT: 4, horasSemP: null, horasSemI: 5, acuerdoOrigen: "CA 009/2026 Art. 5" },
    { codigo: "CBI009", nombre: "Ecuaciones Diferenciales", creditos: 3, tipo: "TEORICO" as const, componente: "BASICO_FACULTAD" as const, facultad: "Ingeniería", creditosT: 3, creditosP: null, horasSemT: 4, horasSemP: null, horasSemI: 5, acuerdoOrigen: "CA 009/2026 Art. 5" },
    { codigo: "CBI010", nombre: "Métodos Numéricos", creditos: 3, tipo: "TEORICO" as const, componente: "BASICO_FACULTAD" as const, facultad: "Ingeniería", creditosT: 3, creditosP: null, horasSemT: 4, horasSemP: null, horasSemI: 5, acuerdoOrigen: "CA 009/2026 Art. 5" },
    { codigo: "CBI011", nombre: "Biología General", creditos: 3, tipo: "TEORICO_PRACTICO" as const, componente: "BASICO_FACULTAD" as const, facultad: "Ingeniería", creditosT: 2, creditosP: 1, horasSemT: 3, horasSemP: 2, horasSemI: 4, acuerdoOrigen: "CA 009/2026 Art. 5" },
    { codigo: "CBI012", nombre: "Química General", creditos: 3, tipo: "TEORICO_PRACTICO" as const, componente: "BASICO_FACULTAD" as const, facultad: "Ingeniería", creditosT: 2, creditosP: 1, horasSemT: 3, horasSemP: 2, horasSemI: 4, acuerdoOrigen: "CA 009/2026 Art. 5" },
    { codigo: "CBI013", nombre: "Probabilidad y Estadística", creditos: 3, tipo: "TEORICO" as const, componente: "BASICO_FACULTAD" as const, facultad: "Ingeniería", creditosT: 3, creditosP: null, horasSemT: 4, horasSemP: null, horasSemI: 5, acuerdoOrigen: "CA 009/2026 Art. 5" },
    { codigo: "CBI014", nombre: "Pensamiento Algorítmico", creditos: 3, tipo: "TEORICO_PRACTICO" as const, componente: "BASICO_FACULTAD" as const, facultad: "Ingeniería", creditosT: 2, creditosP: 1, horasSemT: 2, horasSemP: 2, horasSemI: 5, acuerdoOrigen: "CA 009/2026 Art. 5" },
    { codigo: "CBI015", nombre: "Fundamentos de Administración y Economía", creditos: 2, tipo: "TEORICO" as const, componente: "BASICO_FACULTAD" as const, facultad: "Ingeniería", creditosT: 2, creditosP: null, horasSemT: 3, horasSemP: null, horasSemI: 3, acuerdoOrigen: "CA 009/2026 Art. 5" },
    { codigo: "CBI016", nombre: "Formulación y Evaluación de Proyectos", creditos: 2, tipo: "TEORICO" as const, componente: "BASICO_FACULTAD" as const, facultad: "Ingeniería", creditosT: 2, creditosP: null, horasSemT: 3, horasSemP: null, horasSemI: 3, acuerdoOrigen: "CA 009/2026 Art. 5" },
    { codigo: "CBI017", nombre: "Proyecto Interdisciplinario CDIO", creditos: 3, tipo: "PRACTICO" as const, componente: "BASICO_FACULTAD" as const, facultad: "Ingeniería", creditosT: null, creditosP: 3, horasSemT: null, horasSemP: 3, horasSemI: 6, acuerdoOrigen: "CA 009/2026 Art. 5" },
    { codigo: "CBI018", nombre: "Diseño Experimental", creditos: 2, tipo: "TEORICO" as const, componente: "BASICO_FACULTAD" as const, facultad: "Ingeniería", creditosT: 2, creditosP: null, horasSemT: 3, horasSemP: null, horasSemI: 3, acuerdoOrigen: "CA 009/2026 Art. 5" },
  ]

  for (const c of cursosMaestro) {
    await prisma.cursoMaestro.upsert({
      where: { codigo: c.codigo },
      create: c,
      update: {
        // No sobrescribir el flag `estado` para preservar toggles manuales del ADMIN
        nombre: c.nombre,
        creditos: c.creditos,
        tipo: c.tipo,
        componente: c.componente,
        facultad: c.facultad,
        creditosT: c.creditosT,
        creditosP: c.creditosP,
        horasSemT: c.horasSemT,
        horasSemP: c.horasSemP,
        horasSemI: c.horasSemI,
        acuerdoOrigen: c.acuerdoOrigen,
      },
    })
  }
  console.log(`✓ ${cursosMaestro.length} cursos del catálogo maestro (5 institucionales + 18 ingeniería)`)

  // 7. Usuario SUPERADMIN de prueba
  const superadminEmail = "superadmin@usco.edu.co"
  const superadminPassword = "SuperAdmin123!"
  const passwordHash = await bcrypt.hash(superadminPassword, 10)

  const superadmin = await prisma.docente.upsert({
    where: { email: superadminEmail },
    create: {
      email: superadminEmail,
      password: passwordHash,
      nombre: "Super Administrador SAGE",
      cedula: "0000000001",
      rol: "SUPERADMIN",
      estadoCuenta: "ACTIVO",
      sedeBase: "NEIVA",
      modalidad: "PLANTA_TC",
      facultad: "Administración Central",
      programa: "Sistema SAGE",
      doctorado: false,
      cargoAdministrativo: true,
      tipoCargo: "ASESOR_RECTOR",
      proyectosActivos: false,
      perfilVerificado: true,
    },
    update: {
      // No sobrescribir password si ya existe (preserva cambios manuales)
      rol: "SUPERADMIN",
      estadoCuenta: "ACTIVO",
      perfilVerificado: true,
    },
  })

  console.log(`✓ SUPERADMIN: ${superadmin.email}`)
  console.log(`   Password: ${superadminPassword}  (cámbiala tras primer login)`)

  console.log("\n🎉 Seed completado.")
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
