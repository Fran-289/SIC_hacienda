import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { generateReportInternal } from '../reportUtils';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { grupo, mes, anio, estado, banco } = body;

    if (!grupo || !mes || !anio || !estado) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    let reportTypes: string[] = [];
    let groupType = '';

    if (grupo === 'consulares') {
      groupType = 'Reportes Consulares';
      reportTypes = ['caja', 'saldos', 'liquidacion', 'cablegraficas'];
    } else if (grupo === 'no_identificados') {
      groupType = 'No Identificados / No Distribuidos';
      reportTypes = ['noidentificados_nodistribuidos'];
    } else {
      return NextResponse.json({ error: 'Grupo desconocido' }, { status: 400 });
    }

    const settingsRaw = await prisma.systemSetting.findMany();
    const settings = settingsRaw.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);

    let correlative = mes.toString();
    if (estado === 'DEFINITIVO MODIFICADO') {
       const count = await prisma.reportGroup.count({
          where: {
             groupType,
             periodMonth: mes,
             periodYear: anio,
             status: 'DEFINITIVO MODIFICADO'
          }
       });
       correlative = `${mes}.${count + 1}`;
    }

    const reportGroup = await prisma.reportGroup.create({
      data: {
        correlative,
        groupType,
        periodMonth: mes,
        periodYear: anio,
        status: estado,
        processStatus: 'Firma Jefatura',
        createdById: session.id as number
      }
    });

    for (const type of reportTypes) {
      // Generate PDF
      const pdfRes = await generateReportInternal(type, mes, anio, estado, banco || '11-005225-1', settings, 'PDF');
      
      // Generate Excel
      const excelRes = await generateReportInternal(type, mes, anio, estado, banco || '11-005225-1', settings, 'EXCEL');

      await prisma.reportDocument.create({
        data: {
          groupId: reportGroup.id,
          reportType: type,
          pdfUrl: pdfRes.publicUrl,
          excelUrl: excelRes.publicUrl
        }
      });
    }

    return NextResponse.json({ success: true, groupId: reportGroup.id });

  } catch (error) {
    console.error('Error al generar grupo de reportes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
