import { apiGet } from '@/lib/api-server';
import { PanelTitle } from '@/components/panel/PanelShell';
import { ActionDialog } from '@/components/panel/ActionDialog';

export default async function ConfiguracionPage() {
  const s = await apiGet<{ commissionBps: number }>('/admin/settings');
  const pct = (s.commissionBps / 100).toLocaleString('es-CO', { maximumFractionDigits: 2 });
  return (
    <>
      <PanelTitle title="Configuración">Parámetros comerciales de la plataforma.</PanelTitle>
      <div className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-xs font-semibold text-pizarra uppercase">Comisión de la plataforma</p>
          <p className="text-4xl font-bold text-selva-900">{pct} %</p>
          <p className="mt-1 max-w-md text-sm text-pizarra">Se descuenta del valor de cada venta del proveedor. Cada reserva guarda la comisión vigente al momento de crearse; un cambio solo aplica a reservas nuevas.</p>
        </div>
        <ActionDialog
          label="Cambiar comisión"
          variant="primary"
          small={false}
          title="Cambiar comisión"
          description="Expresada en puntos básicos: 1200 = 12 %. Rango permitido: 0 a 5000 (50 %)."
          endpoint="/admin/settings/commission"
          method="PUT"
          fields={[{ name: 'commissionBps', label: 'Comisión (puntos básicos)', type: 'number', required: true, defaultValue: String(s.commissionBps) }, { name: 'reason', label: 'Motivo del cambio', type: 'textarea', required: true }]}
          submitLabel="Guardar"
        />
      </div>
    </>
  );
}
