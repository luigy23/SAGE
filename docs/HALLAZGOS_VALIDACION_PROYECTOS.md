# Hallazgos de validación — Proyectos activos (Acuerdo 048)

> Documento de seguimiento. Registra posibles huecos de validación detectados en
> el módulo de proyectos (`/proyectos`) y su integración con la Agenda (FO-19).
> **No corregidos aún** — pendientes de decisión/priorización.

## Contexto

`docente.proyectosActivos` ya no es un flag manual: se deriva del módulo de
proyectos (`src/lib/actions/proyecto-actions.ts` → `syncProyectosActivos`). Un
proyecto en estado `APROBADO` lo pone en `true`; si no quedan proyectos
aprobados, vuelve a `false`. En la Agenda, las actividades del catálogo con
`requiereProyectoAprobado` se bloquean cuando `proyectosActivos` es `false`
(`src/components/agenda/ActividadCatalogoSelector.tsx:225`).

## Hallazgo 1 — Conflicto con el Parágrafo 2° (catedráticos)

El Acuerdo 048 (ver `docs/Acuerdo 048.md`, ~línea 61) establece:

> "Los profesores catedráticos podrán dedicar hasta 4 horas semanales de su
> agenda a actividades de investigación o proyección social, con proyectos
> aprobados en convocatoria interna o externa."

Sin embargo, el módulo **bloquea por completo** a los catedráticos de registrar
proyectos (`proyecto-actions.ts:91` en `crearProyectoAction` y `:238` en
`aprobarProyectoAction`, citando Art. 3 Par. 1). Como consecuencia, un
catedrático **nunca** puede alcanzar `proyectosActivos = true` y quedaría
inhabilitado para las actividades que la norma sí le permite (las 4 h/sem).

- Existe `maxInvProySocialCatedra` en los límites de la agenda
  (`src/lib/validations/agenda-rules.ts` / `resolver.ts`). **Falta confirmar**
  si esa ruta de 4 h depende o no de `proyectosActivos`/`requiereProyectoAprobado`.
- **Acción pendiente:** validar la regla con el decano. Si la ruta de 4 h pasa
  por actividades con `requiereProyectoAprobado`, hay que permitir a los
  catedráticos registrar proyectos (o crear una excepción específica).

## Hallazgo 2 — No se valida el ROL ni el TIPO del proyecto aprobado

El proyecto captura `rolDocente` (Investigador Principal → 220 h, Coinvestigador
→ 176 h, Coordinador → 220 h, Cogestor → 110 h) y `tipo`
(`INVESTIGACION` / `PROYECCION_SOCIAL`) — ver `src/lib/schemas/proyecto-schema.ts`.

Pero la Agenda solo consulta el **booleano** `proyectosActivos`, no el rol ni el
tipo aprobado. Esto permite:

- Un docente aprobado como **Coinvestigador** (tope 176 h) podría reclamar en la
  agenda la actividad **Investigador Principal** (tope 220 h).
- Un docente con un proyecto de **investigación** aprobado podría registrar
  horas de **proyección social** (y viceversa).

**Riesgo:** sobre-declaración de horas no respaldada por el proyecto aprobado.

**Acción pendiente:** atar la actividad de la agenda al `rolDocente`/`tipo` del
proyecto aprobado (p. ej., vincular la actividad a un `ProyectoDocente` concreto
o restringir el catálogo disponible según rol/tipo aprobado).

## Hallazgo 3 — Default blando en el bloqueo

En `ActividadCatalogoSelector.tsx:225`:

```ts
const isBlocked = act.requiereProyectoAprobado && !(proyectosActivos ?? true)
```

Si el prop `proyectosActivos` no llega (undefined), el `?? true` **desactiva el
bloqueo** (asume que sí tiene proyectos). Debería endurecerse a `?? false` para
fallar de forma segura.

**Acción pendiente:** cambiar el default a `?? false`.
