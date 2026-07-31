// Filtro de búsqueda del listado de órdenes (ver app/ordenes/page.tsx). Los
// valores viajan por la URL (searchParams) para que el Server Component siga
// siendo el único que hace fetch — este componente solo lee/escribe la
// query string, nunca llama a getOrdenes directamente.
//
// Cliente/Tipo de servicio/Estado son multiselect (Select con `multiple`):
// cada uno viaja en la URL como un solo param con los valores separados por
// coma (ej. "estado=Facturada,Cancelada") — ver app/ordenes/page.tsx, que
// hace el split antes de pasarlo a getOrdenes. Número de OS y Secuencia
// siguen siendo texto libre (búsqueda por substring), no aplica multiselect.
//
// El formulario arranca colapsado (un botón "Filtros" con el conteo de
// filtros activos); al expandirlo se ve el mismo grid de siempre. Los
// filtros ya aplicados se ven como chips aunque el formulario esté
// colapsado, y cada chip se puede quitar por separado sin abrir el
// formulario. Los chips tienen ancho fijo (truncan con "…" + title) porque
// un filtro multiselect con varios valores puede volverse muy largo.
//
// El draft del form (FiltrosCampos) vive en un componente aparte montado
// con key={searchParams.toString()}: así, cuando la URL cambia por fuera del
// form (quitar un chip, "Limpiar filtros", back/forward), React lo remonta y
// el draft nace ya sincronizado con la URL nueva — sin useEffect + setState.

"use client";

import { useState, type FormEvent } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ESTADOS_ORDEN,
  RESPONSABLES_OS,
  TIPO_SERVICIO_OPCIONES,
} from "@/lib/validations/orden.schema";

type ClienteOption = { id: number; nombre_cliente: string };

type OrdenesFiltrosProps = {
  clientes: ClienteOption[];
};

type FiltrosValues = {
  clienteIds: string[];
  numeroOs: string;
  nombreEmpresa: string;
  asesorGestionRiesgos: string;
  tiposServicio: string[];
  estados: string[];
  responsablesOs: string[];
  secuencia: string;
};

