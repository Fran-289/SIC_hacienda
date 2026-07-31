import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getMonthNameSpanish, formatCurrency, getMetadataString } from '../utils';
import ExcelJS from 'exceljs';

export async function generateSaldosPDF(records: any[], saldoAnteriorRoute: number, month: number, year: number, settings: Record<string, string> = {}) {
  const doc = new jsPDF({ orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  
  doc.text('DIRECCION GENERAL DE TESORERIA', pageWidth / 2, 20, { align: 'center' });
  doc.text('DEPARTAMENTO DE INGRESOS DE COLECTURIAS DE ADUANA', pageWidth / 2, 25, { align: 'center' });
  doc.text('REPORTE CONTROL DE SALDOS POR TRANSFERENCIAS CABLEGRAFICAS DE CONSULADOS', pageWidth / 2, 30, { align: 'center' });
  doc.text(`FECHA:         ${getMonthNameSpanish(month).toLowerCase()}/${year}`, pageWidth / 2, 35, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Pag. 1 de 1`, pageWidth - margin, 15, { align: 'right' });

  // Calculation logic
  let saldoFinal = 0;
  let totalPasaportes = 0;
  let totalDui = 0;
  let totalConsulares = 0;
  let totalConcentracion = 0;

  records.forEach(r => {
    const dMonth = new Date(r.depositDate).getMonth() + 1;
    const dYear = new Date(r.depositDate).getFullYear();
    
    if (dMonth === month && dYear === year) {
      totalPasaportes += r.passportValue;
      totalDui += r.duiValue;
      totalConsulares += r.consularValue;
      
      let isNextMonth = false;
      if (r.concentrationDate) {
        const cMonth = new Date(r.concentrationDate).getMonth() + 1;
        const cYear = new Date(r.concentrationDate).getFullYear();
        if ((month === 12 && cMonth === 1 && cYear === year + 1) || (month < 12 && cMonth === month + 1 && cYear === year)) {
          isNextMonth = true;
        }
      } else {
         isNextMonth = true; 
      }
      if (isNextMonth) {
        saldoFinal += r.depositAmount;
      }
    }

    if (r.concentrationDate) {
      const cMonth = new Date(r.concentrationDate).getMonth() + 1;
      const cYear = new Date(r.concentrationDate).getFullYear();
      if (cMonth === month && cYear === year) {
        totalConcentracion += r.depositAmount;
      }
    }
  });

  const totalTransferenciasMas = totalPasaportes + totalDui + totalConsulares;
  const saldoAnterior = saldoFinal + totalConcentracion - totalTransferenciasMas;

  const bancoCuenta = settings.caja_banco_cuenta || '11-005225-1';
  const bancoNombre = settings.caja_banco_nombre || 'BANCO CUSCATLAN DE EL SALVADOR';

  const f = (val: number) => `$       ${formatCurrency(val).replace('$', '')}`;

  autoTable(doc, {
    startY: 45,
    head: [[
      { content: `BANCO:      ${bancoNombre}   CUENTA BANCARIA:  ${bancoCuenta}`, colSpan: 2, styles: { halign: 'left', fontStyle: 'normal' } },
      { content: `FECHA ELABORACIÓN:  ${getMetadataString()}`, colSpan: 2, styles: { halign: 'right', fontStyle: 'normal' } }
    ], [
      { content: 'CONCEPTO', styles: { halign: 'center' } },
      { content: 'PARCIAL', styles: { halign: 'center' } },
      { content: 'TESORERIA', styles: { halign: 'center' } },
      { content: 'BANCO', styles: { halign: 'center' } }
    ]],
    body: [
      [
        { content: 'SALDO ANTERIOR\nSALDO FINAL DE BANCO\n', styles: { valign: 'top' } },
        { content: `\n${f(saldoFinal)}\n`, styles: { valign: 'top' } },
        { content: `${f(saldoAnterior)}\n\n`, styles: { valign: 'top' } },
        { content: `\n${f(saldoFinal)}\n`, styles: { valign: 'top' } }
      ],
      [
        { content: '\nTRANSFERENCIAS\nMÁS\nTransferencias del mes detalladas en inf. caja\nPASAPORTES\nPOR EXPEDICION DE DOCUMENTOS DE IDENTIFICACION\nINGRESOS CONSULARES\n', styles: { valign: 'top' } },
        { content: `\n\n\n\n${f(totalPasaportes)}\n${f(totalDui)}\n${f(totalConsulares)}\n`, styles: { valign: 'top' } },
        { content: `\n\n\n${f(totalTransferenciasMas)}\n\n\n\n`, styles: { valign: 'top' } },
        { content: '', styles: { valign: 'top' } }
      ],
      [
        { content: '\nMENOS\nConcentración del mes detallada en Informe de Caja\nDébitos según Estado de Cuenta Bancario\n', styles: { valign: 'top' } },
        { content: `\n\n\n${f(totalConcentracion)}\n`, styles: { valign: 'top' } },
        { content: `\n\n${f(totalConcentracion)}\n\n`, styles: { valign: 'top' } },
        { content: '', styles: { valign: 'top' } }
      ],
      [{ content: 'TOTALES', styles: { fontStyle: 'bold', halign: 'center' } }, '', f(saldoFinal), f(saldoFinal)]
    ],
    theme: 'grid',
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, font: 'helvetica', textColor: 0, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 35, halign: 'right' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
    didParseCell: (data: any) => {
      // Remove horizontal lines for the CONCEPTO column (index 0) in the body except for the borders with header and footer.
      // row 0: top border but no bottom border
      // row 1: no top or bottom border
      // row 2: no top border, but bottom border (since TOTALES follows it)
      if (data.section === 'body' && data.column.index === 0) {
        if (data.row.index === 0) {
          data.cell.styles.lineWidth = { top: 0.1, right: 0.1, bottom: 0, left: 0.1 };
        } else if (data.row.index === 1) {
          data.cell.styles.lineWidth = { top: 0, right: 0.1, bottom: 0, left: 0.1 };
        } else if (data.row.index === 2) {
          data.cell.styles.lineWidth = { top: 0, right: 0.1, bottom: 0.1, left: 0.1 };
        }
      }
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY || 100;

  if (finalY + 40 > doc.internal.pageSize.height) {
    doc.addPage();
    finalY = 20;
  }

  const signatureY = finalY + 15;
  
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
  return { blob, filename: `Control_Saldos_${month}_${year}.pdf`, signatureY };
}

export async function generateSaldosExcel(records: any[], saldoAnteriorParam: number, month: number, year: number, settings: Record<string, string> = {}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Saldos');

  const centerAlign: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A1:D1');
  worksheet.getCell('A1').value = 'DIRECCION GENERAL DE TESORERIA';
  worksheet.getCell('A1').font = { bold: true, size: 9 };
  worksheet.getCell('A1').alignment = centerAlign;
  
  worksheet.mergeCells('A2:D2');
  worksheet.getCell('A2').value = 'DEPARTAMENTO DE INGRESOS DE COLECTURIAS DE ADUANA';
  worksheet.getCell('A2').font = { bold: true, size: 9 };
  worksheet.getCell('A2').alignment = centerAlign;

  worksheet.mergeCells('A3:D3');
  worksheet.getCell('A3').value = 'REPORTE CONTROL DE SALDOS POR TRANSFERENCIAS CABLEGRAFICAS DE CONSULADOS';
  worksheet.getCell('A3').font = { bold: true, size: 9 };
  worksheet.getCell('A3').alignment = centerAlign;

  worksheet.mergeCells('A4:D4');
  worksheet.getCell('A4').value = `FECHA:         ${getMonthNameSpanish(month).toLowerCase()}/${year}`;
  worksheet.getCell('A4').font = { bold: true, size: 9 };
  worksheet.getCell('A4').alignment = centerAlign;

  worksheet.addRow([]); // A5 empty

  const bancoCuenta = settings.caja_banco_cuenta || '11-005225-1';
  const bancoNombre = settings.caja_banco_nombre || 'BANCO CUSCATLAN DE EL SALVADOR';

  const subheaderRow = worksheet.addRow([`BANCO:      ${bancoNombre}   CUENTA BANCARIA:  ${bancoCuenta}`, '', `FECHA ELABORACIÓN: ${getMetadataString()}`]);
  worksheet.mergeCells(`A${subheaderRow.number}:B${subheaderRow.number}`);
  worksheet.mergeCells(`C${subheaderRow.number}:D${subheaderRow.number}`);
  subheaderRow.getCell(1).font = { size: 8 };
  subheaderRow.getCell(3).font = { size: 8 };
  subheaderRow.getCell(3).alignment = { horizontal: 'right' };

  const headerRow = worksheet.addRow(['CONCEPTO', 'PARCIAL', 'TESORERIA', 'BANCO']);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 8 };
    cell.alignment = centerAlign;
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  let saldoFinal = 0;
  let totalPasaportes = 0;
  let totalDui = 0;
  let totalConsulares = 0;
  let totalConcentracion = 0;

  records.forEach(r => {
    const dMonth = new Date(r.depositDate).getMonth() + 1;
    const dYear = new Date(r.depositDate).getFullYear();
    
    if (dMonth === month && dYear === year) {
      totalPasaportes += r.passportValue;
      totalDui += r.duiValue;
      totalConsulares += r.consularValue;
      
      let isNextMonth = false;
      if (r.concentrationDate) {
        const cMonth = new Date(r.concentrationDate).getMonth() + 1;
        const cYear = new Date(r.concentrationDate).getFullYear();
        if ((month === 12 && cMonth === 1 && cYear === year + 1) || (month < 12 && cMonth === month + 1 && cYear === year)) {
          isNextMonth = true;
        }
      } else {
         isNextMonth = true; 
      }
      if (isNextMonth) {
        saldoFinal += r.depositAmount;
      }
    }

    if (r.concentrationDate) {
      const cMonth = new Date(r.concentrationDate).getMonth() + 1;
      const cYear = new Date(r.concentrationDate).getFullYear();
      if (cMonth === month && cYear === year) {
        totalConcentracion += r.depositAmount;
      }
    }
  });

  const totalTransferenciasMas = totalPasaportes + totalDui + totalConsulares;
  const saldoAnterior = saldoFinal + totalConcentracion - totalTransferenciasMas;

  const addRow = (c1: string, c2: number|string, c3: number|string, c4: number|string, bold1 = false, boldRow = false) => {
    const row = worksheet.addRow([c1, c2, c3, c4]);
    row.eachCell((cell, colNum) => {
      cell.font = { size: 8, bold: boldRow || (colNum === 1 && bold1) };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      if (colNum > 1 && typeof cell.value === 'number') {
        cell.numFmt = '"$"#,##0.00';
      }
    });
    return row;
  };

  addRow('SALDO ANTERIOR', '', saldoAnterior, '', true);
  addRow('SALDO FINAL DE BANCO', saldoFinal, '', saldoFinal, true);
  addRow('TRANSFERENCIAS', '', '', '', true);
  addRow('MÁS', '', '', '', true);
  addRow('Transferencias del mes detalladas en inf. caja', '', totalTransferenciasMas, '');
  addRow('PASAPORTES', totalPasaportes, '', '');
  addRow('POR EXPEDICION DE DOCUMENTOS DE IDENTIFICACION', totalDui, '', '');
  addRow('INGRESOS CONSULARES', totalConsulares, '', '');
  addRow('MENOS', '', '', '', true);
  addRow('Concentración del mes detallada en Informe de Caja', '', totalConcentracion, '');
  addRow('Débitos según Estado de Cuenta Bancario', totalConcentracion, '', '');
  addRow('TOTALES', '', saldoFinal, saldoFinal, true, true).getCell(1).alignment = { horizontal: 'center' };

  worksheet.columns = [
    { width: 55 }, { width: 20 }, { width: 20 }, { width: 20 }
  ];

  for(let i=0; i<4; i++) worksheet.addRow([]);

  const elabNombre = settings.firma_elaboro_nombre || 'JOSE MARLON AVILES CHACON';
  const elabCargo = settings.firma_elaboro_cargo || 'TECNICO DE CONCENTRACIONES';
  const aprobNombre = settings.firma_aprobo_nombre || 'HUGO ORLANDO MARTINEZ PARADA';
  const aprobCargo = settings.firma_aprobo_cargo || 'JEFE DEPTO. DE INGRESOS DE COLECTURIAS DE ADUANAS';

  const sigRow1 = worksheet.addRow(['ELABORO:', '', '', 'APROBO:']);
  const sigRow2 = worksheet.addRow([elabNombre, '', '', aprobNombre]);
  const sigRow3 = worksheet.addRow([elabCargo, '', '', aprobCargo]);

  [sigRow1, sigRow2, sigRow3].forEach(row => {
    row.getCell(1).font = { size: 8 };
    row.getCell(4).font = { size: 8 };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return { blob: new Blob([buffer]), filename: `Saldos_${month}_${year}.xlsx` };
}
