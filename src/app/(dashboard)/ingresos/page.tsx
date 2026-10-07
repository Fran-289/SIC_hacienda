import { prisma } from '@/lib/prisma';
import ClientIngresosTable from './ClientIngresosTable';
import { getPageUser, hasModule } from '@/lib/authz';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function IngresosPage() {
  const user = await getPageUser();

  if (!user) redirect('/login');
  if (!hasModule(user, 'ingresos')) redirect('/configuracion');
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
