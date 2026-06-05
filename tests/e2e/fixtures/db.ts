/**
 * Acceso directo a la base de datos para preparar/limpiar el escenario del test.
 *
 * Instancia el cliente Prisma EXACTAMENTE como prisma/seed.ts (driver adapter pg),
 * porque `@/lib/prisma` es `server-only` y no se puede importar fuera de Next.
 */
import "dotenv/config"
import { PrismaClient } from "../../../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"
import { MARLIO, PERIODO } from "./marlio"
import {
  PROF_CALC,
  PERIODO_CALC,
  CURSOS,
  SEMANAS_CLASES,
  FACTORES,
  CONSTANTE_SUMA,
} from "./calculos"
import {
  ESCENARIOS,
  PERIODO_MOD,
  SEMANAS_PERIODO,
  SEMANAS_NO_PLANTA,
  CURSO_MEDIANO,
  CURSO_GRANDE,
  ACTIVIDAD_INV_QA,
} from "./modalidades"
import {
  DOCENTES_CONSEJ,
  PROGRAMAS_CONSEJ,
  PERIODO_CONSEJ,
  HORAS_POR_COHORTE,
  MAX_COHORTES,
} from "./consejeria"
import {
  PERIODO_VISTA,
  CONSEJEROS,
  PROGRAMA_A,
  PROGRAMA_B,
  COHORTE_VISTA,
  DECANO_VISTA,
  JEFE_VISTA,
} from "./consejeria-vista"
import { PERIODO_INV, INVITADOS } from "./invitado"
import {
  PERIODO_PROY,
  PROYECTO_INYECTADO,
  PROF_PROY,
  PROYECTO_COINV,
  PROF_COINV,
} from "./proyecto-inyectado"
import {
  PERIODO_DEMO,
  PROGRAMA_DEMO,
  COHORTE_DEMO,
  DOCENTE_DEMO,
  JEFE_DEMO,
  PROYECTO_APROBADO_DEMO,
  PROYECTO_PENDIENTE_DEMO,
} from "./demo"

function makePrisma() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

const DAY = 24 * 60 * 60 * 1000

/**
 * Deja la base lista para el test:
 *  1. Garantiza que exista un PeriodoAcademico "2025-2" ABIERTO con la ventana
 *     de agenda abierta hoy y la `fechaInicio` más reciente de todos los
 *     períodos abiertos → así es el período "activo" que verá el docente.
 *  2. Crea/actualiza al docente MARLIO con contraseña conocida y cuenta ACTIVA.
 *  3. Borra cualquier agenda previa de MARLIO en 2025-2 (cascada a sus hijos),
 *     para que la vista de "Nueva Agenda" se renderice en cada corrida.
 */
