import { Download } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { PanelTitle, Section } from '@/components/panel/PanelShell';
import { ProfileForm } from '@/components/account/ProfileForm';
import { ActionDialog } from '@/components/panel/ActionDialog';

export default async function PerfilPage() {
  const user = await requireSession('/cuenta/perfil');
  return (
    <>
      <PanelTitle title="Perfil y datos personales">Actualiza tu información y ejerce tus derechos como titular de datos (Ley 1581 de 2012).</PanelTitle>
      <ProfileForm user={user} />
      <Section title="Tus datos personales">
        <div className="card space-y-4 p-6 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-lg text-pizarra"><strong className="text-tinta">Acceso:</strong> descarga una copia de tus datos (perfil, consentimientos, reservas y reseñas) en formato JSON.</p>
            <a href="/api/v1/users/me/data-export" download="mis-datos-travelcol.json" className="btn-ghost"><Download className="h-4 w-4" aria-hidden />Descargar mis datos</a>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-selva-900/10 pt-4">
            <p className="max-w-lg text-pizarra"><strong className="text-tinta">Supresión:</strong> solicita eliminar tus datos. Se radica una PQR y se conservan solo los registros contables que exige la ley.</p>
            <ActionDialog
              label="Solicitar supresión"
              variant="danger"
              small={false}
              title="Solicitar supresión de datos"
              description="Crearemos un radicado y te responderemos por correo dentro de los plazos legales. Tus reservas activas pueden impedir la eliminación inmediata."
              endpoint="/users/me/deletion-request"
              submitLabel="Radicar solicitud"
            />
          </div>
        </div>
      </Section>
    </>
  );
}
