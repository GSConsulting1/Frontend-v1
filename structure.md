# Estructura del proyecto

Este archivo documenta dónde vive cada cosa y por qué, para que el código
nuevo (escrito por una persona o por un agente) siga el mismo orden. Antes
de crear un archivo, revisa si ya existe una carpeta/convención para ese
tipo de cosa acá abajo.

## Árbol y responsabilidad de cada carpeta

```
src/
├── types/            # Vocabulario del dominio (tipos)
├── lib/
│   ├── supabase/      # Cliente de Supabase (conexión)
│   ├── mock-data/      # Datos falsos para desarrollar sin Supabase
│   ├── data/          # Capa de acceso a datos (queries reales/mock)
│   ├── validations/    # Schemas de Zod (forma válida de cada entidad)
│   └── utils.ts        # Helpers genéricos, sin lógica de negocio
├── app/               # Rutas (file-based routing de Next.js App Router)
│   └── <entidad>/
│       ├── page.tsx        # Server Component: lee datos, renderiza
│       ├── actions.ts       # Server Actions ("use server"): mutaciones
│       ├── nueva/page.tsx   # Ruta de creación
│       └── [id]/editar/page.tsx  # Ruta dinámica de edición
└── components/
    ├── ui/            # Primitivos genéricos (shadcn/ui) — sin dominio
    └── <entidad>/      # Componentes específicos del dominio
```

## Reglas por carpeta

### `types/`
- `database.types.ts` es **generado**, nunca se edita a mano. Se
  regenera con `supabase gen types typescript --project-id <id> >
  src/types/database.types.ts` cada vez que cambia el esquema en
  Supabase. Crece junto con la base — eso es normal y esperado, no un
  problema de mantenibilidad (es un artefacto, no código que alguien lee
  para razonar sobre lógica).
- `index.ts` es la capa curada a mano: alias de dominio sobre los tipos
  crudos (`Cliente`, `OrdenServicio`, etc.). El resto de la app importa
  SIEMPRE desde acá, nunca desde `database.types.ts` directamente. Si
  cambia una columna en la DB, solo se ajusta este archivo.

### `lib/supabase/client.ts`
- Único lugar donde se crea el cliente de Supabase.
- Expone `isSupabaseConfigured` para que `lib/data/*.ts` decida entre
  mock y real. No se importa `supabase` desde ningún otro lugar que no
  sea `lib/data/*.ts`.

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
- Helpers privados de normalización (ej. `normalizarInput`,
  `orNull` en `ordenes.ts`) viven en el mismo archivo mientras solo un
  archivo de datos los necesite. **Se promueven a `lib/utils.ts` recién
  cuando un segundo archivo de `lib/data/` necesite el mismo helper** —
  no antes, para evitar abstraer prematuramente algo con un solo uso.

### `lib/validations/`
- Un schema de Zod por entidad (`orden.schema.ts`). Es la única fuente
  de verdad de validación, usada tanto en el Client Component del
  formulario (`zodResolver`) como en el Server Action (revalidación en
  servidor, nunca confiar solo en el cliente).

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
- `layout.tsx` solo para lo que envuelve toda la app (fuentes, metadata
  global). No mete lógica de una entidad específica.
- `globals.css` vive en `app/globals.css` (convención de Next.js App
  Router) e importa Tailwind. El campo `"css"` de `components.json` en
  la raíz solo le dice al CLI de shadcn/ui dónde inyectar las variables
  de tema al instalar un componente nuevo — no implica que el CSS deba
  moverse a otra carpeta.

### `components/ui/`
- Primitivos de shadcn/ui, instalados con `npx shadcn add <componente>`.
  No se editan a mano salvo para theming; no conocen el dominio
  (ninguna referencia a "orden", "cliente", Supabase, etc.).

### `components/<entidad>/`
- Componentes que sí conocen el dominio (`ordenes-table.tsx`,
  `orden-form.tsx`, `estado-badge.tsx`). Reciben datos ya resueltos por
  vía de props desde `page.tsx` — no hacen fetch propio salvo que sean
  Client Components que llaman a un Server Action (ej. `orden-form.tsx`
  → `actions.ts`).

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
