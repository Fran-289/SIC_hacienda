import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthz } from '@/lib/authz';

export async function GET(req: Request) {
  try {
    const auth = await requireAuthz('reportes');
    if (!auth.ok) return auth.response;

    const history = await prisma.reportGroup.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { name: true, email: true }
        },
        documents: true
      }
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
