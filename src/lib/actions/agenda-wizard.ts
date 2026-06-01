"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import {
  createAgendaSchema,
  createAgendaWizardBaseSchema,
  topesKey,
  type AgendaWizardPayload,
  type AgendaWizardFormData,
  type TopesActividadesMap,
  type ActividadTopeDetalle,
} from "@/lib/schemas/agenda-schema"
import { resolveAgendaLimits } from "@/lib/rules/resolver"
import { esCargoExentoGestion20, esJefeDePrograma } from "@/lib/utils/cargo"
import { verificarCupoCargo } from "@/lib/validations/cupo-cargo"
import type { Sede } from "@/generated/prisma/client"

async function getAuthenticatedDocente() {
  const session = await auth()
  if (!session?.user?.id) return null

  const docente = await prisma.docente.findUnique({
    where: { id: session.user.id },
  })

  return docente
}

export async function upsertAgendaCompletaAction(
  payload: AgendaWizardPayload
): Promise<{ success: true; agendaId: string } | { error: string }> {
  
  const docente = await getAuthenticatedDocente()
  if (!docente) {
    return { error: "No autenticado. Inicia sesión e intenta de nuevo." }
  }

  const { periodo, enviar, semanasAgenda, data } = payload

  if (!periodo || periodo.trim() === "") {
    return { error: "El periodo académico es obligatorio." }
  }

  // Verificar que el período existe, está ABIERTO y que la ventana FO-19 está activa.
  const periodoRow = await prisma.periodoAcademico.findUnique({
    where: { nombre: periodo },
    select: { id: true, estado: true, agendaDesde: true, agendaHasta: true },
  })
  if (!periodoRow) {
    return { error: `El período "${periodo}" no existe en el sistema.` }
  }
  if (periodoRow.estado !== "ABIERTO") {
    return { error: `El período "${periodo}" está cerrado. No se pueden crear o modificar agendas.` }
  }
  if (!periodoRow.agendaDesde || !periodoRow.agendaHasta) {
    return { error: "El administrador aún no ha configurado la ventana de entrega de agendas para este período." }
  }
  const now = new Date()
  if (now < periodoRow.agendaDesde) {
    const abre = periodoRow.agendaDesde.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })
    return { error: `La ventana de entrega de agendas aún no ha abierto. Abre el ${abre}.` }
  }
  if (now > periodoRow.agendaHasta) {
    const cerro = periodoRow.agendaHasta.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })
    return { error: `La ventana de entrega de agendas cerró el ${cerro}.` }
  }

  const excluyeTopeGestion20 = esCargoExentoGestion20(docente.tipoCargo)
  const esJefeProg = esJefeDePrograma(docente.tipoCargo)

  const docenteParaResolver = {
    modalidad: docente.modalidad,
    sedeBase: docente.sedeBase,
    doctorado: docente.doctorado,
    cargoAdministrativo: docente.cargoAdministrativo,
    proyectosActivos: docente.proyectosActivos,
    tipoCargo: docente.tipoCargo,
    semanasVinculacion: docente.semanasVinculacion ?? null,
  }

  // Resolver base (sin override) para obtener semanasMaximas y validar el input
  const baseLimits = await resolveAgendaLimits(docenteParaResolver, periodoRow.id)

  if (
    !Number.isInteger(semanasAgenda) ||
    semanasAgenda < 1 ||
    semanasAgenda > baseLimits.semanasMaximas
  ) {
    return { error: `Semanas inválidas: debe ser un número entre 1 y ${baseLimits.semanasMaximas}.` }
  }

  // Resolver con semanasAgenda para obtener los límites escalados
  const limits = await resolveAgendaLimits(docenteParaResolver, periodoRow.id, semanasAgenda)

  const flags = {
    doctorado: docente.doctorado,
    cargoAdministrativo: docente.cargoAdministrativo,
    proyectosActivos: docente.proyectosActivos,
    excluyeTopeGestion20,
    esJefeDePrograma: esJefeProg,
  }

  // Art. 11: topes individuales por actividad — se cargan solo al ENVIAR
  // (en borrador, el wizard usa el schema base sin reglas de negocio).
  let topesActividades: TopesActividadesMap | undefined = undefined
  if (enviar) {
    const catalogo = await prisma.catalogoActividad.findMany({
      where: {
        activo: true,
        OR: [
          { topeSemestralH: { not: null } },
          { topeSemanalHPorUnidad: { not: null } },
        ],
      },
      select: {
        categoria: true,
        nombre: true,
        topeSemestralH: true,
        topePorUnidad: true,
        topeSemanalHPorUnidad: true,
        unidadMax: true,
        cantidadMaxSimultaneos: true,
        requiereProyectoAprobado: true,
        aplicaUnoPorFacultad: true,
        aplicaUnoPorSede: true,
        aplicaUnoPorPrograma: true,
        // Paso 1 (saneamiento Art. 11): cableamos el campo para que el motor
        // de validación lo tenga disponible. La regla dura de rechazar el
        // envío sin resolución del Rector se implementa en un paso aparte.
        requiereResolucionRector: true,
      },
    })
    topesActividades = {}
    for (const item of catalogo) {
      const detalle: ActividadTopeDetalle = {
        topeSemestralH: item.topeSemestralH,
        topePorUnidad: item.topePorUnidad,
        topeSemanalHPorUnidad: item.topeSemanalHPorUnidad,
        unidadMax: item.unidadMax,
        cantidadMaxSimultaneos: item.cantidadMaxSimultaneos,
        requiereProyectoAprobado: item.requiereProyectoAprobado,
        aplicaUnoPorFacultad: item.aplicaUnoPorFacultad,
        aplicaUnoPorSede: item.aplicaUnoPorSede,
        aplicaUnoPorPrograma: item.aplicaUnoPorPrograma,
        requiereResolucionRector: item.requiereResolucionRector,
      }
      topesActividades[topesKey(item.categoria, item.nombre)] = detalle
    }
  }

  // Art. 11: checks cross-agenda (aplicaUnoPorFacultad / aplicaUnoPorSede).
  // Solo aplican al enviar — en borrador se omiten para no bloquear el flujo.
  if (enviar && topesActividades) {
    type ActividadInput = { nombre?: string; [k: string]: unknown }
    const seccionesPorCategoria: [
      "DOCENCIA" | "INVESTIGACION" | "PROYECCION_SOCIAL" | "GESTION",
      ActividadInput[]
    ][] = [
      ["DOCENCIA", data.otrasActividadesDocencia ?? []],
      ["INVESTIGACION", data.actividadesInvestigacion ?? []],
      ["PROYECCION_SOCIAL", data.actividadesProyeccionSocial ?? []],
      ["GESTION", data.actividadesGestion ?? []],
    ]

    for (const [cat, acts] of seccionesPorCategoria) {
      for (const act of acts) {
        const nombre = act.nombre?.trim()
        if (!nombre) continue
        const tope = topesActividades[topesKey(cat, nombre)]
        if (!tope) continue

        if (tope.aplicaUnoPorFacultad) {
          // Verificar que ningún otro docente de la misma facultad tenga esta
          // actividad en estado ENVIADO o APROBADO en el mismo período.
          const modelo = _modeloParaCategoria(cat)
          const count = await _contarActividadCruzada(
            prisma, modelo, nombre, periodo, docente.id, "facultad", docente.facultad
          )
          if (count > 0) {
            return {
              error: `"${nombre}" ya fue asignada a otro docente de la Facultad de ${docente.facultad} en este período. El Art. 11 permite solo un responsable por facultad.`,
            }
          }
        }

        if (tope.aplicaUnoPorSede) {
          // Prioriza la sede de la actividad (capturada en el wizard). Si está
          // ausente (legacy o no obligatoria), cae a sedeBase del docente.
          const sedeEfectiva =
            ((act as ActividadInput).sede as Sede | null | undefined) ?? docente.sedeBase
          const modelo = _modeloParaCategoria(cat)
          const count = await _contarActividadCruzada(
            prisma, modelo, nombre, periodo, docente.id, "sede", sedeEfectiva
          )
          if (count > 0) {
            return {
              error: `"${nombre}" ya fue asignada a otro docente de la sede ${sedeEfectiva} en este período. El Art. 11 permite solo un responsable por sede.`,
            }
          }
        }

        if (tope.aplicaUnoPorPrograma) {
          // Solo cuenta agendas APROBADAS de otros docentes del mismo programa
          // (misma regla de estados que los cargos directivos).
          const modelo = _modeloParaCategoria(cat)
          const count = await _contarActividadCruzada(
            prisma, modelo, nombre, periodo, docente.id, "programa", docente.programa
          )
          if (count > 0) {
            return {
              error: `"${nombre}" ya fue asignada a otro docente del programa ${docente.programa} en este período. El Art. 11 permite solo un responsable por programa.`,
            }
          }
        }
      }
    }
  }

  // Art. 11: unicidad de cupo de cargo directivo (Decano/Jefe de Programa).
  // Solo al enviar; bloquea si otro docente ya tiene el cargo+ámbito con agenda
  // APROBADA en el período.
  if (enviar) {
    const cupoError = await verificarCupoCargo({
      periodo,
      tipoCargo: docente.tipoCargo,
      cargoAmbitoValor: docente.cargoAmbitoValor,
      excluirDocenteId: docente.id,
    })
    if (cupoError) return { error: cupoError }
  }

  // Borradores: solo validación estructural (tipos y transformaciones)
  // Envío final: validación completa con reglas de negocio resueltas
  const schema = enviar
    ? createAgendaSchema(limits.maxHorasSemanales, limits.esEstricto, flags, limits.minDocencia, limits.semanas, topesActividades, limits.maxInvProySocialCatedra)
    : createAgendaWizardBaseSchema(limits.semanas)

  const parseResult = schema.safeParse(data)

  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]
    return {
      error: firstError?.message || "Error de validación en los datos del formulario.",
    }
  }

  const validData = parseResult.data as AgendaWizardFormData

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingAgenda = await tx.agendaSemestral.findUnique({
        where: {
          docenteId_periodo: {
            docenteId: docente.id,
            periodo,
          },
        },
      })

      if (existingAgenda && existingAgenda.estado === "ENVIADO") {
        throw new Error("Esta agenda ya fue enviada y no puede modificarse.")
      }

      if (existingAgenda) {
        await tx.cursoAgenda.deleteMany({ where: { agendaId: existingAgenda.id } })
        await tx.actividadDocencia.deleteMany({ where: { agendaId: existingAgenda.id } })
        await tx.actividadInvestigacion.deleteMany({ where: { agendaId: existingAgenda.id } })
        await tx.actividadProyeccionSocial.deleteMany({ where: { agendaId: existingAgenda.id } })
        await tx.actividadGestion.deleteMany({ where: { agendaId: existingAgenda.id } })
      }

      const agenda = existingAgenda
        ? await tx.agendaSemestral.update({
            where: { id: existingAgenda.id },
            data: { estado: enviar ? "ENVIADO" : "BORRADOR", semanasAgenda },
          })
        : await tx.agendaSemestral.create({
            data: {
              docenteId: docente.id,
              periodo,
              estado: enviar ? "ENVIADO" : "BORRADOR",
              semanasAgenda,
            },
          })

      for (const curso of validData.cursos) {
        await tx.cursoAgenda.create({
          data: {
            agendaId: agenda.id,
            // FK al catálogo maestro — sustenta el safeguard de borrado en
            // /admin/cursos. null cuando el docente ingresó el curso a mano.
            cursoMaestroId: curso.cursoMaestroId ?? null,
            numeroCurso: curso.numeroCurso,
            nombreCurso: curso.nombreCurso,
            sede: curso.sede || null,
            horasPresenciales: curso.horasPresenciales,
            creditos: curso.creditos,
            semanas: curso.semanas,
            dedicacionPeriodo: curso.dedicacionPeriodo,
          },
        })
      }

      if (validData.otrasActividadesDocencia.length > 0) {
        await tx.actividadDocencia.createMany({
          data: validData.otrasActividadesDocencia.map((act) => ({
            agendaId: agenda.id,
            nombre: act.nombre,
            descripcion: act.descripcion || null,
            dedicacionPeriodo: act.dedicacionPeriodo,
            cantidadUnidades: act.cantidadUnidades || null,
            sede: (act.sede as Sede | null) ?? null,
          })),
        })
      }

      if (validData.actividadesInvestigacion.length > 0) {
        await tx.actividadInvestigacion.createMany({
          data: validData.actividadesInvestigacion.map((act) => ({
            agendaId: agenda.id,
            nombre: act.nombre,
            descripcion: act.descripcion || null,
            dedicacionPeriodo: act.dedicacionPeriodo,
            cantidadUnidades: act.cantidadUnidades || null,
            sede: (act.sede as Sede | null) ?? null,
          })),
        })
      }

      if (validData.actividadesProyeccionSocial.length > 0) {
        await tx.actividadProyeccionSocial.createMany({
          data: validData.actividadesProyeccionSocial.map((act) => ({
            agendaId: agenda.id,
            nombre: act.nombre,
            descripcion: act.descripcion || null,
            dedicacionPeriodo: act.dedicacionPeriodo,
            sede: (act.sede as Sede | null) ?? null,
          })),
        })
      }

      if (validData.actividadesGestion.length > 0) {
        await tx.actividadGestion.createMany({
          data: validData.actividadesGestion.map((act) => ({
            agendaId: agenda.id,
            nombre: act.nombre,
            descripcion: act.descripcion || null,
            dedicacionPeriodo: act.dedicacionPeriodo,
            sede: (act.sede as Sede | null) ?? null,
          })),
        })
      }

      return agenda
    })

    revalidatePath("/agenda")
    return { success: true, agendaId: result.id }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error inesperado al guardar la agenda."
    return { error: message }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers internos para checks cross-agenda del Art. 11
