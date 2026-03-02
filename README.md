# SAGE - Sistema de Automatización y Gestión de Espacios Académicos

Plataforma web para automatizar la organización de agendas y formularios de profesores universitarios.

## Descripción

SAGE es una herramienta diseñada para simplificar y automatizar los procesos de planificación académica, permitiendo a los profesores universitarios gestionar sus horarios, formularios de disponibilidad y asignación de espacios de manera eficiente.

### Funcionalidades principales

- **Gestión de formularios** — Creación y distribución automática de formularios de disponibilidad y preferencias horarias
- **Organización de agendas** — Visualización y gestión centralizada de horarios de profesores
- **Automatización** — Generación automática de horarios basada en restricciones y preferencias
- **Panel administrativo** — Dashboard para coordinadores y administradores académicos

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **Base de datos:** Por definir
- **Autenticación:** Por definir

## Requisitos previos

- Node.js 18+
- npm, yarn o pnpm

## Instalación

```bash
git clone https://github.com/luigy23/SAGE.git
cd SAGE
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura del proyecto

```
SAGE/
├── src/
│   ├── app/          # Rutas y páginas (App Router)
│   ├── components/   # Componentes reutilizables
│   ├── lib/          # Utilidades y configuraciones
│   └── types/        # Tipos TypeScript
├── public/           # Archivos estáticos
└── ...
```

## Licencia

MIT
