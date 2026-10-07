import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthz } from '@/lib/authz';

export async function GET(req: Request) {
  try {
    const auth = await requireAuthz('reportes');
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo');
    const mes = parseInt(searchParams.get('mes') || '');
    const anio = parseInt(searchParams.get('anio') || '');

    if (!tipo || isNaN(mes) || isNaN(anio) || mes < 1 || mes > 12) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    let groupTypeDesc = '';
    if (['caja', 'saldos', 'liquidacion', 'cablegraficas'].includes(tipo)) {
      groupTypeDesc = 'Reportes Consulares';
    } else if (['noidentificados', 'noidentificados_nodistribuidos'].includes(tipo)) {
      groupTypeDesc = 'No Identificados / No Distribuidos';
    }

    // Verificamos si existe al menos un reporte en DEFINITIVO O DEFINITIVO MODIFICADO para este mes y año
    const countDefinitivo = await prisma.reportGroup.count({
      where: {
        groupType: groupTypeDesc,
        periodMonth: mes,
        periodYear: anio,
        status: {
          in: ['DEFINITIVO', 'DEFINITIVO MODIFICADO']
        }
      }
    });

    return NextResponse.json({ hasDefinitivo: countDefinitivo > 0 });
  } catch (error) {
    console.error('Error verificando estado de reporte:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
