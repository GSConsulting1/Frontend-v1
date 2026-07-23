// Celda de edición inline para OrdenesTable — genérica para que agregar un
// campo editable nuevo a futuro sea sumar una entrada, no escribir un
// control nuevo. Reusa los mismos <Input>/<Select> que ya usa OrdenCampos
// para el formulario completo, solo que compactos para caber en una fila.
//
// "text"/"number": click para editar (la celda se ve como texto plano
// hasta que se hace click, evita que la tabla se vea llena de inputs).
// "select": el <Select> queda siempre visible — como control ya se lee
// como "clickeable" (tiene su propio chevron), no hace falta el paso extra
// de revelarlo primero.

"use client";

import { useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { MutacionResult } from "@/app/ordenes/actions";

type SelectOption = { id: string; label: string };

type EditableCellProps =
  | {
      type: "text";
      value: string | null;
      placeholder?: string;
      onSave: (value: string | null) => Promise<MutacionResult>;
      onError: (message: string) => void;
    }
  | {
      type: "number";
      value: number | null;
      placeholder?: string;
      onSave: (value: number | null) => Promise<MutacionResult>;
      onError: (message: string) => void;
    }
  | {
      type: "select";
      value: string | null;
      options: SelectOption[];
      renderValue: (value: string | null) => ReactNode;
      onSave: (value: string | null) => Promise<MutacionResult>;
      onError: (message: string) => void;
    };

export function EditableCell(props: EditableCellProps) {
  const [saving, setSaving] = useState(false);

  if (props.type === "select") {
    const { value, options, renderValue, onSave, onError } = props;
    return (
      <Select
        value={value}
        onValueChange={async (v: string | null) => {
          if (v === value) return;
          setSaving(true);
          const result = await onSave(v);
          setSaving(false);
          if (!result.ok) onError(result.error);
        }}
        items={options.map((o) => ({ label: o.label, value: o.id }))}
      >
        <SelectTrigger
          size="sm"
          disabled={saving}
          className="h-7 w-fit border-transparent bg-transparent px-1.5 hover:border-input"
        >
          <SelectValue>{renderValue(value)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return <ClickToEditCell {...props} saving={saving} setSaving={setSaving} />;
}

function ClickToEditCell({
  type,
  value,
  placeholder,
  onSave,
  onError,
  saving,
  setSaving,
}: (
  | Extract<EditableCellProps, { type: "text" }>
  | Extract<EditableCellProps, { type: "number" }>
) & {
  saving: boolean;
  setSaving: (v: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const cancelledRef = useRef(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value == null ? "" : String(value));
          setEditing(true);
        }}
        className="min-h-8 w-full rounded px-1.5 py-1 text-left hover:bg-muted/50"
      >
        {value ?? "—"}
      </button>
    );
  }

  async function commit() {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    const raw = draft.trim();

    if (type === "number") {
      const parsed = raw === "" ? null : Number(raw);
      if (parsed !== null && Number.isNaN(parsed)) {
        onError("Debe ser un número válido.");
        setEditing(false);
        return;
      }
      setEditing(false);
      if (parsed === value) return;
      setSaving(true);
      const result = await onSave(parsed);
      setSaving(false);
      if (!result.ok) onError(result.error);
      return;
    }

    const parsed = raw === "" ? null : raw;
    setEditing(false);
    if (parsed === value) return;
    setSaving(true);
    const result = await onSave(parsed);
    setSaving(false);
    if (!result.ok) onError(result.error);
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        autoFocus
        type={type}
        step={type === "number" ? "1" : undefined}
        min={type === "number" ? "0" : undefined}
        placeholder={placeholder}
        disabled={saving}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            cancelledRef.current = true;
            setEditing(false);
          }
        }}
        className={cn("h-7 px-2 py-0.5 text-sm")}
      />
      {saving && (
        <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
