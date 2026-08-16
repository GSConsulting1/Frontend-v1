# Estructura del proyecto

Este archivo documenta dónde vive cada cosa y por qué, para que el código
nuevo (escrito por una persona o por un agente) siga el mismo orden. Antes
de crear un archivo, revisa si ya existe una carpeta/convención para ese
tipo de cosa acá abajo.

## Árbol y responsabilidad de cada carpeta

```
src/
├── proxy.ts           # Next 16 (reemplaza middleware.ts): refresca la sesión de Supabase
├── types/            # Vocabulario del dominio (tipos)
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Singleton anon-key, usado por lib/data/*.ts
│   │   └── browser-client.ts # Cliente con sesión en cookies, solo para AuthProvider
│   ├── mock-data/      # Datos falsos para desarrollar sin Supabase
│   ├── data/          # Capa de acceso a datos (queries reales/mock)
│   ├── validations/    # Schemas de Zod (forma válida de cada entidad)
│   ├── pdf/            # Componentes @react-pdf/renderer (documentos binarios)
│   ├── excel/          # Builder de .xlsx con exceljs (matriz de órdenes)
│   ├── supabaseAdmin.ts # Cliente service role — solo para app/api/*/{pdf,excel}, ver abajo
│   └── utils.ts        # Helpers genéricos, sin lógica de negocio
├── app/               # Rutas (file-based routing de Next.js App Router)
│   ├── login/page.tsx  # Login, sin sidebar (ver AppSidebar)
│   ├── recuperar-password/page.tsx   # "Olvidé mi contraseña", sin sidebar
│   ├── actualizar-password/page.tsx  # Landing del link de recuperación, sin sidebar
│   ├── cuenta/page.tsx  # Cambio de contraseña logueado, CON sidebar
│   ├── api/<entidad>/[id]/pdf/route.tsx  # Excepción: genera PDF, ver abajo
│   ├── api/ordenes/excel/route.tsx  # Excepción: genera Excel, ver abajo
│   └── <entidad>/
│       ├── page.tsx        # Server Component: lee datos, renderiza
│       ├── actions.ts       # Server Actions ("use server"): mutaciones
│       ├── nueva/page.tsx   # Ruta de creación
│       ├── importar/page.tsx  # Solo ordenes: creación en lote desde Excel, ver abajo
│       └── [id]/editar/page.tsx  # Ruta dinámica de edición
└── components/
    ├── ui/            # Primitivos genéricos (shadcn/ui) — sin dominio
    ├── layout/        # Chrome de la app (sidebar, encabezado de página) — sin dominio
    ├── forms/         # Composición de formularios genérica — sin dominio
    ├── auth/          # AuthProvider/useAuth, RoleGate, LoginForm — sesión y roles
    └── <entidad>/      # Componentes específicos del dominio

supabase/
├── config.toml        # Config del stack local (generado por `supabase init`)
├── migrations/        # Migraciones versionadas — LA fuente de verdad del esquema
└── seed.sql           # Datos de catálogo solo para la DB local, nunca para el remoto

scripts/
└── gen-db-types.mjs   # Regenera src/types/database.types.ts desde el esquema remoto
```

## Reglas por carpeta

### `supabase/`

**Ningún cambio de esquema se aplica a mano.** Ni por el SQL editor del
dashboard, ni por `psql`. Todo pasa por una migración versionada en
`supabase/migrations/`, que es la fuente de verdad del esquema. Si el remoto y
el repo se desincronizan, el repo deja de servir para reconstruir la base y
nadie puede saber por qué una tabla es como es.

Flujo para cualquier cambio de base:

```bash
pnpm db:new nombre_del_cambio   # crea supabase/migrations/<timestamp>_nombre.sql
                                # …editar el archivo generado…
pnpm db:start                   # levanta el stack local (Docker)
pnpm db:reset                   # borra la DB local y reaplica TODO desde cero + seed
                                # …probar la app contra la DB local…
pnpm db:push                    # recién ahora, aplica al proyecto remoto
pnpm db:types                   # regenera types/database.types.ts
```

`pnpm db:reset` es la prueba de fuego: corre todas las migraciones en orden
sobre una base vacía. Si tu migración depende de algo que ya existía solo en el
remoto, acá revienta — que es exactamente lo que se quiere. **Antes de
`db:push`, siempre `db:reset`**, no `db:up`.

`pnpm db:up` aplica solo las migraciones pendientes, sin borrar la base local.
Sirve para iterar rápido cuando cargaste datos de prueba a mano y no querés
perderlos, pero no demuestra nada: una migración puede pasar con `db:up` y
fallar con `db:reset` si asume algo que ya estaba en tu base.

`pnpm db:status` compara el historial local contra el remoto.

Cada migración corre dentro de una transacción: si falla a la mitad, no queda
nada aplicado de ese archivo.

- **`migrations/`**: nombre `<AAAAMMDDHHMMSS>_descripcion.sql`, generado por
  `pnpm db:new`. Nunca se edita una migración ya aplicada al remoto: se escribe
  una nueva encima. El archivo más viejo es el baseline
  (`..._baseline_esquema_remoto.sql`), un `pg_dump` del esquema que existía
  cuando se adoptaron las migraciones; está marcado como aplicado en el remoto
  y no se vuelve a correr allá, pero sí corre en local.
- **`seed.sql`**: datos de catálogo **solo para la DB local**, corre al final de
  `db:reset` y jamás toca el remoto. No va ningún dato real (órdenes, clientes,
  usuarios, profesionales) ni nombres de personas de verdad. Si necesitás
  regenerarlo desde el remoto, `--schema public` **no es opcional**: sin esa
  bandera el dump se trae el esquema `auth` completo, con emails y contraseñas
  hasheadas.
- Los datos de catálogo que deben existir **en producción** (no solo en local)
  van en una migración, no en `seed.sql`. Ejemplo: los 33 departamentos y los
  1.104 municipios viven en
  `20260802163953_departamentos_y_municipios.sql`, con la procedencia del
  dataset DIVIPOLA documentada en su encabezado. Un catálogo así se congela en
  la migración y no se baja de una API en tiempo de ejecución: `db:reset`
  tiene que poder reconstruir la base aunque la fuente externa ya no exista.

El baseline arranca con un encabezado que documenta las decisiones de diseño
que `pg_dump` no conserva (por qué `es_administrador()` es `SECURITY DEFINER`,
por qué el consecutivo de OS convierte a `America/Bogota`, y el estado real de
RLS). Ese encabezado es lo único editable del archivo: el SQL de abajo es
generado.

### `types/`
- `database.types.ts` es **generado**, nunca se edita a mano. Se
  regenera con `pnpm db:types` (ver `scripts/gen-db-types.mjs`) cada vez
  que cambia el esquema en Supabase; el archivo arranca con un banner de
  "no editar a mano" que el script vuelve a escribir en cada corrida.
  Crece junto con la base — eso es normal y esperado, no un
  problema de mantenibilidad (es un artefacto, no código que alguien lee
  para razonar sobre lógica).
- `index.ts` es la capa curada a mano: alias de dominio sobre los tipos
  crudos (`Cliente`, `OrdenServicio`, etc.). El resto de la app importa
  SIEMPRE desde acá, nunca desde `database.types.ts` directamente. Si
  cambia una columna en la DB, solo se ajusta este archivo.

### `lib/supabase/`
- `client.ts`: singleton con la anon key, sin sesión. Expone
  `isSupabaseConfigured`. Ya no lo usa ningún archivo de `lib/data/` para
  hablar con Supabase — solo lo importan para leer `isSupabaseConfigured`
  y decidir mock vs. real. Se mantendría útil si algún día se agrega una
  tabla de catálogo sin RLS y sin necesidad de sesión, pero hoy no hay
  ninguna.
- `browser-client.ts`: cliente separado con sesión en **cookies** (no
  localStorage), usado únicamente por `components/auth/auth-provider.tsx`.
  Cookies en vez de localStorage porque `proxy.ts` y `server.ts` (abajo)
  solo pueden leer la sesión ahí.
