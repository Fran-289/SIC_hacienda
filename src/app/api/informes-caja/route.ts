import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const generateSchema = z.object({
  bankAccount: z.string().min(1),
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
  status: z.enum(['PRELIMINAR', 'DEFINITIVO'])
});

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const informes = await prisma.informeCaja.findMany({
      include: {
        user: { select: { name: true } }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    return NextResponse.json(informes);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener informes de caja' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const data = generateSchema.parse(body);

    const existing = await prisma.informeCaja.findFirst({
      where: {
        bankAccount: data.bankAccount,
        month: data.month,
        year: data.year,
        status: data.status
      }
    });

    if (existing) {
      return NextResponse.json({ error: `Ya existe un informe de caja en estado ${data.status} para este mes y año en esta cuenta.` }, { status: 400 });
    }

    const startDate = new Date(data.year, data.month - 1, 1);
    const endDate = new Date(data.year, data.month, 0, 23, 59, 59, 999);

    const records = await prisma.record.findMany({
      where: {
        depositDate: {
          gte: startDate,
          lte: endDate
        },
        deletedAt: null 
      }
    });

    let totalTransferencias = 0;
    let totalPasaporte = 0;
    let totalDui = 0;
    let totalConsulares = 0;
    let totalDiversos = 0;
    
    const concentrationDates: Record<string, number> = {};

    records.forEach(r => {
      totalTransferencias += r.depositAmount;
      totalPasaporte += r.passportValue;
      totalDui += r.duiValue;
      totalConsulares += r.consularValue;
      totalDiversos += r.commissionValue;
      
      if (r.concentrationDate) {
        const d = r.concentrationDate.toISOString();
        if (!concentrationDates[d]) concentrationDates[d] = 0;
        concentrationDates[d] += r.depositAmount;
      }
    });

    const totalConcentracion = Object.values(concentrationDates).reduce((a, b) => a + b, 0);

    let correlative = null;
    if (data.status === 'DEFINITIVO') {
      const lastDefinitivo = await prisma.informeCaja.findFirst({
        where: { year: data.year, status: 'DEFINITIVO', bankAccount: data.bankAccount },
        orderBy: { correlative: 'desc' }
      });
      correlative = lastDefinitivo?.correlative ? lastDefinitivo.correlative + 1 : 1;
    }

    const result = await prisma.$transaction(async (tx) => {
      const informe = await tx.informeCaja.create({
        data: {
          correlative,
          bankAccount: data.bankAccount,
          month: data.month,
          year: data.year,
          saldoAnterior: 0, 
          totalPasaporte,
          totalDui,
          totalConsulares,
          totalDiversos,
          saldoPendiente: totalTransferencias - totalConcentracion,
          status: data.status,
          userId: session.id as number
        }
      });

      if (records.length > 0) {
        await tx.record.updateMany({
          where: {
            id: { in: records.map(r => r.id) }
          },
          data: {
            informeCajaId: informe.id
          }
        });
      }
      
      return informe;
    });

    await prisma.systemLog.create({
      data: {
        userId: session.id as number,
        userName: session.name as string,
        action: 'CREATE_INFORME_CAJA',
        details: `Generó Informe de Caja ${data.status} para ${data.month}/${data.year}`,
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: (error as any).errors }, { status: 400 });
    }
    console.error("Create Informe Caja Error:", error);
    return NextResponse.json({ error: 'Error al generar el informe de caja' }, { status: 500 });
  }
}
