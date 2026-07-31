import { prisma } from '@/lib/prisma';
import ClientIngresosTable from './ClientIngresosTable';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function IngresosPage() {
  const session = await getSession();
  const dbUser = session ? await prisma.user.findUnique({ where: { id: session.id as number } }) : null;
  let userPermissions: string[] = [];
  try {
    if (dbUser?.permissions) userPermissions = JSON.parse(dbUser.permissions);
  } catch(e) {}

  if (!session || (session.role !== 'ADMIN' && !userPermissions.includes('ingresos'))) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Acceso Denegado</h2>
        <p>No tienes permisos para ver esta página.</p>
      </div>
    );
  }
  const records = await prisma.record.findMany({
    orderBy: { id: 'desc' },
    take: 100,
    include: { 
      informeCaja: { select: { status: true } },
      createdBy: { select: { name: true } },
      updatedBy: { select: { name: true } }
    }
  });

  // Fetch unique statuses for the filter
  const statuses = Array.from(new Set(records.map(r => r.status)));

  const consulates = await prisma.consulate.findMany({
    orderBy: [
      { region: 'asc' },
      { country: 'asc' },
      { location: 'asc' }
    ]
  });

  return (
    <ClientIngresosTable 
      initialRecords={records} 
      statuses={statuses} 
      consulates={consulates}
    />
  );
}
