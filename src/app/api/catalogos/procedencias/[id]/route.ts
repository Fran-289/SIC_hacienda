import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminAuthz } from '@/lib/authz';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminAuthz();
  if (!auth.ok) return auth.response;
  const session = auth.user;

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json();
    const { type, region, country, location, address, status, createdAt } = body;

    const consulate = await prisma.$transaction(async (tx) => {
      const updated = await tx.consulate.update({
        where: { id },
        data: { 
          type, 
          region, 
          country, 
          location, 
          address: address || null, 
          status,
          ...(createdAt && { createdAt: new Date(createdAt) })
        }
      });

      await tx.systemLog.create({
        data: {
          userId: session.id,
          action: 'UPDATE_CONSULATE',
          details: `Actualizó la procedencia ID: ${id}`,
        }
      });

      return updated;
    });

    return NextResponse.json(consulate);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar la procedencia' }, { status: 500 });
  }
}
