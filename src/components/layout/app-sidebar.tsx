"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  User,
  Calendar,
  ClipboardCheck,
  LogOut,
  ShieldCheck,
  BookOpen,
  CalendarDays,
  Users,
  Crown,
  Sliders,
  GitBranch,
  Search,
  ShieldAlert,
  Microscope,
  ClipboardList,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import { signOutAction } from "@/lib/actions/sign-out"

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Agenda Semestral", href: "/agenda", icon: Calendar },
  { title: "Monitoreo", href: "/monitoreo", icon: ClipboardCheck },
]

const docenteNavItems = [
  { title: "Mis Proyectos", href: "/proyectos", icon: Microscope },
]

const profileItem = { title: "Mi Perfil", href: "/perfil", icon: User }

export function AppSidebar({
  user,
  gestion,
}: {
  user: { name?: string | null; email?: string | null; rol?: string }
  /** Sección de autoridad académica (Jefe/Decano/SUPERADMIN). `null` si no aplica. */
  gestion?: { label: string } | null
}) {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-bold text-[#8F141B]">SAGE</span>
        </Link>
        <p className="text-xs text-muted-foreground">
          Sistema de Agenda y Gestion Educativa
        </p>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegacion</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {user.rol === "DOCENTE" && docenteNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* AUTORIDAD ACADÉMICA — Jefe de Programa / Decano / SUPERADMIN.
                  Aparece solo si el usuario tiene autoridad delegada (cargo). */}
              {gestion && (
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <ClipboardList />
                    <span className="font-semibold">{gestion.label}</span>
                  </SidebarMenuButton>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.startsWith("/gestion/agendas")}
                      >
                        <Link href="/gestion/agendas">
                          <Calendar />
                          <span>Agendas (FO-19)</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.startsWith("/gestion/monitoreos")}
                      >
                        <Link href="/gestion/monitoreos">
                          <ClipboardCheck />
                          <span>Monitoreos (FO-20)</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
              )}

              {/* ADMIN ONLY LINKS - GRUPADOS (también accesible por SUPERADMIN) */}
              {(user.rol === "ADMIN" || user.rol === "SUPERADMIN") && (
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <ShieldCheck />
                    <span className="font-semibold">Administración</span>
                  </SidebarMenuButton>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.startsWith("/admin/revision")}
                      >
                        <Link href="/admin/revision">
                          <Search />
                          <span>Revisión</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.startsWith("/admin/docentes")}
                      >
                        <Link href="/admin/docentes">
                          <Users />
                          <span>Gestión de Docentes</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton 
                        asChild 
                        isActive={pathname.startsWith("/admin/cursos")}
                      >
                        <Link href="/admin/cursos">
                          <BookOpen />
                          <span>Catálogo de Cursos</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.startsWith("/admin/periodos")}
                      >
                        <Link href="/admin/periodos">
                          <CalendarDays />
                          <span>Periodos Académicos</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
              )}

              {/* SUPERADMIN ONLY — gestión de reglas paramétricas y rehabilitación */}
              {user.rol === "SUPERADMIN" && (
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Crown />
                    <span className="font-semibold">SuperAdmin</span>
                  </SidebarMenuButton>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.startsWith("/superadmin/parametros")}
                      >
                        <Link href="/superadmin/parametros">
                          <Sliders />
                          <span>Parámetros Globales</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.startsWith("/superadmin/modalidades")}
                      >
                        <Link href="/superadmin/modalidades">
                          <GitBranch />
                          <span>Modalidades</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.startsWith("/superadmin/usuarios")}
                      >
                        <Link href="/superadmin/usuarios">
                          <Users />
                          <span>Usuarios y Roles</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.startsWith("/superadmin/auditoria")}
                      >
                        <Link href="/superadmin/auditoria">
                          <ShieldAlert />
                          <span>Auditoría</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>

                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.startsWith("/superadmin/periodos")}
                      >
                        <Link href="/superadmin/periodos">
                          <CalendarDays />
                          <span>Períodos Académicos</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {/* Mi Perfil — isolated as a configuration-level item */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith(profileItem.href)}>
              <Link href={profileItem.href}>
                <profileItem.icon />
                <span>{profileItem.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="border-t pt-3 mt-2">
          <div className="mb-2">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesion
            </button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
