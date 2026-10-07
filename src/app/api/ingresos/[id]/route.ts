import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthz } from '@/lib/authz';
import { RECORD_STATUSES } from '@/lib/utils/status';
import { z } from 'zod';

const recordSchema = z.object({
  depositDate: z.string(),
  depositAmount: z.number().min(0),
  concentrationDate: z.string().optional().nullable(),
  days: z.number().int().min(0).optional().nullable(),
  region: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  passportValue: z.number().min(0),
  duiValue: z.number().min(0),
  consularValue: z.number().min(0),
  commissionValue: z.number().min(0),
  diversosValue: z.number().min(0).optional().default(0),
  status: z.enum(RECORD_STATUSES),
});

const deleteSchema = z.object({
  reason: z.string().max(500).optional().default('Sin justificación'),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthz('ingresos');
  if (!auth.ok) return auth.response;
  const session = auth.user;

  try {
    const { id } = await params;
    
    // VERIFICAR CANDADO DE INFORME DE CAJA
    const existingRecord = await prisma.record.findUnique({
      where: { id: Number(id) },
      include: { informeCaja: true }
    });
    
    if (!existingRecord) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }
    
    if (existingRecord.informeCaja && existingRecord.informeCaja.status === 'DEFINITIVO') {
      return NextResponse.json({ error: 'No se puede modificar un registro vinculado a un Informe de Caja en estado DEFINITIVO' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = recordSchema.parse(body);

    const record = await prisma.$transaction(async (tx) => {
      const updated = await tx.record.update({
        where: { id: Number(id) },
        data: {
          depositDate: new Date(validatedData.depositDate),
          depositAmount: validatedData.depositAmount,
          concentrationDate: validatedData.concentrationDate ? new Date(validatedData.concentrationDate) : null,
          days: validatedData.days ?? null,
          region: validatedData.region || null,
          country: validatedData.country || null,
          location: validatedData.location || null,
          passportValue: validatedData.passportValue,
          duiValue: validatedData.duiValue,
          consularValue: validatedData.consularValue,
          commissionValue: validatedData.commissionValue,
          diversosValue: validatedData.diversosValue,
          status: validatedData.status,
          updatedById: session.id,
        }
      });

      await tx.systemLog.create({
        data: {
          userId: session.id,
          userName: session.name,
          action: 'UPDATE_RECORD',
          details: `Actualizó el registro de ingreso ID #${updated.id}`,
        }
      });

      return updated;
    });

    return NextResponse.json(record);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al actualizar el registro' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuthz('ingresos');
  if (!auth.ok) return auth.response;
  const session = auth.user;

  try {
    const { id } = await params;

    // VERIFICAR CANDADO DE INFORME DE CAJA
    const existingRecord = await prisma.record.findUnique({
      where: { id: Number(id) },
      include: { informeCaja: true }
    });
    
    if (!existingRecord) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }
    
    if (existingRecord.informeCaja && existingRecord.informeCaja.status === 'DEFINITIVO') {
      return NextResponse.json({ error: 'No se puede eliminar un registro vinculado a un Informe de Caja en estado DEFINITIVO' }, { status: 403 });
    }

    const body = await request.json();
    const { reason } = deleteSchema.parse(body);

    await prisma.$transaction(async (tx) => {
      await tx.record.update({
        where: { id: Number(id) },
        data: {
          deletedAt: new Date(),
          deleteReason: reason,
          updatedById: session.id,
        }
      });

      await tx.systemLog.create({
        data: {
          userId: session.id,
          userName: session.name,
          action: 'DELETE_RECORD',
          details: `Eliminó lógicamente el registro #${id}. Motivo: ${reason}`,
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    console.error("Delete Error:", error);
    return NextResponse.json({ error: 'Error al eliminar el registro', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