- `server.ts`: `createSupabaseServerClient()` — cliente por-request con la
  sesión de cookies (`createServerClient` + `next/headers` `cookies()`),
  para Server Components y Server Actions. **Obligatorio para cualquier
  tabla con RLS** (hoy: `usuarios`, `valor_hora_orden`, `ordenes_servicio`)
  — el singleton de `client.ts` pega siempre como anon, así que
  `auth.uid()` da `null` ahí adentro y cualquier policy que dependa del
  usuario real falla en silencio en lecturas (0 filas, sin error) y
  explota en escrituras (`new row violates row-level security policy`).
  Tanto `lib/data/ordenes.ts` como `lib/data/info-orden.ts` usan este
  cliente para *todas* sus queries, no solo las de tablas con RLS — para
  no mezclar dos clientes distintos dentro del mismo archivo. Si se
  agrega un `lib/data/<entidad>.ts` nuevo para una tabla sin RLS, ahí sí
  puede quedarse con el singleton de `client.ts` hasta que la gane.

### `proxy.ts`
- Next 16 renombró `middleware.ts` a `proxy.ts` (ver
  `node_modules/next/dist/docs/.../file-conventions/proxy.md`) — no crear
  un `middleware.ts`, Next ya no lo reconoce como convención de archivo.
- Refresca el token de sesión en cada request (`supabase.auth.getUser()`)
  para que la cookie no expire mientras navegas, y además bloquea
  `/ordenes/*` sin sesión: redirige a `/login` (páginas) o devuelve 401 JSON
  (rutas bajo `/api/ordenes/*`, ver `excel/route.tsx` y `[id]/pdf/route.tsx`).
  Sin `isSupabaseConfigured` (modo mock) no bloquea nada, mismo criterio que
  `app/usuarios/page.tsx`.

### `lib/mock-data/`
- Un archivo por entidad (ej. `ordenes.ts` agrupa clientes, estados,
  profesionales y órdenes porque están relacionados). Solo se usa desde
  `lib/data/*.ts`, nunca desde componentes ni desde `app/`.

### `lib/data/`
- **Un archivo por entidad** (`ordenes.ts`, `clientes.ts`,
  `profesionales.ts`, `usuarios.ts`, `info-orden.ts`). Es el único lugar
  del código que llama a `supabase.from(...)`.
- Regla dura: **ni `app/**/page.tsx` ni ningún componente llaman a
  Supabase directamente.** Siempre pasan por una función exportada de
  acá.
- Cada función pública maneja el `if (!isSupabaseConfigured) { mock } else {
  supabase real }` — así toda la UI funciona igual sin credenciales.
- Helpers privados de normalización (ej. `normalizarInput` en
  `ordenes.ts`) viven en el mismo archivo mientras solo un archivo de
  datos los necesite. **Se promueven a `lib/utils.ts` recién cuando un
  segundo archivo de `lib/data/` necesite el mismo helper** — no antes,
  para evitar abstraer prematuramente algo con un solo uso. Ejemplo real:
  `orNull` empezó en `ordenes.ts` y se movió a `lib/utils.ts` cuando
  `info-orden.ts` lo necesitó también.
- Una entidad puede necesitar más de un archivo de mock-data/validations
  si agrupa varias tablas 1-a-1 relacionadas: `info-orden.ts` (mock,
  validations y data) cubre las 5 tablas extendidas de "Información
  orden del servicio" + sus 3 catálogos, separado de `ordenes.ts`
  porque son un conjunto de pantalla propio, aunque casi siempre se
  consultan junto con una orden.

### `lib/validations/`
- Un schema de Zod por entidad (`orden.schema.ts`). Es la única fuente
  de verdad de validación, usada tanto en el Client Component del
  formulario (`zodResolver`) como en el Server Action (revalidación en
  servidor, nunca confiar solo en el cliente).
- `ESTADOS_ORDEN` y `TIPO_SERVICIO_OPCIONES` en `orden.schema.ts`: listas
  fijas hardcodeadas (no vienen de una tabla catálogo — `estados_orden` se
  eliminó de la DB, ver el `ALTER TABLE` que convirtió
  `ordenes_servicio.estado_id` a texto con un CHECK constraint). Reflejan
  ese CHECK 1 a 1; si cambia en la DB, hay que actualizar esta lista
  también. Los componentes (`orden-campos.tsx`, `ordenes-table.tsx`) las
  importan directo — no se prop-drillean desde `page.tsx` como los
  catálogos reales (`clientes`, `profesionales`, `ciudades`, etc.), porque
  no son datos async de Supabase, son constantes de compilación.
- **`RESPONSABLES_OS` ya no existe**, y es el ejemplo de cuándo una lista
  hardcodeada dejó de alcanzar. Era una constante acá + un CHECK
  (`chk_responsable_sec`) en la DB, y las dos tenían que moverse juntas:
  sumar a alguien pedía una migración *y* un cambio de front, y si una
  se olvidaba el `<Select>` ofrecía a una persona que la base rechazaba
  con `23514` recién al guardar (pasó dos veces, ver las migraciones
  `20260805142744` y `20260810015141`). La migración
  `20260816001045_catalogo_responsables_sec.sql` la convirtió en la tabla
  `responsables_sec` y **tiró el CHECK**. Regla que deja: una lista se
  puede hardcodear mientras cambie por decisión de producto (los estados
  de una orden); si cambia porque **entra o sale gente**, es una tabla.
- `asesor_gestion_riesgos` en cambio quedó como texto libre sin CHECK
  (input simple, sin lista fija) — a propósito, para asesores externos
  que no están en `profesionales`.

### `lib/utils.ts`
- Solo helpers **genéricos y sin dominio**, usados en 2+ lugares (ej.
  `cn()` para clases de Tailwind). No debe importar nada de `lib/data`,
  `lib/supabase` ni `types`.

### `app/`
- File-based routing estándar de Next.js App Router. Carpeta = segmento
  de URL; `[id]` = segmento dinámico.
- `page.tsx` de una entidad: Server Component `async`, hace `await` a
  `lib/data/<entidad>.ts` directamente, sin `useEffect`/`useState`.
- `actions.ts` de una entidad: Server Actions (`"use server"`) para
  mutaciones. Valida con el schema de Zod, llama a `lib/data`, hace
  `revalidatePath` + `redirect`. No se crean rutas `app/api/*/route.ts`
  para CRUD propio — los Server Actions las reemplazan.
- Excepción a la regla anterior: `app/api/<entidad>/[id]/pdf/route.tsx`
  (ver `app/api/ordenes/[id]/pdf/route.tsx`) sí es una ruta `route.ts`
  legítima porque no es CRUD — genera un binario (`Content-Type:
  application/pdf`) que un Server Action no puede devolver, y necesita
  una URL directa para abrirse/descargarse desde el navegador. Usa
  `lib/supabaseAdmin.ts` (service role, bypassa RLS) en vez de
  `lib/supabase/server.ts`, a propósito: el documento debe incluir datos
  con RLS restringido a `administrador` (`valor_hora_orden`) sin importar
  el rol de quien dispara la descarga.
- Misma excepción, segundo caso: `app/api/ordenes/excel/route.tsx` genera
  la "matriz de órdenes" en `.xlsx` (`Content-Type` de xlsx) de las filas
  seleccionadas en el listado. Recibe los IDs por `POST { ids: number[] }`
  (no query string: la selección puede ser larga). Arma el binario con
  `lib/excel/` (ver abajo) y también usa `lib/supabaseAdmin.ts` porque la
  matriz incluye `valor_hora_orden` y toda la sección financiera. Como el
  service role saltaría RLS para cualquiera, la protección real vive en la
  ruta: primero valida sesión + rol (`administrador`/`financiero`/`talento`,
  `ROLES_PERMITIDOS`) con `lib/supabase/server.ts` y solo entonces consulta
  con el service role. Además decide ahí `incluirFinanciera`
  (`ROLES_CON_FINANCIERA`, solo `administrador`/`financiero`): `talento`
  exporta la matriz completa salvo las columnas `financiera: true` de
  `matriz-ordenes.ts` (las 5 tablas cuenta_cobro/acta_servicio/facturacion/
  radicacion_imagine/liquidacion), porque RLS solo le da acceso a
  `valor_hora_orden`, no a esas 5. No tiene ruta mock: sin credenciales de
  Supabase no funciona, igual que el PDF.
