import { getCohortesConsejeros } from "@/lib/consejeria"
import { Users } from "lucide-react"

/**
 * Panel embebido (no es una vista del menú): muestra, donde el jefe arma la agenda,
 * las cohortes vigentes del programa y quién es su consejero en el período — para ver
 * de un vistazo qué cohortes están cubiertas y cuáles sin asignar. Server Component.
 */
export async function CohortesConsejeros({
  programa,
  periodo,
}: {
  programa: string
  periodo: string
}) {
  const filas = await getCohortesConsejeros(programa, periodo)
  if (filas.length === 0) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
      <div className="mb-1 flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
        <Users className="h-4 w-4" />
        Consejería del programa — {programa}
      </div>
      <p className="mb-2 text-xs text-muted-foreground">
        Cohortes activas (últimos 6 semestres) y su consejero en {periodo}. Cada cohorte
        admite un único consejero.
      </p>
      <ul className="divide-y">
        {filas.map((f) => (
          <li key={f.cohorte} className="flex items-center justify-between py-1">
            <span className="font-mono text-xs">{f.cohorte}</span>
            {f.consejero ? (
              <span className="text-xs font-medium">{f.consejero}</span>
            ) : (
              <span className="text-xs text-muted-foreground">— sin consejero</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
