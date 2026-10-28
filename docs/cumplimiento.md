# Matriz de cumplimiento normativo (Colombia)

> **Aviso.** Esta matriz es un insumo técnico preparado por el equipo de desarrollo para orientar la revisión jurídica. **No es concepto legal ni garantiza el cumplimiento.** Las normas se citan de forma general y pueden haber sido modificadas o reglamentadas después; cada fila debe validarla un abogado con experiencia en turismo, protección de datos, consumo y tributación antes del lanzamiento. Los textos legales del sitio son **borradores** (versión `0.1-borrador`).

Estados: **Soporte técnico** (la plataforma ya tiene la funcionalidad que la obligación necesita), **Parcial**, **Pendiente** (no implementado) y **Fuera del software** (depende de un trámite o decisión del negocio).

## Turismo

| Obligación | Norma de referencia | Estado | Qué hace la plataforma / qué falta |
|---|---|---|---|
| Los prestadores de servicios turísticos deben estar inscritos en el Registro Nacional de Turismo (RNT) y tenerlo vigente | Ley 300 de 1996 (arts. 61 y 62, modificados), Ley 1558 de 2012, Ley 2068 de 2020 y Decreto 1074 de 2015 | Soporte técnico | El proveedor registra su número de RNT y sube el certificado; SUPPORT lo verifica y **sin RNT verificado no se puede publicar** (prueba E2E). Falta: verificación contra el RUES/RNT oficial y alerta de vencimiento de la renovación anual |
| Inscripción de la propia plataforma en el RNT | Ley 2068 de 2020 (amplía obligaciones a plataformas electrónicas o digitales de servicios turísticos) | Fuera del software | Validar con asesoría si TravelCol debe inscribirse y en qué categoría |
| Contribución parafiscal para la promoción del turismo (FONTUR) | Ley 1101 de 2006, modificada por Ley 2068 de 2020 | Pendiente | Los reportes CSV dan la base, pero el cálculo y la declaración no están modelados |
| Prevención de la explotación sexual comercial de niñas, niños y adolescentes (ESCNNA) | Ley 679 de 2001 y Ley 1336 de 2009 | Parcial | Aviso en el pie de página con la Línea 141 del ICBF. Falta: código de conducta firmado por los proveedores dentro de los términos para proveedores y capacitación |
| Información veraz y precio total al turista | Ley 300 de 1996 y Ley 1480 de 2011 | Parcial | Precio total en COP calculado en el servidor y mostrado antes de pagar, con política de cancelación. Falta: discriminar impuestos cuando apliquen |

## Protección de datos personales

| Obligación | Norma de referencia | Estado | Qué hace la plataforma / qué falta |
|---|---|---|---|
| Autorización previa, expresa e informada | Ley 1581 de 2012, Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) | Soporte técnico | El registro exige aceptar la política de tratamiento; se guarda el consentimiento con la versión del documento, la fecha y la IP en hash |
| Política de tratamiento de datos publicada | Ley 1581 de 2012 y Decreto 1074 de 2015 | Parcial | Página `/legal/privacidad` versionada. El texto es un borrador y debe completarse (responsable, finalidades, canales) |
| Derechos de acceso, actualización, rectificación y supresión (habeas data) | Ley 1581 de 2012, art. 8 | Soporte técnico | Perfil editable, exportación de datos en JSON y solicitud de supresión que llega a administración. Los plazos legales de respuesta deben quedar en el procedimiento interno |
| Registro Nacional de Bases de Datos (RNBD) ante la SIC | Decreto 1074 de 2015 y reglamentación de la SIC | Fuera del software | Obligatorio según el tipo y los activos de la empresa; validar y registrar las bases (usuarios, proveedores, PQR) |
| Seguridad de la información | Ley 1581 de 2012, art. 17 | Parcial | Ver [seguridad.md](seguridad.md). Falta revisión externa |
| Datos de terceros en documentos del proveedor (RUT, cédula) | Ley 1581 de 2012 | Soporte técnico | Documentos privados, visibles solo para su dueño y administración |