- `lib/excel/`: builders/parsers de `.xlsx` con `exceljs`, análogo a
  `lib/pdf/` pero para hojas de cálculo. `matriz-ordenes.ts` es la única
  fuente de verdad del orden y el mapeo de columnas (una fila por orden,
  hoja plana con los textos exactos del documento de referencia); las
  columnas de la sección financiera llevan `financiera: true` en
  `ColumnaMatriz` y `construir-matriz-excel.ts` las filtra cuando
  `construirMatrizExcel` recibe `{ incluirFinanciera: false }`;
  `construir-matriz-excel.ts` arma el workbook — solo lo importa la ruta de
  arriba. `leer-ordenes-excel.ts` es el caso inverso (lectura, para
  `/ordenes/importar`, ver `components/<entidad>/` abajo): mapea las
  columnas del Excel de cronograma del ARL a
  `Partial<OrdenServicioFormValues>` por fila, usando el mismo criterio de
  "una fuente de verdad" — si el mapeo cambia, se ajusta solo ahí. Todo lo
  de esta carpeta corre solo en Node (usa Buffer/zip) — solo se importa
  desde Server Actions/route handlers, nunca desde código de cliente.
- `layout.tsx` solo para lo que envuelve toda la app (fuentes, metadata
  global). No mete lógica de una entidad específica.
- `globals.css` vive en `app/globals.css` (convención de Next.js App
  Router) e importa Tailwind. El campo `"css"` de `components.json` en
  la raíz solo le dice al CLI de shadcn/ui dónde inyectar las variables
  de tema al instalar un componente nuevo — no implica que el CSS deba
  moverse a otra carpeta.

### `components/layout/`
- Chrome de toda la app: `app-sidebar.tsx` (menú lateral, se monta una
  sola vez en `app/layout.tsx`) y `page-header.tsx` (título +
  descripción a la izquierda, botones de acción a la derecha — cada
  `page.tsx` lo usa como primer hijo de su contenedor).
- `nav-config.ts` es la única fuente de verdad de los links del sidebar.
  Al agregar una pantalla nueva, se agrega su entrada acá (no se edita
  `app-sidebar.tsx` a mano por cada ruta). `NavItem.roles?: RolUsuario[]`
  es opcional — si se define, `AppSidebar` (vía `useAuth().perfil`) solo
  muestra ese link a esos roles; sin `perfil` cargado (sin sesión) el link
  no se muestra. Primer uso: `/usuarios`, solo visible para
  `administrador`. Ocultar el link es UX, no seguridad — igual que
  `RoleGate`, no reemplaza la protección real de la página (ver
  `components/usuarios/` abajo).
- Esqueletos de carga genéricos para los `loading.tsx` de Next.js:
  `table-skeleton.tsx` (tabla: cada `loading.tsx` pasa sus `columnas`
  con el mismo header/ancho/alto que la tabla real) y
  `toolbar-skeleton.tsx` (la barra de controles de arriba: buscador,
  botón "Filtros", botón de alta). La regla es que el esqueleto
  reserve **todo** lo que el componente real va a mostrar — si falta
  una columna o la barra de arriba, ese trozo aparece de golpe al
  terminar de cargar y empuja el resto. Pantalla nueva = su
  `loading.tsx` reusando estos dos, no una tabla copiada a mano.
- No conoce el dominio (nada de "orden", "cliente", Supabase). Si un
  componente de layout necesita datos de negocio, se los pasan por
  props desde `page.tsx`/`layout.tsx`, no hace fetch propio.
- Cada `page.tsx` sigue siendo dueño de su propio contenedor
  (`max-w`, padding) — el listado usa `max-w-6xl`, los formularios
  `max-w-3xl`. `components/layout/` no impone un ancho global.

### `components/forms/`
- Piezas de composición de formularios reusables entre entidades, sin
  conocer ninguna: `form-field.tsx` (Label + control + mensaje de error,
  envuelve cualquier input/select/textarea), `save-button.tsx` (variante
  de `Button` con un anillo animado en el borde mientras `pending` es
  true — pensado para guardados en lote donde no hay una navegación que
  ya comunique "está cargando"), `checkbox.tsx` (checkbox con label
  inline) y `password-input.tsx` (`Input` + botón con ícono Eye/EyeOff
  para mostrar/ocultar el valor — promovido acá cuando lo empezaron a
  necesitar `login-form.tsx`, `cambiar-password-form.tsx` y
  `actualizar-password-form.tsx`, los tres en `components/auth/`).
- `pending-ring.tsx` (`<PendingRing>`): el anillo animado de `save-button.tsx`
  extraído a su propio componente cuando `exportar-excel-button.tsx`
  ("Descargar (N)") e `importar-ordenes-form.tsx` ("Previsualizar"/
  "Importar N órdenes") empezaron a necesitar el mismo loader — antes cada
  botón con espera tenía su propio ícono `Loader2` de `lucide-react`
  reemplazando el contenido. **Es el único loader de botón del proyecto**:
  cualquier `<Button>` nuevo que necesite un estado "esperando algo" usa
  `<PendingRing />` (no un ícono `Loader2` suelto), y el botón que lo
  renderiza necesita `className="relative isolate"` para que el anillo
  (que es `absolute`) se posicione respecto a él. `save-button.tsx` ya lo
  usa por dentro; para un botón que no encaja en el patrón de
  `SaveButton` (guardado en lote con label fijo "Guardar cambios"), se
  renderiza `<PendingRing />` a mano junto al label/ícono del botón, como
  en los dos ejemplos de arriba.
  Fuera de alcance a propósito: los spinners inline que NO son un botón
  — `editable-cell.tsx` (`Loader2` junto al input mientras guarda una
  celda) y la fila de `usuarios-table.tsx` (`Loader2` junto al `<Select>`
  de rol) siguen con su ícono suelto porque no envuelven un `<Button>`;
  el ícono `Loader2` del ítem "PDF" en el menú de `ordenes-table.tsx`
  tampoco se tocó, por la misma razón (es un `DropdownMenuItem`, no un
  botón con borde propio).
- Si un componente de este folder empieza a necesitar props específicas
  de una entidad (ej. "orden"), es señal de que en realidad pertenece a
  `components/<entidad>/`, no acá.

### `components/ui/`
- Primitivos de shadcn/ui, instalados con `npx shadcn add <componente>`.
  No se editan a mano salvo para theming; no conocen el dominio
  (ninguna referencia a "orden", "cliente", Supabase, etc.).
- Excepción: `seccion-acordeon.tsx` (`<SeccionAcordeon>`) es un primitivo
  hecho a mano (no viene de shadcn) para agrupar campos en un `<details>`
  con chip de estado completo/incompleto/bloqueado — vive acá porque,
  igual que los primitivos de shadcn, no conoce ningún dominio y se
  reusa entre secciones. Lo consume cada archivo de
  `components/ordenes/secciones/`.
- Otra excepción: `combobox.tsx` es un wrapper propio sobre
  `@base-ui/react/combobox` (la misma librería que usan por debajo los
  primitivos de shadcn de este proyecto), con el mismo patrón que
  `select.tsx`: re-exporta las partes vestidas y no agrega lógica.
  **Cuándo usar cuál**: Combobox es un Select con filtrado por texto, y
  vale la pena solo cuando la lista es tan larga que scrollearla es peor
  que escribir — el caso que lo trajo son los 1.104 municipios. Para
  listas cortas, `<Select>` sigue siendo lo correcto. Al usarlo, no
  olvidar `limit` (cuántos items se pintan como DOM) ni
  `itemToStringLabel` + `isItemEqualToValue`, obligatorias cuando los
  items son objetos que no tienen la forma `{ value, label }`.
