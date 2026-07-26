// Filtro de búsqueda del listado de órdenes (ver app/ordenes/page.tsx). Los
// valores viajan por la URL (searchParams) para que el Server Component siga
// siendo el único que hace fetch — este componente solo lee/escribe la
// query string, nunca llama a getOrdenes directamente.

"use client";

import { useState, type FormEvent } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ESTADOS_ORDEN,
  TIPO_SERVICIO_OPCIONES,
} from "@/lib/validations/orden.schema";

const TODOS = "__todos__";

type ClienteOption = { id: number; nombre_cliente: string };

type OrdenesFiltrosProps = {
  clientes: ClienteOption[];
};

export function OrdenesFiltros({ clientes }: OrdenesFiltrosProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [clienteId, setClienteId] = useState(
    searchParams.get("clienteId") ?? TODOS,
  );
  const [numeroOs, setNumeroOs] = useState(searchParams.get("numeroOs") ?? "");
  const [tipoServicio, setTipoServicio] = useState(
    searchParams.get("tipoServicio") ?? TODOS,
  );
  const [estado, setEstado] = useState(searchParams.get("estado") ?? TODOS);
  const [secuencia, setSecuencia] = useState(
    searchParams.get("secuencia") ?? "",
  );

  function aplicarFiltros(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (clienteId !== TODOS) params.set("clienteId", clienteId);
    if (numeroOs.trim()) params.set("numeroOs", numeroOs.trim());
    if (tipoServicio !== TODOS) params.set("tipoServicio", tipoServicio);
    if (estado !== TODOS) params.set("estado", estado);
    if (secuencia.trim()) params.set("secuencia", secuencia.trim());

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function limpiarFiltros() {
    setClienteId(TODOS);
    setNumeroOs("");
    setTipoServicio(TODOS);
    setEstado(TODOS);
    setSecuencia("");
    router.push(pathname);
  }

  return (
    <form
      onSubmit={aplicarFiltros}
      className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    >
      <FormField label="Cliente" htmlFor="filtro-cliente">
        <Select
          value={clienteId}
          onValueChange={(v: string | null) => setClienteId(v ?? TODOS)}
          items={[
            { label: "Todos", value: TODOS },
            ...clientes.map((c) => ({
              label: c.nombre_cliente,
              value: String(c.id),
            })),
          ]}
        >
          <SelectTrigger id="filtro-cliente" className="w-full">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos</SelectItem>
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

      <FormField label="Tipo de servicio" htmlFor="filtro-tipo-servicio">
        <Select
          value={tipoServicio}
          onValueChange={(v: string | null) => setTipoServicio(v ?? TODOS)}
          items={[
            { label: "Todos", value: TODOS },
            ...TIPO_SERVICIO_OPCIONES.map((t) => ({ label: t, value: t })),
          ]}
        >
          <SelectTrigger id="filtro-tipo-servicio" className="w-full">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos</SelectItem>
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
          value={estado}
          onValueChange={(v: string | null) => setEstado(v ?? TODOS)}
          items={[
            { label: "Todos", value: TODOS },
            ...ESTADOS_ORDEN.map((e) => ({ label: e, value: e })),
          ]}
        >
          <SelectTrigger id="filtro-estado" className="w-full">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos</SelectItem>
            {ESTADOS_ORDEN.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={limpiarFiltros}
        >
          <X className="size-4" />
          Limpiar filtros
        </Button>
      </div>
    </form>
  );
}
