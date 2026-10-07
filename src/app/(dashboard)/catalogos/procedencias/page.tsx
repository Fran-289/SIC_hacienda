import { prisma } from '@/lib/prisma';
import { getPageUser, hasModule } from '@/lib/authz';
import { redirect } from 'next/navigation';
import ClientPage from './ClientPage';

export default async function ProcedenciasPage() {
  const user = await getPageUser();

  if (!user) redirect('/login');
  if (!hasModule(user, 'directorio')) redirect('/configuracion');

  const consulatesRaw = await prisma.consulate.findMany({
    orderBy: [
      { region: 'asc' },
      { country: 'asc' },
      { location: 'asc' }
    ],
    include: {
      createdBy: {
        select: { name: true }
      }
    }
  });

  const consulates = consulatesRaw.map(c => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return (
    <ClientPage 
      initialConsulates={consulates} 
      currentUserName={user?.name || 'Administrador'} 
    />
  );
}
