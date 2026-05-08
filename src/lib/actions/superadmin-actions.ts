"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { invalidate } from "@/lib/rules/cache"
import type { EstadoCuenta, Rol } from "@/generated/prisma/client"

// =====================================================================
// Guard
// =====================================================================

async function ensureSuperadmin() {
  const session = await auth()
  if (!session?.user || session.user.rol !== "SUPERADMIN") {
    throw new Error("No autorizado. Se requieren privilegios de SuperAdmin.")
  }
  return session.user
}

// =====================================================================
// PARÁMETROS GLOBALES
// =====================================================================

export async function listParametrosGlobales() {
  await ensureSuperadmin()
  return prisma.parametroGlobal.findMany({
    where: { periodoId: null },
    orderBy: { clave: "asc" },
  })
}

export async function updateParametroGlobal(id: string, valor: string) {
  await ensureSuperadmin()

  const param = await prisma.parametroGlobal.findUnique({ where: { id } })
  if (!param) return { error: "Parámetro no encontrado." }

  // Validar tipo
  if (param.tipo === "int") {
    const n = parseInt(valor, 10)
    if (Number.isNaN(n)) return { error: `Valor inválido para tipo int: "${valor}"` }
  } else if (param.tipo === "float") {
    const n = parseFloat(valor)
    if (Number.isNaN(n)) return { error: `Valor inválido para tipo float: "${valor}"` }
  } else if (param.tipo === "bool") {
    if (valor !== "true" && valor !== "false") {
      return { error: `Valor inválido para tipo bool: "${valor}" (use "true" o "false")` }
    }
  }

  await prisma.parametroGlobal.update({
    where: { id },
    data: { valor },
  })

  invalidate("params:globales:*")
  revalidatePath("/superadmin/parametros")
  return { success: true }
}

// =====================================================================
// PARÁMETROS POR MODALIDAD
// =====================================================================

export async function listParametrosModalidad() {
  await ensureSuperadmin()
  return prisma.parametrosModalidad.findMany({
    where: { periodoId: null },
    orderBy: [{ modalidad: "asc" }, { sedeAplicable: "asc" }],
  })
}

export async function updateParametrosModalidad(
  id: string,
  data: {
    horasSemanalMax: number
    /** null = derivado en runtime (horasSemanalMax × semanasPeriodo). */
    horasSemestralMax: number | null
    horasSemestralEstricto: boolean
    minDocencia: number | null
    minDocenciaConProyectos: number | null
    maxInvProySocSemanal: number | null
    activo: boolean
  }
) {
  await ensureSuperadmin()

  // Sanity check
  if (data.horasSemanalMax < 0) {
    return { error: "Las horas no pueden ser negativas." }
  }
  if (data.horasSemestralMax !== null && data.horasSemestralMax < 0) {
    return { error: "Las horas no pueden ser negativas." }
  }
  if (
    data.minDocencia !== null &&
    data.horasSemestralMax !== null &&
    data.minDocencia > data.horasSemestralMax
  ) {
    return { error: "El mínimo de docencia no puede superar la carga semestral." }
  }

  await prisma.parametrosModalidad.update({
    where: { id },
    data,
  })

  invalidate("params:modalidad:*")
  revalidatePath("/superadmin/modalidades")
  return { success: true }
}

// =====================================================================
// REHABILITACIÓN DE AGENDAS
// =====================================================================

export async function listAgendasParaRehabilitar(filtroEstado?: "ENVIADO" | "TODAS") {
  await ensureSuperadmin()
  return prisma.agendaSemestral.findMany({
    where: filtroEstado === "ENVIADO" ? { estado: "ENVIADO" } : undefined,
    include: {
      docente: {
        select: { nombre: true, email: true, modalidad: true, programa: true },
      },
      rehabilitaciones: {
        orderBy: { fecha: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  })
}

export async function rehabilitarAgenda(
  agendaId: string,
  motivo: string,
  observaciones?: string | null
) {
  const user = await ensureSuperadmin()

  if (!motivo || motivo.trim().length < 10) {
    return { error: "El motivo es obligatorio y debe tener al menos 10 caracteres." }
  }

  const agenda = await prisma.agendaSemestral.findUnique({
    where: { id: agendaId },
    select: { id: true, estado: true, docenteId: true, periodo: true },
  })

  if (!agenda) return { error: "Agenda no encontrada." }
  if (agenda.estado === "BORRADOR") {
    return { error: "Esta agenda ya está en estado BORRADOR." }
  }

  await prisma.$transaction(async (tx) => {
    await tx.rehabilitacionAgenda.create({
      data: {
        agendaId,
        rehabilitadoPor: user.id,
        motivo: motivo.trim(),
        observaciones: observaciones?.trim() || null,
        estadoOriginal: agenda.estado,
      },
    })

    await tx.agendaSemestral.update({
      where: { id: agendaId },
      data: {
        estado: "BORRADOR",
        rehabilitada: true,
        rehabilitadaCount: { increment: 1 },
        ultimaRehabilitacion: new Date(),
      },
    })
  })

  revalidatePath("/superadmin/agendas")
  revalidatePath("/agenda")
  return { success: true }
}

// =====================================================================
// USUARIOS Y ROLES
// =====================================================================

export async function listUsuarios() {
  await ensureSuperadmin()
  return prisma.docente.findMany({
    orderBy: [{ rol: "asc" }, { nombre: "asc" }],
    select: {
      id: true,
      nombre: true,
      email: true,
      cedula: true,
      rol: true,
      estadoCuenta: true,
      sedeBase: true,
      modalidad: true,
      facultad: true,
      programa: true,
      createdAt: true,
    },
  })
}

export async function cambiarRolUsuario(usuarioId: string, nuevoRol: Rol) {
  const user = await ensureSuperadmin()

  if (usuarioId === user.id && nuevoRol !== "SUPERADMIN") {
    return {
      error: "No puedes cambiar tu propio rol de SUPERADMIN. Otro SUPERADMIN debe hacerlo.",
    }
  }

  await prisma.docente.update({
    where: { id: usuarioId },
    data: { rol: nuevoRol },
  })

  revalidatePath("/superadmin/usuarios")
  return { success: true }
}

export async function cambiarEstadoCuenta(
  usuarioId: string,
  nuevoEstado: EstadoCuenta
) {
  const user = await ensureSuperadmin()

  if (usuarioId === user.id && nuevoEstado === "INACTIVO") {
    return { error: "No puedes desactivar tu propia cuenta." }
  }

  await prisma.docente.update({
    where: { id: usuarioId },
    data: { estadoCuenta: nuevoEstado },
  })

  revalidatePath("/superadmin/usuarios")
  return { success: true }
}
