import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

const recordSchema = z.object({
  depositDate: z.string(),
  depositAmount: z.number().min(0),
  concentrationDate: z.string().min(1, "Fecha de concentración requerida"),
  days: z.number().int().min(0, "Días de concentración requeridos"),
  region: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  passportValue: z.number().min(0),
  duiValue: z.number().min(0),
  consularValue: z.number().min(0),
  commissionValue: z.number().min(0),
  diversosValue: z.number().min(0).optional().default(0),
  status: z.string(),
});

export async function POST(request: Request) {
  const session = await getSession();
  try {
    const body = await request.json();
    const result = recordSchema.safeParse(body);
    
    if (!result.success) {
      try { console.log('ZOD ERROR: ' + JSON.stringify((result.error as any).errors)); } catch(e){}
      return NextResponse.json({ error: 'Datos inválidos', details: (result.error as any).errors }, { status: 400 });
    }

    const data = result.data;

    const record = await prisma.record.create({
      data: {
        depositDate: new Date(data.depositDate),
        depositAmount: data.depositAmount,
        concentrationDate: data.concentrationDate ? new Date(data.concentrationDate) : null,
        days: data.days,
        region: data.region,
        country: data.country,
        location: data.location,
        passportValue: data.passportValue,
        duiValue: data.duiValue,
        consularValue: data.consularValue,
        commissionValue: data.commissionValue,
        diversosValue: data.diversosValue,
        status: data.status,
        createdById: session ? session.id as number : null,
        updatedById: session ? session.id as number : null,
      }
    });

    if (session) {
      await prisma.systemLog.create({
        data: {
          userId: session.id as number,
          userName: session.name as string,
          action: 'CREATE_RECORD',
          details: `Registró ingreso en la bandeja. ID: ${record.id}`,
        }
      });
    }

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    console.error('Error creating record:', error);
    try {
      require('fs').writeFileSync('./last_error.txt', String(error.message || error) + "\\n" + (error.stack || ""));
    } catch(e) {}
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
