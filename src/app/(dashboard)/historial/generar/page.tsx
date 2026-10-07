import ReportGeneratorForm from '../ReportGeneratorForm';
import { redirect } from 'next/navigation';
import { getPageUser, hasModule } from '@/lib/authz';

export default async function GenerarReportesHistorialPage() {
  const user = await getPageUser();
  if (!user) redirect('/login');
  if (!hasModule(user, 'reportes')) redirect('/configuracion');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '2rem', height: '100%', overflowY: 'auto' }}>
      <ReportGeneratorForm />
    </div>
  );
}
