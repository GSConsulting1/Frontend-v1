# Plan: cerrar la brecha de RLS (`mvp_open_access`)

**Severidad: alta. Está en producción hoy.**

Escrito el 2026-08-02, con lo verificado contra el esquema real durante la
adopción de migraciones versionadas. Pensado para ejecutarse en una sesión
aparte. Prerequisito ya cumplido: existe DB local (`pnpm db:start`), así que
todo esto se prueba sin tocar producción.

---

## 1. El problema

Existe una policy llamada `mvp_open_access` en **11 tablas**, declarada así:

```sql
FOR ALL TO public USING (true) WITH CHECK (true)
```

Tres hechos que por separado parecen menores y juntos abren la base:

1. **Postgres combina las policies permisivas con `OR`.** Mientras
   `mvp_open_access` exista, `solo_admin_escribe_ordenes`,
   `admin_gestiona_usuarios` y `autenticados_leen_ordenes` no restringen nada:
   siempre hay una rama del `OR` que da `true`.
2. **`public` en Postgres no significa "usuarios logueados".** Significa todos
   los roles, e incluye a `anon` — el rol con el que pega cualquiera que tenga
   la anon key.
3. **`anon` tiene `SELECT/INSERT/UPDATE/DELETE` sobre las 19 tablas de
   `public`.** Verificado: `anon` tiene `UPDATE` en las 19.

La anon key es pública por diseño: viaja en el bundle de JavaScript que se
descarga en el navegador. Cualquiera puede leerla desde las DevTools.

**Consecuencia:** con esa llave y sin iniciar sesión se pueden leer y escribir
las tablas afectadas, incluido:

```sql
UPDATE usuarios SET rol = 'administrador' WHERE id = '<cualquiera>';
```

Todo el control de acceso por rol que existe hoy vive en el front
(`RoleGate`, los flags de `OrdenInfoSecciones`, `disabled` en los formularios).
Es un control de *interfaz*, no de seguridad: quien no use la interfaz no lo
tiene.

### Cómo verificarlo

```bash
pnpm db:start
docker exec supabase_db_gsc-ordenes-servicio psql -U postgres -d postgres -c "
  SELECT tablename, policyname, cmd, roles::text, qual
  FROM pg_policies WHERE schemaname='public' AND policyname='mvp_open_access';"
```

Para comprobar el impacto real (no solo la teoría), pegarle a la API REST local
con la anon key y sin sesión — si devuelve filas, está confirmado:

```bash
curl "http://127.0.0.1:54321/rest/v1/usuarios?select=*" \
  -H "apikey: <ANON_KEY local, ver .env.local.example>"
```

---

## 2. Por qué no es un `DROP POLICY` y listo

Este es el punto que hace falta entender antes de escribir nada.

De las 11 tablas con `mvp_open_access`, **8 no tienen ninguna otra policy**. Al
quitarla, RLS pasa a denegar por defecto y esas tablas quedan **completamente
inaccesibles** — para todos, incluido el administrador:

| Tabla | Otras policies | Qué pasa si se quita `mvp_open_access` |
| --- | --- | --- |
| `ciudades` | — | 🔴 se apaga el selector de ciudad |
| `estados_ejecucion` | — | 🔴 se apaga el selector de estado |
| `entregables_estandar` | — | 🔴 se apagan los entregables |
| `clientes` | — | 🔴 se apaga el selector de cliente |
| `profesionales` | — | 🔴 se apaga /profesionales entero |
| `checklist_proceso` | — | 🔴 |
| `detalle_entrega_profesional` | — | 🔴 |
| `orden_entregables_estandar` | — | 🔴 |
| `info_orden_servicio` | 5 (admin+financiero) | ⚠️ solo admin y financiero |
| `ordenes_servicio` | `autenticados_leen`, `solo_admin_escribe` | ⚠️ escritura solo admin |
| `usuarios` | `admin_gestiona`, `usuario_lee_su_fila` | ⚠️ |

