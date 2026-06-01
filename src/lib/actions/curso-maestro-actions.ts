"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { TipoCurso, ComponenteCurricular } from "@/generated/prisma/client"
import * as XLSX from "xlsx"

/**
 * Solo administradores pueden gestionar el catálogo maestro.
 */
async function ensureAdmin() {
  const session = await auth()
  const rol = session?.user?.rol
  if (!session?.user || (rol !== "ADMIN" && rol !== "SUPERADMIN")) {
    throw new Error("No autorizado. Se requieren privilegios de Administrador.")
  }
}

/**
 * Obtener todos los cursos del catálogo maestro.
 * No requiere ensureAdmin porque los docentes también consultan el catálogo
 * al crear sus agendas (FO-19).
 */
export async function getCursosMaestros() {
  try {
    const cursos = await prisma.cursoMaestro.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        creditos: true,
        tipo: true,
        estado: true,
        componente: true,
        facultad: true,
        creditosT: true,
        creditosP: true,
        horasSemT: true,
        horasSemP: true,
        horasSemI: true,
        acuerdoOrigen: true,
        createdAt: true,
        _count: { select: { cursosAgenda: true } },
      },
    })
    return cursos
  } catch (error) {
    console.error("[getCursosMaestros] Error:", error)
    throw new Error("No se pudieron obtener los cursos del catálogo.")
  }
}

type CursoMaestroFormData = {
  codigo: string
  nombre: string
  creditos: number
  tipo: TipoCurso
  componente?: ComponenteCurricular | null
  facultad?: string | null
  creditosT?: number | null
  creditosP?: number | null
  horasSemT?: number | null
  horasSemP?: number | null
  horasSemI?: number | null
  acuerdoOrigen?: string | null
}

/**
 * Crear un nuevo curso en el catálogo maestro.
 * Solo ADMIN puede ejecutar esta acción.
 */
export async function crearCursoMaestro(
  data: CursoMaestroFormData
): Promise<{ success: true } | { error: string }> {
  await ensureAdmin()

  try {
    await prisma.cursoMaestro.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        creditos: data.creditos,
        tipo: data.tipo,
        componente: data.componente ?? null,
        facultad: data.facultad ?? null,
        creditosT: data.creditosT ?? null,
        creditosP: data.creditosP ?? null,
        horasSemT: data.horasSemT ?? null,
        horasSemP: data.horasSemP ?? null,
        horasSemI: data.horasSemI ?? null,
        acuerdoOrigen: data.acuerdoOrigen ?? null,
      },
    })

    revalidatePath("/admin/cursos")
    return { success: true }
  } catch (error: any) {
    console.error("[crearCursoMaestro] Error:", error)
    if (error?.code === "P2002") {
      return { error: `Ya existe un curso con el código "${data.codigo}".` }
    }
    return { error: "No se pudo crear el curso." }
  }
}

/**
 * Actualizar un curso del catálogo maestro.
 * Solo ADMIN puede ejecutar esta acción.
 */
export async function actualizarCursoMaestro(
  id: string,
  data: CursoMaestroFormData
): Promise<{ success: true } | { error: string }> {
  await ensureAdmin()

  try {
    await prisma.cursoMaestro.update({
      where: { id },
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        creditos: data.creditos,
        tipo: data.tipo,
        componente: data.componente ?? null,
        facultad: data.facultad ?? null,
        creditosT: data.creditosT ?? null,
        creditosP: data.creditosP ?? null,
        horasSemT: data.horasSemT ?? null,
        horasSemP: data.horasSemP ?? null,
        horasSemI: data.horasSemI ?? null,
        acuerdoOrigen: data.acuerdoOrigen ?? null,
      },
    })

    revalidatePath("/admin/cursos")
    return { success: true }
  } catch (error: any) {
    console.error("[actualizarCursoMaestro] Error:", error)
    if (error?.code === "P2002") {
      return { error: `Ya existe un curso con el código "${data.codigo}".` }
    }
    if (error?.code === "P2025") {
      return { error: "Curso no encontrado." }
    }
    return { error: "No se pudo actualizar el curso." }
  }
}

/**
 * Eliminar un curso del catálogo maestro.
 * SAFEGUARD: bloquea la eliminación si el curso está referenciado en alguna agenda.
 * En ese caso, el admin debe desactivarlo en su lugar.
 * Solo ADMIN puede ejecutar esta acción.
 */
