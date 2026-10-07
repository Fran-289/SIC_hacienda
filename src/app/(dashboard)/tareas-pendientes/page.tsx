import ClientTareasPendientes from './ClientTareasPendientes';
import { redirect } from 'next/navigation';
import { getPageUser, hasModule } from '@/lib/authz';

export default async function TareasPendientesPage() {
  const user = await getPageUser();
  if (!user) redirect('/login');
  if (!hasModule(user, 'reportes')) redirect('/configuracion');

  const currentYear = new Date().getFullYear();
  const minYear = 2020;
  return <ClientTareasPendientes currentYear={currentYear} minYear={minYear} />;
}
