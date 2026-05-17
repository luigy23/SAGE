import Link from "next/link"
import type { Docente } from "@/generated/prisma/client"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GraduationCap, Briefcase, FolderOpen, ShieldCheck } from "lucide-react"
import { esCargoExentoGestion20 } from "@/lib/utils/cargo"

const modalidadLabels: Record<string, string> = {
  PLANTA_TC: "Tiempo Completo Planta",
  PLANTA_MT: "Medio Tiempo Planta",
  OCASIONAL_TC: "Tiempo Completo Ocasional",
  OCASIONAL_MT: "Medio Tiempo Ocasional",
  CATEDRA: "Catedrático",
  VISITANTE: "Visitante",
  INVITADO: "Invitado",
}

/**
 * Formatea valores legacy/importados de `tipoCargo` que vienen en SCREAMING_SNAKE_CASE
 * (ej. `JEFE_DEPARTAMENTO`) a sentence case en español (`Jefe departamento`).
 * Si el valor ya viene con formato legible (mezcla de mayúsculas/minúsculas o sin
 * guiones bajos), se respeta tal cual fue digitado por el docente.
 *
 * Decisión: sentence case en lugar de Title Case para respetar la ortografía
 * española de conectores ("de", "del", "la", etc.).
 */
function formatearTipoCargo(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed === "") return trimmed
  const esLegacy = trimmed.includes("_") || trimmed === trimmed.toUpperCase()
  if (!esLegacy) return trimmed
  const limpio = trimmed.replace(/_/g, " ").toLowerCase().replace(/\s+/g, " ").trim()
  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}

export function ProfileView({ docente }: { docente: Docente }) {
  // El campo `tipoCargo` solo aplica si el docente tiene cargo administrativo activo.
  // El cleanup en profile-actions garantiza que se setea a null cuando se desactiva el cargo,
  // pero defendemos contra cadenas vacías legacy con .trim().
  const tipoCargoActivo =
    docente.cargoAdministrativo && docente.tipoCargo?.trim()
      ? docente.tipoCargo.trim()
      : null

  // Art. 10 + Art. 11: detecta los 5 cargos exentos del tope del 20% de gestión.
  // El helper trabaja sobre el valor crudo (regex tolerante a tildes/mayúsculas),
  // así que normalizamos el display por separado sin afectar la detección.
  const exentoDel20 = tipoCargoActivo ? esCargoExentoGestion20(tipoCargoActivo) : false
  const tipoCargoLabel = tipoCargoActivo ? formatearTipoCargo(tipoCargoActivo) : null

  const condiciones = [
    {
      key: "doctorado",
      label: "Doctorado",
      value: docente.doctorado,
      icon: GraduationCap,
      description: "Art. 4 Par. 3 — Vinculación a grupo de investigación",
    },
    {
      key: "cargoAdministrativo",
      label: "Cargo Administrativo",
      value: docente.cargoAdministrativo,
      icon: Briefcase,
      // Descripción dinámica: si el cargo es exento (Art. 11), reemplazamos la
      // regla del 20% por la del tope individual para evitar contradicción
      // visual con el badge de exención.
      description: exentoDel20
        ? "Art. 11 — Exento del límite del 20%. Se rige por el tope semestral individual del cargo."
        : "Art. 10 — Gestión no puede exceder 20% del tiempo laboral",
    },
    {
      key: "proyectosActivos",
      label: "Proyectos Activos",
      value: docente.proyectosActivos,
      icon: FolderOpen,
      description: "Art. 3 Par. 1 — Reduce mínimo de horas de docencia",
    },
  ]

  return (
    <div className="space-y-6">
      {/* ── Datos Personales ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Datos Personales</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/perfil/editar">Editar Perfil</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Nombre
              </dt>
              <dd className="text-sm">{docente.nombre}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Cédula
              </dt>
              <dd className="text-sm">{docente.cedula}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Email
              </dt>
              <dd className="text-sm">{docente.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Celular
              </dt>
              <dd className="text-sm">{docente.celular || "No registrado"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Facultad
              </dt>
              <dd className="text-sm">{docente.facultad}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Programa
              </dt>
              <dd className="text-sm">{docente.programa}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Modalidad
              </dt>
              <dd>
                <Badge variant="secondary">
                  {modalidadLabels[docente.modalidad] || docente.modalidad}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Cargo Administrativo
              </dt>
              <dd className="text-sm">
                {tipoCargoLabel ? (
                  <Badge variant="secondary">{tipoCargoLabel}</Badge>
                ) : (
                  <span className="italic text-muted-foreground">Ninguno</span>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* ── Condiciones Académicas (Acuerdo 048) ── */}
      <Card>
        <CardHeader>
          <CardTitle>Condiciones Académicas</CardTitle>
          <p className="text-sm text-muted-foreground">
            Flags normativos del Acuerdo 048 de 2018 que afectan el cálculo de
            la carga académica.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {condiciones.map((cond) => {
              const Icon = cond.icon
              // Solo la caja de "Cargo Administrativo" muestra detalle adicional
              // (nombre del cargo + insignia de exención cuando aplica).
              const showCargoDetail = cond.key === "cargoAdministrativo" && cond.value && tipoCargoLabel
              return (
                <div
                  key={cond.key}
                  className={`flex flex-col gap-2 rounded-lg border p-4 transition-colors ${
                    cond.value
                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950"
                      : "border-muted bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`h-5 w-5 ${
                        cond.value
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                      }`}
                    />
                    <span className="text-sm font-semibold">{cond.label}</span>
                    <Badge
                      variant={cond.value ? "default" : "outline"}
                      className={
                        cond.value
                          ? "ml-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "ml-auto"
                      }
                    >
                      {cond.value ? "Sí" : "No"}
                    </Badge>
                  </div>
                  {showCargoDetail && (
                    <div className="flex flex-wrap items-center gap-1.5 pl-7">
                      <span className="text-sm font-medium text-foreground">
                        {tipoCargoLabel}
                      </span>
                      {exentoDel20 && (
                        <Badge
                          variant="outline"
                          className="gap-1 border-emerald-300 bg-emerald-100/80 text-[10px] font-medium text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          Exento tope 20% (Art. 11)
                        </Badge>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {cond.description}
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