## Consumidor y comercio electrónico

| Obligación | Norma de referencia | Estado | Qué hace la plataforma / qué falta |
|---|---|---|---|
| Información mínima en comercio electrónico (identidad del vendedor, precio, condiciones) | Ley 1480 de 2011, art. 50 | Parcial | El detalle muestra el operador, precio, duración, punto de encuentro y política. Falta: datos legales de TravelCol (razón social, NIT, domicilio) en el pie y los términos |
| Derecho de retracto en ventas a distancia | Ley 1480 de 2011, art. 47 | Pendiente de validación | La norma tiene excepciones para servicios con fecha o cuya ejecución ya inició. **La aplicación al turismo debe definirla la asesoría jurídica**; hoy rigen las políticas de cancelación FLEXIBLE, MODERADA y ESTRICTA |
| Reversión del pago | Ley 1480 de 2011, art. 51 y Decreto 587 de 2016 (compilado en el Decreto 1074 de 2015) | Parcial | Administración registra los reembolsos manualmente en el libro contable (no hay un flujo específico de contracargos). Falta un procedimiento para recibir solicitudes de reversión dentro del plazo legal |
| Atención de peticiones, quejas y reclamos | Ley 1480 de 2011 | Soporte técnico | Formulario PQR con radicado y gestión en administración |
| Mensajes de datos y firma de aceptación | Ley 527 de 1999 | Soporte técnico | Aceptaciones con marca de tiempo y versión del documento |
| Horarios y canales de contacto comercial | Ley 2300 de 2023 | Fuera del software | Aplica a campañas de mercadeo; hoy la plataforma solo envía correos transaccionales |

## Tributario y financiero

| Obligación | Norma de referencia | Estado | Qué hace la plataforma / qué falta |
|---|---|---|---|
| Facturación electrónica de la comisión de TravelCol | Estatuto Tributario, art. 616-1, y resolución vigente de la DIAN | Pendiente | Integrar un proveedor tecnológico autorizado por la DIAN. El libro contable ya identifica cada comisión |
| Facturación del servicio al turista por el proveedor | Estatuto Tributario y normas de la DIAN | Fuera del software | Define el modelo de mandato o intermediación con asesoría contable |
| IVA, retenciones y gravamen sobre la comisión y los pagos | Estatuto Tributario | Pendiente | No modelados. Afectan el neto del proveedor y el precio mostrado |
| Costos de la pasarela | Contrato con Wompi | Pendiente | La comisión de Wompi no se descuenta en el libro; debe decidirse quién la asume |

## Accesibilidad

| Obligación | Norma de referencia | Estado | Qué hace la plataforma / qué falta |
|---|---|---|---|
| Acceso de personas con discapacidad a la información | Ley 1618 de 2013 y NTC 5854 (referencia WCAG) | Parcial | HTML semántico, paleta elegida para contraste AA en textos principales (sin auditoría formal), foco visible, etiquetas en formularios y movimiento reducido. Falta auditoría con lector de pantalla |

## Fuentes oficiales

- Ministerio de Comercio, Industria y Turismo: <https://www.mincit.gov.co>
- Registro Nacional de Turismo (Confecámaras/RUES): <https://rnt.confecamaras.co>
- Superintendencia de Industria y Comercio (datos personales, RNBD y consumidor): <https://www.sic.gov.co>
- DIAN, facturación electrónica: <https://www.dian.gov.co>
- FONTUR: <https://fontur.com.co>
- Normativa compilada: Función Pública, gestor normativo <https://www.funcionpublica.gov.co/eva/gestornormativo> y Secretaría del Senado <http://www.secretariasenado.gov.co>
- ICBF, Línea 141: <https://www.icbf.gov.co>

## Siguiente paso

Entregar esta matriz, los borradores de `/legal/*` y el flujo de reserva a la asesoría jurídica, y convertir cada fila **Pendiente** o **Fuera del software** en una tarea con responsable antes del lanzamiento.