function parseLista(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

function resumenSeleccion(
  seleccionados: string[],
  etiquetas: Map<string, string>,
) {
  if (seleccionados.length === 0) return "Todos";
  if (seleccionados.length === 1) {
    return etiquetas.get(seleccionados[0]) ?? seleccionados[0];
  }
  return `${seleccionados.length} seleccionados`;
}

export function OrdenesFiltros({ clientes }: OrdenesFiltrosProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const clienteLabelPorId = new Map(
    clientes.map((c) => [String(c.id), c.nombre_cliente]),
  );

  const initial: FiltrosValues = {
    clienteIds: parseLista(searchParams.get("clienteId")),
    numeroOs: searchParams.get("numeroOs") ?? "",
    nombreEmpresa: searchParams.get("nombreEmpresa") ?? "",
    asesorGestionRiesgos: searchParams.get("asesorGestionRiesgos") ?? "",
    tiposServicio: parseLista(searchParams.get("tipoServicio")),
    estados: parseLista(searchParams.get("estado")),
    responsablesOs: parseLista(searchParams.get("responsableOs")),
    secuencia: searchParams.get("secuencia") ?? "",
  };

  const filtrosActivos = [
    {
      key: "clienteId",
      label: "Cliente",
      texto: initial.clienteIds
        .map((id) => clienteLabelPorId.get(id) ?? id)
        .join(", "),
    },
    {
      key: "tipoServicio",
      label: "Tipo servicio",
      texto: initial.tiposServicio.join(", "),
    },
    { key: "estado", label: "Estado", texto: initial.estados.join(", ") },
    {
      key: "responsableOs",
      label: "Responsable SEC",
      texto: initial.responsablesOs.join(", "),
    },
    { key: "numeroOs", label: "Número de OS", texto: initial.numeroOs },
    {
      key: "nombreEmpresa",
      label: "Empresa usuaria",
      texto: initial.nombreEmpresa,
    },
    {
      key: "asesorGestionRiesgos",
      label: "Asesor gestión riesgos",
      texto: initial.asesorGestionRiesgos,
    },
    { key: "secuencia", label: "Secuencia", texto: initial.secuencia },
  ].filter((f) => f.texto.length > 0);

  function aplicarFiltros(values: FiltrosValues) {
    const params = new URLSearchParams();
    if (values.clienteIds.length)
      params.set("clienteId", values.clienteIds.join(","));
    if (values.numeroOs.trim()) params.set("numeroOs", values.numeroOs.trim());
    if (values.nombreEmpresa.trim())
      params.set("nombreEmpresa", values.nombreEmpresa.trim());
    if (values.asesorGestionRiesgos.trim())
      params.set("asesorGestionRiesgos", values.asesorGestionRiesgos.trim());
    if (values.tiposServicio.length)
      params.set("tipoServicio", values.tiposServicio.join(","));
    if (values.estados.length) params.set("estado", values.estados.join(","));
    if (values.responsablesOs.length)
      params.set("responsableOs", values.responsablesOs.join(","));
    if (values.secuencia.trim())
      params.set("secuencia", values.secuencia.trim());

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function limpiarFiltros() {
    router.push(pathname);
  }

  function quitarFiltro(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
        >
          <SlidersHorizontal className="size-4" />
          Filtros
          {filtrosActivos.length > 0 && (
            <Badge variant="secondary" className="rounded-full px-1.5">
              {filtrosActivos.length}
            </Badge>
          )}
          {open ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </Button>

        {filtrosActivos.map((f) => (
          <Badge
            key={f.key}
            variant="secondary"
            className="max-w-40 gap-1 pr-1"
          >
            <span
              className="min-w-0 flex-1 truncate"
              title={`${f.label}: ${f.texto}`}
            >
              {f.label}: {f.texto}
            </span>
            <button
              type="button"
              onClick={() => quitarFiltro(f.key)}
              aria-label={`Quitar filtro ${f.label}`}
              className="shrink-0 rounded-full p-0.5 hover:bg-foreground/10"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>

      {open && (
        <FiltrosCampos
          key={searchParams.toString()}
          clientes={clientes}
          initial={initial}
          onAplicar={aplicarFiltros}
          onLimpiar={limpiarFiltros}
        />
      )}
    </div>
  );
}

function FiltrosCampos({
  clientes,
  initial,
  onAplicar,
  onLimpiar,
}: {
  clientes: ClienteOption[];
  initial: FiltrosValues;
  onAplicar: (values: FiltrosValues) => void;
  onLimpiar: () => void;
}) {
  const [clienteIds, setClienteIds] = useState(initial.clienteIds);
  const [numeroOs, setNumeroOs] = useState(initial.numeroOs);
  const [nombreEmpresa, setNombreEmpresa] = useState(initial.nombreEmpresa);
  const [asesorGestionRiesgos, setAsesorGestionRiesgos] = useState(
    initial.asesorGestionRiesgos,
  );
  const [tiposServicio, setTiposServicio] = useState(initial.tiposServicio);
  const [estados, setEstados] = useState(initial.estados);
  const [responsablesOs, setResponsablesOs] = useState(
    initial.responsablesOs,
  );
  const [secuencia, setSecuencia] = useState(initial.secuencia);

  const clienteLabelPorId = new Map(
    clientes.map((c) => [String(c.id), c.nombre_cliente]),
  );
  const tipoServicioLabels = new Map(TIPO_SERVICIO_OPCIONES.map((t) => [t, t]));
  const estadoLabels = new Map(ESTADOS_ORDEN.map((e) => [e, e]));
  const responsableOsLabels = new Map(RESPONSABLES_OS.map((r) => [r, r]));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onAplicar({
      clienteIds,
      numeroOs,
      nombreEmpresa,
      asesorGestionRiesgos,
      tiposServicio,
      estados,
      responsablesOs,
      secuencia,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    >
      <FormField label="Cliente" htmlFor="filtro-cliente">
        <Select
          multiple
          value={clienteIds}
          onValueChange={(v: string[]) => setClienteIds(v)}
          items={clientes.map((c) => ({
            label: c.nombre_cliente,
            value: String(c.id),
          }))}
        >
          <SelectTrigger id="filtro-cliente" className="w-full">
            <SelectValue>
              {(value: string[]) => resumenSeleccion(value, clienteLabelPorId)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {clientes.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.nombre_cliente}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Número de OS" htmlFor="filtro-numero-os">
        <Input
          id="filtro-numero-os"
          value={numeroOs}
          onChange={(e) => setNumeroOs(e.target.value)}
          placeholder="Buscar por número de OS"
        />
      </FormField>

      <FormField label="Empresa usuaria" htmlFor="filtro-nombre-empresa">
        <Input
          id="filtro-nombre-empresa"
          value={nombreEmpresa}
          onChange={(e) => setNombreEmpresa(e.target.value)}
          placeholder="Buscar por nombre de la empresa"
        />
      </FormField>

      <FormField
        label="Asesor gestión riesgos"
        htmlFor="filtro-asesor-gestion-riesgos"
      >
        <Input
          id="filtro-asesor-gestion-riesgos"
          value={asesorGestionRiesgos}
          onChange={(e) => setAsesorGestionRiesgos(e.target.value)}
          placeholder="Buscar por asesor"
        />
      </FormField>

      <FormField label="Tipo de servicio" htmlFor="filtro-tipo-servicio">
        <Select
          multiple
          value={tiposServicio}
          onValueChange={(v: string[]) => setTiposServicio(v)}
          items={TIPO_SERVICIO_OPCIONES.map((t) => ({ label: t, value: t }))}
        >
          <SelectTrigger id="filtro-tipo-servicio" className="w-full">
            <SelectValue>
              {(value: string[]) => resumenSeleccion(value, tipoServicioLabels)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TIPO_SERVICIO_OPCIONES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Estado" htmlFor="filtro-estado">
        <Select
          multiple
          value={estados}
          onValueChange={(v: string[]) => setEstados(v)}
          items={ESTADOS_ORDEN.map((e) => ({ label: e, value: e }))}
        >
          <SelectTrigger id="filtro-estado" className="w-full">
            <SelectValue>
              {(value: string[]) => resumenSeleccion(value, estadoLabels)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ESTADOS_ORDEN.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Responsable SEC" htmlFor="filtro-responsable-os">
        <Select
          multiple
          value={responsablesOs}
          onValueChange={(v: string[]) => setResponsablesOs(v)}
          items={RESPONSABLES_OS.map((r) => ({ label: r, value: r }))}
        >
          <SelectTrigger id="filtro-responsable-os" className="w-full">
            <SelectValue>
              {(value: string[]) =>
                resumenSeleccion(value, responsableOsLabels)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {RESPONSABLES_OS.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Secuencia" htmlFor="filtro-secuencia">
        <Input
          id="filtro-secuencia"
          value={secuencia}
          onChange={(e) => setSecuencia(e.target.value)}
          placeholder="Ej. 1/2"
        />
      </FormField>

      <div className="col-span-full flex items-end gap-2">
        <Button type="submit" size="sm">
          <Search className="size-4" />
          Buscar
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onLimpiar}>
          <X className="size-4" />
          Limpiar filtros
        </Button>
      </div>
    </form>
  );
}
