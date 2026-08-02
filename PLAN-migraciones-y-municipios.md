# Plan: migraciones en código + todos los municipios de Colombia

Dos cambios que conviene hacer en este orden, en **dos PRs separados**:

1. **Infraestructura de migraciones** — pasar de "SQL suelto aplicado a mano en
   el editor de Supabase" a migraciones versionadas con el CLI. Sin ningún
   cambio funcional.
2. **Departamentos + municipios** — nueva tabla `departamentos`, `ciudades`
   pasa de 25 a ~1.100 filas, y el selector se vuelve una cascada
   Departamento → Ciudad con búsqueda.

Decisiones ya tomadas (no reabrir sin motivo):

- DB local con Docker (`supabase start` / `db reset`) para probar antes de
  tocar producción.
- Se **mantiene** el nombre de tabla `ciudades` y la columna
  `info_orden_servicio.ciudad_id`. Renombrar a `municipios` sería el nombre de
  dominio correcto, pero obliga a tocar tipos, formularios, PDF, Excel y mocks
  a cambio de nada funcional. El label de negocio en la UI sigue siendo
  "Ciudad".
- UI: dos campos en cascada, ambos con filtrado por texto mientras se escribe.

---

## Estado actual (lo que hay hoy)

- `supabase` v2.109.1 está en `devDependencies` y el proyecto está linkeado
  (`supabase/.temp/linked-project.json` → ref `tvveelfjazwlinhlbcjd`).
- **No** existe `supabase/config.toml` ni `supabase/migrations/`. Los archivos
  `003_…` a `006_…` están sueltos en `supabase/` y se aplicaron a mano.
- El historial ya está incompleto: `structure.md` referencia
  `supabase/002_usuarios_roles_rls.sql`, que no existe en el repo.
- `ciudades` tiene `id serial`, `nombre`, `departamento` (texto libre,
  redundante) y 25 filas.
- `info_orden_servicio.ciudad_id` → FK a `ciudades.id`. Hay órdenes reales
  apuntando a esos ids: **no se pueden reasignar**.

---

## PR 1 — Infraestructura de migraciones ✅ HECHO

Objetivo: que el esquema del repo y el del proyecto remoto queden
sincronizados, y que de acá en adelante todo cambio de DB sea un archivo
committeado.

> **Cómo quedó, y en qué se desvió de lo planeado.** Verificado con
> `db reset` desde cero: 19 tablas, 28 policies, las 2 funciones y el trigger
> del consecutivo; catálogos sembrados y cero datos reales. `db push --dry-run`
> responde "Remote database is up to date", o sea que para producción este PR
> no cambia nada.
>
> 1. **El baseline se generó con `db dump`, no con `db pull`.** `db pull` usa un
>    diff de migra y reportó "No schema changes found" contra un historial
>    vacío, lo cual era falso. `supabase db dump --linked` hace un `pg_dump`
>    real y sí se trajo todo. El registro en el historial remoto se hizo aparte
>    con `supabase migration repair --status applied 20260802085134`.
> 2. **`participantes_arl` y `vobo` no van al `seed.sql` desde el remoto**:
>    guardan nombres y cédulas de personas reales. En el seed hay filas
>    inventadas. Confirmado además que `db dump --data-only` **sin
>    `--schema public` se trae el esquema `auth` entero**, con emails y
>    contraseñas hasheadas.
> 3. **`005_ordenes_servicio_financiero_edicion.sql` nunca se aplicó al
>    remoto** — ver "Pendiente heredado" abajo. No se archivó en `legacy/`.

### 1.1 Inicializar el CLI

```bash
pnpm exec supabase init          # crea supabase/config.toml y supabase/.gitignore
pnpm exec supabase link --project-ref tvveelfjazwlinhlbcjd   # pide la DB password
```

`init` pregunta si generar settings de VS Code / Deno — decir que no, el
proyecto no usa Deno.

### 1.2 Baseline desde el remoto

El remoto tiene el esquema completo pero **ningún historial de migraciones**.
Hay que crear el punto de partida:

```bash
pnpm exec supabase db pull       # → supabase/migrations/<ts>_remote_schema.sql
```

Esto hace dos cosas: escribe el DDL completo actual como primera migración, y
registra esa versión como *ya aplicada* en `supabase_migrations.schema_migrations`
del remoto. Desde ese momento `db push` solo aplica lo nuevo.

