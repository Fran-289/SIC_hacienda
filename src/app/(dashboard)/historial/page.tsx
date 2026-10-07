import { getPageUser, hasModule } from '@/lib/authz';
import { redirect } from 'next/navigation';
import ClientHistorial from './ClientHistorial';

export const metadata = {
  title: 'Bandeja de Reportes | SIC',
};

export default async function HistorialPage() {
  const user = await getPageUser();
  if (!user) redirect('/login');
  if (!hasModule(user, 'reportes')) redirect('/configuracion');
  
  const currentYear = new Date().getFullYear();

  return (
    <div className="animate-fade-in" style={{ padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>
          Bandeja de Reportes
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Módulo integrado para generar nuevos reportes y consultar el registro de descargas.
        </p>
      </header>

      <ClientHistorial currentYear={currentYear} minYear={2020} />
    </div>
  );
}
