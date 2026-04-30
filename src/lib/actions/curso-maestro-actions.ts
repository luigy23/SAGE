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
        createdAt: true,
      },
    })
    return cursos
  } catch (error) {
    console.error("[getCursosMaestros] Error:", error)
    throw new Error("No se pudieron obtener los cursos del catálogo.")
  }
}

/**
 * Crear un nuevo curso en el catálogo maestro.
 * Solo ADMIN puede ejecutar esta acción.
 */
export async function crearCursoMaestro(data: {
  codigo: string
  nombre: string
  creditos: number
  tipo: TipoCurso
}) {
  await ensureAdmin()

  try {
    await prisma.cursoMaestro.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        creditos: data.creditos,
        tipo: data.tipo,
      },
    })

    revalidatePath("/admin/cursos")
    return { success: true }
  } catch (error: any) {
    console.error("[crearCursoMaestro] Error:", error)

    // Prisma P2002: unique constraint violation (codigo duplicado)
    if (error?.code === "P2002") {
      throw new Error(`Ya existe un curso con el código "${data.codigo}".`)
    }

    throw new Error("No se pudo crear el curso.")
  }
}

/**
 * Alternar el estado activo/inactivo de un curso.
 * Solo ADMIN puede ejecutar esta acción.
 */
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

    const creditosRaw = parseInteger(r.creditos, "creditos", fila, errors)
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

    const componenteRaw = parseStr(r.componente)?.toUpperCase()
    if (componenteRaw && !COMPONENTES_VALIDOS.includes(componenteRaw as ComponenteCurricular)) {
      errors.push({
        fila,
        campo: "componente",
        mensaje: `Componente inválido. Usar: ${COMPONENTES_VALIDOS.join(", ")}`,
      })
      return
    }

    rows.push({
      codigo,
      nombre,
      creditos: creditosRaw,
      tipo: tipoRaw as TipoCurso,
      componente: (componenteRaw as ComponenteCurricular) || null,
      facultad: parseStr(r.facultad),
      creditosT: parseInteger(r.creditost, "creditosT", fila, errors),
      creditosP: parseInteger(r.creditosp, "creditosP", fila, errors),
      horasSemT: parseInteger(r.horassemt, "horasSemT", fila, errors),
      horasSemP: parseInteger(r.horassemp, "horasSemP", fila, errors),
      horasSemI: parseInteger(r.horassemi, "horasSemI", fila, errors),
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