**Revisar el archivo generado antes de commitear.** `db pull` sobre un esquema
armado a mano suele arrastrar ruido (extensiones, grants a roles internos) y a
veces omite objetos. Comparar contra `003…006` para confirmar que las policies
de RLS y el trigger `generar_id_unico_orden` quedaron dentro.

### 1.3 Datos de catálogos para la DB local

`db pull` trae solo DDL, no filas. Sin esto, la DB local arranca con los
catálogos vacíos y el formulario no sirve:

```bash
pnpm exec supabase db dump --data-only \
  --table public.ciudades --table public.estados_ejecucion \
  --table public.entregables_estandar --table public.participantes_arl \
  --table public.vobo \
  -f supabase/seed.sql
```

Solo catálogos — **nunca** `ordenes_servicio`, `usuarios` ni
`info_orden_servicio`: son datos reales de clientes y no van al repo.
`seed.sql` corre en `db reset` local y nunca se aplica al remoto.

### 1.4 Qué hacer con el SQL viejo

Se borran `003`, `004` y `006`: su SQL ya está dentro del baseline, y git
conserva el historial. Lo que sí se rescata es el **razonamiento** —`pg_dump`
descarta los comentarios— como encabezado del baseline. Una carpeta de SQL
muerto al lado de las migraciones vivas es una trampa: tarde o temprano alguien
la aplica.

### 1.5 Scripts en `package.json`

```json
"db:start": "supabase start",
"db:stop":  "supabase stop",
"db:new":   "supabase migration new",
"db:reset": "supabase db reset",
"db:push":  "supabase db push",
"db:types": "node scripts/gen-db-types.mjs"
```

`db:types` se queda como está (genera desde el remoto): los tipos deben
reflejar producción, así que se corre *después* del push, no antes.

Flujo de trabajo resultante, a documentar en `structure.md` (sección nueva
`supabase/`):

```
pnpm db:new nombre_del_cambio   →  editar el .sql generado
pnpm db:reset                   →  aplica todo desde cero en local + seed
   … probar la app contra la DB local …
pnpm db:push                    →  aplica al remoto
pnpm db:types                   →  regenera database.types.ts
```

### 1.6 `.gitignore`

`supabase/.temp/` y `supabase/.branches/` fuera del repo (el `init` agrega su
propio `.gitignore` en `supabase/`, verificar que los cubra).

---

## Pendiente heredado (descubierto al hacer el PR 1)

Nada de esto lo causó el PR 1; salió a la luz al comparar el repo contra el
esquema real. Son decisiones aparte:

1. **`005_ordenes_servicio_financiero_edicion.sql` nunca se aplicó.** El
   baseline no tiene `es_financiero()`, ni la policy
   `financiero_actualiza_ordenes`, ni el trigger
   `restringir_columnas_financiero`. La app ya ofrece edición inline de
   `cronograma`/`estado`/`secuencia` al rol `financiero`
   (`ordenes-table.tsx`), pero **en la base ese UPDATE no está permitido**: la
   policy de 004 lo restringe a `administrador`. Convertirlo en migración es un
   cambio funcional real (le da permisos de escritura a un rol), así que no se
   metió de contrabando en un PR que se vendía como no-op. El archivo sigue en
   `supabase/`, sin aplicar.

