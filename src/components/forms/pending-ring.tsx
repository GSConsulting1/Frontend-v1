// Anillo animado que recorre el borde de un botón mientras espera algo
// (guardar, exportar, importar...) — extraído de save-button.tsx cuando
// exportar-excel-button.tsx e importar-ordenes-form.tsx empezaron a
// necesitar el mismo loader (antes cada uno tenía su propio ícono
// `Loader2` reemplazando el contenido del botón). Es el único loader de
// botón del proyecto — ver structure.md, "componentes/forms/".
//
// El botón que lo usa necesita `className="relative isolate"` (así lo
// hace SaveButton) para que el anillo, que es absolute, se posicione
// respecto al botón y no a un ancestro más lejano.
export function PendingRing() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -inset-px overflow-hidden rounded-[inherit]"
      style={{
        padding: 1,
        WebkitMask:
          "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        maskComposite: "exclude",
      }}
    >
      <span
        className="absolute inset-[-60%] animate-spin"
        style={{
          animationDuration: "1.1s",
          background:
            "conic-gradient(from 0deg, transparent 0deg, var(--primary) 55deg, transparent 130deg)",
        }}
      />
    </span>
  );
}
