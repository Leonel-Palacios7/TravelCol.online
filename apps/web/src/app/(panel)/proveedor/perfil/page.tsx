import { apiGet } from '@/lib/api-server';
import type { ProviderMe } from '@/lib/types';
import { PanelTitle } from '@/components/panel/PanelShell';
import { ProviderProfileForm } from '@/components/provider/ProviderProfileForm';

export default async function PerfilProveedor() {
  const me = await apiGet<ProviderMe>('/providers/me');
  return (
    <>
      <PanelTitle title="Perfil público">
        Razón social: {me.legalName} · NIT {me.taxId}. Para cambiar datos legales escríbenos desde Contacto.
      </PanelTitle>
      <ProviderProfileForm initial={{ businessName: me.businessName, description: me.description, contactPhone: me.contactPhone, rntNumber: me.rntNumber }} />
    </>
  );
}
