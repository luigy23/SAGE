# SAGE - Sistema de Automatizacion y Gestion de Espacios Academicos

Plataforma web para automatizar la organizacion de agendas y formularios de profesores universitarios.

## Descripcion

SAGE es una herramienta diseñada para simplificar y automatizar los procesos de planificacion academica, permitiendo a los profesores universitarios gestionar sus horarios, formularios de disponibilidad y asignacion de espacios de manera eficiente.

### Funcionalidades principales

- **Gestion de formularios** — Creacion y distribucion automatica de formularios de disponibilidad y preferencias horarias
- **Organizacion de agendas** — Visualizacion y gestion centralizada de horarios de profesores
- **Automatizacion** — Generacion automatica de horarios basada en restricciones y preferencias
- **Panel administrativo** — Dashboard para coordinadores y administradores academicos

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **Base de datos:** PostgreSQL
- **ORM:** Prisma

## Requisitos previos

- Node.js 18+
- npm

## Instalacion

```bash
git clone https://github.com/luigy23/SAGE.git
cd SAGE
npm install
```

Copia el archivo de variables de entorno:

```bash
cp .env.example .env
```

Configura tu `DATABASE_URL` en `.env` y ejecuta las migraciones:

```bash
npx prisma migrate dev
```

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura del proyecto

```
SAGE/
├── src/
│   ├── app/          # Rutas y paginas (App Router)
│   ├── components/   # Componentes reutilizables
│   └── lib/          # Utilidades y configuraciones
├── prisma/           # Schema y migraciones
├── docs/             # Documentacion y formularios de referencia
├── public/           # Archivos estaticos
└── ...
```

## Licencia

MIT