Fallará además **en silencio en las lecturas**: RLS no tira error al leer,
devuelve 0 filas. La app va a mostrar listas vacías y selectores sin opciones,
sin ningún mensaje. En las escrituras sí explota, con
`new row violates row-level security policy`.

Por eso la migración tiene que **crear las policies correctas en el mismo
cambio** en que borra `mvp_open_access`, no antes ni después.

---

## 3. Cosas rotas que aparecieron al inventariar

No las causa `mvp_open_access`, pero hay que resolverlas en el mismo trabajo
porque afectan qué policies hay que escribir.

**a) Cinco policies quedaron creadas sobre la tabla equivocada.**
`info_orden_servicio` tiene estas cinco, todas con el predicado idéntico
(`administrador` o `financiero`):

```
admin_y_financiero_editan_acta_servicio
admin_y_financiero_editan_checklist_proceso
admin_y_financiero_editan_detalle_entrega_profesional
admin_y_financiero_editan_info_orden
admin_y_financiero_editan_ordenes_servicio
```

Por los nombres, cuatro estaban destinadas a *otras* tablas y se crearon todas
sobre `info_orden_servicio`. Eso explica por qué `checklist_proceso` y
`detalle_entrega_profesional` se quedaron sin policy propia. Hay que moverlas a
donde correspondía.

**b) Dos pares de policies duplicadas** (mismo predicado, distinto nombre):
- `usuarios`: `usuario_lee_su_fila` y `usuario_lee_su_propia_fila`
- `valor_hora_orden`: `admin_fin_valor_hora` y `admin_y_financiero_valor_hora`

**c) El rol `talento` no existe a nivel de base.** `structure.md` dice que
`talento` debe leer y escribir `valor_hora_orden`, pero ninguna de las dos
policies de esa tabla lo incluye — solo `administrador` y `financiero`. Y
`valor_hora_orden` **no** tiene `mvp_open_access`, así que esto no está tapado
por la brecha: **hoy, en producción, un usuario `talento` ya no puede usar esa
sección.** Vale la pena confirmarlo con negocio antes de decidir el predicado.

**d) `participantes_arl` y `vobo` no tienen RLS activado.** Con RLS apagado, las
policies no aplican y el GRANT de `anon` manda: quedan abiertas por otra vía.
Contienen nombres y cédulas de personas reales.

**e) `005_ordenes_servicio_financiero_edicion.sql` nunca se aplicó** (sigue sin
aplicar en `supabase/`). Define `es_financiero()`, la policy
`financiero_actualiza_ordenes` y un trigger que restringe qué columnas puede
tocar ese rol. Hoy la app ofrece edición inline a `financiero` y funciona
**solo porque `mvp_open_access` deja pasar todo**. Al cerrar la brecha, esa
función se rompe salvo que se aplique el 005. Conviene incorporarlo a este
trabajo.

---

## 4. Los seis roles

`src/types/index.ts` → `RolUsuario`:

`administrador`, `programador`, `profesional`, `lectura`, `financiero`,
`talento`.

Antes de escribir las policies hace falta una matriz tabla × rol con
lectura/escritura. **Eso es una decisión de negocio, no técnica** — el front de
hoy es una fuente razonable de partida, pero está incompleto (no cubre
`programador` ni `lectura` en todas las tablas). Conviene confirmarla antes de
escribir SQL.

---

## 5. La migración propuesta

Un solo archivo, `pnpm db:new cerrar_rls_mvp_open_access`, con este orden:

1. **Catálogos** (`ciudades`, `estados_ejecucion`, `entregables_estandar`,
   `clientes`, `profesionales`, `participantes_arl`, `vobo`):
   - `ENABLE ROW LEVEL SECURITY` donde falte (`participantes_arl`, `vobo`).
   - `FOR SELECT TO authenticated USING (true)` — todos los roles leen.
   - Escritura: solo `administrador` (confirmar; hoy `/profesionales` permite
     crear y editar, revisar con qué roles).
