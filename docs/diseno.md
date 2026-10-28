# Sistema de diseño

## Cómo se combinaron las referencias

Se entregaron dos referencias visuales. Ninguna se copió: se tomaron sus ideas y se adaptaron a una identidad propia para Colombia.

| Referencia | Qué se tomó | Cómo se adaptó |
|---|---|---|
| «Discover The World» (verde azulado y amarillo, papel rasgado) | Bloques de color intensos, bordes de papel rasgado entre secciones, contraste fuerte entre fondo oscuro y acento cálido | Verde **selva** andino como color principal y amarillo **sol** como acento. El borde rasgado es un SVG propio (`components/ui/TornEdge.tsx`) usado en el héroe, los encabezados de página y el pie |
| «triply» (tarjetas ovaladas, letra caligráfica, acentos naranja) | Categorías en tarjetas ovaladas, títulos con un acento manuscrito, botones redondeados y tarjetas limpias con sombra suave | Categorías con forma de píldora vertical en el inicio, acento caligráfico con **Caveat** sobre títulos en **Poppins**, naranja **tierra** para llamados secundarios |
| Identidad colombiana (propia) | — | Franja tricolor discreta (amarillo, azul y rojo) en el pie y en detalles; ilustraciones de Villeta: cascada, trapiche panelero, aves, finca y pueblo |

## Tokens

Definidos en `apps/web/src/app/globals.css` con `@theme` de Tailwind CSS 4.

| Token | Valor | Uso |
|---|---|---|
| `selva-950…50` | `#052b26` … `#eef7f4` | Fondos oscuros, botones primarios, texto de títulos |
| `sol-500/400/300/100` | `#f6b40e` … `#fff3cc` | Acento principal, botón «sol», foco visible |
| `tierra-600/500/100` | `#c95a22` … `#fbe6da` | Acento caligráfico (`eyebrow`), llamados secundarios |
| `crema`, `arena` | `#fbf7f0`, `#f3ebdd` | Fondo general y secciones alternas |
| `tinta`, `pizarra` | `#13211e`, `#52625e` | Texto principal y secundario |
| `bandera-azul`, `bandera-rojo` | `#1f4e9e`, `#c8102e` | Franja tricolor; el rojo también marca errores y acciones destructivas |

Tipografía: Poppins 400–700 para texto e interfaz, Caveat 700 solo para acentos cortos. Ambas se sirven desde el propio sitio (`@fontsource`), sin llamadas a Google Fonts, lo que permite una CSP `font-src 'self'`.

Utilidades: `btn-primary`, `btn-sol`, `btn-tierra`, `btn-ghost`, `btn-danger`, `card`, `input`, `label`, `field-error`, `eyebrow`, `container-tc`, `table-tc` y `tricolor`.

## Componentes base

| Componente | Archivo | Nota |
|---|---|---|
| Borde rasgado | `ui/TornEdge.tsx` | Decorativo (`aria-hidden`) |
| Encabezado de página | `ui/PageHeader.tsx` | Banda selva con borde rasgado |
| Insignia DEMO | `ui/DemoBadge.tsx` | Marca obligatoria en todo dato de demostración |
| Estado | `ui/StatusBadge.tsx` | Estados de reserva, pago y servicio con texto, no solo color |
| Vacío | `ui/EmptyState.tsx` | Siempre con una acción real o sin botón |
| Paneles | `panel/*` | Navegación lateral, tarjetas de indicadores, tablas, paginación y diálogos nativos `<dialog>` |

## Imágenes

No se usaron fotografías de terceros sin licencia ni imágenes que aparenten ser de proveedores reales. Las ilustraciones de `public/illustrations/*.svg` son originales y livianas ([ADR 0009](adr/0009-ilustraciones.md)). Las fotos de cada experiencia las sube su proveedor.

## Accesibilidad

- HTML semántico: un `h1` por página, `nav` con `aria-label`, `main` y enlace para saltar al contenido.
- Foco visible en amarillo sol con contorno de 3 px.
- Formularios con `label`, errores asociados con `aria-invalid` y `role="alert"`.
- El estado nunca se comunica solo con color.
- `prefers-reduced-motion` desactiva animaciones y desplazamiento suave.
- Diseño móvil primero; las pruebas E2E verifican que no haya desplazamiento horizontal a 412 px.

Pendiente: auditoría con lector de pantalla (NVDA/VoiceOver) y medición formal de contraste en todos los estados.

## Reglas de interfaz

- No hay botones decorativos: cada botón ejecuta una operación real de la API o navega a una página que existe.
- Las fechas y horas se muestran en `es-CO` y `America/Bogota`; el dinero en COP sin decimales.
- Los textos usan tú, frases cortas y verbos de acción.
