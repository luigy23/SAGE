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
import { GraduationCap, Briefcase, FolderOpen } from "lucide-react"

const modalidadLabels: Record<string, string> = {
  PLANTA_TC: "Tiempo Completo Planta",
  PLANTA_MT: "Medio Tiempo Planta",
  OCASIONAL_TC: "Tiempo Completo Ocasional",
  OCASIONAL_MT: "Medio Tiempo Ocasional",
  CATEDRA: "Catedrático",
  VISITANTE: "Visitante",
  INVITADO: "Invitado",
}

export function ProfileView({ docente }: { docente: Docente }) {
  const condiciones = [
    {
      label: "Doctorado",
      value: docente.doctorado,
      icon: GraduationCap,
      description: "Art. 4 Par. 3 — Vinculación a grupo de investigación",
    },
    {
      label: "Cargo Administrativo",
      value: docente.cargoAdministrativo,
      icon: Briefcase,
      description: "Art. 10 — Gestión no puede exceder 20% del tiempo laboral",
    },
    {
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
              return (
                <div
                  key={cond.label}
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
