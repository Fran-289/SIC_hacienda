import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { getMonthNameSpanish, formatCurrency, getMetadataString } from '../utils';
import ExcelJS from 'exceljs';

export async function generateNoIdentificadosPDF(records: any[], month: number, year: number, settings: Record<string, string> = {}) {
  const doc = new jsPDF({ orientation: 'portrait' });
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;

  const formatZeroAsDash = (val: number) => {
    if (!val || val === 0) return '$        -';
    return formatCurrency(val);
  };

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  
  doc.text('MINISTERIO DE HACIENDA', pageWidth / 2, 15, { align: 'center' });
  doc.text('DIRECCION GENERAL DE TESORERIA', pageWidth / 2, 20, { align: 'center' });
  doc.text('DEPARTAMENTO DE INGRESOS DE COLECTURIAS DE ADUANA', pageWidth / 2, 25, { align: 'center' });
  doc.text('REPORTE DE INGRESOS SIN IDENTIFICAR', pageWidth / 2, 30, { align: 'center' });
  
  // Use lowercase month string as in prototype (e.g. diciembre/2021)
  const monthName = getMonthNameSpanish(month).toLowerCase();
  doc.text(`PERIODO:              ${monthName}/${year}`, pageWidth / 2, 35, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Pag. 1 de 1`, pageWidth - margin, 15, { align: 'right' });

  const bodyData: any[] = [];
  let totalValor = 0;
  let totalPasaporte = 0;
  let totalDui = 0;
  let totalSaldo = 0;

  records.forEach(r => {
    const val = r.depositAmount || 0;
    const pas = r.passportValue || 0;
    const dui = r.duiValue || 0;
    const saldo = val - pas - dui;

    totalValor += val;
    totalPasaporte += pas;
    totalDui += dui;
    totalSaldo += saldo;

    bodyData.push([
      format(new Date(r.depositDate), 'dd/MM/yyyy'),
      formatCurrency(val),
      r.location || r.country || r.region || 'NO IDENTIFICADO',
      formatZeroAsDash(pas),
      formatZeroAsDash(dui),
      formatCurrency(saldo)
    ]);
  });

  // Total Row
  bodyData.push([
    '',
    '',
    '',
    formatZeroAsDash(totalPasaporte),
    formatZeroAsDash(totalDui),
    formatCurrency(totalSaldo)
  ]);

  autoTable(doc, {
    startY: 45,
    head: [['FECHA DE\nINGRESO', 'VALOR', 'PROCEDENCIA', 'PASAPORTE', 'DUI', 'SALDO']],
    body: bodyData,
    theme: 'plain',
    styles: { fontSize: 8, font: 'helvetica', textColor: 0, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: { top: 0, right: 0.1, bottom: 0, left: 0.1 } },
    headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', halign: 'center', lineWidth: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 } },
    footStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', lineWidth: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 } },
    willDrawCell: function(data) {
        if (data.section === 'body') {
            if (data.row.index === bodyData.length - 1) {
                data.cell.styles.lineWidth = { top: 0, right: 0.1, bottom: 0.1, left: 0.1 };
                data.cell.styles.fontStyle = 'bold';
            }
        }
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 45;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const reglaText = "Atentamente: ";
  const splitText = doc.splitTextToSize(reglaText, pageWidth - (margin * 2));
  doc.text(splitText, margin, finalY + 20);

  const arrayBuffer = doc.output('arraybuffer');
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  return { blob, filename: `ReporteSinIdentificar_${month}_${year}.pdf` };
}

export async function generateNoIdentificadosExcel(records: any[], month: number, year: number, settings: Record<string, string> = {}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('No Identificados');

  const centerAlign: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('A1:F1');
  worksheet.getCell('A1').value = 'MINISTERIO DE HACIENDA';
  worksheet.getCell('A1').font = { bold: true, size: 9 };
  worksheet.getCell('A1').alignment = centerAlign;
  
  worksheet.mergeCells('A2:F2');
  worksheet.getCell('A2').value = 'DIRECCIÓN GENERAL DE TESORERIA';
  worksheet.getCell('A2').font = { bold: true, size: 9 };
  worksheet.getCell('A2').alignment = centerAlign;

  worksheet.mergeCells('A3:F3');
  worksheet.getCell('A3').value = 'DEPARTAMENTO DE INGRESOS DE COLECTURIAS DE ADUANA';
  worksheet.getCell('A3').font = { bold: true, size: 9 };
  worksheet.getCell('A3').alignment = centerAlign;

  worksheet.mergeCells('A4:F4');
  worksheet.getCell('A4').value = 'FONDOS NO IDENTIFICADOS INGRESADOS A CUENTA TRANSFERENCIAS EN EL EXTERIOR 00-11-005225-1';
  worksheet.getCell('A4').font = { bold: true, size: 9 };
  worksheet.getCell('A4').alignment = centerAlign;

  worksheet.mergeCells('A5:F5');
  worksheet.getCell('A5').value = `${getMonthNameSpanish(month)}/${year}`;
  worksheet.getCell('A5').font = { bold: true, size: 9 };
  worksheet.getCell('A5').alignment = centerAlign;

  worksheet.addRow([]); // A6 empty

  const subheaderRow = worksheet.addRow(['DEFINITIVO', '', '', '', '', `FECHA ELABORACIÓN: ${getMetadataString()}`]);
  subheaderRow.getCell(1).font = { size: 8 };
  subheaderRow.getCell(6).font = { size: 8 };
  subheaderRow.getCell(6).alignment = { horizontal: 'right' };

  const headerRow = worksheet.addRow(['FECHA DE INGRESO', 'VALOR', 'PROCEDENCIA', 'PASAPORTE', 'DUI', 'SALDO']);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 8 };
    cell.alignment = centerAlign;
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  let totalGeneral = 0;
  
  records.forEach(r => {
    totalGeneral += r.depositAmount;
    const row = worksheet.addRow([
      format(new Date(r.depositDate), 'dd/MM/yyyy'),
      r.depositAmount,
      r.location || r.country || r.region || 'NO IDENTIFICADO',
      r.passportValue > 0 ? r.passportValue : '',
      r.duiValue > 0 ? r.duiValue : '',
      r.depositAmount
    ]);

    row.eachCell((cell, colNum) => {
      cell.font = { size: 8 };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      if (colNum === 2 || colNum === 4 || colNum === 5 || colNum === 6) {
        if (typeof cell.value === 'number') {
          cell.numFmt = '"$"#,##0.00';
        }
      }
    });
  });

  const grandTotalRow = worksheet.addRow(['TOTAL GENERAL', totalGeneral, '', '', '', totalGeneral]);
  grandTotalRow.eachCell((cell, colNum) => {
    cell.font = { bold: true, size: 8 };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    if (colNum === 2 || colNum === 6) cell.numFmt = '"$"#,##0.00';
  });

  worksheet.columns = [
    { width: 15 }, { width: 15 }, { width: 35 }, { width: 15 }, { width: 15 }, { width: 15 }
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return { blob: new Blob([buffer]), filename: `NoIdentificados_${month}_${year}.xlsx` };
}
