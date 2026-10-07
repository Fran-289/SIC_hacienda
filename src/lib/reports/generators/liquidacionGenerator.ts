import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, numeroALetras, getMonthNameSpanish } from '../utils';
import ExcelJS from 'exceljs';
import type { Record as DbRecord } from '@prisma/client';

type DocWithAutoTable = jsPDF & { lastAutoTable: { finalY: number } };

export async function generateLiquidacionPDF(records: DbRecord[], month: number, year: number, settings: Record<string, string> = {}, numLiquidacion: number | string = '') {
  const doc = new jsPDF({ orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  
  doc.text('MINISTERIO DE HACIENDA', pageWidth / 2, 15, { align: 'center' });
  doc.text('DIRECCION GENERAL DE TESORERIA', pageWidth / 2, 20, { align: 'center' });
  doc.text(`LIQUIDACIÓN DE FONDOS PROVENIENTES DEL SERVICIO EXTERIOR N°   ${numLiquidacion}   DE ${getMonthNameSpanish(month).toLowerCase()}/${year}`, pageWidth / 2, 25, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Pag. 1 de 1`, pageWidth - margin, 15, { align: 'right' });

  const bancoCuenta = settings.caja_banco_cuenta || '11-005225-1';
  const bancoNombre = settings.caja_banco_nombre || 'BANCO CUSCATLAN DE EL SALVADOR';

  let totalIngresos = 0;
  records.forEach(r => {
    totalIngresos += r.depositAmount;
  });

  autoTable(doc, {
    startY: 40,
    head: [[
      { content: `CUENTA No:    ${bancoCuenta}`, styles: { halign: 'left' } },
      { content: bancoNombre, colSpan: 2, styles: { halign: 'center' } }
    ], [
      { content: 'DETALLE DE INGRESOS', styles: { halign: 'center' } },
      { content: 'PARCIALES', styles: { halign: 'center' } },
      { content: 'TOTALES', styles: { halign: 'center' } }
    ]],
    body: [
      [
        { content: '\nREPRESENTACIONES DIPLOMATICAS Y CONSULARES\nACREDITADAS EN EL EXTERIOR.', styles: { minCellHeight: 120, valign: 'top' } },
        { content: '', styles: { minCellHeight: 120 } },
        { content: `\n$       ${formatCurrency(totalIngresos).replace('$', '')}`, styles: { minCellHeight: 120, valign: 'top' } }
      ],
      [{ content: 'TOTAL INGRESOS', styles: { halign: 'center', fontStyle: 'bold' } }, '', `$       ${formatCurrency(totalIngresos).replace('$', '')}`],
    ],
    theme: 'grid',
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, font: 'helvetica', textColor: 0, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
    }
  });

  let finalY = (doc as DocWithAutoTable).lastAutoTable.finalY + 15;
  const pageHeight = doc.internal.pageSize.height;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`LUGAR Y FECHA:     San Salvador,     ${new Date().toLocaleDateString('es-SV', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, margin, finalY);
  
  doc.setFont('helvetica', 'bold');
  doc.text(`LA CANTIDAD DE:   ${numeroALetras(totalIngresos)}`, margin, finalY + 10);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`VALOR DEPOSITADO A LA ORDEN DE LA DIRECCIÓN GENERAL DE TESORERIA, SEGÚN NOTAS`, margin, finalY + 20);
  doc.text(`DE ABONO DEL MES DE :       ${getMonthNameSpanish(month).toLowerCase()}/${year}`, margin, finalY + 25);

  if (finalY + 45 > doc.internal.pageSize.height) {
    doc.addPage();
    finalY = 20;
  }

  const signatureY = finalY + 50;

  const elabNombre = settings.firma_elaboro_nombre || 'JOSE MARLON AVILES CHACON';
  const elabCargo = settings.firma_elaboro_cargo || 'TECNICO DE CONCENTRACIONES';
  const aprobNombre = settings.firma_aprobo_nombre || 'HUGO ORLANDO MARTINEZ PARADA';
  const aprobCargo = settings.firma_aprobo_cargo || 'JEFE DEPTO. DE INGRESOS DE COLECTURIAS DE ADUANAS';

  doc.text('ELABORO:', margin, signatureY);
  doc.text(elabNombre, margin, signatureY + 15);
  doc.text(elabCargo, margin, signatureY + 20);
  
  doc.text('APROBO:', pageWidth / 2, signatureY);
  doc.text(aprobNombre, pageWidth / 2, signatureY + 15);
  doc.text(aprobCargo, pageWidth / 2, signatureY + 20);

  const arrayBuffer = doc.output('arraybuffer');
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  return { blob, filename: `Liquidacion_${month}_${year}.pdf`, signatureY };
}

export async function generateLiquidacionExcel(records: DbRecord[], month: number, year: number, settings: Record<string, string> = {}, numLiquidacion: number | string = '') {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Liquidación');

  const centerAlign: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A1:E1');
  worksheet.getCell('A1').value = 'MINISTERIO DE HACIENDA';
  worksheet.getCell('A1').font = { bold: true, size: 9 };
  worksheet.getCell('A1').alignment = centerAlign;
  
  worksheet.mergeCells('A2:E2');
  worksheet.getCell('A2').value = 'DIRECCIÓN GENERAL DE TESORERIA';
  worksheet.getCell('A2').font = { bold: true, size: 9 };
  worksheet.getCell('A2').alignment = centerAlign;

  worksheet.mergeCells('A3:E3');
  worksheet.getCell('A3').value = 'DEPARTAMENTO DE INGRESOS DE COLECTURIAS DE ADUANA';
  worksheet.getCell('A3').font = { bold: true, size: 9 };
  worksheet.getCell('A3').alignment = centerAlign;

  worksheet.addRow([]); // A4 empty

  worksheet.mergeCells('A5:E5');
  worksheet.getCell('A5').value = `LIQUIDACIÓN DE FONDOS PROVENIENTES DEL SERVICIO EXTERIOR N°   ${numLiquidacion}   DE ${getMonthNameSpanish(month).toLowerCase()}/${year}`;
  worksheet.getCell('A5').font = { bold: true, size: 10 };
  worksheet.getCell('A5').alignment = centerAlign;

  worksheet.addRow([]); // A6 empty
  worksheet.addRow([]); // A7 empty

  let totalTransferencias = 0;
  records.forEach(r => totalTransferencias += r.depositAmount);

  const letras = numeroALetras(totalTransferencias);

  const headerRow = worksheet.addRow(['', 'CANTIDAD EN DOLARES', 'LA CANTIDAD DE:', 'CUENTA', 'FONDO']);
  headerRow.eachCell((cell, colNumber) => {
    if (colNumber > 1) {
      cell.font = { bold: true, size: 9 };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = centerAlign;
    }
  });

  const valueRow = worksheet.addRow([
    '',
    totalTransferencias,
    letras,
    '00-11-005225-1',
    'FONDOS PROVENIENTES DEL EXTERIOR'
  ]);

  valueRow.getCell(2).numFmt = '"$"#,##0.00';
  valueRow.eachCell((cell, colNumber) => {
    if (colNumber > 1) {
      cell.font = { size: 9 };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { vertical: 'middle', wrapText: true, horizontal: 'center' };
    }
  });

  worksheet.columns = [
    { width: 5 }, { width: 25 }, { width: 45 }, { width: 20 }, { width: 30 }
  ];

  for(let i=0; i<6; i++) worksheet.addRow([]);

  const elabNombre = settings.firma_elaboro_nombre || 'JOSE MARLON AVILES CHACON';
  const elabCargo = settings.firma_elaboro_cargo || 'TECNICO DE CONCENTRACIONES';
  const aprobNombre = settings.firma_aprobo_nombre || 'HUGO ORLANDO MARTINEZ PARADA';
  const aprobCargo = settings.firma_aprobo_cargo || 'JEFE DEPTO. DE INGRESOS DE COLECTURIAS DE ADUANAS';

  const sigRow1 = worksheet.addRow(['', 'ELABORO:', '', 'APROBO:']);
  const sigRow2 = worksheet.addRow(['', elabNombre, '', aprobNombre]);
  const sigRow3 = worksheet.addRow(['', elabCargo, '', aprobCargo]);

  [sigRow1, sigRow2, sigRow3].forEach(row => {
    row.getCell(2).font = { size: 9 };
    row.getCell(4).font = { size: 9 };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return { blob: new Blob([buffer]), filename: `Liquidacion_${month}_${year}.xlsx` };
}
