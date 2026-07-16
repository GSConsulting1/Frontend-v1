// Checkbox con label inline, sin conocer ninguna entidad — mismo criterio de
// reuso que form-field.tsx. Ver structure.md.

import type { InputHTMLAttributes } from "react";

export function Checkbox({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="size-4 rounded border-input accent-foreground"
        {...props}
      />
      {label}
    </label>
  );
}
