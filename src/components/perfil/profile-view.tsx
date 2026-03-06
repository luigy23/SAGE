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

const modalidadLabels: Record<string, string> = {
  TCP: "Tiempo Completo Planta",
  TCO: "Tiempo Completo Ocasional",
  MTP: "Medio Tiempo Planta",
  MTC: "Medio Tiempo Catedra",
  CATEDRA: "Catedra",
}

export function ProfileView({ docente }: { docente: Docente }) {
  return (
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
              Cedula
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
  )
}
