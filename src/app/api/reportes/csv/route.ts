import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const records = await prisma.record.findMany({
    orderBy: { depositDate: 'desc' },
  });

  const headers = ['ID', 'Fecha Depósito', 'Región', 'País', 'Ubicación', 'Monto Total', 'Pasaporte', 'DUI', 'Consular', 'Estado'];
  
  const csvRows = [headers.join(',')];

  for (const record of records) {
    const row = [
      record.id,
      record.depositDate.toISOString().split('T')[0],
      `"${record.region || ''}"`,
      `"${record.country || ''}"`,
      `"${record.location || ''}"`,
      record.depositAmount,
      record.passportValue,
      record.duiValue,
      record.consularValue,
      record.status,
    ];
    csvRows.push(row.join(','));
  }

  const csvContent = csvRows.join('\n');

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ingresos_consulares.csv"',
    },
  });
}
