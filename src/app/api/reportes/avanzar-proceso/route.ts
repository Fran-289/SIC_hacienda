import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthz } from '@/lib/authz';

const STATE_FLOW = [
  'Firma Jefatura',
  'Modificación',
  'Firma Recaudaciones',
  'Finalizado'
];

export async function POST(req: Request) {
  try {
    const auth = await requireAuthz('reportes');
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { groupId } = body;

    if (typeof groupId !== 'number' || !Number.isInteger(groupId) || groupId <= 0) {
      return NextResponse.json({ error: 'ID de grupo no proporcionado' }, { status: 400 });
    }

    const group = await prisma.reportGroup.findUnique({ where: { id: groupId } });
    if (!group) {
      return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });
    }

    // Determine the next state
    const currentIndex = STATE_FLOW.indexOf(group.processStatus);
    
    // If it's already Finalizado, do nothing
    if (group.processStatus === 'Finalizado' || currentIndex === STATE_FLOW.length - 1) {
      return NextResponse.json({ success: true, processStatus: 'Finalizado' });
    }

    // If it's an unknown state, restart from the beginning, otherwise go to next
    const nextIndex = currentIndex === -1 ? 1 : currentIndex + 1;
    const nextState = STATE_FLOW[nextIndex];

    await prisma.reportGroup.update({
      where: { id: groupId },
      data: { processStatus: nextState }
    });

    return NextResponse.json({ success: true, processStatus: nextState });

  } catch (error) {
    console.error('Error avanzando proceso:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
