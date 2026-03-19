import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ClipboardCheck, BookOpen, User } from "lucide-react"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/login")

  const docente = await prisma.docente.findUnique({
    where: { id: session.user.id },
    include: {
      _count: {
        select: {
          cursosGuardados: true,
          agendasSemestrales: true,
          monitoreos: true,
        },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bienvenido, {docente?.nombre}</h1>
        <p className="text-muted-foreground">
          {docente?.facultad} — {docente?.programa}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Cursos Guardados
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {docente?._count.cursosGuardados ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Cursos en tu perfil
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Agendas Semestrales
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {docente?._count.agendasSemestrales ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Formularios FO-19</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monitoreos</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {docente?._count.monitoreos ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Formularios FO-20</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Modalidad</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{docente?.modalidad}</div>
            <p className="text-xs text-muted-foreground">Tipo de vinculacion</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Mi Perfil</CardTitle>
            <CardDescription>
              Actualiza tus datos y gestiona tus cursos guardados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/perfil">Ir a mi perfil</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agenda Semestral (FO-19)</CardTitle>
            <CardDescription>
              Planifica tu agenda academica del semestre
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/agenda">Ir a agenda</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monitoreo (FO-20)</CardTitle>
            <CardDescription>
              Reporta las actividades ejecutadas en el semestre
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/monitoreo">Ir a monitoreo</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
