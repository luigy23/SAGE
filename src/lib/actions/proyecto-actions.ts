"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { registrarAuditoriaStrict } from "@/lib/audit"
import type { Rol, Prisma } from "@/generated/prisma/client"
import {
  crearProyectoSchema,
  type CrearProyectoInput,
} from "@/lib/schemas/proyecto-schema"

// =====================================================================
// Guards
// =====================================================================

async function ensureDocente() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("No autenticado.")
  return session.user
}

async function ensureAdmin() {
  const session = await auth()
  const rol = session?.user?.rol
  if (!session?.user || (rol !== "ADMIN" && rol !== "SUPERADMIN")) {
    throw new Error("No autorizado. Se requiere ADMIN o SUPERADMIN.")
  }
  return session.user
}

// =====================================================================
// Helpers
// =====================================================================

function revalidateProyectoPaths(docenteId?: string) {
  revalidatePath("/proyectos")
  revalidatePath("/admin/revision/proyectos")
  if (docenteId) revalidatePath(`/proyectos`)
}

/**
 * Actualiza proyectosActivos en el Docente dentro de una transacción.
 * - Aprobación: setea true sin importar el estado actual.
 * - Rechazo/cancelación: setea false solo si no quedan proyectos APROBADO.
 */
async function syncProyectosActivos(
  tx: Prisma.TransactionClient,
  docenteId: string,
  accion: "aprobar" | "rechazar",
) {
  if (accion === "aprobar") {
    await tx.docente.update({
      where: { id: docenteId },
      data: { proyectosActivos: true },
    })
    return
  }

  const aprobadosRestantes = await tx.proyectoDocente.count({
    where: { docenteId, estado: "APROBADO" },
  })
  if (aprobadosRestantes === 0) {
    await tx.docente.update({
      where: { id: docenteId },
      data: { proyectosActivos: false },
    })
  }
}

// =====================================================================
// CREAR — docente crea en BORRADOR
// =====================================================================

export async function crearProyectoAction(
  input: CrearProyectoInput,
): Promise<{ error: string } | { success: true; id: string }> {
  const session = await ensureDocente()

  const parsed = crearProyectoSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." }
  }

  const docente = await prisma.docente.findUnique({
    where: { id: session.id },
    select: { id: true, modalidad: true },
  })
  if (!docente) return { error: "Docente no encontrado." }

  if (docente.modalidad === "CATEDRA") {
    return {
      error:
        "Art. 3 Par. 1: los docentes catedráticos no pueden registrar proyectos activos.",
    }
  }

  const creado = await prisma.proyectoDocente.create({
    data: {
      docenteId: docente.id,
      ...parsed.data,
      estado: "BORRADOR",
    },
    select: { id: true },
  })

  revalidateProyectoPaths(docente.id)
  return { success: true, id: creado.id }
}

// =====================================================================
// ACTUALIZAR — docente edita mientras está en BORRADOR
// =====================================================================

export async function actualizarProyectoAction(
  id: string,
  input: CrearProyectoInput,
): Promise<{ error: string } | { success: true }> {
  const session = await ensureDocente()

  const parsed = crearProyectoSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." }
  }

  const proyecto = await prisma.proyectoDocente.findUnique({
    where: { id },
    select: { id: true, docenteId: true, estado: true },
  })
  if (!proyecto) return { error: "Proyecto no encontrado." }
  if (proyecto.docenteId !== session.id) {
    return { error: "No podés editar un proyecto que no es tuyo." }
  }
  if (proyecto.estado !== "BORRADOR") {
    return { error: "Solo se pueden editar proyectos en estado BORRADOR." }
  }

  await prisma.proyectoDocente.update({
    where: { id },
    data: parsed.data,
  })

  revalidateProyectoPaths(session.id)
  return { success: true }
}

// =====================================================================
// ENVIAR — docente envía a revisión (BORRADOR → ENVIADO)
// =====================================================================

export async function enviarProyectoAction(
  id: string,
): Promise<{ error: string } | { success: true }> {
  const session = await ensureDocente()

  const proyecto = await prisma.proyectoDocente.findUnique({
    where: { id },
    select: { id: true, docenteId: true, estado: true },
  })
  if (!proyecto) return { error: "Proyecto no encontrado." }
  if (proyecto.docenteId !== session.id) {
    return { error: "No podés enviar un proyecto que no es tuyo." }
  }
  if (proyecto.estado !== "BORRADOR") {
    return { error: "Solo se pueden enviar proyectos en estado BORRADOR." }
  }

  await prisma.proyectoDocente.update({
    where: { id },
    data: { estado: "ENVIADO" },
  })

  revalidateProyectoPaths(session.id)
  revalidatePath("/admin/revision/proyectos")
  return { success: true }
}

// =====================================================================
// CANCELAR — docente retira un proyecto ENVIADO o elimina BORRADOR
// =====================================================================

export async function cancelarProyectoAction(
  id: string,
): Promise<{ error: string } | { success: true }> {
  const session = await ensureDocente()

  const proyecto = await prisma.proyectoDocente.findUnique({
    where: { id },
    select: { id: true, docenteId: true, estado: true },
  })
  if (!proyecto) return { error: "Proyecto no encontrado." }
  if (proyecto.docenteId !== session.id) {
    return { error: "No podés cancelar un proyecto que no es tuyo." }
  }
  if (proyecto.estado !== "ENVIADO" && proyecto.estado !== "BORRADOR") {
    return {
      error: "Solo se pueden cancelar proyectos en estado BORRADOR o ENVIADO.",
    }
  }

  if (proyecto.estado === "BORRADOR") {
    await prisma.proyectoDocente.delete({ where: { id } })
  } else {
    await prisma.proyectoDocente.update({
      where: { id },
      data: {
        estado: "RECHAZADO",
        observacionesAdmin: "Cancelado por el docente",
        revisadoEn: new Date(),
      },
    })
  }

  revalidateProyectoPaths(session.id)
  return { success: true }
}

