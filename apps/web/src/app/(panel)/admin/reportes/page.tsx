import { Download } from 'lucide-react';
import { apiGet } from '@/lib/api-server';
import { formatCOP } from '@/lib/format';
import { PanelTitle, Section, TableCard } from '@/components/panel/PanelShell';

interface Row { providerId: string; businessName: string; confirmed: number; cancelled: number; expired: number; revenueCop: number }

export default async function ReportesPage() {
  const rows = await apiGet<Row[]>('/admin/reports/provider-performance');
  return (
    <>
      <PanelTitle title="Reportes" actions={<a href="/api/v1/admin/reports/bookings.csv" className="btn-primary"><Download className="h-4 w-4" aria-hidden />Exportar reservas (CSV)</a>}>
        El CSV incluye reservas con montos, comisión y estado, codificado en UTF-8 para Excel.
      </PanelTitle>
      <Section title="Desempeño por proveedor">
        <TableCard>
          <thead><tr><th>Proveedor</th><th>Confirmadas</th><th>Canceladas</th><th>Expiradas</th><th className="text-right">Ventas</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.providerId}><td>{r.businessName}</td><td>{r.confirmed}</td><td>{r.cancelled}</td><td>{r.expired}</td><td className="text-right font-mono">{formatCOP(r.revenueCop)}</td></tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="text-pizarra">Sin datos.</td></tr>}
          </tbody>
        </TableCard>
      </Section>
    </>
  );
}
