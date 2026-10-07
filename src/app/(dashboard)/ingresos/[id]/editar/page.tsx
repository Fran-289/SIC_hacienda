import { prisma } from '@/lib/prisma';
import ClientEditPage from './ClientEditPage';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function EditarIngresoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const { id } = await params;

  const record = await prisma.record.findUnique({
    where: { id: Number(id) },
    include: { createdBy: { select: { name: true } } },
  });

  if (!record) {
    redirect('/ingresos');
  }

  return <ClientEditPage initialData={record} />;
}
