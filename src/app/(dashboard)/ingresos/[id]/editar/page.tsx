import { prisma } from '@/lib/prisma';
import ClientEditPage from './ClientEditPage';
import { redirect } from 'next/navigation';

export default async function EditarIngresoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const record = await prisma.record.findUnique({
    where: { id: Number(id) },
    include: { createdBy: true },
  });

  if (!record) {
    redirect('/ingresos');
  }

  return <ClientEditPage initialData={record} />;
}
