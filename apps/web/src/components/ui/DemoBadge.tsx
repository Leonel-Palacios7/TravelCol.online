export function DemoBadge({ className = '' }: { className?: string }) {
  return (
    <span
      title="Contenido de demostración: no corresponde a un proveedor ni a un precio real"
      className={`inline-flex items-center rounded-full bg-bandera-azul px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white uppercase ${className}`}
    >
      Demo
    </span>
  );
}
