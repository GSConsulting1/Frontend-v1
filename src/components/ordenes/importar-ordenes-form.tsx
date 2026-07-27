// Wizard de importación de órdenes desde Excel (/ordenes/importar). No es
// un formulario de una orden (no usa react-hook-form/ordenServicioSchema
// como resolver) — es un flujo de 3 pasos con estado local propio:
// subir (elegir Cliente + archivo) -> revisar (previsualización fila por
// fila, sin tocar Supabase) -> resultado (tras crear las filas válidas).
//
// Las dos Server Actions que consume viven en app/ordenes/actions.ts junto
// con el resto de mutaciones de la entidad (previsualizarImportacionOrdenes,
// importarOrdenesDesdeExcel) — ver el comentario de cabecera de ese
// archivo.

"use client";

import { useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileUp,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PendingRing } from "@/components/forms/pending-ring";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  previsualizarImportacionOrdenes,
  importarOrdenesDesdeExcel,
  type FilaPreviewImportacion,
} from "@/app/ordenes/actions";

type SelectOption = { id: number; label: string };

type Paso = "subir" | "revisar" | "resultado";

type ResultadoImport = {
  creadas: number;
  fallidas: { fila: number; error: string }[];
};

// Mismos valores que se muestran al usuario en el pie de la zona de carga —
// si cambian, hay que subir también experimental.serverActions.bodySizeLimit
// en next.config.ts (el límite de Next.js para el body de un Server Action
// es 1MB por defecto, muy por debajo de esto).
const TAMANO_MAXIMO_MB = 25;
const TAMANO_MAXIMO_BYTES = TAMANO_MAXIMO_MB * 1024 * 1024;
const EXTENSIONES_ACEPTADAS = [".xlsx", ".xls"];

function validarArchivo(archivo: File): string | null {
  const nombre = archivo.name.toLowerCase();
  if (!EXTENSIONES_ACEPTADAS.some((ext) => nombre.endsWith(ext))) {
    return "Solo se aceptan archivos .xls o .xlsx.";
  }
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return `El archivo supera el tamaño máximo de ${TAMANO_MAXIMO_MB}MB.`;
  }
  return null;
}