// =====================================================================
// APROBAR — admin aprueba y activa proyectosActivos
// =====================================================================

export async function aprobarProyectoAction(
  id: string,
): Promise<{ error: string } | { success: true }> {
  const user = await ensureAdmin()

  const proyecto = await prisma.proyectoDocente.findUnique({
    where: { id },
    include: {
      docente: { select: { id: true, nombre: true, modalidad: true } },
    },
  })
  if (!proyecto) return { error: "Proyecto no encontrado." }
  if (proyecto.estado !== "ENVIADO") {
    return { error: "Solo se pueden aprobar proyectos en estado ENVIADO." }
  }

  if (proyecto.docente.modalidad === "CATEDRA") {
    return {
      error:
        "Art. 3 Par. 1: los docentes catedráticos no pueden tener proyectos activos.",
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.proyectoDocente.update({
      where: { id },
      data: {
        estado: "APROBADO",
        revisadoPor: user.id,
        revisadoEn: new Date(),
      },
    })
    await syncProyectosActivos(tx, proyecto.docenteId, "aprobar")
    await registrarAuditoriaStrict(
      {
        actorId: user.id,
        actorRol: user.rol as Rol,
        actorNombre: user.name ?? user.email ?? user.id,
        entidad: "PROYECTO_DOCENTE",
        accion: "CAMBIAR_ESTADO",
        recursoId: id,
        recursoDesc: `Proyecto "${proyecto.titulo}" de ${proyecto.docente.nombre}`,
        antes: { estado: "ENVIADO" },
        despues: { estado: "APROBADO" },
      },
      tx,
    )
  })

  revalidatePath("/admin/revision/proyectos")
  revalidatePath(`/admin/revision/proyectos/${id}`)
  revalidatePath("/proyectos")
  revalidatePath("/agenda")
  return { success: true }
}

// =====================================================================
// RECHAZAR — admin rechaza con motivo
// =====================================================================

export async function rechazarProyectoAction(
  id: string,
  motivo: string,
): Promise<{ error: string } | { success: true }> {
  const user = await ensureAdmin()

  if (!motivo || motivo.trim().length < 10) {
    return {
      error: "El motivo es obligatorio y debe tener al menos 10 caracteres.",
    }
  }

  const proyecto = await prisma.proyectoDocente.findUnique({
    where: { id },
    include: {
      docente: { select: { id: true, nombre: true } },
    },
  })
  if (!proyecto) return { error: "Proyecto no encontrado." }
  if (proyecto.estado !== "ENVIADO") {
    return { error: "Solo se pueden rechazar proyectos en estado ENVIADO." }
  }

  await prisma.$transaction(async (tx) => {
    await tx.proyectoDocente.update({
      where: { id },
      data: {
        estado: "RECHAZADO",
        observacionesAdmin: motivo.trim(),
        revisadoPor: user.id,
        revisadoEn: new Date(),
      },
    })
    await syncProyectosActivos(tx, proyecto.docenteId, "rechazar")
    await registrarAuditoriaStrict(
      {
        actorId: user.id,
        actorRol: user.rol as Rol,
        actorNombre: user.name ?? user.email ?? user.id,
        entidad: "PROYECTO_DOCENTE",
        accion: "CAMBIAR_ESTADO",
        recursoId: id,
        recursoDesc: `Proyecto "${proyecto.titulo}" de ${proyecto.docente.nombre}`,
        antes: { estado: "ENVIADO" },
        despues: { estado: "RECHAZADO" },
        observaciones: motivo.trim(),
      },
      tx,
    )
  })

  revalidatePath("/admin/revision/proyectos")
  revalidatePath(`/admin/revision/proyectos/${id}`)
  revalidatePath("/proyectos")
  return { success: true }
}

// =====================================================================
// LECTURA — docente
// =====================================================================

export async function getProyectosDocente(docenteId: string) {
  return prisma.proyectoDocente.findMany({
    where: { docenteId },
    orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
  })
}

export async function getProyectoDetalle(id: string) {
  return prisma.proyectoDocente.findUnique({
    where: { id },
    include: {
      docente: {
        select: { id: true, nombre: true, email: true, modalidad: true },
      },
    },
  })
}

// =====================================================================
// LECTURA — admin
// =====================================================================

export async function getProyectosParaAdmin(opts?: {
  estado?: "ENVIADO" | "APROBADO" | "RECHAZADO" | "BORRADOR" | "TODAS"
  q?: string
  page?: number
  perPage?: number
}) {
  await ensureAdmin()
  const page = opts?.page ?? 1
  const perPage = opts?.perPage ?? 20
  const estado = !opts?.estado || opts.estado === "TODAS" ? undefined : opts.estado

  const where: Prisma.ProyectoDocenteWhereInput = {
    estado,
    docente: opts?.q
      ? {
          OR: [
            { nombre: { contains: opts.q, mode: "insensitive" } },
            { cedula: { contains: opts.q } },
            { email: { contains: opts.q, mode: "insensitive" } },
          ],
        }
      : undefined,
  }

  const [total, items] = await Promise.all([
    prisma.proyectoDocente.count({ where }),
    prisma.proyectoDocente.findMany({
      where,
      orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        docente: {
          select: {
            id: true,
            nombre: true,
            email: true,
            cedula: true,
            modalidad: true,
            sedeBase: true,
            facultad: true,
            programa: true,
          },
        },
      },
    }),
  ])

  return {
    items,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}
