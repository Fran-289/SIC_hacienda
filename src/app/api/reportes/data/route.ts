import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mes = parseInt(searchParams.get('mes') || '');
    const anio = parseInt(searchParams.get('anio') || '');

    if (isNaN(mes) || isNaN(anio) || mes < 1 || mes > 12) {
      return NextResponse.json({ error: 'Parámetros de fecha inválidos' }, { status: 400 });
    }

    // Start and end of the month
    const startDate = new Date(anio, mes - 1, 1);
    const endDate = new Date(anio, mes, 1); // 1st of next month (exclusive)

    // Previous month bounds
    const prevStartDate = new Date(anio, mes - 2, 1);
    const prevEndDate = new Date(anio, mes - 1, 1);

    const records = await prisma.record.findMany({
      where: {
        depositDate: { gte: startDate, lt: endDate },
        deletedAt: null,
      },
      orderBy: { depositDate: 'asc' }
    });

    const saldoAnteriorRecords = await prisma.record.findMany({
      where: {
        depositDate: { lt: startDate },
        concentrationDate: { gte: startDate, lt: endDate },
        deletedAt: null,
      },
      orderBy: { depositDate: 'asc' }
    });

    const settingsRaw = await prisma.systemSetting.findMany();
    const settings = settingsRaw.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({ records, saldoAnteriorRecords, settings });
  } catch (error) {
    console.error('Error fetching reporte data:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
