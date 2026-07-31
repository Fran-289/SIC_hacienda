import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getMonthNameSpanish, formatCurrency, getMetadataString } from '../utils';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

export async function generateCajaPDF(records: any[], saldoAnteriorRecords: any[], month: number, year: number, settings: Record<string, string> = {}) {
  const doc = new jsPDF({ orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;

  const monthName = getMonthNameSpanish(month).toLowerCase();
  const estado = (settings.estado_informe || 'PRELIMINAR').toUpperCase();
  const informeNum = settings.informe_num || month.toString();

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  
  doc.text('MINISTERIO DE HACIENDA', pageWidth / 2, 15, { align: 'center' });
  doc.text('DIRECCION GENERAL DE TESORERIA', pageWidth / 2, 20, { align: 'center' });
  doc.text('DEPARTAMENTO DE INGRESOS DE COLECTURIAS DE ADUANA', pageWidth / 2, 25, { align: 'center' });
  
  doc.text(`INFORME DE CAJA FONDOS PROVENIENTES DEL EXTERIOR N°:      ${informeNum}`, pageWidth / 2, 30, { align: 'center' });
  doc.text(`TRANSFERENCIAS DE :     ${monthName}/${year}`, pageWidth / 2, 35, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Pag. 1 de 1`, pageWidth - margin, 15, { align: 'right' });

  const bancoCuenta = settings.caja_banco_cuenta || '00-11-005225-1';
  const bancoNombre = settings.caja_banco_nombre || 'BANCO CUSCATLAN DE EL SALVADOR';

  // Subheaders exactly as originally positioned
  doc.text(`BANCO: ${bancoNombre}`, margin, 42);
  doc.text(`CUENTA: ${bancoCuenta}`, margin + 70, 42);
  doc.text(`ESTADO: ${estado}`, margin, 46);
  doc.text(`FECHA ELABORACIÓN: ${getMetadataString()}`, pageWidth - margin, 46, { align: 'right' });

  let totalSaldoAnterior = 0;
  let totalPasaportes = 0;
  let totalDui = 0;
  let totalConsulares = 0;
  let totalConcentracion = 0;
  let totalSaldoPendiente = 0;

  const concentraciones: Record<string, number> = {};
  
  saldoAnteriorRecords.forEach(r => {
     totalSaldoAnterior += r.depositAmount;
     if (r.concentrationDate) {
        const d = format(new Date(r.concentrationDate), 'dd/MM/yyyy');
        if (!concentraciones[d]) concentraciones[d] = 0;
        concentraciones[d] += r.depositAmount;
     }
  });

  records.forEach(r => {
     totalPasaportes += r.passportValue;
     totalDui += r.duiValue;
     totalConsulares += r.consularValue;
     
     let isNextMonth = false;
     if (r.concentrationDate) {
        const cMonth = new Date(r.concentrationDate).getMonth() + 1;
        const cYear = new Date(r.concentrationDate).getFullYear();
        if ((month === 12 && cMonth === 1 && cYear === year + 1) || (month < 12 && cMonth === month + 1 && cYear === year)) {
           isNextMonth = true;
        } else if (cMonth === month && cYear === year) {
           const d = format(new Date(r.concentrationDate), 'dd/MM/yyyy');
           if (!concentraciones[d]) concentraciones[d] = 0;
           concentraciones[d] += r.depositAmount;
        } else {
           isNextMonth = true; // some other month? shouldn't happen based on route, but treat as pending
        }
     } else {
        isNextMonth = true;
     }
     
     if (isNextMonth) {
        totalSaldoPendiente += r.depositAmount;
     }
  });

  const totalIngresos = totalPasaportes + totalDui + totalConsulares;
  totalConcentracion = Object.values(concentraciones).reduce((a, b) => a + b, 0);

  const totalDebe = totalSaldoAnterior + totalIngresos;
  const totalHaber = totalConcentracion + totalSaldoPendiente;

  const f = (val: number) => `$       ${formatCurrency(val).replace('$', '')}`;

  const bodyData: any[] = [];
  
  bodyData.push(['', '', 'SALDO ANTERIOR', '', f(totalSaldoAnterior), '']);
  saldoAnteriorRecords.forEach(r => {
    const depStr = format(new Date(r.depositDate), 'dd/MM/yyyy');
    const concStr = r.concentrationDate ? format(new Date(r.concentrationDate), 'dd/MM/yyyy') : '-';
    bodyData.push(['', '', `      Transferencia del:   ${depStr} Concentración de   ${concStr}`, f(r.depositAmount), '', '']);
  });
  
  bodyData.push(['', '', '', '', '', '']);
  bodyData.push(['', '', '', '', '', '']);
  bodyData.push(['', '', 'TOTAL INGRESOS', '', f(totalIngresos), '']);
  bodyData.push(['', '12106', 'PASAPORTES', f(totalPasaportes), '', '']);
  bodyData.push(['', '14297', 'DUI DEL EXTERIOR', f(totalDui), '', '']);
  bodyData.push(['', '12209', 'CONSULARES', f(totalConsulares), '', '']);
  bodyData.push(['', '', '', '', '', '']);
  bodyData.push(['', '', '', '', '', '']);

  bodyData.push(['', '', 'CONCENTRACION DE FONDOS AL BCR', '', '', f(totalConcentracion)]);
  // Sort concentrations by date
  const sortedDates = Object.keys(concentraciones).sort((a, b) => {
      const [d1, m1, y1] = a.split('/').map(Number);
      const [d2, m2, y2] = b.split('/').map(Number);
      return new Date(y1, m1-1, d1).getTime() - new Date(y2, m2-1, d2).getTime();
  });

  sortedDates.forEach(date => {
     bodyData.push(['', '', `FECHA DE CONCENTRACION AL BCR                     ${date}`, f(concentraciones[date]), '', '']);
  });

  bodyData.push(['', '', '', '', '', '']);
  bodyData.push(['', '', '', '', '', '']);
  bodyData.push(['', '', 'SALDO PENDIENTE DE REMESAR', '', '', f(totalSaldoPendiente)]);
  
  records.forEach(r => {
     let isNextMonth = false;
     if (r.concentrationDate) {
        const cMonth = new Date(r.concentrationDate).getMonth() + 1;
        const cYear = new Date(r.concentrationDate).getFullYear();
        if ((month === 12 && cMonth === 1 && cYear === year + 1) || (month < 12 && cMonth === month + 1 && cYear === year)) {
           isNextMonth = true;
        } else if (cMonth !== month || cYear !== year) {
           isNextMonth = true;
        }
     } else {
        isNextMonth = true;
     }

     if (isNextMonth) {
        const depStr = format(new Date(r.depositDate), 'dd/MM/yyyy');
        const concStr = r.concentrationDate ? format(new Date(r.concentrationDate), 'dd/MM/yyyy') : '-';
        bodyData.push(['', '', `      Transferencia del:   ${depStr} Concentración de   ${concStr}`, f(r.depositAmount), '', '']);
     }
  });

  // add empty lines to fill up
  for(let i=0; i<3; i++) {
     bodyData.push(['', '', '', '', '', '']);
  }
  
  bodyData.push(['', '', '', '', f(totalDebe), f(totalHaber)]);

  autoTable(doc, {
    startY: 49,
    head: [['CODIGO\nCONTABLE', 'CODIGO\nPRESUPUESTARIO', 'CONCEPTO', 'CANTIDADES\nPARCIALES', 'DEBE', 'HABER']],
    body: bodyData,
    theme: 'grid',
    styles: { fontSize: 7, font: 'helvetica', textColor: 0, cellPadding: 1, lineColor: [0, 0, 0] },
    headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', halign: 'center', lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 25 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' }
    },
    didParseCell: (data) => {
      // Bold certain rows
      const concept = (data.row.raw as any)[2] as string;
      if (typeof concept === 'string' && (
          concept === 'SALDO ANTERIOR' || 
          concept === 'TOTAL INGRESOS' || 
          concept === 'CONCENTRACION DE FONDOS AL BCR' || 
          concept === 'SALDO PENDIENTE DE REMESAR')) {
        data.cell.styles.fontStyle = 'bold';
      }
      
      if (data.section === 'body') {
        let top = 0;
        let bottom = 0;
        if (data.row.index === 0) top = 0.1;
        if (data.row.index === bodyData.length - 1) {
           top = 0.1;
           bottom = 0.1;
           data.cell.styles.fontStyle = 'bold';
        }
        data.cell.styles.lineWidth = { top, right: 0.1, bottom, left: 0.1 };
      }
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY || 100;
  
  if (finalY + 45 > doc.internal.pageSize.height) {
    doc.addPage();
    finalY = 20;
  }

  const signatureY = finalY + 20;

  const elabNombre = settings.firma_elaboro_nombre || 'JOSE MARLON AVILES CHACON';
  const elabCargo = settings.firma_elaboro_cargo || 'TECNICO DE CONCENTRACIONES';
  const aprobNombre = settings.firma_aprobo_nombre || 'HUGO ORLANDO MARTINEZ PARADA';
  const aprobCargo = settings.firma_aprobo_cargo || 'JEFE DE DEPARTAMENTO DE INGRESOS DE COLECTURIAS DE ADUANAS';

  doc.setFontSize(8);
  doc.text('ELABORO:', margin, signatureY);
  doc.text(elabNombre, margin, signatureY + 15);
  doc.text(elabCargo, margin, signatureY + 20);

  doc.text('AUTORIZO:', pageWidth / 2, signatureY);
  doc.text(aprobNombre, pageWidth / 2, signatureY + 15);
  const splitCargo = doc.splitTextToSize(aprobCargo, (pageWidth / 2) - margin);
  doc.text(splitCargo, pageWidth / 2, signatureY + 20);

  const arrayBuffer = doc.output('arraybuffer');
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  return { blob, filename: `Caja_${month}_${year}.pdf`, signatureY };
}

export async function generateCajaExcel(records: any[], saldoAnteriorRecords: any[], month: number, year: number, settings: Record<string, string> = {}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Informe de Caja');

  const centerAlign: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };

  const estado = (settings.estado_informe || 'PRELIMINAR').toUpperCase();
  const informeNum = settings.informe_num || month.toString();

  worksheet.mergeCells('A1:F1');
  worksheet.getCell('A1').value = 'MINISTERIO DE HACIENDA';
  worksheet.getCell('A1').font = { bold: true, size: 9 };
  worksheet.getCell('A1').alignment = centerAlign;
  
  worksheet.mergeCells('A2:F2');
  worksheet.getCell('A2').value = 'DIRECCION GENERAL DE TESORERIA';
  worksheet.getCell('A2').font = { bold: true, size: 9 };
  worksheet.getCell('A2').alignment = centerAlign;

  worksheet.mergeCells('A3:F3');
  worksheet.getCell('A3').value = 'DEPARTAMENTO DE INGRESOS DE COLECTURIAS DE ADUANA';
  worksheet.getCell('A3').font = { bold: true, size: 9 };
  worksheet.getCell('A3').alignment = centerAlign;

  worksheet.mergeCells('A4:F4');
  worksheet.getCell('A4').value = `INFORME DE CAJA FONDOS PROVENIENTES DEL EXTERIOR N°:      ${informeNum}`;
  worksheet.getCell('A4').font = { bold: true, size: 9 };
  worksheet.getCell('A4').alignment = centerAlign;

  const monthName = getMonthNameSpanish(month).toLowerCase();
  worksheet.mergeCells('A5:F5');
  worksheet.getCell('A5').value = `TRANSFERENCIAS DE :     ${monthName}/${year}`;
  worksheet.getCell('A5').font = { bold: true, size: 9 };
  worksheet.getCell('A5').alignment = centerAlign;

  worksheet.addRow([]); // A6 empty

  const bancoCuenta = settings.caja_banco_cuenta || '00-11-005225-1';
  const bancoNombre = settings.caja_banco_nombre || 'BANCO CUSCATLAN DE EL SALVADOR';

  const subheaderRow = worksheet.addRow([`BANCO: ${bancoNombre}`, '', `CUENTA: ${bancoCuenta}`, `ESTADO: ${estado}`, '', `FECHA ELABORACIÓN: ${getMetadataString()}`]);
  worksheet.mergeCells(`A${subheaderRow.number}:B${subheaderRow.number}`);
  worksheet.mergeCells(`D${subheaderRow.number}:E${subheaderRow.number}`);
  subheaderRow.eachCell(cell => {
    cell.font = { size: 8 };
  });
  subheaderRow.getCell(6).alignment = { horizontal: 'right' };

  const headerRow = worksheet.addRow(['CODIGO CONTABLE', 'CODIGO PRESUPUESTARIO', 'CONCEPTO', 'CANTIDADES PARCIALES', 'DEBE', 'HABER']);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 8 };
    cell.alignment = centerAlign;
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  // Calculation is same as PDF
  let totalSaldoAnterior = 0;
  let totalPasaportes = 0;
  let totalDui = 0;
  let totalConsulares = 0;
  let totalConcentracion = 0;
  let totalSaldoPendiente = 0;

  const concentraciones: Record<string, number> = {};
  
  saldoAnteriorRecords.forEach(r => {
     totalSaldoAnterior += r.depositAmount;
     if (r.concentrationDate) {
        const d = format(new Date(r.concentrationDate), 'dd/MM/yyyy');
        if (!concentraciones[d]) concentraciones[d] = 0;
        concentraciones[d] += r.depositAmount;
     }
  });

  records.forEach(r => {
     totalPasaportes += r.passportValue;
     totalDui += r.duiValue;
     totalConsulares += r.consularValue;
     
     let isNextMonth = false;
     if (r.concentrationDate) {
        const cMonth = new Date(r.concentrationDate).getMonth() + 1;
        const cYear = new Date(r.concentrationDate).getFullYear();
        if ((month === 12 && cMonth === 1 && cYear === year + 1) || (month < 12 && cMonth === month + 1 && cYear === year)) {
           isNextMonth = true;
        } else if (cMonth === month && cYear === year) {
           const d = format(new Date(r.concentrationDate), 'dd/MM/yyyy');
           if (!concentraciones[d]) concentraciones[d] = 0;
           concentraciones[d] += r.depositAmount;
        } else {
           isNextMonth = true;
        }
     } else {
        isNextMonth = true;
     }
     
     if (isNextMonth) {
        totalSaldoPendiente += r.depositAmount;
     }
  });

  const totalIngresos = totalPasaportes + totalDui + totalConsulares;
  totalConcentracion = Object.values(concentraciones).reduce((a, b) => a + b, 0);

  const totalDebe = totalSaldoAnterior + totalIngresos;
  const totalHaber = totalConcentracion + totalSaldoPendiente;

  const addRow = (c1: string, c2: string, c3: string, c4: number|string, c5: number|string, c6: number|string, bold = false) => {
    const row = worksheet.addRow([c1, c2, c3, c4, c5, c6]);
    row.eachCell((cell, colNum) => {
      cell.font = { size: 8, bold: bold || (colNum === 3 && bold) };
      // Vertical borders only (simulate PDF)
      cell.border = { left: { style: 'thin' }, right: { style: 'thin' } };
      if (colNum >= 4 && typeof cell.value === 'number') {
        cell.numFmt = '"$"#,##0.00';
      }
    });
    return row;
  };

  addRow('', '', 'SALDO ANTERIOR', '', totalSaldoAnterior, '', true);
  saldoAnteriorRecords.forEach(r => {
    const depStr = format(new Date(r.depositDate), 'dd/MM/yyyy');
    const concStr = r.concentrationDate ? format(new Date(r.concentrationDate), 'dd/MM/yyyy') : '-';
    addRow('', '', `      Transferencia del:   ${depStr} Concentración de   ${concStr}`, r.depositAmount, '', '');
  });
  
  addRow('', '', '', '', '', '');
  addRow('', '', '', '', '', '');
  addRow('', '', 'TOTAL INGRESOS', '', totalIngresos, '', true);
  addRow('', '12106', 'PASAPORTES', totalPasaportes, '', '');
  addRow('', '14297', 'DUI DEL EXTERIOR', totalDui, '', '');
  addRow('', '12209', 'CONSULARES', totalConsulares, '', '');
  addRow('', '', '', '', '', '');
  addRow('', '', '', '', '', '');

  addRow('', '', 'CONCENTRACION DE FONDOS AL BCR', '', '', totalConcentracion, true);
  const sortedDates = Object.keys(concentraciones).sort((a, b) => {
      const [d1, m1, y1] = a.split('/').map(Number);
      const [d2, m2, y2] = b.split('/').map(Number);
      return new Date(y1, m1-1, d1).getTime() - new Date(y2, m2-1, d2).getTime();
  });

  sortedDates.forEach(date => {
     addRow('', '', `FECHA DE CONCENTRACION AL BCR                     ${date}`, concentraciones[date], '', '');
  });

  addRow('', '', '', '', '', '');
  addRow('', '', '', '', '', '');
  addRow('', '', 'SALDO PENDIENTE DE REMESAR', '', '', totalSaldoPendiente, true);
  
  records.forEach(r => {
     let isNextMonth = false;
     if (r.concentrationDate) {
        const cMonth = new Date(r.concentrationDate).getMonth() + 1;
        const cYear = new Date(r.concentrationDate).getFullYear();
        if ((month === 12 && cMonth === 1 && cYear === year + 1) || (month < 12 && cMonth === month + 1 && cYear === year)) {
           isNextMonth = true;
        } else if (cMonth !== month || cYear !== year) {
           isNextMonth = true;
        }
     } else {
        isNextMonth = true;
     }

     if (isNextMonth) {
        const depStr = format(new Date(r.depositDate), 'dd/MM/yyyy');
        const concStr = r.concentrationDate ? format(new Date(r.concentrationDate), 'dd/MM/yyyy') : '-';
        addRow('', '', `      Transferencia del:   ${depStr} Concentración de   ${concStr}`, r.depositAmount, '', '');
     }
  });

  for(let i=0; i<3; i++) {
     addRow('', '', '', '', '', '');
  }
  
  const totalRow = addRow('', '', '', '', totalDebe, totalHaber, true);
  totalRow.eachCell(c => c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } });

  worksheet.columns = [
    { width: 15 }, { width: 25 }, { width: 55 }, { width: 25 }, { width: 25 }, { width: 25 }
  ];

  for(let i=0; i<4; i++) worksheet.addRow([]);

  const elabNombre = settings.firma_elaboro_nombre || 'JOSE MARLON AVILES CHACON';
  const elabCargo = settings.firma_elaboro_cargo || 'TECNICO DE CONCENTRACIONES';
  const aprobNombre = settings.firma_aprobo_nombre || 'HUGO ORLANDO MARTINEZ PARADA';
  const aprobCargo = settings.firma_aprobo_cargo || 'JEFE DE DEPARTAMENTO DE INGRESOS DE COLECTURIAS DE ADUANAS';

  const sigRow1 = worksheet.addRow(['ELABORO:', '', '', 'AUTORIZO:']);
  const sigRow2 = worksheet.addRow([elabNombre, '', '', aprobNombre]);
  const sigRow3 = worksheet.addRow([elabCargo, '', '', aprobCargo]);

  [sigRow1, sigRow2, sigRow3].forEach(row => {
    row.getCell(1).font = { size: 8 };
    row.getCell(4).font = { size: 8 };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return { blob: new Blob([buffer]), filename: `Caja_${month}_${year}.xlsx` };
}
