/**
 * Borde de papel rasgado (motivo visual de la referencia) como divisor entre secciones.
 * top: se ubica sobre la sección actual (color = sección actual). bottom: dentro de la sección,
 * pintado con el color de la sección siguiente.
 */
export function TornEdge({ position, color, className = '' }: { position: 'top' | 'bottom'; color: string; className?: string }) {
  const d =
    'M0,22 L18,14 L34,20 L52,8 L70,17 L88,10 L108,19 L126,6 L146,16 L164,9 L184,18 L204,7 L222,15 L242,11 L262,20 L280,8 L300,16 L320,10 L340,19 L360,7 L380,15 L400,12 L420,20 L440,9 L460,17 L480,6 L500,15 L520,10 L540,19 L560,8 L580,16 L600,12 L620,20 L640,9 L660,17 L680,7 L700,15 L720,11 L740,19 L760,8 L780,16 L800,12 L800,30 L0,30 Z';
  return (
    <svg
      aria-hidden
      viewBox="0 0 800 30"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-x-0 h-5 w-full sm:h-7 ${position === 'top' ? '-top-4 sm:-top-6' : '-bottom-px'} ${className}`}
    >
      <path d={d} fill={color} />
    </svg>
  );
}
