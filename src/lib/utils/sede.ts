import type { Sede } from "@/generated/prisma/client"
import { SEDES } from "@/lib/constants"

/** Sedes regionales que autorizan 19 h/sem para cátedra (Art. 4d Acuerdo 048). */
export const SEDES_CATEDRA_EXTENDIDA: Sede[] = ["PITALITO", "GARZON", "LA_PLATA"]

/** Retorna la etiqueta legible para una sede (ej. "LA_PLATA" -> "La Plata"). */
export function getSedeLabel(sedeValue?: string | null): string {
  if (!sedeValue) return ""
  return SEDES.find(s => s.value === sedeValue)?.label ?? sedeValue
}
