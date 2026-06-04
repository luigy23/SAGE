import { getCohortesConsejeros } from "@/lib/consejeria"
import { LiberarCohorteButton } from "@/components/agenda/LiberarCohorteButton"
import { Users } from "lucide-react"

/**
 * Panel embebido (no es una vista del menú): muestra, donde el jefe arma la agenda,
 * las cohortes vigentes del programa, su consejero y "Sem X de Y" en el período. Si
 * `canLiberar`, ofrece el botón para liberar el compromiso antes de tiempo.
 * Server Component.
 */
export async function CohortesConsejeros({
  programa,
  periodo,
  canLiberar = false,
}: {
  programa: string
  periodo: string
  canLiberar?: boolean
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
          <li key={f.cohorte} className="flex items-center justify-between gap-2 py-1">
            <span className="font-mono text-xs">{f.cohorte}</span>
            {f.consejero ? (
              <span className="flex items-center gap-2 text-xs">
                <span className="font-medium">{f.consejero}</span>
                {f.semestreActual != null && f.semestresCompromiso != null && (
                  <span className="text-muted-foreground">
                    Sem {f.semestreActual}/{f.semestresCompromiso}
                  </span>
                )}
                {canLiberar && f.compromisoId && (
                  <LiberarCohorteButton compromisoId={f.compromisoId} />
                )}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">— sin consejero</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
