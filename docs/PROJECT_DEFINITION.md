# SAGE — Definicion del Proyecto

## Contexto

Plataforma web para la **Universidad Surcolombiana (USCO)** que digitaliza y automatiza dos formularios oficiales del proceso de gestion de agenda docente, permitiendo planificar actividades al inicio del semestre y reportar lo ejecutado al final.

---

## Formularios

### FO-19 — Informacion de Actividades Agenda Semestral Docentes (Planificacion)

**Cuando se llena:** Inicio del semestre
**Codigo oficial:** MI-FOR-FO-19 v8 (2019)
**Se llena una sola vez** por semestre. No editable despues de enviar.

#### Encabezado (pre-cargado del perfil)

| Campo              | Tipo                                           |
| ------------------ | ---------------------------------------------- |
| Facultad           | Texto                                          |
| Programa/Dpto      | Texto                                          |
| Nombre del Docente | Texto                                          |
| Cedula             | Numero                                         |
| Fecha              | Fecha                                          |
| Periodo            | Texto (ej: 2026-1)                             |
| Modalidad          | Seleccion: TCP, TCO, MTP, MTC, Catedra, Otro  |

#### Seccion 1 — Docencia

**1.0 Cursos asignados**

| Campo               | Tipo   |
| ------------------- | ------ |
| Numero del Curso    | Texto  |
| Nombre del Curso    | Texto  |
| Subgrupo            | Texto  |
| Sede                | Texto  |
| Horas Presenciales  | Numero |
| Numero de Creditos  | Numero |
| Numero de Semanas   | Numero |
| Dedicacion por Periodo (horas totales semestre) | Numero |

Subtotal de dedicacion.

**1.1 Horario de Clases**

Grilla semanal por curso:

| Campo            | Tipo                                    |
| ---------------- | --------------------------------------- |
| Numero del Curso | Texto (referencia a tabla anterior)     |
| Nombre del Curso | Texto                                   |
| Lunes            | Rango horario                           |
| Martes           | Rango horario                           |
| Miercoles        | Rango horario                           |
| Jueves           | Rango horario                           |
| Viernes          | Rango horario                           |
| Sabado           | Rango horario                           |
| Domingo          | Rango horario                           |

**1.2 Otras Actividades de Docencia**

Actividades de docencia distintas al desarrollo de cursos (Art. 11, Acuerdo 048/2018).

| Campo                  | Tipo   |
| ---------------------- | ------ |
| Nombre de la Actividad | Texto  |
| Descripcion            | Texto  |
| Dedicacion por Periodo | Numero |

Subtotal + **Total 1** (cursos + otras actividades).

#### Seccion 2 — Investigacion

| Campo                  | Tipo   |
| ---------------------- | ------ |
| Nombre de la Actividad | Texto  |
| Descripcion            | Texto  |
| Dedicacion por Periodo | Numero |

**Total 2**

#### Seccion 3 — Proyeccion Social

| Campo                  | Tipo   |
| ---------------------- | ------ |
| Nombre de la Actividad | Texto  |
| Descripcion            | Texto  |
| Dedicacion por Periodo | Numero |

**Total 3**

#### Seccion 4 — Gestion Academico Administrativa

| Campo                  | Tipo   |
| ---------------------- | ------ |
| Nombre de la Actividad | Texto  |
| Descripcion            | Texto  |
| Dedicacion por Periodo | Numero |

**Total 4**

#### Gran Total

`Gran Total = Total 1 + Total 2 + Total 3 + Total 4` (horas totales del semestre)

#### Firmas

- Docente
- Jefe del Programa o Departamento

---

### FO-20 — Monitoreo Agenda Academica (Reporte)

**Cuando se llena:** Final del semestre
**Codigo oficial:** MI-FOR-FO-20 v5 (2015)
**Se llena una sola vez** por semestre. No editable despues de enviar.

#### Encabezado (pre-cargado del perfil)

| Campo                  | Tipo                                  |
| ---------------------- | ------------------------------------- |
| Periodo                | Texto                                 |
| Nombre                 | Texto                                 |
| Cedula                 | Numero                                |
| Facultad               | Texto                                 |
| Programa o Departamento| Texto                                 |
| Celular                | Texto                                 |
| E-mail                 | Email                                 |
| Modalidad              | Seleccion: TCP, MTP, TCO, MTO         |
| Fecha                  | Fecha                                 |