function formatearTamano(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type ImportarOrdenesFormProps = {
  clientes: SelectOption[];
  clienteIdPredeterminado: number;
};

export function ImportarOrdenesForm({
  clientes,
  clienteIdPredeterminado,
}: ImportarOrdenesFormProps) {
  const [paso, setPaso] = useState<Paso>("subir");
  const [clienteId, setClienteId] = useState<number | undefined>(
    clienteIdPredeterminado,
  );
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filas, setFilas] = useState<FilaPreviewImportacion[]>([]);
  const [resultado, setResultado] = useState<ResultadoImport | null>(null);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  const filasValidas = filas.filter((f) => f.valida);

  function seleccionarArchivo(candidato: File | null) {
    if (!candidato) return;
    const mensaje = validarArchivo(candidato);
    if (mensaje) {
      setArchivo(null);
      setErrorArchivo(mensaje);
      return;
    }
    setErrorArchivo(null);
    setArchivo(candidato);
  }

  function quitarArchivo() {
    setArchivo(null);
    setErrorArchivo(null);
    if (inputArchivoRef.current) inputArchivoRef.current.value = "";
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastrando(false);
    seleccionarArchivo(e.dataTransfer.files?.[0] ?? null);
  }

  async function handlePrevisualizar() {
    if (!archivo || !clienteId) return;
    setCargando(true);
    setError(null);
    const formData = new FormData();
    formData.set("archivo", archivo);
    formData.set("clienteId", String(clienteId));
    const respuesta = await previsualizarImportacionOrdenes(formData);
    setCargando(false);
    if ("error" in respuesta) {
      setError(respuesta.error);
      return;
    }
    setFilas(respuesta.filas);
    setPaso("revisar");
  }

  async function handleImportar() {
    setCargando(true);
    setError(null);
    const respuesta = await importarOrdenesDesdeExcel(
      filasValidas.map((f) => ({ fila: f.fila, valores: f.valores })),
    );
    setCargando(false);
    setResultado(respuesta);
    setPaso("resultado");
  }

  function reiniciar() {
    setPaso("subir");
    quitarArchivo();
    setFilas([]);
    setResultado(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar órdenes desde Excel"
        backHref="/ordenes"
        backLabel="Volver al listado"
      />

      {error && (
        <p className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {paso === "subir" && (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <div className="space-y-1.5">
            <Label htmlFor="cliente-import">Cliente</Label>
            <Select
              value={clienteId != null ? String(clienteId) : null}
              onValueChange={(v: string | null) =>
                setClienteId(v ? Number(v) : undefined)
              }
              items={clientes.map((c) => ({
                label: c.label,
                value: String(c.id),
              }))}
            >
              <SelectTrigger id="cliente-import" className="w-full">
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Se aplica a todas las órdenes que salgan de este archivo — el
              Excel no trae el Cliente, solo la empresa afiliada.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="archivo-import">Archivo Excel</Label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={handleDrop}
              className={cn(
                "flex flex-col items-center gap-3 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
                arrastrando
                  ? "border-primary bg-primary/5"
                  : "border-border",
              )}
            >
              {archivo ? (
                <>
                  <FileSpreadsheet
                    className="size-8 text-primary"
                    aria-hidden
                  />
                  <div className="text-sm">
                    <p className="font-medium">{archivo.name}</p>
                    <p className="text-muted-foreground">
                      {formatearTamano(archivo.size)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={quitarArchivo}
                  >
                    <X className="size-4" />
                    Quitar archivo
                  </Button>
                </>
              ) : (
                <>
                  <FileUp
                    className="size-8 text-muted-foreground"
                    aria-hidden
                  />
                  <p className="text-sm text-muted-foreground">
                    Arrastra y suelta el archivo acá o{" "}
                    <button
                      type="button"
                      className="font-medium text-primary underline underline-offset-2"
                      onClick={() => inputArchivoRef.current?.click()}
                    >
                      elige un archivo
                    </button>
                  </p>
                </>
              )}
              <input
                ref={inputArchivoRef}
                id="archivo-import"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) =>
                  seleccionarArchivo(e.target.files?.[0] ?? null)
                }
              />
            </div>
            {errorArchivo && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertTriangle className="size-4 shrink-0" aria-hidden />
                {errorArchivo}
              </p>
            )}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Formatos soportados: XLS, XLSX</span>
              <span>Tamaño máximo: {TAMANO_MAXIMO_MB}MB</span>
            </div>
          </div>

          <Button
            disabled={!archivo || !clienteId || cargando}
            onClick={handlePrevisualizar}
            className="relative isolate"
          >
            {cargando && <PendingRing />}
            Previsualizar
          </Button>
        </div>
      )}

      {paso === "revisar" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {filasValidas.length} de {filas.length} filas listas para crear.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fila</TableHead>
                  <TableHead>Nombre del servicio</TableHead>
                  <TableHead>Nit / Razón social</TableHead>
                  <TableHead>Cronograma</TableHead>
                  <TableHead>Tipo servicio</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f) => (
                  <TableRow key={f.fila}>
                    <TableCell>{f.fila}</TableCell>
                    <TableCell>{f.valores.nombre_servicio}</TableCell>
                    <TableCell>
                      {f.valores.nit_empresa_usuaria ?? "—"}
                      {" — "}
                      {f.valores.nombre_empresa_usuaria ?? "—"}
                    </TableCell>
                    <TableCell>{f.valores.cronograma ?? "—"}</TableCell>
                    <TableCell>{f.valores.tipo_servicio ?? "—"}</TableCell>
                    <TableCell>
                      {f.valida ? (
                        <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
                          <CheckCircle2 className="size-4" aria-hidden />
                          Lista
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-sm text-destructive"
                          title={f.errores.join(" · ")}
                        >
                          <AlertTriangle className="size-4" aria-hidden />
                          {f.errores[0]}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reiniciar} disabled={cargando}>
              Volver a subir
            </Button>
            <Button
              disabled={filasValidas.length === 0 || cargando}
              onClick={handleImportar}
              className="relative isolate"
            >
              {cargando && <PendingRing />}
              Importar {filasValidas.length} órdenes
            </Button>
          </div>
        </div>
      )}

      {paso === "resultado" && resultado && (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <p className="text-sm">
            Se crearon <strong>{resultado.creadas}</strong> órdenes.
          </p>
          {resultado.fallidas.length > 0 && (
            <div className="space-y-1 text-sm text-destructive">
              <p>{resultado.fallidas.length} filas no se pudieron crear:</p>
              <ul className="list-disc pl-5">
                {resultado.fallidas.map((f) => (
                  <li key={f.fila}>
                    Fila {f.fila}: {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={reiniciar}>
              Importar otro archivo
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/ordenes">Ver listado</Link>}
            />
          </div>
        </div>
      )}
    </div>
  );
}