export async function prepararEscenario() {
  const prisma = makePrisma()
  try {
    // 1) Período activo "2025-2" con ventana abierta -------------------------
    const abiertos = await prisma.periodoAcademico.findMany({
      where: { estado: "ABIERTO", nombre: { not: PERIODO } },
      select: { fechaInicio: true },
      orderBy: { fechaInicio: "desc" },
      take: 1,
    })
    const base = abiertos[0]?.fechaInicio?.getTime() ?? Date.now()
    const fechaInicio = new Date(base + DAY) // estrictamente la más reciente
    const fechaFin = new Date(fechaInicio.getTime() + 22 * 7 * DAY) // ~22 semanas
    const ventanaDesde = new Date("2020-01-01T00:00:00Z")
    const ventanaHasta = new Date("2031-01-01T00:00:00Z")

    await prisma.periodoAcademico.upsert({
      where: { nombre: PERIODO },
      update: {
        estado: "ABIERTO",
        fechaInicio,
        fechaFin,
        agendaDesde: ventanaDesde,
        agendaHasta: ventanaHasta,
      },
      create: {
        nombre: PERIODO,
        estado: "ABIERTO",
        fechaInicio,
        fechaFin,
        agendaDesde: ventanaDesde,
        agendaHasta: ventanaHasta,
      },
    })

    // 2) Docente MARLIO ------------------------------------------------------
    const passwordHash = await bcrypt.hash(MARLIO.password, 10)
    const docente = await prisma.docente.upsert({
      where: { email: MARLIO.email },
      update: {
        password: passwordHash,
        nombre: MARLIO.nombre,
        cedula: MARLIO.cedula,
        rol: "DOCENTE",
        estadoCuenta: "ACTIVO",
        sedeBase: MARLIO.sedeBase,
        modalidad: MARLIO.modalidad,
        facultad: MARLIO.facultad,
        programa: MARLIO.programa,
        doctorado: false,
        cargoAdministrativo: true,
        tipoCargo: MARLIO.tipoCargo,
        proyectosActivos: false,
      },
      create: {
        email: MARLIO.email,
        password: passwordHash,
        nombre: MARLIO.nombre,
        cedula: MARLIO.cedula,
        rol: "DOCENTE",
        estadoCuenta: "ACTIVO",
        sedeBase: MARLIO.sedeBase,
        modalidad: MARLIO.modalidad,
        facultad: MARLIO.facultad,
        programa: MARLIO.programa,
        doctorado: false,
        cargoAdministrativo: true,
        tipoCargo: MARLIO.tipoCargo,
        proyectosActivos: false,
      },
    })

    // 3) Limpiar agenda previa (cascade borra cursos/actividades) ------------
    await prisma.agendaSemestral.deleteMany({
      where: { docenteId: docente.id, periodo: PERIODO },
    })

    return { docenteId: docente.id }
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Deja la base lista para el test de CÁLCULOS de la agenda:
 *  1. Garantiza el período activo "2025-2" con la ventana abierta (igual que MBC).
 *  2. Fuerza el parámetro `semanas_clases` y las fórmulas estándar Art. 3 Par. 4
 *     (TEÓRICO=2, TEÓRICO-PRÁCTICO=1.5, PRÁCTICO=1, +1) para que el cálculo sea
 *     determinista, sin depender del contenido del seed ni de ediciones por UI.
 *  3. Crea/actualiza los cursos QA del catálogo maestro.
 *  4. Crea/actualiza al docente PROF_CALC (PLANTA_TC) con cuenta ACTIVA.
 *  5. Borra cualquier agenda previa suya en el período (vista "Nueva Agenda" limpia).
 */
export async function prepararEscenarioCalculos() {
  const prisma = makePrisma()
  try {
    // 1) Período activo "2025-2" con ventana abierta -------------------------
    const abiertos = await prisma.periodoAcademico.findMany({
      where: { estado: "ABIERTO", nombre: { not: PERIODO_CALC } },
      select: { fechaInicio: true },
      orderBy: { fechaInicio: "desc" },
      take: 1,
    })
    const base = abiertos[0]?.fechaInicio?.getTime() ?? Date.now()
    const fechaInicio = new Date(base + DAY)
    const fechaFin = new Date(fechaInicio.getTime() + 22 * 7 * DAY)
    const ventanaDesde = new Date("2020-01-01T00:00:00Z")
    const ventanaHasta = new Date("2031-01-01T00:00:00Z")

    await prisma.periodoAcademico.upsert({
      where: { nombre: PERIODO_CALC },
      update: { estado: "ABIERTO", agendaDesde: ventanaDesde, agendaHasta: ventanaHasta },
      create: {
        nombre: PERIODO_CALC,
        estado: "ABIERTO",
        fechaInicio,
        fechaFin,
        agendaDesde: ventanaDesde,
        agendaHasta: ventanaHasta,
      },
    })

    // 2) Parámetro semanas_clases (global, periodoId null) -------------------
    const paramExistente = await prisma.parametroGlobal.findFirst({
      where: { periodoId: null, clave: "semanas_clases" },
    })
    if (paramExistente) {
      await prisma.parametroGlobal.update({
        where: { id: paramExistente.id },
        data: { valor: String(SEMANAS_CLASES), activo: true },
      })
    } else {
      await prisma.parametroGlobal.create({
        data: {
          clave: "semanas_clases",
          valor: String(SEMANAS_CLASES),
          tipo: "int",
          descripcion: "Semanas de clase (QA)",
          articuloOrigen: "Calendario académico USCO",
          periodoId: null,
          activo: true,
        },
      })
    }

    // 2b) Fórmulas estándar por tipo (global, sin facultad) ------------------
    for (const tipo of ["TEORICO", "TEORICO_PRACTICO", "PRACTICO"] as const) {
      const f = await prisma.formulaCurso.findFirst({
        where: { periodoId: null, tipoCurso: tipo, facultad: null },
      })
      const data = { factorHoras: FACTORES[tipo], constanteSuma: CONSTANTE_SUMA, activo: true }
      if (f) {
        await prisma.formulaCurso.update({ where: { id: f.id }, data })
      } else {
        await prisma.formulaCurso.create({
          data: { ...data, tipoCurso: tipo, facultad: null, periodoId: null },
        })
      }
    }

    // 3) Cursos QA del catálogo maestro --------------------------------------
    for (const c of CURSOS) {
      await prisma.cursoMaestro.upsert({
        where: { codigo: c.codigo },
        update: {
          nombre: c.nombre,
          creditos: c.creditos,
          tipo: c.tipo,
          estado: true,
          facultad: PROF_CALC.facultad,
          horasSemT: c.horasSemT,
          horasSemP: c.horasSemP,
          horasSemI: 0,
        },
        create: {
          codigo: c.codigo,
          nombre: c.nombre,
          creditos: c.creditos,
          tipo: c.tipo,
          estado: true,
          facultad: PROF_CALC.facultad,
          horasSemT: c.horasSemT,
          horasSemP: c.horasSemP,
          horasSemI: 0,
        },
      })
    }

    // 4) Docente PROF_CALC ---------------------------------------------------
    const passwordHash = await bcrypt.hash(PROF_CALC.password, 10)
    const comun = {
      password: passwordHash,
      nombre: PROF_CALC.nombre,
      cedula: PROF_CALC.cedula,
      rol: "DOCENTE" as const,
      estadoCuenta: "ACTIVO" as const,
      sedeBase: PROF_CALC.sedeBase,
      modalidad: PROF_CALC.modalidad,
      facultad: PROF_CALC.facultad,
      programa: PROF_CALC.programa,
      doctorado: false,
      cargoAdministrativo: false,
      tipoCargo: null,
      proyectosActivos: false,
    }
    const docente = await prisma.docente.upsert({
      where: { email: PROF_CALC.email },
      update: comun,
      create: { email: PROF_CALC.email, ...comun },
    })

    // 5) Limpiar agenda previa (cascade) -------------------------------------
    await prisma.agendaSemestral.deleteMany({
      where: { docenteId: docente.id, periodo: PERIODO_CALC },
    })

    return { docenteId: docente.id }
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Deja la base lista para el test de MODALIDADES (cálculos + reglas de envío):
 *  1. Período activo "2025-2" con ventana abierta.
 *  2. Fuerza parámetros globales (semanas) y fórmulas estándar (deterministas).
 *  3. Fuerza los ParametrosModalidad de las 4 modalidades clave (topes/mínimos del Acuerdo).
 *  4. Crea el curso grande QA y la actividad de investigación QA.
 *  5. Crea/actualiza un docente por modalidad (sin cargo, sin proyectos).
 *  6. Borra sus agendas previas.
 */
export async function prepararEscenarioModalidades() {
  const prisma = makePrisma()
  try {
    // 1) Período activo "2025-2" -------------------------------------------
    const abiertos = await prisma.periodoAcademico.findMany({
      where: { estado: "ABIERTO", nombre: { not: PERIODO_MOD } },
      select: { fechaInicio: true },
      orderBy: { fechaInicio: "desc" },
      take: 1,
    })
    const base = abiertos[0]?.fechaInicio?.getTime() ?? Date.now()
    const fechaInicio = new Date(base + DAY)
    const fechaFin = new Date(fechaInicio.getTime() + 22 * 7 * DAY)
    await prisma.periodoAcademico.upsert({
      where: { nombre: PERIODO_MOD },
      update: {
        estado: "ABIERTO",
        agendaDesde: new Date("2020-01-01T00:00:00Z"),
        agendaHasta: new Date("2031-01-01T00:00:00Z"),
      },
      create: {
        nombre: PERIODO_MOD,
        estado: "ABIERTO",
        fechaInicio,
        fechaFin,
        agendaDesde: new Date("2020-01-01T00:00:00Z"),
        agendaHasta: new Date("2031-01-01T00:00:00Z"),
      },
    })

    // 2) Parámetros globales de semanas (deterministas) ---------------------
    const globales: { clave: string; valor: string }[] = [
      { clave: "semanas_periodo", valor: String(SEMANAS_PERIODO) },
      { clave: "semanas_clases", valor: String(SEMANAS_CLASES) },
      { clave: "semanas_periodo_ocasional", valor: String(SEMANAS_NO_PLANTA) },
      { clave: "semanas_periodo_visitante", valor: String(SEMANAS_NO_PLANTA) },
      { clave: "semanas_periodo_catedra", valor: String(SEMANAS_NO_PLANTA) },
    ]
    for (const g of globales) {
      const ex = await prisma.parametroGlobal.findFirst({
        where: { periodoId: null, clave: g.clave },
      })
      if (ex) {
        await prisma.parametroGlobal.update({ where: { id: ex.id }, data: { valor: g.valor, activo: true } })
      } else {
        await prisma.parametroGlobal.create({
          data: { clave: g.clave, valor: g.valor, tipo: "int", descripcion: "QA", periodoId: null, activo: true },
        })
      }
    }

    // 2b) Fórmulas estándar por tipo ----------------------------------------
    for (const tipo of ["TEORICO", "TEORICO_PRACTICO", "PRACTICO"] as const) {
      const f = await prisma.formulaCurso.findFirst({
        where: { periodoId: null, tipoCurso: tipo, facultad: null },
      })
      const data = { factorHoras: FACTORES[tipo], constanteSuma: CONSTANTE_SUMA, activo: true }
      if (f) await prisma.formulaCurso.update({ where: { id: f.id }, data })
      else await prisma.formulaCurso.create({ data: { ...data, tipoCurso: tipo, facultad: null, periodoId: null } })
    }

    // 3) ParametrosModalidad de las 4 modalidades clave (Acuerdo 048) --------
    const modParams = [
      { modalidad: "PLANTA_TC" as const, sedeAplicable: null, horasSemanalMax: 40, horasSemestralMax: 880 as number | null, horasSemestralEstricto: true, minDocencia: 432 as number | null, minDocenciaConProyectos: 288 as number | null, maxInvProySocSemanal: null as number | null },
      { modalidad: "OCASIONAL_TC" as const, sedeAplicable: null, horasSemanalMax: 40, horasSemestralMax: null as number | null, horasSemestralEstricto: true, minDocencia: 432 as number | null, minDocenciaConProyectos: 288 as number | null, maxInvProySocSemanal: null as number | null },
      { modalidad: "VISITANTE_TC" as const, sedeAplicable: null, horasSemanalMax: 40, horasSemestralMax: null as number | null, horasSemestralEstricto: false, minDocencia: null as number | null, minDocenciaConProyectos: null as number | null, maxInvProySocSemanal: null as number | null },
      { modalidad: "CATEDRA" as const, sedeAplicable: "NEIVA" as const, horasSemanalMax: 16, horasSemestralMax: null as number | null, horasSemestralEstricto: true, minDocencia: null as number | null, minDocenciaConProyectos: null as number | null, maxInvProySocSemanal: 4 as number | null },
    ]
    for (const p of modParams) {
      const ex = await prisma.parametrosModalidad.findFirst({
        where: { periodoId: null, modalidad: p.modalidad, sedeAplicable: p.sedeAplicable ?? null },
      })
      if (ex) await prisma.parametrosModalidad.update({ where: { id: ex.id }, data: { ...p, activo: true } })
      else await prisma.parametrosModalidad.create({ data: { ...p, periodoId: null, activo: true } })
    }

    // 4) Cursos QA (mediano + grande) + actividad de investigación QA -------
    for (const c of [CURSO_MEDIANO, CURSO_GRANDE]) {
      const datos = {
        nombre: c.nombre,
        creditos: c.creditos,
        tipo: c.tipo,
        estado: true,
        facultad: "Facultad QA",
        horasSemT: c.horasSemT,
        horasSemP: c.horasSemP,
        horasSemI: 0,
      }
      await prisma.cursoMaestro.upsert({
        where: { codigo: c.codigo },
        update: datos,
        create: { codigo: c.codigo, ...datos },
      })
    }

    const actExistente = await prisma.catalogoActividad.findFirst({
      where: { categoria: ACTIVIDAD_INV_QA.categoria, nombre: ACTIVIDAD_INV_QA.nombre },
    })
    if (!actExistente) {
      await prisma.catalogoActividad.create({
        data: {
          categoria: ACTIVIDAD_INV_QA.categoria,
          nombre: ACTIVIDAD_INV_QA.nombre,
          descripcion: "Actividad de investigación QA sin tope propio",
          topeSemestralH: null,
          activo: true,
          articuloOrigen: "QA",
        },
      })
    } else {
      await prisma.catalogoActividad.update({
        where: { id: actExistente.id },
        data: { topeSemestralH: null, activo: true },
      })
    }

    // 5) Un docente por ESCENARIO (rechazo/acepta) — aislados ----------------
    const docenteIds: Record<string, string> = {}
    for (const esc of ESCENARIOS) {
      const d = esc.docente
      const passwordHash = await bcrypt.hash(d.password, 10)
      const comun = {
        password: passwordHash,
        nombre: d.nombre,
        cedula: d.cedula,
        rol: "DOCENTE" as const,
        estadoCuenta: "ACTIVO" as const,
        sedeBase: d.sedeBase,
        modalidad: d.modalidad,
        facultad: d.facultad,
        programa: d.programa,
        doctorado: false,
        cargoAdministrativo: false,
        tipoCargo: null,
        proyectosActivos: false,
        semanasVinculacion: d.semanasVinculacion,
      }
      const docente = await prisma.docente.upsert({
        where: { email: d.email },
        update: comun,
        create: { email: d.email, ...comun },
      })
      docenteIds[d.email] = docente.id

      // 6) Limpiar agenda previa (vista "Nueva Agenda" limpia en cada corrida)
      await prisma.agendaSemestral.deleteMany({
        where: { docenteId: docente.id, periodo: PERIODO_MOD },
      })
    }

    return docenteIds
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Deja la base lista para el test de CONSEJERÍA (Acuerdo 048 Art. 11):
 *  1. Período activo "2025-2".
 *  2. Fuerza el catálogo "Consejería Académica" (48h/cohorte, máx 2, por COHORTE).
 *  3. Fuerza ParametrosModalidad de CÁTEDRA (sin mínimo docencia → agenda solo-consejería envía).
 *  4. Crea los docentes de consejería (CÁTEDRA).
 *  5. Limpia sus agendas y TODOS los compromisos de sus programas (clave para aislar).
 */
export async function prepararEscenarioConsejeria() {
  const prisma = makePrisma()
  try {
    // 1) Período activo "2025-2" --------------------------------------------
    const abiertos = await prisma.periodoAcademico.findMany({
      where: { estado: "ABIERTO", nombre: { not: PERIODO_CONSEJ } },
      select: { fechaInicio: true },
      orderBy: { fechaInicio: "desc" },
      take: 1,
    })
    const base = abiertos[0]?.fechaInicio?.getTime() ?? Date.now()
    const fechaInicio = new Date(base + DAY)
    await prisma.periodoAcademico.upsert({
      where: { nombre: PERIODO_CONSEJ },
      update: {
        estado: "ABIERTO",
        agendaDesde: new Date("2020-01-01T00:00:00Z"),
        agendaHasta: new Date("2031-01-01T00:00:00Z"),
      },
      create: {
        nombre: PERIODO_CONSEJ,
        estado: "ABIERTO",
        fechaInicio,
        fechaFin: new Date(fechaInicio.getTime() + 22 * 7 * DAY),
        agendaDesde: new Date("2020-01-01T00:00:00Z"),
        agendaHasta: new Date("2031-01-01T00:00:00Z"),
      },
    })

    // 2) Catálogo "Consejería Académica" (48h/cohorte, máx 2, por COHORTE) ---
    const consejCat = await prisma.catalogoActividad.findFirst({
      where: { categoria: "DOCENCIA", nombre: "Consejería Académica" },
    })
    const datosConsej = {
      topeSemestralH: HORAS_POR_COHORTE,
      topePorUnidad: "COHORTE" as const,
      unidadMax: MAX_COHORTES,
      activo: true,
    }
    if (consejCat) {
      await prisma.catalogoActividad.update({ where: { id: consejCat.id }, data: datosConsej })
    } else {
      await prisma.catalogoActividad.create({
        data: {
          categoria: "DOCENCIA",
          nombre: "Consejería Académica",
          descripcion: "Hasta 2 cohortes; un solo consejero por cohorte y programa (6 semestres).",
          articuloOrigen: "Art. 11 — Docencia",
          ...datosConsej,
        },
      })
    }

    // 3) ParametrosModalidad CÁTEDRA (Neiva): sin mínimo de docencia ---------
    const catParam = {
      modalidad: "CATEDRA" as const,
      sedeAplicable: "NEIVA" as const,
      horasSemanalMax: 16,
      horasSemestralMax: null as number | null,
      horasSemestralEstricto: true,
      minDocencia: null as number | null,
      minDocenciaConProyectos: null as number | null,
      maxInvProySocSemanal: 4 as number | null,
    }
    const exCat = await prisma.parametrosModalidad.findFirst({
      where: { periodoId: null, modalidad: "CATEDRA", sedeAplicable: "NEIVA" },
    })
    if (exCat) await prisma.parametrosModalidad.update({ where: { id: exCat.id }, data: { ...catParam, activo: true } })
    else await prisma.parametrosModalidad.create({ data: { ...catParam, periodoId: null, activo: true } })

    // 4) Docentes de consejería + 5) limpieza de agendas --------------------
    const docenteIds: Record<string, string> = {}
    for (const d of DOCENTES_CONSEJ) {
      const passwordHash = await bcrypt.hash(d.password, 10)
      const comun = {
        password: passwordHash,
        nombre: d.nombre,
        cedula: d.cedula,
        rol: "DOCENTE" as const,
        estadoCuenta: "ACTIVO" as const,
        sedeBase: d.sedeBase,
        modalidad: d.modalidad,
        facultad: d.facultad,
        programa: d.programa,
        doctorado: false,
        cargoAdministrativo: false,
        tipoCargo: null,
        proyectosActivos: false,
        semanasVinculacion: d.semanasVinculacion,
      }
      const docente = await prisma.docente.upsert({
        where: { email: d.email },
        update: comun,
        create: { email: d.email, ...comun },
      })
      docenteIds[d.email] = docente.id
      await prisma.agendaSemestral.deleteMany({
        where: { docenteId: docente.id, periodo: PERIODO_CONSEJ },
      })
    }

    // 5b) Limpiar TODOS los compromisos de los programas de prueba ----------
    await prisma.consejeriaCompromiso.deleteMany({
      where: { programa: { in: PROGRAMAS_CONSEJ } },
    })

    return docenteIds
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Deja la base lista para el test de la VISTA de consejeros (/gestion/consejeria):
 *  1. Período activo "2025-2".
 *  2. Crea 2 consejeros (cátedra) en programas distintos de una misma facultad.
 *  3. Crea un Decano (facultad) y un Jefe (programa A) con autoridad académica.
 *  4. Siembra los compromisos ACTIVOS directo en DB (probamos la VISTA, no la reserva).
 */
export async function prepararEscenarioConsejeriaVista() {
  const prisma = makePrisma()
  try {
    // 1) Período activo "2025-2" --------------------------------------------
    await prisma.periodoAcademico.updateMany({
      where: { nombre: PERIODO_VISTA },
      data: {
        estado: "ABIERTO",
        agendaDesde: new Date("2020-01-01T00:00:00Z"),
        agendaHasta: new Date("2031-01-01T00:00:00Z"),
      },
    })

    // 2) Consejeros (cátedra) -----------------------------------------------
    const docenteIds: Record<string, string> = {}
    for (const c of CONSEJEROS) {
      const passwordHash = await bcrypt.hash(c.password, 10)
      const comun = {
        password: passwordHash,
        nombre: c.nombre,
        cedula: c.cedula,
        rol: "DOCENTE" as const,
        estadoCuenta: "ACTIVO" as const,
        sedeBase: c.sedeBase,
        modalidad: c.modalidad,
        facultad: c.facultad,
        programa: c.programa,
        doctorado: false,
        cargoAdministrativo: false,
        tipoCargo: null,
        proyectosActivos: false,
        semanasVinculacion: 16,
      }
      const d = await prisma.docente.upsert({
        where: { email: c.email },
        update: comun,
        create: { email: c.email, ...comun },
      })
      docenteIds[c.email] = d.id
    }

    // 3) Decano (facultad) y Jefe (programa A) con autoridad académica -------
    for (const a of [DECANO_VISTA, JEFE_VISTA]) {
      const passwordHash = await bcrypt.hash(a.password, 10)
      const comun = {
        password: passwordHash,
        nombre: a.nombre,
        cedula: a.cedula,
        rol: "DOCENTE" as const,
        estadoCuenta: "ACTIVO" as const,
        sedeBase: "NEIVA" as const,
        modalidad: "PLANTA_TC" as const,
        facultad: a.facultad,
        programa: a.programa,
        doctorado: false,
        cargoAdministrativo: true,
        tipoCargo: a.tipoCargo,
        cargoAmbitoValor: a.cargoAmbitoValor,
        proyectosActivos: false,
      }
      await prisma.docente.upsert({
        where: { email: a.email },
        update: comun,
        create: { email: a.email, ...comun },
      })
    }

    // 4) Compromisos ACTIVOS sembrados directo (uno por programa) -----------
    await prisma.consejeriaCompromiso.deleteMany({
      where: { programa: { in: [PROGRAMA_A, PROGRAMA_B] } },
    })
    for (const c of CONSEJEROS) {
      await prisma.consejeriaCompromiso.create({
        data: {
          docenteId: docenteIds[c.email],
          programa: c.programa,
          cohorte: COHORTE_VISTA,
          periodoInicio: PERIODO_VISTA,
          semestresCompromiso: c.semestresCompromiso,
          creadaEnPeriodo: PERIODO_VISTA,
          estado: "ACTIVO",
        },
      })
    }

    return docenteIds
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Deja la base lista para el test del INVITADO (Art. 4f):
 *  1. Período activo "2025-2".
 *  2. Fuerza ParametrosModalidad de INVITADO (40h/sem, sin tope fijo, no estricto).
 *  3. Crea 2 invitados: uno SIN horas autorizadas y otro CON (300h).
 */
export async function prepararEscenarioInvitado() {
  const prisma = makePrisma()
  try {
    await prisma.periodoAcademico.updateMany({
      where: { nombre: PERIODO_INV },
      data: {
        estado: "ABIERTO",
        agendaDesde: new Date("2020-01-01T00:00:00Z"),
        agendaHasta: new Date("2031-01-01T00:00:00Z"),
      },
    })

    // ParametrosModalidad INVITADO (Art. 4f): derivado, no estricto, sin mínimos.
    const invParam = {
      modalidad: "INVITADO" as const,
      sedeAplicable: null,
      horasSemanalMax: 40,
      horasSemestralMax: null as number | null,
      horasSemestralEstricto: false,
      minDocencia: null as number | null,
      minDocenciaConProyectos: null as number | null,
      maxInvProySocSemanal: null as number | null,
    }
    const exInv = await prisma.parametrosModalidad.findFirst({
      where: { periodoId: null, modalidad: "INVITADO", sedeAplicable: null },
    })
    if (exInv) await prisma.parametrosModalidad.update({ where: { id: exInv.id }, data: { ...invParam, activo: true } })
    else await prisma.parametrosModalidad.create({ data: { ...invParam, periodoId: null, activo: true } })

    const docenteIds: Record<string, string> = {}
    for (const inv of INVITADOS) {
      const passwordHash = await bcrypt.hash(inv.password, 10)
      const comun = {
        password: passwordHash,
        nombre: inv.nombre,
        cedula: inv.cedula,
        rol: "DOCENTE" as const,
        estadoCuenta: "ACTIVO" as const,
        sedeBase: inv.sedeBase,
        modalidad: inv.modalidad,
        facultad: inv.facultad,
        programa: inv.programa,
        doctorado: false,
        cargoAdministrativo: false,
        tipoCargo: null,
        proyectosActivos: false,
        invHorasContratadas: inv.invHorasContratadas,
      }
      const d = await prisma.docente.upsert({
        where: { email: inv.email },
        update: comun,
        create: { email: inv.email, ...comun },
      })
      docenteIds[inv.email] = d.id
      await prisma.agendaSemestral.deleteMany({
        where: { docenteId: d.id, periodo: PERIODO_INV },
      })
    }

    return docenteIds
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Deja la base lista para el test de PRECARGA de proyectos (Art. 11):
 *  1. Período activo "2025-2".
 *  2. Crea un docente (planta) con un proyecto APROBADO+activo donde participa.
 *  3. El proyecto abarca el período (fechas amplias) y tiene horas asignadas.
 */
export async function prepararEscenarioProyectoInyectado() {
  const prisma = makePrisma()
  try {
    await prisma.periodoAcademico.updateMany({
      where: { nombre: PERIODO_PROY },
      data: {
        estado: "ABIERTO",
        agendaDesde: new Date("2020-01-01T00:00:00Z"),
        agendaHasta: new Date("2031-01-01T00:00:00Z"),
      },
    })

    const passwordHash = await bcrypt.hash(PROF_PROY.password, 10)
    const comun = {
      password: passwordHash,
      nombre: PROF_PROY.nombre,
      cedula: PROF_PROY.cedula,
      rol: "DOCENTE" as const,
      estadoCuenta: "ACTIVO" as const,
      sedeBase: PROF_PROY.sedeBase,
      modalidad: PROF_PROY.modalidad,
      facultad: PROF_PROY.facultad,
      programa: PROF_PROY.programa,
      doctorado: false,
      cargoAdministrativo: false,
      tipoCargo: null,
      proyectosActivos: true,
    }
    const docente = await prisma.docente.upsert({
      where: { email: PROF_PROY.email },
      update: comun,
      create: { email: PROF_PROY.email, ...comun },
    })

    // Limpiar agenda + proyectos QA previos del docente (cascade borra participantes).
    await prisma.agendaSemestral.deleteMany({ where: { docenteId: docente.id, periodo: PERIODO_PROY } })
    await prisma.proyecto.deleteMany({
      where: {
        creadorId: docente.id,
        OR: [{ titulo: PROYECTO_INYECTADO.titulo }, { titulo: { contains: "QA Propuesta" } }],
      },
    })

    // Proyecto APROBADO con fechas amplias (abarca cualquier período) + horas asignadas.
    await prisma.proyecto.create({
      data: {
        titulo: PROYECTO_INYECTADO.titulo,
        tipo: PROYECTO_INYECTADO.tipo,
        estado: "APROBADO",
        creadorId: docente.id,
        fechaInicio: new Date("2020-01-01T00:00:00Z"),
        fechaFin: new Date("2031-01-01T00:00:00Z"),
        revisadoEn: new Date("2025-01-01T00:00:00Z"),
        participantes: {
          create: {
            docenteId: docente.id,
            rol: PROYECTO_INYECTADO.rol,
            horasAsignadas: PROYECTO_INYECTADO.horasAsignadas,
          },
        },
      },
    })

    // Segundo caso: un docente COINVESTIGADOR en un proyecto aprobado aparte.
    const passwordHashCo = await bcrypt.hash(PROF_COINV.password, 10)
    const comunCo = {
      password: passwordHashCo,
      nombre: PROF_COINV.nombre,
      cedula: PROF_COINV.cedula,
      rol: "DOCENTE" as const,
      estadoCuenta: "ACTIVO" as const,
      sedeBase: PROF_COINV.sedeBase,
      modalidad: PROF_COINV.modalidad,
      facultad: PROF_COINV.facultad,
      programa: PROF_COINV.programa,
      doctorado: false,
      cargoAdministrativo: false,
      tipoCargo: null,
      proyectosActivos: true,
    }
    const coinv = await prisma.docente.upsert({
      where: { email: PROF_COINV.email },
      update: comunCo,
      create: { email: PROF_COINV.email, ...comunCo },
    })
    await prisma.agendaSemestral.deleteMany({ where: { docenteId: coinv.id, periodo: PERIODO_PROY } })
    await prisma.proyecto.deleteMany({ where: { titulo: PROYECTO_COINV.titulo } })
    await prisma.proyecto.create({
      data: {
        titulo: PROYECTO_COINV.titulo,
        tipo: PROYECTO_COINV.tipo,
        estado: "APROBADO",
        creadorId: coinv.id,
        fechaInicio: new Date("2020-01-01T00:00:00Z"),
        fechaFin: new Date("2031-01-01T00:00:00Z"),
        revisadoEn: new Date("2025-01-01T00:00:00Z"),
        // El docente de prueba es COINVESTIGADOR (seed directo; aislado de otros docentes).
        participantes: {
          create: {
            docenteId: coinv.id,
            rol: PROYECTO_COINV.rol,
            horasAsignadas: PROYECTO_COINV.horasAsignadas,
          },
        },
      },
    })

    return { docenteId: docente.id, coinvId: coinv.id }
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Escenario del DEMO end-to-end (docente DIANA → jefe CARLOS):
 *  - DIANA (planta) con un proyecto APROBADO (precarga), un proyecto PENDIENTE
 *    (el jefe lo aprueba) y una consejería activa (la ve el jefe).
 *  - CARLOS, jefe del programa de DIANA, con autoridad académica.
 *  - Cursos del catálogo garantizados (CBI001/002/003).
 */
export async function prepararEscenarioDemo() {
  const prisma = makePrisma()
  try {
    await prisma.periodoAcademico.updateMany({
      where: { nombre: PERIODO_DEMO },
      data: {
        estado: "ABIERTO",
        agendaDesde: new Date("2020-01-01T00:00:00Z"),
        agendaHasta: new Date("2031-01-01T00:00:00Z"),
      },
    })

    // Cursos del catálogo (garantizados para el demo).
    const cursosDemo = [
      { codigo: "CBI001", nombre: "Fundamentos de Matemáticas" },
      { codigo: "CBI002", nombre: "Cálculo Diferencial" },
      { codigo: "CBI003", nombre: "Cálculo Integral" },
    ]
    for (const c of cursosDemo) {
      const datos = {
        nombre: c.nombre, creditos: 3, tipo: "TEORICO" as const, estado: true,
        facultad: "Ingeniería", horasSemT: 4, horasSemP: null, horasSemI: 5,
      }
      await prisma.cursoMaestro.upsert({ where: { codigo: c.codigo }, update: datos, create: { codigo: c.codigo, ...datos } })
    }

    // Docente DIANA + Jefe CARLOS.
    const diana = await prisma.docente.upsert({
      where: { email: DOCENTE_DEMO.email },
      update: {},
      create: {
        email: DOCENTE_DEMO.email,
        password: await bcrypt.hash(DOCENTE_DEMO.password, 10),
        nombre: DOCENTE_DEMO.nombre, cedula: DOCENTE_DEMO.cedula,
        rol: "DOCENTE", estadoCuenta: "ACTIVO",
        sedeBase: DOCENTE_DEMO.sedeBase, modalidad: DOCENTE_DEMO.modalidad,
        facultad: DOCENTE_DEMO.facultad, programa: DOCENTE_DEMO.programa,
        doctorado: false, cargoAdministrativo: false, tipoCargo: null, proyectosActivos: true,
      },
    })
    // Asegurar contraseña/estado en re-runs.
    await prisma.docente.update({
      where: { id: diana.id },
      data: { password: await bcrypt.hash(DOCENTE_DEMO.password, 10), estadoCuenta: "ACTIVO", proyectosActivos: true },
    })

    await prisma.docente.upsert({
      where: { email: JEFE_DEMO.email },
      update: {
        password: await bcrypt.hash(JEFE_DEMO.password, 10),
        estadoCuenta: "ACTIVO", cargoAdministrativo: true,
        tipoCargo: JEFE_DEMO.tipoCargo, cargoAmbitoValor: JEFE_DEMO.cargoAmbitoValor,
        facultad: JEFE_DEMO.facultad, programa: JEFE_DEMO.programa,
      },
      create: {
        email: JEFE_DEMO.email,
        password: await bcrypt.hash(JEFE_DEMO.password, 10),
        nombre: JEFE_DEMO.nombre, cedula: JEFE_DEMO.cedula,
        rol: "DOCENTE", estadoCuenta: "ACTIVO",
        sedeBase: "NEIVA", modalidad: "PLANTA_TC",
        facultad: JEFE_DEMO.facultad, programa: JEFE_DEMO.programa,
        doctorado: false, cargoAdministrativo: true,
        tipoCargo: JEFE_DEMO.tipoCargo, cargoAmbitoValor: JEFE_DEMO.cargoAmbitoValor,
        proyectosActivos: false,
      },
    })

    // Limpiar estado previo de DIANA (agenda, proyectos demo, compromisos).
    await prisma.agendaSemestral.deleteMany({ where: { docenteId: diana.id, periodo: PERIODO_DEMO } })
    await prisma.proyecto.deleteMany({
      where: { creadorId: diana.id, titulo: { in: [PROYECTO_APROBADO_DEMO.titulo, PROYECTO_PENDIENTE_DEMO.titulo] } },
    })
    await prisma.consejeriaCompromiso.deleteMany({ where: { docenteId: diana.id, programa: PROGRAMA_DEMO } })

    const fechas = { fechaInicio: new Date("2020-01-01T00:00:00Z"), fechaFin: new Date("2031-01-01T00:00:00Z") }

    // Proyecto APROBADO (se precarga en la agenda).
    await prisma.proyecto.create({
      data: {
        titulo: PROYECTO_APROBADO_DEMO.titulo, tipo: "INVESTIGACION", estado: "APROBADO",
        creadorId: diana.id, ...fechas, revisadoEn: new Date("2025-01-01T00:00:00Z"),
        participantes: { create: { docenteId: diana.id, rol: "INVESTIGADOR_PRINCIPAL", horasAsignadas: PROYECTO_APROBADO_DEMO.horas } },
      },
    })

    // Proyecto PENDIENTE (ENVIADO) con horas propuestas + fechas (el jefe lo aprueba).
    await prisma.proyecto.create({
      data: {
        titulo: PROYECTO_PENDIENTE_DEMO.titulo, tipo: "INVESTIGACION", estado: "ENVIADO",
        creadorId: diana.id, ...fechas,
        participantes: { create: { docenteId: diana.id, rol: "INVESTIGADOR_PRINCIPAL", horasAsignadas: PROYECTO_PENDIENTE_DEMO.horasPropuestas } },
      },
    })

    // Consejería activa de DIANA (la ve el jefe en /gestion/consejeria + se precarga).
    await prisma.consejeriaCompromiso.create({
      data: {
        docenteId: diana.id, programa: PROGRAMA_DEMO, cohorte: COHORTE_DEMO,
        periodoInicio: PERIODO_DEMO, semestresCompromiso: 2, creadaEnPeriodo: PERIODO_DEMO, estado: "ACTIVO",
      },
    })

    return { dianaId: diana.id }
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  Promise.all([
    prepararEscenario(),
    prepararEscenarioCalculos(),
    prepararEscenarioModalidades(),
    prepararEscenarioConsejeria(),
    prepararEscenarioConsejeriaVista(),
    prepararEscenarioInvitado(),
    prepararEscenarioProyectoInyectado(),
    prepararEscenarioDemo(),
  ])
    .then((r) => {
      console.log("Escenario listo:", r)
      process.exit(0)
    })
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}
