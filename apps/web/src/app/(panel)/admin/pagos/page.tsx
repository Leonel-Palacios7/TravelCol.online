import Link from 'next/link';
import { LABELS, PAYMENT_STATUSES } from '@travelcol/contracts';
import { apiGet } from '@/lib/api-server';
import { formatCOP, formatDateTime } from '@/lib/format';
import { PanelTitle, TableCard } from '@/components/panel/PanelShell';
import { Pager } from '@/components/panel/Pager';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface PaymentRow {
  id: string; reference: string; status: string; amountCop: number; environment: string; providerTransactionId: string | null; paymentMethodType: string | null;
  statusMessage: string | null; createdAt: string; approvedAt: string | null; booking: { id: string; code: string; status: string; needsAttention: boolean }; _count: { webhookEvents: number };
}
interface EventRow { id: string; eventType: string; signatureValid: boolean; transactionId: string | null; reference: string | null; reportedStatus: string | null; processingResult: string | null; receivedAt: string }

const RESULT: Record<string, string> = {
  PROCESSED: 'Procesado', DUPLICATE: 'Duplicado', INVALID_SIGNATURE: 'Firma inválida', UNKNOWN_REFERENCE: 'Referencia desconocida',
  MISMATCH: 'Monto o moneda no coinciden', IGNORED_EVENT: 'Evento ignorado', STALE: 'Fuera de orden (sin efecto)', NOT_VERIFIABLE: 'No verificable',
};

export default async function PagosAdmin({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string; page?: string }> }) {
  const sp = await searchParams;
  const tab = sp.tab === 'eventos' ? 'eventos' : 'pagos';
  const tabs = (
    <div className="mb-4 flex gap-2">
      <Link href="/admin/pagos" className={`rounded-full px-3.5 py-1.5 text-sm ${tab === 'pagos' ? 'bg-selva-800 text-white' : 'bg-white shadow-tarjeta'}`}>Intentos de pago</Link>
      <Link href="/admin/pagos?tab=eventos" className={`rounded-full px-3.5 py-1.5 text-sm ${tab === 'eventos' ? 'bg-selva-800 text-white' : 'bg-white shadow-tarjeta'}`}>Eventos de webhook</Link>
    </div>
  );
  if (tab === 'eventos') {
    const ev = await apiGet<{ items: EventRow[]; total: number; page: number; pageSize: number }>(`/admin/webhook-events?page=${sp.page ?? 1}`);
    return (
      <>
        <PanelTitle title="Pagos y webhooks">Cada evento recibido de Wompi se guarda una sola vez, con el resultado de validar su firma.</PanelTitle>
        {tabs}
        <TableCard>
          <thead><tr><th>Recibido</th><th>Evento</th><th>Referencia</th><th>Estado informado</th><th>Firma</th><th>Resultado</th></tr></thead>
          <tbody>
            {ev.items.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap">{formatDateTime(e.receivedAt)}</td>
                <td>{e.eventType}<span className="block font-mono text-xs text-pizarra">{e.transactionId ?? '—'}</span></td>
                <td className="font-mono text-xs">{e.reference ?? '—'}</td>
                <td>{e.reportedStatus ? <StatusBadge status={e.reportedStatus} /> : '—'}</td>
                <td>{e.signatureValid ? <span className="text-selva-700">Válida</span> : <span className="font-semibold text-bandera-rojo">Inválida</span>}</td>
                <td>{e.processingResult ? (RESULT[e.processingResult.split(':')[0] ?? ''] ?? e.processingResult) : 'Pendiente'}</td>
              </tr>
            ))}
            {!ev.items.length && <tr><td colSpan={6} className="text-pizarra">Aún no se han recibido eventos.</td></tr>}
          </tbody>
        </TableCard>
        <Pager page={ev.page} pageSize={ev.pageSize} total={ev.total} basePath="/admin/pagos" params={{ tab: 'eventos' }} />
      </>
    );
  }
  const status = sp.status && (PAYMENT_STATUSES as readonly string[]).includes(sp.status) ? sp.status : undefined;
  const data = await apiGet<{ items: PaymentRow[]; total: number; page: number; pageSize: number }>(`/admin/payments?page=${sp.page ?? 1}${status ? `&status=${status}` : ''}`);
  return (
    <>
      <PanelTitle title="Pagos y webhooks">El estado de un pago solo cambia por un webhook con firma válida o por consulta del backend a Wompi.</PanelTitle>
      {tabs}
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/pagos" className={`rounded-full px-3 py-1 text-xs ${!status ? 'bg-selva-100 font-semibold' : 'bg-white shadow-tarjeta'}`}>Todos</Link>
        {PAYMENT_STATUSES.map((s) => <Link key={s} href={`/admin/pagos?status=${s}`} className={`rounded-full px-3 py-1 text-xs ${status === s ? 'bg-selva-100 font-semibold' : 'bg-white shadow-tarjeta'}`}>{LABELS.paymentStatus[s]}</Link>)}
      </div>
      <TableCard>
        <thead><tr><th>Referencia</th><th>Reserva</th><th>Monto</th><th>Medio</th><th>Ambiente</th><th>Eventos</th><th>Estado</th></tr></thead>
        <tbody>
          {data.items.map((p) => (
            <tr key={p.id}>
              <td className="font-mono text-xs">{p.reference}<span className="block text-pizarra">{formatDateTime(p.createdAt)}</span></td>
              <td className="font-mono text-xs">{p.booking.code}{p.booking.needsAttention && <span className="block font-sans font-semibold text-tierra-600">Requiere atención</span>}</td>
              <td>{formatCOP(p.amountCop)}</td>
              <td>{p.paymentMethodType ?? '—'}</td>
              <td>{p.environment === 'SANDBOX' ? 'Sandbox' : 'Producción'}</td>
              <td>{p._count.webhookEvents}</td>
              <td><StatusBadge status={p.status} />{p.statusMessage && <span className="block text-xs text-pizarra">{p.statusMessage}</span>}</td>
            </tr>
          ))}
          {!data.items.length && <tr><td colSpan={7} className="text-pizarra">Sin pagos.</td></tr>}
        </tbody>
      </TableCard>
      <Pager page={data.page} pageSize={data.pageSize} total={data.total} basePath="/admin/pagos" params={{ status }} />
    </>
  );
}