- Un componente de shadcn que exporta más de un sub-componente (ej.
  `dropdown-menu`, con `DropdownMenu`, `DropdownMenuItem`,
  `DropdownMenuContent`, etc.; o `tooltip`, con `Tooltip`,
  `TooltipTrigger`, `TooltipContent`, `TooltipProvider`) se instala
  como carpeta `<componente>/` en vez de archivo único: un archivo por
  sub-componente exportado (`dropdown-menu-item.tsx`,
  `tooltip-trigger.tsx`...) más un `index.ts` que los reexporta todos.
  El resto de la app sigue importando desde `@/components/ui/<componente>`
  sin cambios, porque TypeScript resuelve esa ruta al `index.ts` de la
  carpeta. Los primitivos con un solo export (`button.tsx`, `table.tsx`,
  etc.) se quedan como archivo único.

### `components/auth/`
- `auth-provider.tsx`: `AuthProvider` (montado una sola vez en
  `app/layout.tsx`, envolviendo `AppSidebar` + `main`) y el hook
  `useAuth()` (`session`, `perfil` de la tabla `usuarios`, `loading`,
  `signIn`, `signOut`, `updatePassword`, `sendPasswordResetEmail`). Es el
  único consumidor de `lib/supabase/browser-client.ts`.
- `role-gate.tsx`: `<RoleGate allow={[...]}>` genérico — oculta
  `children` (muestra `fallback`, `null` por defecto) si `perfil` no
  tiene un rol permitido. Es UX, no seguridad: el dato solo queda
  protegido de verdad si la tabla tiene RLS en Supabase.
- `login-form.tsx`: Client Component con el formulario de `/login`
  (llama a `useAuth().signIn`); `app/login/page.tsx` es el wrapper Server
  Component delgado, mismo patrón que `app/ordenes/nueva/page.tsx`.
- Contraseña — dos flujos separados, ambos vía `useAuth()`, nunca
  importando `supabaseBrowser` directo desde el form:
  - **Logueado** (`cambiar-password-form.tsx`, ruta `/cuenta`, CON
    sidebar): pide la contraseña actual y la valida a mano con `signIn`
    antes de llamar `updatePassword`, porque `auth.updateUser()` de
    Supabase no re-pide la contraseña vieja por sí solo.
  - **Deslogueado** (`recuperar-password-form.tsx` en `/recuperar-password`
    → email vía `sendPasswordResetEmail` → `actualizar-password-form.tsx`
    en `/actualizar-password`): el link del correo trae un `code` que
    `@supabase/ssr` intercambia solo por una sesión de recovery; la
    pantalla de `/actualizar-password` solo necesita esperar a `session`
    de `useAuth()`, no parsear la URL. **Requiere agregar
    `<origin>/actualizar-password` a Authentication > URL Configuration >
    Redirect URLs en el dashboard de Supabase** (dev y cada dominio de
    producción) — si falta, Supabase rechaza el `redirectTo` y el link
    del correo no funciona.
  - En los dos flujos, tras un `updatePassword` exitoso se llama a
    `signOut()` (con un `setTimeout` corto para que se vea el mensaje de
    éxito) en vez de dejar seguir con la sesión actual — el usuario debe
    volver a loguearse con la contraseña nueva.
- `AppSidebar` se oculta a sí mismo en `/login`, `/recuperar-password` y
  `/actualizar-password` (`RUTAS_SIN_SIDEBAR` en `app-sidebar.tsx`) para
  que esas pantallas no tengan el chrome de la app — no hay un layout de
  ruta aparte para eso todavía. `/cuenta` sí lleva sidebar (usuario ya
  logueado), con un ícono de engranaje junto al botón de logout.
- **Las rutas de `/ordenes/*` están protegidas centralizadamente en
  `proxy.ts`** (ver esa sección): sin sesión, redirect a `/login` para las
  páginas y 401 JSON para `/api/ordenes/*`. Se eligió centralizar en vez de
  repetir el chequeo (`getPerfilActual()` + `redirect()`) en cada `page.tsx`
  de la entidad como hace `/usuarios` — acá alcanza con "hay sesión o no",
  sin distinción de rol, así que no hace falta el perfil completo.
- **`/usuarios` es la excepción**: al ser la pantalla que asigna roles, su
  `page.tsx` sí bloquea de verdad en servidor (no solo con `RoleGate`) —
  ver `lib/data/usuarios.ts` (`getPerfilActual()`) y
  `components/usuarios/` abajo. Es el primer caso de protección real de
  página del proyecto; si se protege otra ruta, seguir el mismo patrón en
  vez de inventar uno nuevo.

### `components/<entidad>/`
- Componentes que sí conocen el dominio (`ordenes-table.tsx`,
  `orden-form.tsx`, `estado-badge.tsx`). Reciben datos ya resueltos por
  vía de props desde `page.tsx` — no hacen fetch propio salvo que sean
  Client Components que llaman a un Server Action (ej. `orden-form.tsx`
  → `actions.ts`).
- `ordenes-table.tsx` es de **solo lectura** en cuanto a los datos: sin
  filas desplegables, sin edición inline de contenido. Cada fila tiene un
  ícono "editar" que navega a `/ordenes/{id}/editar` (visible a cualquier
  rol) y un ítem "eliminar" envuelto en `<RoleGate allow={["administrador"]}>`
  que abre un `<AlertDialog>` de confirmación (mismo componente y
  espíritu que el cambio de rol en `usuarios-table.tsx`, ver
  `components/usuarios/` abajo) — **no** `window.confirm()`: se reemplazó
  porque el diálogo nativo del navegador no se puede estilar y no encaja
  con el resto de la UI. `ordenPendienteEliminar` guarda la orden a
  confirmar; `confirmarEliminar()` la borra y cierra el diálogo de una
  (no se queda mostrando un loader adentro — el feedback de "eliminando"
  sigue siendo la fila con `opacity-50`, vía `deletingIds`, mismo patrón
  que antes). Además tiene una **columna de checkbox** (con select-all en
  el header) para las acciones en lote del header (exportar o eliminar):
  la tabla no es dueña de esa selección, la recibe por props
  (`selectedIds`/`onToggle`/`onToggleAll`) desde `ordenes-listado.tsx`. Su
  estado propio sigue siendo el de "eliminando" (`eliminarOrden`, por
  fila), la orden pendiente de confirmar, y el de "descargando" el PDF
  por fila. Crear y editar viven los dos en páginas completas —
  `/ordenes/nueva` y `/ordenes/[id]/editar` — no en la tabla.
- `ordenes-listado.tsx` es el Client Component que envuelve el listado:
  `app/ordenes/page.tsx` (Server Component) hace el fetch y solo renderiza
  `<OrdenesListado ordenes={...} />`. Existe porque las acciones en lote
  del `PageHeader` (ver `ordenes-acciones-menu.tsx` abajo) necesitan
  compartir con la tabla el `Set<number>` de IDs seleccionados, así que
  ese estado se sube acá. `accionSeleccion: "exportar" | "eliminar" | null`
  (no un simple `selectionMode: boolean`) — hay dos acciones en lote
  distintas que usan la misma columna de checkboxes: `"exportar"` muestra
  `ExportarExcelButton`, `"eliminar"` muestra `EliminarOrdenesButton`,
  `null` muestra el menú "⋮". NO es el viejo `ordenes-manager.tsx` de
  guardado en lote (ver más abajo): lo único que gobierna es la
  selección para estas dos acciones.