#### Seccion I — Actividades Academicas Basicas

Docencia, investigacion y proyeccion social.

| Campo                            | Tipo   |
| -------------------------------- | ------ |
| Actividades Desarrolladas        | Texto (incluir soportes) |
| Periodo de Ejecucion             | Texto  |

Observaciones al final de la seccion.

#### Seccion II — Actividades Academicas Complementarias

Coordinacion de pasantias, practicas, comites de autoevaluacion, consejeria academica, asesoria a estudiantes, diseno de programas/modulos, escritura de articulos, representaciones universitarias, capacitacion intersemestral, entre otras.

| Campo                            | Tipo   |
| -------------------------------- | ------ |
| Actividades Desarrolladas        | Texto (incluir soportes) |
| Periodo de Ejecucion             | Texto  |

Observaciones al final de la seccion.

#### Seccion III — Actividades Administrativas

Consejos de programa, coordinacion de laboratorios, representaciones (Consejo Superior, Academico, Facultad, Comite Electoral), jefaturas, secretarias, direcciones, entre otras.

| Campo                            | Tipo   |
| -------------------------------- | ------ |
| Actividades Desarrolladas        | Texto (incluir soportes) |
| Periodo de Ejecucion             | Texto  |

Observaciones al final de la seccion.

#### Seccion IV — Actividades de Desarrollo Institucional

Proyectos que contribuyan al mejoramiento de la calidad institucional. Horas aprobadas por Consejo Academico previo concepto del Consejo de Facultad.

| Campo                            | Tipo   |
| -------------------------------- | ------ |
| Actividades Desarrolladas        | Texto (incluir soportes) |
| Periodo de Ejecucion             | Texto  |

Observaciones al final de la seccion.

#### Firmas

- Docente
- Jefe del Programa
- Decano

---

## Modalidades Docentes

| Sigla   | Significado                |
| ------- | -------------------------- |
| TCP     | Tiempo Completo Planta     |
| TCO     | Tiempo Completo Ocasional  |
| MTP     | Medio Tiempo Planta        |
| MTC     | Medio Tiempo Catedra       |
| Catedra | Catedratico                |

---

## Funcionalidades

### MVP

1. **Autenticacion** — Registro e inicio de sesion con correo y contrasena
2. **Perfil docente** — Datos personales pre-cargados en formularios. Cursos guardados para reutilizar entre semestres
3. **Formulario FO-19** — Llenado digital al inicio del semestre. Una sola entrega, no editable despues de enviar
4. **Formulario FO-20** — Llenado digital al final del semestre. Una sola entrega, no editable despues de enviar
5. **Comparacion FO-19 vs FO-20** — Vista que muestre lo planeado vs lo ejecutado
6. **Validaciones (Acuerdo 048/2018)** — Reglas de horas maximas segun modalidad, entre otras (por definir en detalle)
7. **Exportar PDF** — Formato oficial de la USCO para impresion y firma fisica

### Futuro

- Roles de Jefe de Programa y Decano (revision, aprobacion, firma digital)
- Subida de archivos como soportes/evidencias en FO-20
- Validaciones avanzadas basadas en el Acuerdo 048/2018

---

## Flujo del Sistema

```
Inicio del Semestre                          Final del Semestre
       |                                            |
       v                                            v
  Docente llena FO-19          ------>        Docente llena FO-20
  (Planificacion)                             (Reporte/Monitoreo)
       |                                            |
       v                                            v
  Validacion Acuerdo 048                  Comparacion FO-19 vs FO-20
       |                                            |
       v                                            v
  Exportar PDF                              Exportar PDF
```

---

## Unidad de Medida

**Dedicacion por Periodo** = Horas totales del semestre

---

## Documentos de Referencia

- `MI-FOR-FO-19 INFORMACION DE ACTIVIDADES AGENDA SEMESTRAL DOCENTES.pdf`
- `MI-FOR-FO-20 MONITOREO AGENDA ACADEMICA.pdf`
- `Acuerdo 048 de 2018 Se reglamenta la Labor Docente Mod. 020.pdf` (validaciones)

---

## Stack Tecnico

- **Framework:** Next.js 15 (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **Base de datos:** PostgreSQL
- **ORM:** Prisma
- **DB hosting:** PostgreSQL remoto
- **Autenticacion:** Correo + Contrasena (implementacion por definir)
