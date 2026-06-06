"use client"

import { useMemo, useState } from "react"
import type { ConsejeroDeAmbito } from "@/lib/consejeria"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Inbox, Search } from "lucide-react"

const TODOS = "__todos__"

interface Props {
  consejeros: ConsejeroDeAmbito[]
  periodo: string
  /** Decano/Superadmin: muestra programa+facultad y el filtro por programa. */
  mostrarPrograma: boolean
}

export function ConsejerosLista({ consejeros, periodo, mostrarPrograma }: Props) {
  const [busqueda, setBusqueda] = useState("")
  const [programa, setPrograma] = useState<string>(TODOS)
  const [cohorte, setCohorte] = useState<string>(TODOS)

  const programas = useMemo(
    () => [...new Set(consejeros.map((c) => c.programa))].sort((a, b) => a.localeCompare(b)),
    [consejeros],
  )

  // Cohortes presentes entre los consejeros, más recientes primero.
  const cohortes = useMemo(
    () =>
      [...new Set(consejeros.flatMap((c) => c.cohortes.map((co) => co.cohorte)))].sort((a, b) =>
        b.localeCompare(a),
      ),
    [consejeros],
  )

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return consejeros.filter((c) => {
      if (programa !== TODOS && c.programa !== programa) return false
      if (cohorte !== TODOS && !c.cohortes.some((co) => co.cohorte === cohorte)) return false
      if (q && !c.nombre.toLowerCase().includes(q)) return false
      return true
    })
  }, [consejeros, busqueda, programa, cohorte])

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar consejero por nombre…"
            className="pl-8"
          />
        </div>
        {mostrarPrograma && programas.length > 1 && (
          <Select value={programa} onValueChange={setPrograma}>
            <SelectTrigger className="sm:w-64">
              <SelectValue placeholder="Programa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los programas</SelectItem>
              {programas.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {cohortes.length > 1 && (
          <Select value={cohorte} onValueChange={setCohorte}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Cohorte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas las cohortes</SelectItem>
              {cohortes.map((co) => (
                <SelectItem key={co} value={co}>{co}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {consejeros.length === 0
              ? `No hay consejeros activos en tu ámbito para el período ${periodo}.`
              : "Ningún consejero coincide con el filtro."}
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-md border">
          {filtrados.map((c) => (
            <li key={c.docenteId} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {mostrarPrograma ? `${c.programa} · ${c.facultad}` : c.programa}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {c.cohortes.map((co) => (
                  <Badge key={co.cohorte} variant="outline" className="font-normal">
                    Cohorte <span className="ml-1 font-mono font-medium">{co.cohorte}</span>
                    <span className="ml-1 text-muted-foreground">
                      · sem {co.semestreActual} de {co.semestresCompromiso}
                    </span>
                  </Badge>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
