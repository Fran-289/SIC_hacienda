import { prisma } from '@/lib/prisma';
import ClientVerPage from './ClientVerPage';
import { redirect } from 'next/navigation';

export default async function VerIngresoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const record = await prisma.record.findUnique({
    where: { id: Number(id) },
  });

  if (!record) {
    redirect('/ingresos');
  }

  return <ClientVerPage initialData={record} />;
}
