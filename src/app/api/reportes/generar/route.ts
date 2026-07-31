import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo');
    const mes = parseInt(searchParams.get('mes') || '');
    const anio = parseInt(searchParams.get('anio') || '');
    const formato = searchParams.get('formato');
    const estado = searchParams.get('estado') || 'PRELIMINAR';

    if (!tipo || isNaN(mes) || isNaN(anio) || mes < 1 || mes > 12) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const settingsRaw = await prisma.systemSetting.findMany();
    const settings = settingsRaw.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);

    let blob: Blob;
    let filename: string;

    if (tipo === 'cablegraficas') {
      const { generateCablegraficasPDF, generateCablegraficasExcel } = await import('@/lib/reports/generators/cablegraficasGenerator');
      
      const prevStartDate = new Date(anio, mes - 2, 1);
      const nextEndDate = new Date(anio, mes + 1, 1);

      const records = await prisma.record.findMany({
        where: { depositDate: { gte: prevStartDate, lt: nextEndDate }, deletedAt: null }
      });

      const cablegraficasSettings = {
        ...settings,
        estado_informe: estado
      };

      const result = formato === 'EXCEL' ? 
        await generateCablegraficasExcel(records, mes, anio, cablegraficasSettings) : 
        await generateCablegraficasPDF(records, mes, anio, cablegraficasSettings);
      
      blob = result.blob;
      filename = result.filename;

    } else if (tipo === 'liquidacion') {
      const { generateLiquidacionPDF, generateLiquidacionExcel } = await import('@/lib/reports/generators/liquidacionGenerator');
      
      const startDate = new Date(anio, mes - 1, 1);
      const endDate = new Date(anio, mes, 1);

      const records = await prisma.record.findMany({
        where: { concentrationDate: { gte: startDate, lt: endDate }, deletedAt: null }
      });

      const informeCaja = await prisma.informeCaja.findFirst({
        where: { month: mes, year: anio },
        orderBy: { createdAt: 'desc' }
      });
      const numLiquidacion = informeCaja?.correlative || informeCaja?.id || '';

      const result = formato === 'EXCEL' ?
        await generateLiquidacionExcel(records, mes, anio, settings, numLiquidacion) :
        await generateLiquidacionPDF(records, mes, anio, settings, numLiquidacion);
        
      blob = result.blob;
      filename = result.filename;

    } else if (tipo === 'saldos') {
      const { generateSaldosPDF, generateSaldosExcel } = await import('@/lib/reports/generators/saldosGenerator');
      
      const startDate = new Date(anio, mes - 1, 1);
      const endDate = new Date(anio, mes, 1);

      const records = await prisma.record.findMany({
        where: {
          OR: [
            { depositDate: { gte: startDate, lt: endDate } },
            { concentrationDate: { gte: startDate, lt: endDate } }
          ],
          deletedAt: null
        }
      });

      const allPrevRecords = await prisma.record.findMany({
        where: {
          OR: [
            { depositDate: { lt: startDate } },
            { concentrationDate: { lt: startDate } }
          ],
          deletedAt: null
        }
      });

      let saldoAnterior = 0;
      for (const r of allPrevRecords) {
        if (r.depositDate < startDate) saldoAnterior += r.depositAmount;
        if (r.concentrationDate && r.concentrationDate < startDate) saldoAnterior -= r.depositAmount;
      }

      const result = formato === 'EXCEL' ?
        await generateSaldosExcel(records, saldoAnterior, mes, anio, settings) :
        await generateSaldosPDF(records, saldoAnterior, mes, anio, settings);
        
      blob = result.blob;
      filename = result.filename;

        } else if (tipo === 'noidentificados' || tipo === 'noidentificados_nodistribuidos') {
      const { generateNoIdentificadosPDF, generateNoIdentificadosExcel } = await import('@/lib/reports/generators/noIdentificadosGenerator');
      
      const startDate = new Date(anio, mes - 1, 1);
      const endDate = new Date(anio, mes, 1);

      const statusFilter = tipo === 'noidentificados' ? ['NO IDENTIFICADO'] : ['NO IDENTIFICADO', 'IDENTIFICADO NO DISTRIBUIDO'];

      const records = await prisma.record.findMany({
        where: {
          depositDate: { gte: startDate, lt: endDate },
          status: { in: statusFilter },
          deletedAt: null
        },
        orderBy: { depositDate: 'asc' }
      });

            const niSettings = {
         ...settings,
         estado_informe: estado
      };

      const result = formato === 'EXCEL' ?
        await generateNoIdentificadosExcel(records, mes, anio, niSettings) :
        await generateNoIdentificadosPDF(records, mes, anio, niSettings);
        
      blob = result.blob;
      filename = result.filename;

    } else if (tipo === 'caja') {
      const banco = searchParams.get('banco') || '11-005225-1';
      const { generateCajaPDF, generateCajaExcel } = await import('@/lib/reports/generators/cajaGenerator');
      
      const startDate = new Date(anio, mes - 1, 1);
      const endDate = new Date(anio, mes, 1);

      const records = await prisma.record.findMany({
        where: { depositDate: { gte: startDate, lt: endDate }, deletedAt: null },
        orderBy: { depositDate: 'asc' }
      });

      const saldoAnteriorRecords = await prisma.record.findMany({
        where: {
          depositDate: { lt: startDate },
          concentrationDate: { gte: startDate, lt: endDate },
          deletedAt: null,
        },
        orderBy: { depositDate: 'asc' }
      });

      let informeNumStr = mes.toString();
      if (estado === 'DEFINITIVO MODIFICADO') {
         const count = await prisma.reportHistory.count({
            where: {
               reportType: 'Informe de Caja',
               periodMonth: mes,
               periodYear: anio,
               status: 'DEFINITIVO MODIFICADO',
               format: 'PDF'
            }
         });
         informeNumStr = `${mes}.${count + 1}`;
      }

      const cajaSettings = {
         ...settings,
         caja_banco_cuenta: banco,
         estado_informe: estado,
         informe_num: informeNumStr
      };

      const result = formato === 'EXCEL' ?
        await generateCajaExcel(records, saldoAnteriorRecords, mes, anio, cajaSettings) :
        await generateCajaPDF(records, saldoAnteriorRecords, mes, anio, cajaSettings);
        
      blob = result.blob;
      filename = result.filename;

    } else {
      return NextResponse.json({ error: 'Tipo de reporte desconocido' }, { status: 400 });
    }

        const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Guardar físicamente en el servidor (public/reports)
    const reportsDir = path.join(process.cwd(), 'public', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Add timestamp to ensure uniqueness in storage
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}_${filename}`;
    const filePath = path.join(reportsDir, uniqueFilename);
    const publicUrl = `/reports/${uniqueFilename}`;
    
    fs.writeFileSync(filePath, buffer);

    let reportTypeDesc = tipo;
    if (tipo === 'caja') reportTypeDesc = 'Informe de Caja';
    else if (tipo === 'saldos') reportTypeDesc = 'Reporte de Saldos';
    else if (tipo === 'liquidacion') reportTypeDesc = 'Liquidación de Ingresos';
    else if (tipo === 'cablegraficas') reportTypeDesc = 'Transferencias Cablegráficas';
    else if (tipo === 'noidentificados') reportTypeDesc = 'No Identificados';
    else if (tipo === 'noidentificados_nodistribuidos') reportTypeDesc = 'No Identificados / No Distribuidos';

    // Registrar en ReportHistory
    await prisma.reportHistory.create({
      data: {
        userId: session.id as number,
        reportType: reportTypeDesc,
        periodMonth: mes,
        periodYear: anio,
        status: estado,
        format: formato || 'PDF',
        fileName: filename,
        filePath: publicUrl
      }
    });

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': formato === 'EXCEL' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });} catch (error) {
    console.error('Error al generar reporte:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
