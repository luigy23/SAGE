# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SAGE (Sistema de Automatización y Gestión de Espacios Académicos) — digitalize and automate FO-19 (semester agenda planning) and FO-20 (execution audit) forms for Universidad Surcolombiana professors, enforcing workload rules from **Acuerdo 048/2018**.

## Commands

```bash
# Development
npm run dev          # Next.js dev server on http://localhost:3000

# Production
npm run build        # prisma generate && next build
npm start            # production server

# Linting
npm run lint         # ESLint

# Database
npm run seed         # tsx prisma/seed.ts
npx prisma migrate dev
npx prisma generate
```

Package manager is **pnpm** but npm scripts work. No test suite exists — there are no test commands.

## Architecture

**Full-stack Next.js App Router** with Server Actions as the mutation layer.

```
src/
├── app/
│   ├── (protected)/         # Auth-gated routes
│   │   ├── agenda/          # FO-19 planning forms (BORRADOR → ENVIADO → APROBADO)
│   │   ├── monitoreo/       # FO-20 execution audit forms
│   │   ├── admin/           # ADMIN role: cursos, docentes, periodos, revision
│   │   └── superadmin/      # SUPERADMIN role: parametric rules, bulk ops
│   ├── api/
│   │   ├── agenda/[id]/pdf/ # PDF export
│   │   └── monitoreo/[id]/pdf/
│   └── auth/login/
├── components/
│   ├── ui/                  # shadcn/ui base components (new-york style)
│   ├── agenda/              # FO-19 wizard, read-only view, validation panel
│   ├── monitoreo/           # FO-20 components
│   ├── revision/            # Audit/review components
│   └── admin/, superadmin/, perfil/, layout/
├── lib/
│   ├── actions/             # Server Actions (all mutations live here)
│   ├── rules/               # Parametric rules resolver + in-memory cache
│   ├── validations/         # Acuerdo 048 business rule validators
│   ├── schemas/             # Zod schemas
│   ├── utils/               # periodo.ts, modalidad.ts, cargo.ts
│   ├── auth.ts              # NextAuth v5 config
│   ├── rbac.ts              # Role-based access control helpers
│   └── prisma.ts            # Prisma client singleton
└── types/
```

## Key Patterns

### Server Actions
All mutations use `"use server"` actions in `src/lib/actions/*.ts`. Return contract is consistent:
```ts
{ error: string } | { success: true; data?: T }
```
Always call `revalidatePath()` after mutations.

### Authentication & RBAC
- NextAuth v5 (beta) with Credentials provider. JWT strategy with custom claims: `rol`, `sedeBase`, `modalidad`, `facultad`, `programa`.
- Check permissions via `puedeAdministrar()` in `rbac.ts` before any admin mutation.
- Guard against removing the last superadmin with `assertNoEsUltimoSuperadmin()`.

### Parametric Rules Engine
Rules enforcing Acuerdo 048 have two sources that cascade:

1. **DB tables** (`ParametroGlobal`, `ParametrosModalidad`, `FormulaCurso`, `CatalogoActividad`, `CargoAdministrativo`) — configurable via Superadmin UI
2. **Hardcoded fallback** in `src/lib/validations/agenda-rules.ts`

The resolver in `src/lib/rules/resolver.ts` applies precedence: `(periodoId, modalidad, sede)` → most specific wins → fallback to hardcoded. Rules are memoized for 60s via `src/lib/rules/cache.ts`. See `docs/REGLAS_PARAMETRIZABLES.md` for the full rules reference.

### Form State Machine
`AgendaSemestral` (FO-19) and `Monitoreo` (FO-20) follow:
```
BORRADOR → ENVIADO → APROBADO | RECHAZADO
```
Admins can rehabilitate forms back to BORRADOR. All rehabilitations and admin edits are logged (`RehabilitacionAgenda`, `EdicionAdministrativa` with before/after JSON diffs).

### Validation Layer
- **Structural** — Zod schemas in `src/lib/schemas/`
- **Business rules** — `src/lib/validations/agenda-rules.ts`
- **Real-time UI** — `agenda-validation-panel.tsx` shows live rule violations during form editing

## Domain Vocabulary

| Term | Meaning |
|------|---------|
| Agenda | FO-19 semester planning form |
| Monitoreo | FO-20 execution audit form |
| Docente | Professor user |
| Periodo | Academic period (e.g. "2026-1") |
| Modalidad | Contract type: PLANTA_TC, PLANTA_MT, OCASIONAL_TC, OCASIONAL_MT, CATEDRA, VISITANTE, INVITADO |
| Sede | Campus: NEIVA, PITALITO, GARZON, LA_PLATA |
| Tope | Maximum allowed hours per activity category |
| CursoMaestro | Centralized course catalog entry |
| Cargo | Administrative role that reduces teaching load |

## Database

PostgreSQL via Prisma. Key constraints:
- `@@unique([docenteId, periodo])` — one agenda per professor per period
- Cascade deletes on Docente → agendas/monitoreos
- SetNull on optional CursoMaestro references

After schema changes: `npx prisma migrate dev` then `npx prisma generate`. The `postinstall` script runs `prisma generate` automatically on `npm install`.

## Environment

Requires `.env` with `DATABASE_URL` pointing to a PostgreSQL instance. Auth requires `AUTH_SECRET`. See `prisma.config.ts` for Prisma config.
