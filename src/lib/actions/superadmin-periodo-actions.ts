"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

async function ensureSuperadmin() {
  const session = await auth()
  if (!session?.user || session.user.rol !== "SUPERADMIN") {
    throw new Error("No autorizado. Se requieren privilegios de SuperAdmin.")
  }
}

// ─────────────────────────────────────────────────────
// Lectura
// ─────────────────────────────────────────────────────

export async function getPeriodosSuperadmin() {
  await ensureSuperadmin()
  return prisma.periodoAcademico.findMany({
    orderBy: { fechaInicio: "desc" },
    include: {
      _count: {
        select: { parametrosGlobales: true },
      },
    },
  })
}

/**
 * Cuenta agendas ENVIADAS o APROBADAS asociadas a un período por nombre.
 * Se usa para bloquear la edición de fechas cuando ya hay agendas validadas.
 */
export async function contarAgendasEnviadasPeriodo(nombrePeriodo: string): Promise<number> {
  await ensureSuperadmin()
  return prisma.agendaSemestral.count({
    where: {
      periodo: nombrePeriodo,
      estado: { in: ["ENVIADO", "APROBADO"] },
    },
  })
}

// ─────────────────────────────────────────────────────
// Creación
// ─────────────────────────────────────────────────────

/**
 * Crea un nuevo período académico.
 * fechaFin se calcula en el servidor a partir de semanas_periodo (ParametroGlobal global).
 * El período nace siempre como CERRADO — SuperAdmin lo abre explícitamente.
 */
export async function crearPeriodoSuperadminAction(data: {
  nombre: string
  fechaInicio: Date
}): Promise<{ success: true } | { error: string }> {
  await ensureSuperadmin()

  if (!data.nombre || !/^\d{4}-[1-2]$/.test(data.nombre.trim())) {
    return { error: "Formato de nombre inválido. Use AAAA-S (Ej: 2026-2)." }
  }

  // Leer semanas_periodo del ParametroGlobal permanente (periodoId=null)
  const paramSemanas = await prisma.parametroGlobal.findFirst({
    where: { clave: "semanas_periodo", periodoId: null, activo: true },
    select: { valor: true },
  })
  const semanas = paramSemanas ? parseInt(paramSemanas.valor, 10) : 22
  if (isNaN(semanas) || semanas < 1) {
    return { error: "El parámetro 'semanas_periodo' no está configurado correctamente." }
  }

  const fechaFin = new Date(
    data.fechaInicio.getTime() + semanas * 7 * 24 * 60 * 60 * 1000
  )

  try {
    await prisma.periodoAcademico.create({
      data: {
        nombre: data.nombre.trim(),
        fechaInicio: data.fechaInicio,
        fechaFin,
        estado: "CERRADO",
      },
    })
    revalidatePath("/superadmin/periodos")
    revalidatePath("/admin/periodos")
    return { success: true }
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { error: `Ya existe un período con el nombre "${data.nombre}".` }
    }
    return { error: "No se pudo crear el período académico." }
  }
}

// ─────────────────────────────────────────────────────
// Edición de fechas
// ─────────────────────────────────────────────────────

/**
 * Edita las fechas de inicio y fin de un período.
 * Bloqueado si ya existen agendas ENVIADAS o APROBADAS en ese período.
 */
export async function editarPeriodoSuperadminAction(
  id: string,
  data: { fechaInicio: Date; fechaFin: Date }
): Promise<{ success: true } | { error: string }> {
  await ensureSuperadmin()

  if (data.fechaFin <= data.fechaInicio) {
    return { error: "La fecha de fin debe ser posterior a la fecha de inicio." }
  }

  const periodo = await prisma.periodoAcademico.findUnique({
    where: { id },
    select: { nombre: true },
  })
  if (!periodo) return { error: "Período no encontrado." }

  const agendasEnviadas = await prisma.agendaSemestral.count({
    where: {
      periodo: periodo.nombre,
      estado: { in: ["ENVIADO", "APROBADO"] },
    },
  })
  if (agendasEnviadas > 0) {
    return {
      error: `No se pueden modificar las fechas: hay ${agendasEnviadas} agenda(s) enviada(s) o aprobada(s) en este período.`,
    }
  }

  try {
    await prisma.periodoAcademico.update({
      where: { id },
      data: { fechaInicio: data.fechaInicio, fechaFin: data.fechaFin },
    })
    revalidatePath("/superadmin/periodos")
    revalidatePath("/admin/periodos")
    return { success: true }
  } catch {
    return { error: "No se pudieron actualizar las fechas del período." }
  }
}

// ─────────────────────────────────────────────────────
// Apertura / Cierre del semestre
// ─────────────────────────────────────────────────────

/**
 * Abre un período (CERRADO → ABIERTO).
 * Invariante: solo puede haber un período ABIERTO a la vez.
 */
export async function abrirPeriodoSuperadminAction(
  id: string
): Promise<{ success: true } | { error: string }> {
  await ensureSuperadmin()

  const existente = await prisma.periodoAcademico.findFirst({
    where: { estado: "ABIERTO", NOT: { id } },
    select: { nombre: true },
  })
  if (existente) {
    return {
      error: `No se puede abrir este período: "${existente.nombre}" ya está activo. Ciérralo primero.`,
    }
  }

  try {
    await prisma.periodoAcademico.update({
      where: { id },
      data: { estado: "ABIERTO" },
    })
    revalidatePath("/superadmin/periodos")
    revalidatePath("/admin/periodos")
    return { success: true }
  } catch {
    return { error: "No se pudo abrir el período." }
  }
}

/**
 * Cierra un período (ABIERTO → CERRADO).
 */
export async function cerrarPeriodoSuperadminAction(
  id: string
): Promise<{ success: true } | { error: string }> {
  await ensureSuperadmin()

  try {
    await prisma.periodoAcademico.update({
      where: { id },
      data: { estado: "CERRADO" },
    })
    revalidatePath("/superadmin/periodos")
    revalidatePath("/admin/periodos")
    return { success: true }
  } catch {
    return { error: "No se pudo cerrar el período." }
  }
}