- `ordenes-acciones-menu.tsx`: único punto de entrada a las 4 acciones del
  listado (Nueva orden, Importar desde Excel, Exportar Excel, Eliminar
  órdenes) — un botón "⋮" (`MoreVertical`) que abre un `DropdownMenu`,
  mismo patrón que el menú de acciones por fila de `ordenes-table.tsx`
  (`DropdownMenuItem render={<Link .../>}` para navegación). No usa
  `<RoleGate>` por ítem: calcula `esAdmin`/`puedeExportar`/`puedeImportar`
  una sola vez vía `useAuth()` (mismo criterio que `puedeVerFinanciera` en
  `orden-form.tsx`) y no renderiza nada si el rol no tiene ningún permiso
  — evita un botón "⋮" que abre un menú vacío. "Nueva orden" y "Eliminar
  órdenes" solo para `administrador`; "Exportar Excel" e "Importar desde
  Excel" para `administrador`+`financiero`+`talento` (protección real del
  export en `app/api/ordenes/excel/route.tsx`, `ROLES_PERMITIDOS` — esa
  misma ruta filtra la sección financiera para `talento`, ver arriba). El
  import no tiene protección real del lado del servidor (mismo hueco que
  "Datos generales", ver `mvp_open_access` más abajo), solo se oculta el
  ítem del menú.
  `exportar-excel-button.tsx`/`eliminar-ordenes-button.tsx` no son el
  botón disparador: cada uno renderiza sus propios controles
  ("Descargar (N)"/"Cancelar", o "Eliminar (N)"/"Cancelar") solo mientras
  `accionSeleccion` está en ese valor (lo prenden los ítems del menú, vía
  `onExportar`/`onEliminar` → `iniciarSeleccion("exportar"|"eliminar")` de
  `ordenes-listado.tsx`). `ExportarExcelButton` sigue descargando el
  `.xlsx` con `POST /api/ordenes/excel` igual que siempre (mismo patrón
  `fetch → blob → <a download>` que el PDF de la tabla).
  `EliminarOrdenesButton` abre un `<AlertDialog>` de confirmación antes de
  llamar a `eliminarOrdenes` (Server Action nueva en
  `app/ordenes/actions.ts`: recorre los IDs seleccionados, borra cada uno
  con el mismo criterio que `eliminarOrden` — primero las tablas
  extendidas, después la orden — sin abortar el lote si una fila falla, y
  hace un solo `revalidatePath` al final; mismo espíritu resiliente que
  `importarOrdenesDesdeExcel`). El `<RoleGate>` de los tres es solo UX —
  la protección real la hace la ruta/RLS (ver sección `app/`).
- `/ordenes/importar` (`app/ordenes/importar/page.tsx` +
  `importar-ordenes-form.tsx`): crea órdenes en lote desde el Excel de
  cronograma que manda el ARL — una orden por fila, llenando solo los
  campos de "Datos generales" con equivalente confirmado por negocio (el
  resto de columnas del Excel se ignora; ver el mapeo en
  `lib/excel/leer-ordenes-excel.ts`). El Excel no trae el Cliente (tabla
  `clientes`, distinto de la empresa afiliada/usuaria que sí trae cada
  fila): la pantalla obliga a elegir uno (preseleccionado a "COMPAÑIA DE
  SEGUROS BOLÍVAR SA") que se aplica a todas las órdenes del archivo, en
  vez de tocar el esquema (`cliente_id` sigue `NOT NULL` + FK en la base
  real). `ImportarOrdenesForm` es un wizard de 3 pasos con estado propio
  (no usa `react-hook-form`: no es el formulario de una orden) — subir
  (Cliente + archivo) → revisar (previsualización fila por fila sin tocar
  Supabase, cada una marcada lista/con error) → resultado (creadas +
  fallidas). Las dos Server Actions que usa
  (`previsualizarImportacionOrdenes`, `importarOrdenesDesdeExcel`) viven en
  `app/ordenes/actions.ts` junto con el resto de mutaciones de la entidad,
  no en un `actions.ts` aparte.
- `orden-campos.tsx` ("Datos generales", TODOS los campos de
  `ordenes_servicio`) recibe `disabled` — `true` para cualquier rol que
  no sea `administrador`, `financiero` o `talento` (ver
  `supabase/migrations/20260802085134_baseline_esquema_remoto.sql`): se ve pero no se puede tocar,
  mismo patrón `<fieldset disabled>` que ya usaba
  `orden-info-secciones.tsx`. `orden-info-secciones.tsx` es un
  orquestador delgado: mete en un mismo `<fieldset disabled>` las 11
  secciones extendidas, cada una en su propio archivo bajo
  `components/ordenes/secciones/` (`datos-actividad.tsx`,
  `profesional-contacto.tsx`, `detalle-entrega.tsx`,
  `entregables-estandar.tsx`, `valor-hora.tsx`, `checklist.tsx`,
  `cuenta-cobro.tsx`, `acta-servicio.tsx`, `radicacion-imagine.tsx`,
  `facturacion.tsx`, `liquidacion.tsx`). Cada archivo de `secciones/` es
  autocontenido: calcula su propio estado completo/incompleto (con
  `algunoLleno` de `lib/utils.ts`) vía `watch` y se envuelve en
  `<SeccionAcordeon>` (`components/ui/`) — mismo criterio que
  `orden-campos.tsx`: un componente por grupo de campos, reusado donde
  haga falta. De esas 11 secciones, Valor hora está gateada a
  `administrador`/`financiero`/`talento`, y las 5 de la sección financiera
  (Cuenta de cobro, Acta de servicio, Radicación Imagine, Facturación,
  Liquidación) están gateadas a `administrador`/`financiero` únicamente
  (ver más abajo) — para el resto de roles esas 6 secciones ni se
  renderizan (`return null`), no solo se deshabilitan. El gate de Datos
  generales es el mismo que el de Valor hora (`puedeEditarGeneral`), pero
  ahí sí se renderiza deshabilitada (ver `datos-generales.tsx`). Las 5
  secciones operativas restantes (Datos actividad, Profesional/contacto,
  Detalle entrega, Entregables estándar, Checklist) son editables por
  cualquier rol salvo `profesional` y `lectura`: para esos dos,
  `OrdenInfoSecciones` calcula `soloLecturaOperativas` y envuelve esas 6
  secciones (más Valor hora, que igual no se renderiza para ellos) en un
  `<fieldset disabled>` adicional — mismo patrón que ya usaba para el modo
  "nueva sin guardar", con un banner propio explicando el motivo.
  `programador` no está en `soloLecturaOperativas`: sigue editando esas 5
  secciones sin restricción, solo pierde Datos generales/financiera como
  cualquier no-administrador/financiero/talento.
- `components/ordenes/secciones/`: todas tipan `register`/`control`/
  `errors`/`watch` contra el mismo `OrdenInfoFormValues` de
  `orden-form.tsx` (un solo `useForm` para todo el formulario, ver abajo)
  — no tienen schema propio. "Datos generales" (`OrdenCampos`) todavía
  NO vive acá: sigue siendo su propio componente en
  `components/ordenes/`, con `orden-form.tsx` como único consumidor (el
  comentario legado en `orden-campos.tsx` sobre editores inline en la
  tabla quedó desactualizado — `ordenes-table.tsx` es de solo lectura,
  ver arriba).
- `orden-form.tsx` es la única pieza que arma el formulario completo:
  un solo `useForm` (schema `ordenServicioSchema` + las claves anidadas
  de `ordenInfoExtendidaSchema`) cubre `OrdenCampos` + `OrdenInfoSecciones`,
  con un solo botón "Guardar". Recibe `mode: "nueva" | "existente"` — en
  `"nueva"` las secciones extendidas se ven deshabilitadas
  (`OrdenInfoSecciones` prop `disabled`) porque las 10 tablas extendidas
  usan `orden_id` como PK/FK hacia `ordenes_servicio(id)`: no pueden
  tener fila hasta que la orden misma tenga `id`.
  `app/ordenes/nueva/page.tsx` y `app/ordenes/[id]/editar/page.tsx` son
  ambos wrappers delgados sobre `OrdenForm`, no reimplementan nada. En
  `onSubmit`, si el usuario no puede editar general (no es administrador,
  financiero ni talento) se manda `datosBase: null` a
  `guardarInformacionOrden` (que entonces se salta `updateOrdenRecord` por
  completo) — mismo motivo que `valorHora`/sección financiera `undefined`
  más abajo: RLS igual lo rechazaría, pero tumbaría el guardado de las
  secciones que ese rol sí puede editar.
- "Valor hora profesional" vive en su propia tabla (`valor_hora_orden`,
  1-a-1 con `ordenes_servicio` vía `orden_id`), separada de
  `detalle_entrega_profesional` desde
  `supabase/002_usuarios_roles_rls.sql`. La **sección financiera**
  (`cuenta_cobro`, `acta_servicio`, `radicacion_imagine`, `facturacion`,
  `liquidacion`, todas 1-a-1 con `ordenes_servicio` vía `orden_id`) se
  agregó en una migración posterior junto con las policies
  "admin_fin_valor_hora" / "fin_all" — RLS ahí permite leer/escribir
  `valor_hora_orden` a `administrador`, `financiero` y `talento` (rol
  agregado a `RolUsuario` en `types/index.ts` para esto, ve/edita Datos
  generales y Valor hora pero no la sección financiera de 5 tablas, que
  sigue solo `administrador`/`financiero`). **La extensión de la policy de
  `valor_hora_orden` para incluir `talento` a nivel de base de datos aún
  no tiene migración committeada en `supabase/` — el front ya lo permite,
  pero falta el SQL real (ver aviso al usuario en el chat que agregó el
  rol).** En el form son las claves `valorHora`, `cuentaCobro`,
  `actaServicio`, `radicacionImagine`, `facturacion`, `liquidacion`
  (schemas en `lib/validations/info-orden.schema.ts`).
  `OrdenInfoSecciones` calcula dos flags (llama a `useAuth()` directo, es
  Client Component): `puedeVerFinanciera = rol === "administrador" || rol === "financiero"`
  para las 5 tablas financieras, y `puedeVerValorHora = puedeVerFinanciera || rol === "talento"`
  para Valor hora — cada sección se envuelve en su propio
  `<RoleGate allow={[...]}>` con la lista correspondiente. `OrdenForm` ya
  no recibe ni reenvía `rol` como prop, pero sí calcula sus propios
  `puedeVerFinanciera`/`puedeEditarGeneral` para el `onSubmit` (ver
  abajo).
  `valor_hora_profesional` se precarga desde `profesionales.valor_hora`
  (la tarifa base del profesional, administrable en `/profesionales` —
  ver más abajo) cuando se elige el profesional en "Profesional y
  contacto": `SeccionValorHora` recibe `profesionales` (con `valorHora`
  incluido, no el `SelectOption` genérico) + `setValue`, y un checkbox
  "Ingresar valor manual" decide si el campo se resincroniza con la
  tarifa base al cambiar de profesional o si queda congelado en lo que
  se escribió a mano. A propósito el valor queda GUARDADO en
  `valor_hora_orden` (no es una referencia en vivo a `profesionales`): si
  más adelante cambia la tarifa base de alguien, las órdenes ya cerradas
  no deben recalcularse solas. `getProfesionalesParaSelect()`
  (`lib/data/ordenes.ts`) trae `valor_hora` además de `id`/
  `nombre_completo` para esto.
  Si el usuario no puede editar general, se manda
  `valorHora: undefined`; si además no puede ver la financiera, también
  `cuentaCobro`/`actaServicio`/`radicacionImagine`/`facturacion`/
  `liquidacion: undefined` al Server Action — si se mandaran igual, RLS
  los rechazaría, pero tumbaría el guardado de TODAS las secciones en vez
  de solo esas (`guardarInfoOrdenCompleta` hace un `if (datos.X)` por
  sección, todo en la misma llamada). Por la misma razón,
  `eliminarInfoOrdenCompleta` puede fallarle a alguien sin esos roles si
  la orden ya tiene fila en cualquiera de esas tablas (el DELETE ahí
  también está restringido) — ver el comentario en
  `lib/data/info-orden.ts`; no hay solución del lado del front, es una
  decisión de política que le toca a Persona A. El
  viejo `ordenes-manager.tsx` de "guardar cambios en lote" ya no existe
  (el listado pasó a solo lectura); el único Client Component que hoy
  envuelve el listado es `ordenes-listado.tsx`, y solo para compartir la
  selección de filas a exportar entre el header y la tabla (ver arriba).
