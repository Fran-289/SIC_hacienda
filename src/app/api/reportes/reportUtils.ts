import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { STORAGE_ROOT, storagePublicUrl } from '@/lib/storage';
import { generateCablegraficasPDF, generateCablegraficasExcel } from '@/lib/reports/generators/cablegraficasGenerator';
import { generateLiquidacionPDF, generateLiquidacionExcel } from '@/lib/reports/generators/liquidacionGenerator';
import { generateSaldosPDF, generateSaldosExcel } from '@/lib/reports/generators/saldosGenerator';
import { generateNoIdentificadosPDF, generateNoIdentificadosExcel } from '@/lib/reports/generators/noIdentificadosGenerator';
import { generateCajaPDF, generateCajaExcel } from '@/lib/reports/generators/cajaGenerator';

type ReportOutput = {
  blob: Blob;
  filename: string;
  signatureY?: number;
};

export async function generateReportInternal(
  tipo: string,
  mes: number,
  anio: number,
  estado: string,
  banco: string,
  settings: Record<string, string>,
  formato: 'PDF' | 'EXCEL'
) {
  let blob: Blob;
  let filename: string;
  let signatureY: number | undefined;

  if (tipo === 'cablegraficas') {
    const prevStartDate = new Date(Date.UTC(anio, mes - 2, 1));
    const nextEndDate = new Date(Date.UTC(anio, mes + 1, 1));

    const records = await prisma.record.findMany({
      where: { depositDate: { gte: prevStartDate, lt: nextEndDate }, deletedAt: null }
    });

    const cablegraficasSettings = {
      ...settings,
      estado_informe: estado
    };

    const result: ReportOutput = formato === 'EXCEL' ? 
      await generateCablegraficasExcel(records, mes, anio, cablegraficasSettings) : 
      await generateCablegraficasPDF(records, mes, anio, cablegraficasSettings);
    
    blob = result.blob;
    filename = result.filename;
    signatureY = result.signatureY;

  } else if (tipo === 'liquidacion') {
    const startDate = new Date(Date.UTC(anio, mes - 1, 1));
    const endDate = new Date(Date.UTC(anio, mes, 1));

    const records = await prisma.record.findMany({
      where: { concentrationDate: { gte: startDate, lt: endDate }, deletedAt: null }
    });

    const informeCaja = await prisma.informeCaja.findFirst({
      where: { month: mes, year: anio },
      orderBy: { createdAt: 'desc' }
    });
    const numLiquidacion = informeCaja?.correlative || informeCaja?.id || '';

    const result: ReportOutput = formato === 'EXCEL' ?
      await generateLiquidacionExcel(records, mes, anio, settings, numLiquidacion) :
      await generateLiquidacionPDF(records, mes, anio, settings, numLiquidacion);
      
    blob = result.blob;
    filename = result.filename;
    signatureY = result.signatureY;

  } else if (tipo === 'saldos') {
    const startDate = new Date(Date.UTC(anio, mes - 1, 1));
    const endDate = new Date(Date.UTC(anio, mes, 1));

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

    const result: ReportOutput = formato === 'EXCEL' ?
      await generateSaldosExcel(records, saldoAnterior, mes, anio, settings) :
      await generateSaldosPDF(records, saldoAnterior, mes, anio, settings);
      
    blob = result.blob;
    filename = result.filename;
    signatureY = result.signatureY;

  } else if (tipo === 'noidentificados' || tipo === 'noidentificados_nodistribuidos') {
    const startDate = new Date(Date.UTC(anio, mes - 1, 1));
    const endDate = new Date(Date.UTC(anio, mes, 1));

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

    const result: ReportOutput = formato === 'EXCEL' ?
      await generateNoIdentificadosExcel(records, mes, anio, niSettings) :
      await generateNoIdentificadosPDF(records, mes, anio, niSettings);
      
    blob = result.blob;
    filename = result.filename;

  } else if (tipo === 'caja') {
    const startDate = new Date(Date.UTC(anio, mes - 1, 1));
    const endDate = new Date(Date.UTC(anio, mes, 1));

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
       const count = await prisma.reportGroup.count({
          where: {
             groupType: 'Reportes Consulares',
             periodMonth: mes,
             periodYear: anio,
             status: 'DEFINITIVO MODIFICADO'
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

    const result: ReportOutput = formato === 'EXCEL' ?
      await generateCajaExcel(records, saldoAnteriorRecords, mes, anio, cajaSettings) :
      await generateCajaPDF(records, saldoAnteriorRecords, mes, anio, cajaSettings);
      
    blob = result.blob;
    filename = result.filename;
    signatureY = result.signatureY;

  } else {
    throw new Error('Tipo de reporte desconocido');
  }

  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const reportsDir = path.join(STORAGE_ROOT, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const timestamp = Date.now();
  const uniqueFilename = `${timestamp}_${filename}`;
  const filePath = path.join(reportsDir, uniqueFilename);
  
  let publicUrl = storagePublicUrl(`reports/${uniqueFilename}`);
  if (signatureY !== undefined) {
    publicUrl += `?y=${signatureY}`;
  }
  
  fs.writeFileSync(filePath, buffer);

  return { blob, buffer, filename: uniqueFilename, publicUrl };
}