2. 🔴 **`mvp_open_access` deja la base abierta a internet.** Es lo más urgente
   de esta lista, y hay que atenderlo antes que el PR 2.

   La policy existe en **11 tablas** (`usuarios`, `ordenes_servicio`,
   `clientes`, `info_orden_servicio`, `profesionales`, `checklist_proceso`,
   `detalle_entrega_profesional`, `orden_entregables_estandar`, `ciudades`,
   `entregables_estandar`, `estados_ejecucion`) y está declarada como
   `FOR ALL TO public USING (true) WITH CHECK (true)`.

   Tres hechos que se combinan:
   - Postgres une las policies permisivas con **OR**, así que
     `solo_admin_escribe_ordenes`, `admin_gestiona_usuarios` y
     `autenticados_leen_ordenes` no restringen nada mientras esta exista.
   - En Postgres, `public` **no** significa "usuarios logueados": significa
     todos los roles, incluido `anon`.
   - `anon` tiene GRANT de `SELECT, INSERT, UPDATE, DELETE` sobre esas tablas
     (verificado sobre `usuarios`).

   Resultado: con la anon key —que es pública por diseño, viaja en el bundle
   del navegador— se puede leer y escribir esas tablas **sin iniciar sesión**.
   Incluye `UPDATE usuarios SET rol = 'administrador'`. Todo el control de
   acceso por rol que hoy existe es solo del front.

   Arreglarlo es `DROP POLICY "mvp_open_access"` en las 11 tablas, pero **no
   es una línea**: apenas se quite, las policies reales pasan a aplicar de
   verdad y es muy probable que algo de la app deje de funcionar (lecturas que
   devuelven 0 filas en silencio, escrituras que fallan con *"new row violates
   row-level security policy"*). Merece su propio PR, con `db:reset` local y
   un recorrido rol por rol. Que ahora exista DB local hace esto viable sin
   arriesgar producción.

3. **`participantes_arl` y `vobo` no tienen RLS activado**, lo que las deja
   igual de expuestas por la misma vía. Contienen nombres y cédulas.

   Para el PR 2: `departamentos` **no** debe copiar `mvp_open_access`. Que
   nazca con `FOR SELECT TO authenticated`.

4. **`002_usuarios_roles_rls.sql` no existe** en el repo aunque `structure.md` y
   varios comentarios del código lo citan. Su contenido sí está en el baseline.
   Las referencias quedaron como están: apuntan a algo que documenta una
   decisión real, aunque el archivo se haya perdido.

---

## PR 2 — Departamentos + municipios

### 2.1 Modelo

```
departamentos (id smallint PK = código DANE, nombre text unique)
      ▲
      │ departamento_id
ciudades (id serial PK ← las 25 filas actuales conservan su id,
          codigo_dane text UNIQUE,
          departamento_id smallint NOT NULL,
          nombre text)
      ▲
      │ ciudad_id  ← FK intacto, ninguna orden se rompe
info_orden_servicio
```

Claves del diseño:

- `departamentos.id` = código DANE de 2 dígitos (05 Antioquia, 11 Bogotá D.C.,
  …). 33 filas (32 departamentos + Bogotá D.C.). Es un código estable y
  oficial, mejor que un serial arbitrario.
- `ciudades.codigo_dane` es **texto**, no número: los códigos llevan cero a la
  izquierda (`05001` Medellín). Con `UNIQUE`, el seed se puede re-correr sin
  duplicar.
- `ciudades.id` sigue siendo el serial existente. Las 25 filas actuales
  mantienen su id y solo se les rellenan las columnas nuevas.
- Se elimina `ciudades.departamento` (texto libre), que ahora vive normalizado
  en `departamentos`.

### 2.2 La migración

`pnpm db:new departamentos_y_municipios`, y adentro, en este orden:

1. `create table departamentos` + `enable row level security` + policy de
   lectura para `authenticated`. **Copiar la policy exacta que hoy tiene
   `ciudades`** (verificarla en el baseline): si la tabla nueva queda sin
   policy, RLS la deja vacía para todos y el selector de departamento aparece
   en blanco.
2. `insert into departamentos` — las 33 filas.
3. `alter table ciudades add column codigo_dane text, add column
   departamento_id smallint references departamentos(id)`.
4. **Backfill de las 25 existentes**, con una lista explícita `(id, codigo_dane)`
   — no con matching difuso por nombre. Son 25 filas y hay ambigüedades reales
   (Cartagena de Indias vs. Cartagena del Chairá, Armenia en Quindío vs. en
   Antioquia). Explícito = determinista.
5. `alter table ciudades add constraint ciudades_codigo_dane_key unique (codigo_dane)`.
6. `insert into ciudades (nombre, departamento_id, codigo_dane) values (…)
   on conflict (codigo_dane) do nothing` — el bloque generado con los ~1.100
   municipios. El `on conflict` salta las 25 ya presentes.
7. `update ciudades set nombre = <nombre DANE> ... where codigo_dane = …` para
   normalizar los nombres de las 25 viejas al texto oficial (hoy dice
   "Bogotá D.C.", DANE dice "Bogotá, D.C.").
8. `update ciudades set departamento_id = substring(codigo_dane,1,2)::smallint
   where departamento_id is null`.
9. `alter table ciudades alter column codigo_dane set not null, alter column
   departamento_id set not null, drop column departamento`.
10. `create index on ciudades (departamento_id)` — es el filtro de la cascada.
11. `alter table ciudades add constraint ciudades_depto_nombre_key
    unique (departamento_id, nombre)`.

Alcance del seed: solo **municipios** (1.103, incluyendo Bogotá D.C. como
distrito). Las ~20 "áreas no municipalizadas" de Amazonas, Guainía y Vaupés
quedan fuera; si negocio las necesita, se agregan después con el mismo script.

> ⚠️ El paso 9 (`drop column departamento`) rompe la app si la DB se despliega
> antes que el código: `lib/data/info-orden.ts:69` hace
> `.select("id, nombre, departamento")`. Van en el mismo PR y se despliegan
> juntos. Si en algún momento hiciera falta desacoplarlos, el `drop` se saca a
> una migración posterior.

### 2.3 De dónde salen los datos

`scripts/gen-municipios-sql.mjs`, siguiendo el estilo de
`gen-db-types.mjs` (escribe solo si la descarga salió bien):

- Fuente: dataset DIVIPOLA del DANE en datos.gov.co
  (`https://www.datos.gov.co/resource/xdk5-pm3f.json?$limit=2000`), campos
  `c_digo_dane_del_departamento`, `departamento`,
  `c_digo_dane_del_municipio`, `municipio`.
- Normaliza: padding a 2 y 5 dígitos, `trim`, escapado de comillas simples.
- Imprime el bloque de `INSERT` listo para pegar en la migración, y reporta el
  conteo (deben ser 33 departamentos y 1.103 municipios; si el número no
  cuadra, algo cambió en el dataset y hay que mirarlo antes de seguir).
- Se commitean **el script y el SQL generado**. El SQL es la fuente de verdad
  inmutable (una migración no puede depender de que una API externa siga viva);
  el script queda como documentación de procedencia y para regenerar si hay que
  actualizar.
- Si datos.gov.co no responde: alternativa es el CSV oficial de DIVIPOLA
  descargado a mano, o un dataset espejo en GitHub.

### 2.4 Tipos y capa de datos

- `pnpm db:types` después del push.
- `src/types/index.ts`: agregar
  `export type Departamento = Database["public"]["Tables"]["departamentos"]["Row"]`.
  `Ciudad` ya existe: gana `codigo_dane` y `departamento_id`, pierde
  `departamento`.
- `src/lib/data/info-orden.ts`, `getCatalogosInfoOrden()`:
  - **Gotcha crítico**: PostgREST devuelve máximo 1.000 filas por defecto. Con
    1.103 municipios la lista se trunca **en silencio** y faltarían ciudades sin
    ningún error. Agregar `.range(0, 4999)` a la query de `ciudades`.
  - Cambiar `.select("id, nombre, departamento")` → `.select("id, nombre,
    departamento_id")`.
  - Agregar la query de `departamentos` al `Promise.all` (mismo patrón de
    manejo de error que las demás).
- `src/lib/mock-data/info-orden.ts`: `mockDepartamentos` (los 33) y ampliar
  `mockCiudades` con `departamento_id` — bastan 3-4 municipios por
  departamento para desarrollar sin Supabase.

Sobre el peso: 1.103 ciudades × (id, nombre, departamento_id) ≈ 55 KB de JSON
en el payload RSC de `/ordenes/nueva` y `/ordenes/[id]/editar` (~15 KB
comprimido). Aceptable, y evita estados de carga en el selector. Si más
adelante molesta, la alternativa es un route handler
`/api/ciudades?departamento_id=` que cargue bajo demanda.

### 2.5 UI

**Componente nuevo `src/components/ui/combobox.tsx`** — wrapper sobre
`@base-ui/react/combobox` (ya viene en la v1.6.0 instalada, sin dependencias
nuevas), siguiendo el mismo patrón que `select.tsx`: re-exportar las partes con
los estilos del design system. Partes: `Combobox`, `ComboboxInputGroup`,
`ComboboxInput`, `ComboboxTrigger`, `ComboboxClear`, `ComboboxContent`,
`ComboboxItem`, `ComboboxEmpty`.

Props relevantes de `Combobox.Root` para este caso:

- `items` + `value` / `onValueChange` — controlado desde react-hook-form.
- `itemToStringLabel` e `isItemEqualToValue` — los items son objetos
  `{ id, label }`, hacen falta ambos.
- `limit={100}` — no pintar 1.100 nodos de DOM. Evita tener que virtualizar.
- `autoHighlight` — Enter selecciona la primera coincidencia.
- `filter`: verificar que el filtro por defecto ignore acentos (escribir
  "bogota" debe encontrar "Bogotá"). Si no lo hace, pasar un `filter` propio
  que normalice con `.normalize("NFD").replace(/\p{Diacritic}/gu, "")`.

Se respeta la regla de `structure.md > components/ui/`: el componente no conoce
el dominio (nada de "ciudad" ni "orden" adentro).

**`src/components/ordenes/secciones/datos-actividad.tsx`** — reemplazar el
`<Select>` de Ciudad por dos campos:

- Estado local `departamentoId` en el componente, **no** en el formulario: el
  departamento no se guarda en la orden, se deriva de la ciudad. No hay que
  tocar el esquema de `info_orden_servicio` ni `info-orden.schema.ts`.
- Modo edición: al montar, derivar `departamentoId` desde el `ciudad_id` ya
  guardado, para que el campo aparezca lleno.
- Al cambiar el departamento: resetear `infoOrdenServicio.ciudad_id` a
  `undefined` (si no, queda una ciudad de otro departamento seleccionada) y
  filtrar la lista de ciudades.
- El campo Ciudad va `disabled` mientras no haya departamento, con placeholder
  "Selecciona primero un departamento".
- La prop `ciudades` deja de ser `SelectOption` genérico y pasa a un tipo
  propio `{ id, label, departamentoId }`; se agrega la prop `departamentos`.

**Propagación**: `orden-info-secciones.tsx` pasa `departamentos` hacia abajo, y
`app/ordenes/nueva/page.tsx` + `app/ordenes/[id]/editar/page.tsx` mapean los
catálogos nuevos.

Sin cambios en PDF (`OrdenServicioDocument.tsx`) ni Excel
(`matriz-ordenes.ts`): ambos leen `ciudad.nombre`, que sigue igual.

### 2.6 Verificación

```bash
pnpm db:reset      # baseline + migración nueva desde cero, en local
```

Que corra limpio desde cero es la prueba de que la migración está bien
ordenada. Después, contra la DB local:

- `select count(*) from departamentos` → 33
- `select count(*) from ciudades` → 1.103
- `select count(*) from info_orden_servicio where ciudad_id not in (select id from ciudades)` → **0** (ninguna orden quedó huérfana)
- `select id, nombre from ciudades where id <= 25 order by id` → las 25
  originales conservan su id
- `select count(*) from ciudades where departamento_id is null` → 0

Y en la app: `pnpm lint`, `pnpm build`, crear una orden nueva eligiendo
departamento + ciudad, y **editar una orden vieja** para confirmar que la
ciudad guardada se muestra y el departamento se deriva solo.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El baseline de `db pull` sale incompleto o no corre en local | Se detecta en el primer `db reset`; se corrige editando el archivo a mano. Nada de esto toca producción. |
| Truncado silencioso a 1.000 filas de PostgREST | `.range(0, 4999)` explícito + el conteo de la verificación. |
| `drop column departamento` desplegado antes que el código | Migración y cambio de app en el mismo PR. |
| El dataset del DANE cambia de forma o desaparece | El SQL generado se commitea; la migración nunca depende de la red. |
| Se filtran datos reales al repo vía `seed.sql` | El `db dump` lista tablas de catálogo explícitamente, nunca `--schema public` completo. |

## Orden de ejecución

Arrancar desde una rama nueva sobre `main` — la actual
(`feat/pagination-table`) tiene trabajo sin commitear que no es de esto.

1. PR 1 (infraestructura) — mergeable solo, sin cambio funcional.
2. PR 2 (departamentos + municipios + UI) sobre PR 1 ya mergeado.
3. Actualizar `structure.md` en cada PR: sección `supabase/` en el primero,
   `components/ui/combobox.tsx` y `scripts/` en el segundo.