export async function eliminarCursoMaestro(
  id: string
): Promise<{ success: true } | { error: string }> {
  await ensureAdmin()

  const curso = await prisma.cursoMaestro.findUnique({
    where: { id },
    select: {
      nombre: true,
      codigo: true,
      _count: { select: { cursosAgenda: true } },
    },
  })

  if (!curso) return { error: "Curso no encontrado." }

  // Capa 1: referencias formales por FK.
  if (curso._count.cursosAgenda > 0) {
    return {
      error: `No se puede eliminar "${curso.nombre}": está referenciado en ${curso._count.cursosAgenda} agenda(s). Desactívalo en su lugar para que no aparezca en nuevas agendas.`,
    }
  }

  // Capa 2: huérfanos legacy — CursoAgenda con cursoMaestroId=null pero
  // numeroCurso=codigo. Ocurre con agendas creadas antes del Paso B del
  // fix (que cerró el origen del bug). El backfill (`scripts/backfill-
  // curso-maestro-id.ts`) los convierte en referencias formales; mientras
  // queden huérfanos, este check los detecta para no borrar el catálogo
  // de cursos efectivamente en uso.
  const huerfanosPorCodigo = await prisma.cursoAgenda.count({
    where: {
      cursoMaestroId: null,
      numeroCurso: curso.codigo,
    },
  })
  if (huerfanosPorCodigo > 0) {
    return {
      error: `No se puede eliminar "${curso.nombre}": hay ${huerfanosPorCodigo} agenda(s) con código "${curso.codigo}" sin enlace formal al catálogo (registros legacy). Ejecuta el script de backfill (scripts/backfill-curso-maestro-id.ts) o desactiva el curso en su lugar.`,
    }
  }

  try {
    await prisma.cursoMaestro.delete({ where: { id } })
    revalidatePath("/admin/cursos")
    return { success: true }
  } catch (error) {
    console.error("[eliminarCursoMaestro] Error:", error)
    return { error: "No se pudo eliminar el curso." }
  }
}

// =====================================================================
// IMPORT BULK desde CSV/Excel
// =====================================================================

const TIPOS_VALIDOS: TipoCurso[] = ["TEORICO", "TEORICO_PRACTICO", "PRACTICO"]
const COMPONENTES_VALIDOS: ComponenteCurricular[] = [
  "BASICO_INSTITUCIONAL",
  "BASICO_FACULTAD",
  "COMPLEMENTARIO_INSTITUCIONAL",
  "COMPLEMENTARIO_FACULTAD",
  "COMPLEMENTARIO_PROGRAMA",
  "POSGRADO",
]

export type RowError = { fila: number; campo: string; mensaje: string }

export type ParsedRow = {
  codigo: string
  nombre: string
  creditos: number
  tipo: TipoCurso
  componente: ComponenteCurricular | null
  facultad: string | null
  creditosT: number | null
  creditosP: number | null
  horasSemT: number | null
  horasSemP: number | null
  horasSemI: number | null
  acuerdoOrigen: string | null
}

function parseInteger(val: unknown, fieldLabel: string, fila: number, errors: RowError[]): number | null {
  if (val === null || val === undefined || val === "") return null
  const n = typeof val === "number" ? val : parseInt(String(val).trim(), 10)
  if (Number.isNaN(n)) {
    errors.push({ fila, campo: fieldLabel, mensaje: `Valor "${val}" no es un número entero` })
    return null
  }
  return n
}

function parseStr(val: unknown): string | null {
  if (val === null || val === undefined) return null
  const s = String(val).trim()
  return s === "" ? null : s
}

/**
 * Parsea un archivo CSV/XLSX a filas validadas.
 * Cabeceras esperadas (case-insensitive): codigo, nombre, creditos, tipo,
 * componente?, facultad?, creditosT?, creditosP?, horasSemT?, horasSemP?, horasSemI?, acuerdoOrigen?
 */
export async function previewImportCursos(formData: FormData): Promise<
  | { error: string }
  | { rows: ParsedRow[]; errors: RowError[]; totalFilas: number }
