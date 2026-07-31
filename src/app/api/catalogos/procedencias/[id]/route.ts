import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  if (session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
  }

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json();
    const { type, region, country, location, address, status, createdAt } = body;

    const consulate = await prisma.consulate.update({
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

    // Registrar en logs
    await prisma.systemLog.create({
      data: {
        userId: session.id as number,
        action: 'UPDATE_CONSULATE',
        details: `Actualizó la procedencia ID: ${id}`,
      }
    });

    return NextResponse.json(consulate);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar la procedencia' }, { status: 500 });
  }
}
