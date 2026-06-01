import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, Briefcase, FolderOpen, ShieldCheck } from "lucide-react"
import { esCargoExentoGestion20 } from "@/lib/utils/cargo"
import { getModalidadLabel } from "@/lib/utils/modalidad"
import { DocenteAdminActions } from "@/components/admin/docente-admin-actions"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type DocenteDetalle = {
  id: string
  nombre: string
  cedula: string
  email: string
  celular: string | null
  modalidad: string
  sedeBase: string
  facultad: string
  programa: string
  estadoCuenta: string
  createdAt: Date
  doctorado: boolean
  cargoAdministrativo: boolean
  tipoCargo: string | null
  proyectosActivos: boolean
  rol: string
}

function estadoBadge(estado: string) {
  const map: Record<string, { className: string; label: string }> = {
    ACTIVO:    { className: "bg-green-600 text-white", label: "Activo" },
    PENDIENTE: { className: "bg-yellow-500 text-white", label: "Pendiente" },
    INACTIVO:  { className: "bg-red-600 text-white", label: "Inactivo" },
    RECHAZADO: { className: "bg-orange-500 text-white", label: "Rechazado" },
  }
  const cfg = map[estado] ?? { className: "", label: estado }
  return <Badge className={cfg.className}>{cfg.label}</Badge>
}

function formatearTipoCargo(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  const esLegacy = trimmed.includes("_") || trimmed === trimmed.toUpperCase()
  if (!esLegacy) return trimmed
  const limpio = trimmed.replace(/_/g, " ").toLowerCase().replace(/\s+/g, " ").trim()
  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}

export function DocenteDetail({ docente }: { docente: DocenteDetalle }) {
  const tipoCargoActivo =
    docente.cargoAdministrativo && docente.tipoCargo?.trim()
      ? docente.tipoCargo.trim()
      : null
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
      {/* ── Estado y acciones ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado de la cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {estadoBadge(docente.estadoCuenta)}
              <span className="text-sm text-muted-foreground">
                Registrado el {format(new Date(docente.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: es })}
              </span>
            </div>
            <DocenteAdminActions docenteId={docente.id} currentStatus={docente.estadoCuenta} />
          </div>
        </CardContent>
      </Card>

      {/* ── Datos Personales ── */}
      <Card>
        <CardHeader>
          <CardTitle>Datos Personales</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Nombre</dt>
              <dd className="text-sm">{docente.nombre}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Cédula</dt>
              <dd className="text-sm">{docente.cedula}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Email</dt>
              <dd className="text-sm">{docente.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Celular</dt>
              <dd className="text-sm">{docente.celular || <span className="italic text-muted-foreground">No registrado</span>}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Facultad</dt>
              <dd className="text-sm">{docente.facultad}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Programa</dt>
              <dd className="text-sm">{docente.programa}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Modalidad</dt>
              <dd>
                <Badge variant="secondary">{getModalidadLabel(docente.modalidad as any)}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Sede</dt>
              <dd className="text-sm">{docente.sedeBase}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Cargo Administrativo</dt>
              <dd className="text-sm">
                {tipoCargoLabel ? (
                  <Badge variant="secondary">{tipoCargoLabel}</Badge>
                ) : (
                  <span className="italic text-muted-foreground">Ninguno</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Rol en el sistema</dt>
              <dd className="text-sm">{docente.rol}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* ── Condiciones Académicas ── */}
      <Card>
        <CardHeader>
          <CardTitle>Condiciones Académicas</CardTitle>
          <p className="text-sm text-muted-foreground">
            Flags normativos del Acuerdo 048 de 2018 que afectan el cálculo de la carga académica.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {condiciones.map((cond) => {
              const Icon = cond.icon
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
                        cond.value ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                      }`}
                    />
                    <span className="text-sm font-semibold">{cond.label}</span>
                    <Badge
                      variant={cond.value ? "default" : "outline"}
                      className={
                        cond.value ? "ml-auto bg-emerald-600 hover:bg-emerald-700 text-white" : "ml-auto"
                      }
                    >
                      {cond.value ? "Sí" : "No"}
                    </Badge>
                  </div>
                  {showCargoDetail && (
                    <div className="flex flex-wrap items-center gap-1.5 pl-7">
                      <span className="text-sm font-medium text-foreground">{tipoCargoLabel}</span>
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
                  <p className="text-xs text-muted-foreground leading-relaxed">{cond.description}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
