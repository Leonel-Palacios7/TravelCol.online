import { apiGet } from '@/lib/api-server';
import { formatCOP, formatDate, formatDateTime } from '@/lib/format';
import type { LedgerRow } from '@/lib/types';
import { PanelTitle, Section, StatCard, TableCard } from '@/components/panel/PanelShell';
import { Pager } from '@/components/panel/Pager';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface Summary {
  grossSalesCop: number; commissionCop: number; refundsCop: number; paidOutCop: number; adjustmentsCop: number; pendingSettlementCop: number;
  settlements: Array<{ id: string; periodEnd: string; grossCop: number; commissionCop: number; refundsCop: number; netCop: number; status: string; payoutReference: string | null; paidAt: string | null }>;
}
const TYPE: Record<string, string> = { SALE: 'Venta', COMMISSION: 'Comisión', REFUND: 'Reembolso', COMMISSION_REVERSAL: 'Reversión de comisión', PAYOUT: 'Pago recibido', ADJUSTMENT: 'Ajuste' };

export default async function FinanzasPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Number((await searchParams).page ?? 1) || 1;
  const [s, ledger] = await Promise.all([
    apiGet<Summary>('/providers/me/settlements'),
    apiGet<{ items: LedgerRow[]; page: number; pageSize: number; total: number }>(`/providers/me/ledger?page=${page}`),
  ]);
  return (
    <>
      <PanelTitle title="Finanzas">Libro contable de solo adición: cada venta, comisión, reembolso y pago queda registrado y no se modifica.</PanelTitle>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ventas" value={formatCOP(s.grossSalesCop)} />
        <StatCard label="Comisiones" value={formatCOP(Math.abs(s.commissionCop))} tone="tierra" />
        <StatCard label="Pagado a ti" value={formatCOP(Math.abs(s.paidOutCop))} tone="sol" />
        <StatCard label="Por liquidar" value={formatCOP(s.pendingSettlementCop)} tone="neutral" hint={s.refundsCop ? `Reembolsos: ${formatCOP(Math.abs(s.refundsCop))}` : undefined} />
      </div>
      <Section title="Liquidaciones">
        <TableCard>
          <thead><tr><th>Corte</th><th>Ventas</th><th>Comisión</th><th>Reembolsos</th><th>Neto</th><th>Estado</th><th>Referencia de pago</th></tr></thead>
          <tbody>
            {s.settlements.map((x) => (
              <tr key={x.id}>
                <td>{formatDate(x.periodEnd)}</td><td>{formatCOP(x.grossCop)}</td><td>{formatCOP(x.commissionCop)}</td><td>{formatCOP(x.refundsCop)}</td>
                <td className="font-semibold">{formatCOP(x.netCop)}</td><td><StatusBadge status={x.status} /></td>
                <td className="font-mono text-xs">{x.payoutReference ?? '—'}{x.paidAt && <span className="block text-pizarra">{formatDate(x.paidAt)}</span>}</td>
              </tr>
            ))}
            {!s.settlements.length && <tr><td colSpan={7} className="text-pizarra">Aún no hay liquidaciones. TravelCol las genera periódicamente con tu saldo por liquidar.</td></tr>}
          </tbody>
        </TableCard>
      </Section>
      <Section title="Movimientos">
        <TableCard>
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th className="text-right">Valor</th></tr></thead>
          <tbody>
            {ledger.items.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                <td>{TYPE[l.type] ?? l.type}</td>
                <td>{l.description}{l.settlementId && <span className="ml-2 text-xs text-selva-700">(liquidado)</span>}</td>
                <td className={`text-right font-mono ${l.amountCop < 0 ? 'text-bandera-rojo' : 'text-selva-800'}`}>{formatCOP(l.amountCop)}</td>
              </tr>
            ))}
            {!ledger.items.length && <tr><td colSpan={4} className="text-pizarra">Sin movimientos todavía.</td></tr>}
          </tbody>
        </TableCard>
        <Pager page={ledger.page} pageSize={ledger.pageSize} total={ledger.total} basePath="/proveedor/finanzas" />
      </Section>
    </>
  );
}
