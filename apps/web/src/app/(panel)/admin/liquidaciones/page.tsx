import { apiGet } from '@/lib/api-server';
import { formatCOP, formatDate } from '@/lib/format';
import { PanelTitle, Section, TableCard } from '@/components/panel/PanelShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ActionDialog } from '@/components/panel/ActionDialog';

interface Balance { providerId: string; businessName: string; unsettledCop: number; settleableCop: number; pendingServiceCop: number }
interface Settlement {
  id: string; periodEnd: string; grossCop: number; commissionCop: number; refundsCop: number; netCop: number; status: string;
  payoutReference: string | null; paidAt: string | null; createdAt: string; provider: { businessName: string }; _count: { entries: number };
}

export default async function LiquidacionesPage() {
  const [balances, settlements] = await Promise.all([apiGet<Balance[]>('/admin/settlements/balances'), apiGet<Settlement[]>('/admin/settlements')]);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  return (
    <>
      <PanelTitle title="Liquidaciones a proveedores">
        Una liquidación agrupa los movimientos de servicios ya prestados hasta la fecha de corte. El pago se hace fuera de la plataforma y se registra con su referencia.
      </PanelTitle>
      <Section title="Saldos por liquidar">
        <TableCard>
          <thead><tr><th>Proveedor</th><th className="text-right">Liquidable hoy</th><th className="text-right">Servicios por prestar</th><th className="text-right">Acción</th></tr></thead>
          <tbody>
            {balances.map((b) => (
              <tr key={b.providerId}>
                <td>{b.businessName}</td>
                <td className={`text-right font-mono ${b.settleableCop < 0 ? 'text-bandera-rojo' : ''}`}>{formatCOP(b.settleableCop)}</td>
                <td className="text-right font-mono text-pizarra">{formatCOP(b.pendingServiceCop)}</td>
                <td className="text-right">
                  {b.settleableCop > 0 ? (
                    <ActionDialog label="Generar liquidación" variant="primary" title={`Liquidar a ${b.businessName}`} description="Incluye los movimientos sin liquidar hasta la fecha de corte (hora de Colombia)." endpoint="/admin/settlements" fixed={{ providerId: b.providerId }} fields={[{ name: 'periodEnd', label: 'Fecha de corte', type: 'date', required: true, defaultValue: today }]} submitLabel="Generar" />
                  ) : (
                    <span className="text-xs text-pizarra">Se liquida después de prestado el servicio</span>
                  )}
                </td>
              </tr>
            ))}
            {!balances.length && <tr><td colSpan={4} className="text-pizarra">No hay saldos pendientes.</td></tr>}
          </tbody>
        </TableCard>
      </Section>
      <Section title="Historial">
        <TableCard>
          <thead><tr><th>Proveedor</th><th>Corte</th><th>Ventas</th><th>Comisión</th><th>Reembolsos</th><th>Neto</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {settlements.map((s) => (
              <tr key={s.id}>
                <td>{s.provider.businessName}<span className="block text-xs text-pizarra">{s._count.entries} movimientos</span></td>
                <td>{formatDate(s.periodEnd)}</td>
                <td>{formatCOP(s.grossCop)}</td><td>{formatCOP(s.commissionCop)}</td><td>{formatCOP(s.refundsCop)}</td>
                <td className="font-semibold">{formatCOP(s.netCop)}</td>
                <td><StatusBadge status={s.status} />{s.payoutReference && <span className="block font-mono text-xs">{s.payoutReference}</span>}</td>
                <td className="text-right">
                  {s.status === 'DRAFT' && (
                    <div className="flex justify-end gap-2">
                      <ActionDialog label="Registrar pago" variant="primary" title="Registrar pago de la liquidación" description={`Confirma que transferiste ${formatCOP(s.netCop)} a ${s.provider.businessName}.`} endpoint={`/admin/settlements/${s.id}/pay`} fields={[{ name: 'payoutReference', label: 'Referencia de la transferencia', required: true }, { name: 'notes', label: 'Notas', type: 'textarea' }]} submitLabel="Registrar pago" />
                      <ActionDialog label="Anular" variant="danger" title="Anular liquidación" description="Los movimientos vuelven a quedar pendientes de liquidar." endpoint={`/admin/settlements/${s.id}/cancel`} submitLabel="Anular" />
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!settlements.length && <tr><td colSpan={8} className="text-pizarra">Aún no hay liquidaciones.</td></tr>}
          </tbody>
        </TableCard>
      </Section>
    </>
  );
}
