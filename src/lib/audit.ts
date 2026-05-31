import { prisma } from "@/lib/prisma"
import type { Prisma, TipoEntidad, AccionAuditoria, Rol } from "@/generated/prisma/client"

export type AuditoriaInput = {
  actorId: string
  actorRol: Rol
  actorNombre: string
  entidad: TipoEntidad
  accion: AccionAuditoria
  recursoId?: string
  recursoDesc?: string
  antes?: Record<string, unknown>
  despues?: Record<string, unknown>
  observaciones?: string
}

function buildData(input: AuditoriaInput) {
  return {
    actorId: input.actorId,
    actorRol: input.actorRol,
    actorNombre: input.actorNombre,
    entidad: input.entidad,
    accion: input.accion,
    recursoId: input.recursoId ?? null,
    recursoDesc: input.recursoDesc ?? null,
    antes: (input.antes as Prisma.InputJsonValue) ?? undefined,
    despues: (input.despues as Prisma.InputJsonValue) ?? undefined,
    observaciones: input.observaciones ?? null,
  }
}

/**
 * Registra un evento en AuditoriaLog usando un cliente de transacción opcional.
 * Silent fail: si la escritura falla, el error se loguea pero no se propaga.
 * Usar cuando el log es informativo y NO debe revertir la operación de negocio.
 */
export async function registrarAuditoria(
  input: AuditoriaInput,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  try {
    const client = tx ?? prisma
    await client.auditoriaLog.create({ data: buildData(input) })
  } catch (err) {
    console.error("[audit] Error al registrar auditoría:", err)
  }
}

/**
 * Registra un evento en AuditoriaLog dentro de una transacción obligatoria.
 * Lanza si falla: usar cuando el log es parte permanente del registro de negocio.
 */
export async function registrarAuditoriaStrict(
  input: AuditoriaInput,
  tx: Prisma.TransactionClient,
): Promise<void> {
  await tx.auditoriaLog.create({ data: buildData(input) })
}