- `createOrden`/`guardarInformacionOrden`/`eliminarOrden` en
  `app/ordenes/actions.ts`: `createOrden` es la única que hace
  `redirect()` (a `/ordenes/{id}/editar`, al crear la orden desde
  `/ordenes/nueva`). `guardarInformacionOrden` guarda datos generales +
  las 11 secciones extendidas en una sola llamada (llama a
  `updateOrdenRecord` de `lib/data/ordenes.ts` y a
  `guardarInfoOrdenCompleta` de `lib/data/info-orden.ts`) y no
  redirige — el usuario se queda en la misma página de edición.
  `eliminarOrden` tampoco redirige, solo `revalidatePath` — la dispara
  la tabla.

### `components/profesionales/`, `components/participantes-arl/`, `components/vobo/`, `components/responsables-sec/`
- La pantalla `/profesionales` tiene **4 pestañas**, una por catálogo de
  personas, y son **4 tablas distintas** (no roles de una misma):
  - `/profesionales` → `profesionales` — el equipo de campo que ejecuta la
    orden. Es la única sin borrado: sigue teniendo solo "Marcar inactivo"
    (ver `lib/data/profesionales.ts`), y su `PageHeader` vive en el
    `page.tsx` porque no tiene selección de filas de la que dependa.
  - `/profesionales/participantes-arl` → `participantes_arl` — el equipo de
    la ARL que firma el detalle de entrega
    (`detalle_entrega_profesional.participante_arl_id`) y el acta
    (`acta_servicio.profesional_acta_id`).
  - `/profesionales/vobo` → `vobo` — el personal interno de GS Group del
    `<Select>` "Quién da el VoBo"
    (`detalle_entrega_profesional.profesional_vobo_id`).
  - `/profesionales/responsables-sec` → `responsables_sec` — quién de GS
    Group **responde por la orden** (`ordenes_servicio.responsable_sec_id`
    + la copia de texto `responsable_os`).
  `vobo` y `responsables_sec` comparten varias personas y tienen las mismas
  columnas, pero **no se unificaron**: son dos roles, y alguien puede
  responder por órdenes sin dar el visto bueno de ninguna. Unificarlas en una
  tabla "personal" con flags es un refactor aparte, no algo que deba resolver
  la migración que crea el catálogo.
  Las tres pestañas nuevas calcan la anatomía de `components/clientes/`
  (listado + tabla + menú "⋮" + botón de borrado en lote + campos
  compartidos), con borrado real traducido desde el `23503` de la FK.
  `participantes_arl` y `vobo` no tienen RLS habilitada (solo `GRANT`s en el
  baseline) y `responsables_sec` la tiene con la policy `mvp_open_access`
  (`USING (true)`), así que en las tres el `redirect()` de cada `page.tsx` es
  toda la barrera real hoy — mismo estado que `clientes`.
- **Las pestañas no salen de un `layout.tsx`**, mismo motivo que las de
  `/clientes`: cada página monta `<ProfesionalesTabs />`
  (`components/profesionales/profesionales-tabs.tsx`) debajo de su propio
  `PageHeader`, porque las dos pestañas con selección de filas renderizan
  ese header desde su listado. Al agregar una pestaña: entrada en `TABS` +
  carpeta de ruta con `page.tsx` y `loading.tsx`, **cada uno con su propio
  gate de rol** (`administrador`/`financiero`/`talento`) — no hay layout
  donde centralizarlo, y olvidarlo deja la ruta abierta.
- Los `actions.ts` de las tres pestañas nuevas revalidan
  `revalidatePath("/ordenes", "layout")`, no `revalidatePath("/ordenes")`
  a secas como `app/clientes/actions.ts`: estos catálogos los consumen
  `/ordenes/nueva` y `/ordenes/[id]/editar` (vía `getCatalogos()` de
  `lib/data/info-orden.ts` para ARL/VoBo, vía
  `getResponsablesSecParaSelect()` para responsables SEC), y sin `"layout"`
  el revalidate no baja a esas rutas hijas.

