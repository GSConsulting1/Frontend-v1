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
```

## Reglas por carpeta

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
- Hoy solo refresca el token de sesión en cada request (`supabase.auth.getUser()`)
  para que la cookie no expire mientras navegas. **No redirige nada
  todavía** — `/ordenes/*` sigue abierto sin sesión a propósito (ver
  `components/auth/`), porque hoy no hay usuarios reales creados en
  Supabase Auth. Cuando los haya, agregar la lógica de redirect acá.

### `lib/mock-data/`
- Un archivo por entidad (ej. `ordenes.ts` agrupa clientes, estados,
  profesionales y órdenes porque están relacionados). Solo se usa desde
  `lib/data/*.ts`, nunca desde componentes ni desde `app/`.

### `lib/data/`
- **Un archivo por entidad** (`ordenes.ts`, y a futuro `clientes.ts`,
  `profesionales.ts`, etc.). Es el único lugar del código que llama a
  `supabase.from(...)`.
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
- `ESTADOS_ORDEN` y `RESPONSABLES_OS` en `orden.schema.ts`: listas fijas
  hardcodeadas (no vienen de una tabla catálogo — `estados_orden` se
  eliminó de la DB, ver el `ALTER TABLE` que convirtió
  `ordenes_servicio.estado_id`/`responsable_sec_id` a texto con un CHECK
  constraint). Reflejan ese CHECK 1 a 1; si cambia en la DB, hay que
  actualizar esta lista también. Los componentes (`orden-campos.tsx`,
  `ordenes-table.tsx`) las importan directo — no se prop-drillean desde
  `page.tsx` como los catálogos reales (`clientes`, `profesionales`,
  `ciudades`, etc.), porque no son datos async de Supabase, son
  constantes de compilación. `asesor_gestion_riesgos` en cambio quedó
  como texto libre sin CHECK (input simple, sin lista fija) — a
  propósito, para asesores externos que no están en `profesionales`.

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
  ruta: primero valida sesión + rol (`administrador`/`financiero`) con
  `lib/supabase/server.ts` y solo entonces consulta con el service role. No
  tiene ruta mock: sin credenciales de Supabase no funciona, igual que el
  PDF.
- `lib/excel/`: builders/parsers de `.xlsx` con `exceljs`, análogo a
  `lib/pdf/` pero para hojas de cálculo. `matriz-ordenes.ts` es la única
  fuente de verdad del orden y el mapeo de columnas (una fila por orden,
  hoja plana con los textos exactos del documento de referencia);
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
- **Las rutas de `/ordenes/*` siguen sin protección** (no hay redirect a
  `/login` si no hay sesión) — decisión a propósito mientras no existan
  usuarios reales creados en Supabase Auth + su fila en `usuarios`. Para
  activarla: agregar el chequeo de sesión en cada `page.tsx` (o
  centralizarlo en `proxy.ts`, ver esa sección).
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
  órdenes" solo para `administrador`; "Exportar Excel" para
  `administrador`+`financiero` (protección real en
  `app/api/ordenes/excel/route.tsx`, `ROLES_PERMITIDOS`); "Importar desde
  Excel" para `administrador`+`financiero`+`talento` — sin protección real
  del lado del servidor (mismo hueco que "Datos generales", ver
  `mvp_open_access` más abajo), solo se oculta el ítem del menú.
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
  `supabase/004_ordenes_servicio_rls.sql`): se ve pero no se puede tocar,
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

## Al agregar una entidad nueva (ej. "clientes" como pantalla propia)

1. `types/index.ts` — ya debería existir el alias (`Cliente`); si no,
   agregarlo.
2. `lib/mock-data/clientes.ts` (o reutilizar el de `ordenes.ts` si ya
   están ahí).
3. `lib/data/clientes.ts` — funciones `getClientes`, `createCliente`,
   etc., mismo patrón mock/real que `ordenes.ts`.
4. `lib/validations/cliente.schema.ts` — schema de Zod.
5. `app/clientes/page.tsx`, `app/clientes/actions.ts`, rutas
   `nueva`/`[id]/editar` si aplica.
6. `components/clientes/` — tabla, formulario, etc.

Si en el paso 3 se repite un helper que ya existe en `lib/data/ordenes.ts`
(como `orNull`), ese es el momento de moverlo a `lib/utils.ts`.
