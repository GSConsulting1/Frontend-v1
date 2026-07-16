// Aviso informativo sobre los campos de OrdenCampos: qué es obligatorio y
// qué formato espera cada uno. Se muestra en OrdenForm, único consumidor
// de OrdenCampos (ver structure.md).

import { Info } from "lucide-react";

export function OrdenCamposInfo() {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground">
      <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <p className="font-medium">Antes de llenar los campos</p>
        <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
          <li>
            <span className="text-foreground">Cliente</span> y{" "}
            <span className="text-foreground">Servicio</span> son obligatorios; el resto es
            opcional.
          </li>
          <li>
            <span className="text-foreground">Link del archivo de la orden</span>: pega la URL
            completa del documento (Google Drive, SharePoint, etc.), incluyendo{" "}
            <code className="rounded bg-background px-1">https://</code>.
          </li>
          <li>
            <span className="text-foreground">Horas cargadas</span> y{" "}
            <span className="text-foreground">Tarifa / valor transporte</span> solo aceptan
            números.
          </li>
        </ul>
      </div>
    </div>
  );
}
