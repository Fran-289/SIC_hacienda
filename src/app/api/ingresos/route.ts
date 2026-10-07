import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireAuthz } from '@/lib/authz';
import { RECORD_STATUSES } from '@/lib/utils/status';
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
  status: z.enum(RECORD_STATUSES),
});

export async function POST(request: Request) {
  const auth = await requireAuthz('ingresos');
  if (!auth.ok) return auth.response;
  const session = auth.user;
  try {
    const body = await request.json();
    const result = recordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: result.error.issues }, { status: 400 });
    }

    const data = result.data;

    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.record.create({
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
          createdById: session.id,
          updatedById: session.id,
        }
      });

      await tx.systemLog.create({
        data: {
          userId: session.id,
          userName: session.name,
          action: 'CREATE_RECORD',
          details: `Registró ingreso en la bandeja. ID: ${created.id}`,
        }
      });

      return created;
    });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error('Error creating record:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