### `components/clientes/`
- CRUD completo de la tabla `clientes` (`/clientes`, solo
  `administrador`). Calca la anatomía de `/ordenes` —no la de
  `/profesionales`— porque tiene selección de filas: `clientes-listado.tsx`
  (Client Component dueño del estado), `clientes-acciones-menu.tsx` (el "⋮"
  del header), `eliminar-clientes-button.tsx` ("Eliminar (N)" + `AlertDialog`)
  y `clientes-table.tsx`. `campos-cliente.tsx` son los 2 campos del
  formulario, compartidos por el alta y por la fila de edición.
- `selectionMode: boolean` en vez del `accionSeleccion` de órdenes: hay una
  sola acción en lote (eliminar), no dos. `clientes-listado.tsx` también
  gobierna `formAbierto` (alta) y `editandoId` (edición) porque los tres
  modos se apagan entre sí.
- Alta y edición son **inline** (formulario arriba de la tabla / fila
  desplegada debajo), no páginas `nueva` + `[id]/editar` como órdenes: un
  cliente son 2 campos. Si la entidad crece, ahí sí conviene la página.
- **Sí tiene borrado real**, a diferencia de `profesionales`: la FK
  `ordenes_servicio_cliente_id_fkey` no tiene `ON DELETE CASCADE`, así que
  Postgres rechaza (`23503`) borrar un cliente con órdenes — el historial lo
  protege la base. `lib/data/clientes.ts` traduce ese código a un mensaje
  legible y la UI ofrece "Marcar inactivo" como alternativa. El borrado en
  lote (`eliminarClientes`) devuelve `{ eliminados, fallidos }` y no aborta
  el lote, igual que `eliminarOrdenes`.
- Ningún componente usa `<RoleGate>`: la pantalla entera ya está gateada en
  servidor (`app/clientes/page.tsx`), y repetir el chequeo en el cliente
  dejaría la UI vacía en modo mock (sin Supabase no hay `perfil`).
- `app/clientes/actions.ts` revalida `/clientes` **y** `/ordenes`: el filtro
  y el `<Select>` de cliente de órdenes salen de
  `getClientesParaSelect()` (`lib/data/ordenes.ts`, solo activos), así que
  cualquier alta/edición/baja acá cambia esa pantalla. Esa función sigue
  viviendo en `ordenes.ts` a propósito (la consumen 4 `page.tsx` de
  órdenes); `lib/data/clientes.ts` es la administración de la entidad, no el
  catálogo.
- La policy de `clientes` sigue siendo `mvp_open_access` (`USING (true)`),
  así que el `redirect()` de `page.tsx` es toda la barrera real hoy —
  cualquier sesión podría escribir la tabla por la API. Cerrarlo es una
  migración de policy, no un cambio de front.

### `components/empresas-usuarias/`
- Segunda pestaña de la pantalla `/clientes` (`/clientes/empresas-usuarias`):
  CRUD completo de `empresas_usuarias`, la empresa **donde se ejecuta** el
  servicio — distinta del `Cliente`, que es quien lo contrata y paga. Mismos 5
  archivos y misma anatomía que `components/clientes/` (listado + tabla +
  menú "⋮" + botón de borrado en lote + campos compartidos).
- **Las pestañas no salen de un `layout.tsx`**: cada página monta
  `<ClientesTabs />` (`components/clientes/clientes-tabs.tsx`) justo debajo de
  su propio `PageHeader`. Un layout tendría que dibujarlas encima del título,
  porque el header lo renderiza cada listado (sus botones dependen del estado
  de selección de esa tabla). Son dos líneas repetidas a cambio de que el
  header siga siendo dueño de sus acciones. Al agregar una pestaña nueva:
  entrada en `TABS` de `clientes-tabs.tsx` + su carpeta de ruta con `page.tsx`
  y `loading.tsx`, cada uno con su propio gate de rol (no hay layout donde
  centralizarlo).
- La tabla tiene una columna **"Órdenes"** (conteo) que las demás no tienen:
  sale de un embedded aggregate de PostgREST (`ordenes_servicio(count)`,
  devuelve `[{ count: N }]`) que `lib/data/empresas-usuarias.ts` normaliza a
  `number`. Ese conteo es además el que decide si el ítem "Eliminar" del menú
  de fila va deshabilitado: con órdenes asociadas el borrado falla siempre por
  FK, y ofrecer una acción que no puede funcionar es peor que no ofrecerla.
  En `clientes-table.tsx` ese ítem sí queda habilitado, porque ahí no se carga
  el conteo.
- `lib/data/empresas-usuarias.ts` traduce **dos** códigos de Postgres a
  mensajes de pantalla (clientes solo traduce uno):
  - `23505` — el índice único es sobre el nombre NORMALIZADO (trim, espacios
    colapsados, mayúsculas), así que "ACME SA" choca con "acme  sa" aunque el
    texto no sea idéntico. Es a propósito: evita volver a llenar la tabla de
    variantes de la misma empresa.
  - `23503` — `ordenes_servicio.empresa_usuaria_id` no tiene `ON DELETE
    CASCADE`, mismo criterio que `clientes`.
- **Editar una empresa reescribe sus órdenes.** `nombre_empresa_usuaria` y
  `nit_empresa_usuaria` son copias denormalizadas, así que
  `actualizarEmpresaUsuariaRecord` hace un segundo `UPDATE` sobre
  `ordenes_servicio` filtrando por la FK. Sin eso, corregir un nombre dejaba a
  las órdenes ya cargadas mostrando el valor viejo para siempre — dos nombres
  para la misma empresa, justo lo que el catálogo vino a limpiar. Solo se tocan
  las órdenes **vinculadas por FK**: las que tienen texto con
  `empresa_usuaria_id` en NULL se dejan como están, porque nadie confirmó
  todavía que sean esta empresa. Mismo criterio que
  `lib/data/responsables-sec.ts` con `responsable_os`.
- El origen de los datos es la migración
  `20260815123716_catalogo_empresas_usuarias.sql`, que creó la tabla a partir
  de los `nombre_empresa_usuaria` que ya estaban escritos a mano en las
  órdenes. Esas columnas de texto **siguen existiendo** y son las que el front
  de órdenes lee hoy; `empresa_usuaria_id` todavía no la consume nadie fuera
  de esta pantalla. Migrar esos consumidores (y recién ahí borrar las columnas
  viejas) es trabajo pendiente, no un descuido.
- `supabase/seed.sql` carga estas 4 empresas a mano y vincula las órdenes con
  el mismo `UPDATE` normalizado de la migración. Hace falta porque `db:reset`
  corre todas las migraciones sobre una base vacía y el seed va después: el
  backfill no tiene ninguna orden que leer.
- **Consumo desde el formulario de órdenes**: "Datos generales"
  (`orden-campos.tsx`) ya no pide la empresa usuaria como texto libre. Es un
  `<Combobox>` sobre `getEmpresasUsuariasParaSelect()` enlazado a
  `empresa_usuaria_id`, y al elegir una copia con `setValue` su nombre y su NIT
  a `nombre_empresa_usuaria` / `nit_empresa_usuaria`. Esas dos columnas
  quedaron **denormalizadas a propósito**: son las que siguen leyendo el
  listado, el Excel y el PDF, así que el formulario las mantiene sincronizadas
  en vez de obligar a migrar los cuatro consumidores en el mismo diff. El campo
  NIT quedó `readOnly` siempre — el NIT es un dato de la empresa y se corrige
  en su pantalla, no orden por orden, que es justo lo que produjo el desorden
  que la migración limpió.
  Dos casos que ese campo maneja explícitamente: si la orden apunta a una
  empresa marcada inactiva después, `getEmpresasUsuariasParaSelect(incluirId)`
  la incluye igual (si no, el campo saldría vacío y guardar borraría el
  vínculo); y si la orden tiene nombre en texto pero `empresa_usuaria_id` en
  NULL, el campo muestra un aviso de "sin vincular" en vez de verse vacío.