// ──────────────────────────────────────────────────────────────────────────────

type ModeloCategoriaActividad =
  | "actividadDocencia"
  | "actividadInvestigacion"
  | "actividadProyeccionSocial"
  | "actividadGestion"

function _modeloParaCategoria(
  cat: "DOCENCIA" | "INVESTIGACION" | "PROYECCION_SOCIAL" | "GESTION"
): ModeloCategoriaActividad {
  switch (cat) {
    case "DOCENCIA": return "actividadDocencia"
    case "INVESTIGACION": return "actividadInvestigacion"
    case "PROYECCION_SOCIAL": return "actividadProyeccionSocial"
    case "GESTION": return "actividadGestion"
  }
}

async function _contarActividadCruzada(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  modelo: ModeloCategoriaActividad,
  nombre: string,
  periodo: string,
  docenteIdExcluido: string,
  dimension: "facultad" | "sede" | "programa",
  valor: string | null
): Promise<number> {
  if (!valor) return 0

  // Para dimensión "sede": prioriza la nueva columna `sede` de la actividad.
  // Mantiene fallback retro por `docente.sedeBase` para filas sin sede (legacy
  // o actividades donde la sede no es obligatoria).
  const sedeFilter =
    dimension === "sede"
      ? {
          OR: [
            { sede: valor },
            { sede: null, agenda: { docente: { sedeBase: valor } } },
          ],
        }
      : null

  // "programa" usa la misma regla de estados que los cargos: solo ESTRICTAMENTE
  // APROBADO ocupa el cupo. facultad/sede conservan ENVIADO+APROBADO (legacy).
  const estados: ("ENVIADO" | "APROBADO")[] =
    dimension === "programa" ? ["APROBADO"] : ["ENVIADO", "APROBADO"]

  return client[modelo].count({
    where: {
      nombre,
      ...(sedeFilter ?? {}),
      agenda: {
        periodo,
        estado: { in: estados },
        docenteId: { not: docenteIdExcluido },
        ...(dimension === "facultad" ? { docente: { facultad: valor } } : {}),
        ...(dimension === "programa" ? { docente: { programa: valor } } : {}),
      },
    },
  })
}

export async function searchCursosGuardadosAction(query: string) {
  const session = await auth()
  if (!session?.user?.id) return []

  const cursos = await prisma.cursoGuardado.findMany({
    where: {
      docenteId: session.user.id,
      OR: [
        { nombreCurso: { contains: query, mode: "insensitive" } },
        { numeroCurso: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 20,
    orderBy: { nombreCurso: "asc" },
  })

  return cursos
}

export async function deleteAgendaBorradorAction(periodo: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "No autenticado." }
  }

  const agenda = await prisma.agendaSemestral.findUnique({
    where: {
      docenteId_periodo: {
        docenteId: session.user.id,
        periodo,
      },
    },
  })

  if (!agenda) {
    return { error: "No se encontró la agenda." }
  }

  if (agenda.estado !== "BORRADOR") {
    return { error: "Solo se pueden descartar agendas en estado borrador." }
  }

  await prisma.agendaSemestral.delete({
    where: { id: agenda.id },
  })

  revalidatePath("/agenda")
  return { success: true }
}