2. **Tablas operativas** (`checklist_proceso`, `detalle_entrega_profesional`,
   `orden_entregables_estandar`, `info_orden_servicio`): policies según la
   matriz del punto 4, y mover a su tabla las cuatro policies mal ubicadas.
3. **Limpiar duplicados** de `usuarios` y `valor_hora_orden`.
4. **Incorporar el contenido del 005** (`es_financiero()`, la policy y el
   trigger de columnas), y borrar el archivo suelto.
5. **`DROP POLICY "mvp_open_access"` en las 11 tablas** — recién acá, cuando
   todo lo de arriba ya está en su lugar.
6. **`REVOKE` a `anon`** sobre todas las tablas de `public`. Es la segunda
   línea de defensa: aunque una policy quede mal escrita, `anon` no tiene
   permiso de tabla y no llega a evaluarse.

   ✅ **Verificado el 2026-08-02**: ningún archivo importa el cliente
   `supabase` de `lib/supabase/client.ts` (el singleton con anon key y sin
   sesión). Los 8 archivos que importan de ahí traen solo
   `isSupabaseConfigured`. Todas las queries de `lib/data/` pasan por
   `createSupabaseServerClient()`, que sí lleva la sesión. Las rutas de PDF y
   Excel usan `lib/supabaseAdmin.ts` (service role), que bypassea RLS y no se
   ve afectado. Conviene re-confirmarlo con un grep antes de aplicar, por si
   entró código nuevo:

   ```bash
   grep -rn "supabase" src/ --include=*.ts --include=*.tsx | grep "lib/supabase/client"
   ```

---

## 6. Cómo probarlo

`pnpm db:reset` solo demuestra que el SQL corre. Para saber si la app sigue
funcionando hay que **entrar con un usuario de cada rol**, contra la DB local:

1. `pnpm db:start` y apuntar `.env.local` a local (ver `.env.local.example`).
2. Crear 6 usuarios en el Studio local (http://127.0.0.1:54323) →
   Authentication → Add user, e insertar su fila en `usuarios` con cada rol.
   Conviene agregar esto a `supabase/seed.sql` para no repetirlo a mano.
3. Con cada rol, recorrer: listado de órdenes, crear orden, editar orden
   (Datos generales, sección financiera, valor hora), `/profesionales`,
   `/usuarios`, exportar Excel, descargar PDF, importar Excel.
4. **Mirar la consola del navegador y las listas vacías**, no solo los errores:
   el modo de falla típico de RLS es 0 filas en silencio.

Y la prueba que cierra el caso, la misma del punto 1 pero al revés — sin
sesión, con la anon key, debe devolver vacío o 401:

```bash
curl "http://127.0.0.1:54321/rest/v1/usuarios?select=*" -H "apikey: <ANON_KEY>"
```

---

## 7. Despliegue y rollback

- Aplicar con `pnpm db:push` **manualmente y mirando**, no por CI, y en un
  momento de baja actividad.
- Hay una sola base (no hay staging), así que el "ensayo" es la DB local.
- **Rollback:** recrear `mvp_open_access` en las tablas afectadas devuelve el
  estado anterior al instante. Vale la pena tener ese SQL escrito y a mano
  *antes* de aplicar:

  ```sql
  CREATE POLICY "mvp_open_access" ON public.<tabla>
    FOR ALL TO public USING (true) WITH CHECK (true);
  ```

  Es volver a abrir la brecha, pero es preferible a dejar la app caída mientras
  se depura.

---

## 8. Orden respecto al resto

Esto va **antes** que el PR de departamentos/municipios
(`PLAN-migraciones-y-municipios.md`). Dos razones: la brecha está viva, y ese
PR crea una tabla nueva (`departamentos`) que tendría que nacer con la policy
correcta — mejor definir el criterio acá primero y que la tabla nueva lo siga,
en vez de copiar `mvp_open_access` y tener que arreglarla después.