- **Importación desde Excel** (`/ordenes/importar`): el archivo del ARL trae la
  razón social escrita a mano, así que la importación resuelve cada nombre
  contra el catálogo por nombre normalizado y deja las órdenes ya vinculadas.
  El reparto entre los dos pasos del wizard es deliberado:
  - `previsualizarImportacionOrdenes` **solo consulta**
    (`buscarEmpresasUsuariasPorNombre`) y devuelve `empresasNuevas`, que la
    pantalla lista antes de confirmar. Las filas cuya empresa ya existe se
    muestran con el nombre y NIT **canónicos** (los de la tabla, no los del
    Excel): la previsualización enseña lo que se va a guardar.
  - `importarOrdenesDesdeExcel` **crea las que falten**
    (`resolverEmpresasUsuarias`) y vuelve a resolver del lado del servidor, sin
    confiar en el `empresa_usuaria_id` que calculó la previsualización — las
    filas llegan desde el cliente y el catálogo pudo cambiar entre un paso y
    otro.
  La regla detrás de esa división: una importación **no debe dar de alta
  empresas en silencio**, porque un typo en el Excel crea una variante nueva y
  es exactamente lo que llenó de duplicados la etapa de texto libre. Se crean,
  pero recién después de mostrarlas.
  Si el catálogo no se puede resolver, la importación falla entera y no crea
  ninguna orden (a diferencia del bucle por fila, que sí es resiliente): es
  preferible a dejar media importación con vínculos incompletos.

### `components/responsables-sec/`
- Cuarta pestaña de `/profesionales` (`/profesionales/responsables-sec`): CRUD
  completo de `responsables_sec`, quién de GS Group responde por una orden.
  Mismos 5 archivos y misma anatomía que `components/vobo/`, más la columna
  **"Órdenes"** de `components/empresas-usuarias/` (embedded aggregate
  `ordenes_servicio(count)`, y el ítem "Eliminar" de la fila deshabilitado
  cuando ese conteo es > 0).
- Origen: la migración `20260816001045_catalogo_responsables_sec.sql`. Es la
  misma forma que `empresas_usuarias` (tabla + FK + backfill + columna de texto
  que sobrevive) con **una diferencia**: acá había un CHECK, y la migración lo
  tira. Con el CHECK puesto, dar de alta a alguien desde esta pantalla no
  serviría de nada — el `<Select>` lo ofrecería y el INSERT de la orden
  explotaría igual. Quien valida ahora es la FK.
- El backfill del catálogo sale de **la lista del CHECK**, no de un `SELECT
  DISTINCT` sobre las órdenes: hay personas dadas de alta que todavía no tienen
  ninguna orden y un DISTINCT las perdería. Por eso, y a diferencia de
  `empresas_usuarias`, `supabase/seed.sql` **no** carga estas filas a mano —
  la migración las crea sola aunque la base esté vacía; el seed solo vincula
  las tres órdenes de prueba.
- `lib/data/responsables-sec.ts` traduce los mismos dos códigos que
  `empresas-usuarias.ts` (`23505` sobre el nombre normalizado, `23503` al
  borrar a alguien con órdenes) y hace **una cosa que las otras pantallas no**:
  al renombrar a una persona reescribe también el `responsable_os` de sus
  órdenes. Esa columna es la copia denormalizada que leen el listado, el filtro,
  el Excel y el PDF, y sin la cascada quedarían dos nombres para la misma
  persona y sus órdenes viejas fuera del filtro. `empresas_usuarias` hace lo
  mismo con `nombre_empresa_usuaria`/`nit_empresa_usuaria` desde el mismo
  cambio.
- **Consumo desde el formulario de órdenes**: "Responsable SEC para GS" es un
  `<Select>` sobre `getResponsablesSecParaSelect()` enlazado a
  `responsable_sec_id`, que al elegir copia el nombre a `responsable_os` con
  `setValue`. Mismo par de casos que la empresa usuaria: `incluirId` para no
  perder el vínculo de una orden cuyo responsable se marcó inactivo después, y
  aviso de "sin vincular" cuando hay texto sin FK.
- **Filtro del listado**: las opciones ya no salen de una constante, las pasa
  `app/ordenes/page.tsx` con `getResponsablesSecTodos()` — *todos*, no solo los
  activos: si alguien se marcó inactivo sus órdenes siguen en el listado y hay
  que poder filtrarlas. El filtro sigue comparando contra la columna de texto,
  no contra la FK; son los mismos valores gracias a la cascada del rename.
- **Importación desde Excel**: al revés que las empresas usuarias, la
  importación **no da de alta responsables**. Una empresa usuaria nueva es un
  dato del cliente; una persona es del equipo interno, y crearla por un typo del
  Excel deja un empleado fantasma. `leerOrdenesDesdeExcel` recibe los nombres
  del catálogo para el match por tokens (tolera nombres de más: "Yulieth Andrea
  Amell Gonzalez" resuelve a "Yulieth Amell"), y si el nombre no resuelve —o es
  ambiguo, como "Amell" entre dos personas— la fila queda **inválida** con un
  mensaje que dice qué hacer. Ojo con el orden de esos dos cambios: al dejar de
  ser `z.enum`, `responsable_os` acepta cualquier string, así que ese chequeo
  explícito en `previsualizarImportacionOrdenes` es lo único que impide que una
  orden se importe con un responsable inventado y sin FK.

### `components/usuarios/`
- `usuarios-table.tsx`: única pantalla de administración de usuarios —
  lista `nombre_completo`/`email`/`rol` y deja cambiar el rol inline con
  un `<Select>` por fila (dispara `actualizarRolUsuario` de
  `app/usuarios/actions.ts` al `onValueChange`, sin botón "Guardar"
  aparte). Mismo patrón de estado que `ordenes-table.tsx`: un `Set` de
  ids en "guardando" solo para feedback visual mientras corre el Server
  Action.
- `app/usuarios/page.tsx` es la única `page.tsx` del proyecto con
  protección real en servidor (no solo `RoleGate`): usa
  `getPerfilActual()` de `lib/data/usuarios.ts` y hace `redirect("/")` si
  el rol no es `administrador`. En modo mock (`isSupabaseConfigured ===
  false`) no bloquea nada, porque no hay sesión real que verificar.
- `lib/data/usuarios.ts` sigue el mismo patrón mock/real que
  `ordenes.ts`, pero usa `createSupabaseServerClient()` para *todas* sus
  queries (no el singleton de `lib/supabase/client.ts`) porque `usuarios`
  tiene RLS — mismo motivo que `ordenes.ts`/`info-orden.ts`.

## Al agregar una entidad nueva (ej. "proveedores" como pantalla propia)

1. `types/index.ts` — agregar el alias de dominio (`Proveedor`) sobre el
   tipo crudo de `database.types.ts`.
2. `lib/mock-data/proveedores.ts` (o reutilizar el mock de otra entidad si
   los datos ya están ahí — `clientes` reusa `mock-data/ordenes.ts`).
3. `lib/data/proveedores.ts` — funciones `getProveedores`,
   `crearProveedorRecord`, etc., mismo patrón mock/real que `ordenes.ts`.
4. `lib/validations/proveedor.schema.ts` — schema de Zod.
5. `app/proveedores/page.tsx`, `actions.ts`, `loading.tsx`, y rutas
   `nueva`/`[id]/editar` si el formulario no cabe inline.
6. `components/proveedores/` — tabla, formulario, etc.
7. `components/layout/nav-config.ts` — la entrada del sidebar (con
   `roles` si la pantalla no es para todos).

Si en el paso 3 se repite un helper que ya existe en `lib/data/ordenes.ts`
(como `orNull`), ese es el momento de moverlo a `lib/utils.ts`.

**`clientes` es la implementación de referencia más reciente y completa de
esta receta** (los 7 pasos, incluido el CRUD entero): si vas a agregar una
entidad nueva, copiá esa forma antes que inventar una.
