import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ClientPage from './ClientPage';

export default async function ProcedenciasPage() {
  const session = await getSession();
  const dbUser = session ? await prisma.user.findUnique({ where: { id: session.id as number } }) : null;
  let userPermissions: string[] = [];
  try {
    if (dbUser?.permissions) userPermissions = JSON.parse(dbUser.permissions);
  } catch(e) {}

  if (!session || (session.role !== 'ADMIN' && !userPermissions.includes('directorio'))) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Acceso Denegado</h2>
        <p>No tienes permisos para ver esta página.</p>
      </div>
    );
  }

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
      currentUserName={dbUser?.name || 'Administrador'} 
    />
  );
}