> {
  await ensureAdmin()

  const file = formData.get("file") as File | null
  if (!file) return { error: "No se recibió archivo." }
  if (file.size === 0) return { error: "El archivo está vacío." }
  if (file.size > 5 * 1024 * 1024) return { error: "El archivo excede 5MB." }

  let raw: Record<string, unknown>[]
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) return { error: "El archivo no tiene hojas." }
    const sheet = workbook.Sheets[sheetName]
    raw = XLSX.utils.sheet_to_json(sheet, { defval: "" })
  } catch (e) {
    return { error: `No se pudo leer el archivo: ${e instanceof Error ? e.message : "formato inválido"}` }
  }

  if (raw.length === 0) {
    return { error: "El archivo no contiene filas." }
  }

  // Normalizar headers a lowercase
  const normalized = raw.map((r) => {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(r)) {
      out[k.toLowerCase().trim()] = r[k]
    }
    return out
  })

  const errors: RowError[] = []
  const rows: ParsedRow[] = []
  const codigosVistos = new Set<string>()

  normalized.forEach((r, idx) => {
    const fila = idx + 2 // +1 por header, +1 porque humanos empiezan en 1

    const codigo = parseStr(r.codigo)
    if (!codigo) {
      errors.push({ fila, campo: "codigo", mensaje: "Código obligatorio" })
      return
    }
    if (codigosVistos.has(codigo)) {
      errors.push({ fila, campo: "codigo", mensaje: `Código "${codigo}" duplicado en el archivo` })
      return
    }
    codigosVistos.add(codigo)

    const nombre = parseStr(r.nombre)
    if (!nombre) {
      errors.push({ fila, campo: "nombre", mensaje: "Nombre obligatorio" })
      return
    }

    let creditosRaw = parseInteger(r.creditos, "creditos", fila, errors)
    if (creditosRaw === null) return
    if (creditosRaw < 1 || creditosRaw > 12) {
      errors.push({ fila, campo: "creditos", mensaje: `Créditos fuera de rango (1-12): ${creditosRaw}` })
      return
    }

    const tipoRaw = parseStr(r.tipo)?.toUpperCase()
    if (!tipoRaw || !TIPOS_VALIDOS.includes(tipoRaw as TipoCurso)) {
      errors.push({
        fila,
        campo: "tipo",
        mensaje: `Tipo inválido "${tipoRaw}". Usar: ${TIPOS_VALIDOS.join(", ")}`,
      })
      return
    }
    const tipo = tipoRaw as TipoCurso

    const componenteRaw = parseStr(r.componente)?.toUpperCase()
    if (componenteRaw && !COMPONENTES_VALIDOS.includes(componenteRaw as ComponenteCurricular)) {
      errors.push({
        fila,
        campo: "componente",
        mensaje: `Componente inválido. Usar: ${COMPONENTES_VALIDOS.join(", ")}`,
      })
      return
    }

    // Campos numéricos opcionales. Rastreamos los errores de ESTA fila para
    // no incluirla si alguno es inválido (antes una fila podía quedar
    // "válida y con error" a la vez, importándose con el campo en null).
    const errCountBefore = errors.length
    let creditosT = parseInteger(r.creditost, "creditosT", fila, errors)
    let creditosP = parseInteger(r.creditosp, "creditosP", fila, errors)
    let horasSemT = parseInteger(r.horassemt, "horasSemT", fila, errors)
    let horasSemP = parseInteger(r.horassemp, "horasSemP", fila, errors)
    const horasSemI = parseInteger(r.horassemi, "horasSemI", fila, errors)
    if (errors.length > errCountBefore) return

    // Normalización tipo↔créditos/horas — espeja el formulario manual
    // (mapFormValuesToCursoPayload + useCourseFormReactivity en
    // course-form-shared.tsx). Garantiza que el import no introduzca datos
    // inconsistentes (p. ej. un TEORICO con horasSemP/creditosP) que la
    // tabla oculta pero que se filtran a los cálculos del FO-19.
    if (tipo === "TEORICO") {
      creditosT = creditosRaw
      creditosP = null
      horasSemP = null
    } else if (tipo === "PRACTICO") {
      creditosP = creditosRaw
      creditosT = null
      horasSemT = null
    } else {
      // TEORICO_PRACTICO: los créditos son la suma de T+P (fuente de verdad,
      // igual que la reactividad del formulario). Se recalcula `creditos`
      // ignorando la columna `creditos` del archivo si difiere.
      const total = (creditosT ?? 0) + (creditosP ?? 0)
      if (total < 1) {
        errors.push({
          fila,
          campo: "creditosT",
          mensaje: "TEORICO_PRACTICO requiere al menos un crédito teórico o práctico (creditosT/creditosP)",
        })
        return
      }
      if (total > 12) {
        errors.push({
          fila,
          campo: "creditosP",
          mensaje: `El total de créditos T+P (${total}) supera el máximo de 12`,
        })
        return
      }
      creditosRaw = total
    }

    rows.push({
      codigo,
      nombre,
      creditos: creditosRaw,
      tipo,
      componente: (componenteRaw as ComponenteCurricular) || null,
      facultad: parseStr(r.facultad),
      creditosT,
      creditosP,
      horasSemT,
      horasSemP,
      horasSemI,
      acuerdoOrigen: parseStr(r.acuerdoorigen),
    })
  })

  return { rows, errors, totalFilas: raw.length }
}

/**
 * Aplica el import: upsert por codigo, preserva el flag `estado` si el curso existe.
 * Devuelve cuántos se crearon vs actualizaron.
 */
export async function commitImportCursos(
  rows: ParsedRow[]
): Promise<{ created: number; updated: number } | { error: string }> {
  await ensureAdmin()

  if (rows.length === 0) return { error: "Sin filas para importar." }
  if (rows.length > 500) return { error: "Máximo 500 filas por archivo." }

  let created = 0
  let updated = 0

  await prisma.$transaction(async (tx) => {
    for (const c of rows) {
      const existing = await tx.cursoMaestro.findUnique({
        where: { codigo: c.codigo },
        select: { id: true },
      })
      if (existing) {
        await tx.cursoMaestro.update({
          where: { codigo: c.codigo },
          data: {
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
        updated++
      } else {
        await tx.cursoMaestro.create({ data: c })
        created++
      }
    }
  })

  revalidatePath("/admin/cursos")
  return { created, updated }
}

export async function toggleEstadoCursoMaestro(cursoId: string, nuevoEstado: boolean) {
  await ensureAdmin()

  try {
    await prisma.cursoMaestro.update({
      where: { id: cursoId },
      data: { estado: nuevoEstado },
    })

    revalidatePath("/admin/cursos")
    return { success: true }
  } catch (error) {
    console.error("[toggleEstadoCursoMaestro] Error:", error)
    throw new Error("No se pudo actualizar el estado del curso.")
  }
}
