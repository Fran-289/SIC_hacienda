import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getMonthNameSpanish, getMonthNameEnglish, formatCurrency, getMetadataString } from '../utils';
import { format } from 'date-fns';

export async function generateTransferenciasExcel(records: any[], month: number, year: number, settings: Record<string, string> = {}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Transferencias Cablegraficas');

  // Page Setup for landscape
  worksheet.pageSetup.orientation = 'landscape';
  worksheet.pageSetup.margins = { left: 0.25, right: 0.25, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 };

  // Helper for centering
  const centerAlign: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };

  // Headers
  worksheet.mergeCells('A1:M1');
  worksheet.getCell('A1').value = 'MINISTERIO DE HACIENDA';
  worksheet.getCell('A1').font = { bold: true, size: 12 };
  worksheet.getCell('A1').alignment = centerAlign;

  worksheet.mergeCells('A2:M2');
  worksheet.getCell('A2').value = 'DIRECCIÓN GENERAL DE TESORERIA';
  worksheet.getCell('A2').font = { bold: true, size: 11 };
  worksheet.getCell('A2').alignment = centerAlign;

  worksheet.mergeCells('A3:M3');
  worksheet.getCell('A3').value = 'DEPARTAMENTO DE INGRESOS DE COLECTURIAS DE ADUANA';
  worksheet.getCell('A3').font = { bold: true, size: 11 };
  worksheet.getCell('A3').alignment = centerAlign;

  worksheet.mergeCells('A4:M4');
  worksheet.getCell('A4').value = 'CUADRO CONTROL DE INGRESOS TRANSFERENCIAS CABLEGRAFICAS';
  worksheet.getCell('A4').font = { bold: true, size: 11 };
  worksheet.getCell('A4').alignment = centerAlign;

  worksheet.mergeCells('A5:M5');
  worksheet.getCell('A5').value = `MES: ${getMonthNameSpanish(month).toUpperCase()} ${year}`;
  worksheet.getCell('A5').font = { bold: true, size: 10 };
  worksheet.getCell('A5').alignment = centerAlign;

  worksheet.addRow([]); // empty (row 6)

  // Add logos
  if (settings.logo_izquierdo) {
    const ext = settings.logo_izquierdo.startsWith('data:image/jpeg') ? 'jpeg' : 'png';
    const logoId = workbook.addImage({ base64: settings.logo_izquierdo, extension: ext });
    worksheet.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 100, height: 60 } });
  }
  if (settings.logo_derecho) {
    const ext = settings.logo_derecho.startsWith('data:image/jpeg') ? 'jpeg' : 'png';
    const logoId = workbook.addImage({ base64: settings.logo_derecho, extension: ext });
    worksheet.addImage(logoId, { tl: { col: 12, row: 0 }, ext: { width: 100, height: 60 } });
  }

  worksheet.getCell('L6').value = `FECHA ELABORACIÓN:   ${getMetadataString()}`;
  worksheet.getCell('L6').font = { size: 9 };
  worksheet.getCell('L6').alignment = { horizontal: 'right' };
  worksheet.mergeCells('L6:M6');

  // Columns Header
  const headers = [
    'ESTADO', 'REGION', 'PROCEDENCIA', 'FECHA DEPÓSITO', 'FECHA CONCENTRA', 'DIAS CONCENT.',
    'MONTO CONSULADO', 'MONTO COMISIÓN', 'MONTO CONCENTRADO', '12106 - PASAPORTE', '14297 - DUI', '12209 - CONSULARES', '15799 - INGRESOS DIVERSOS'
  ];
  
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 30;
  headerRow.eachCell((cell, colNumber) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }; // Light gray
    cell.font = { bold: true, size: 9 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  // Group by region (assuming region or country)
  const grouped = records.reduce((acc: any, r: any) => {
    let key = r.region || r.country || 'OTRO';
    key = key.toUpperCase().trim();
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const addRow = (values: any[], isBold: boolean = false, bgColor?: string) => {
    const row = worksheet.addRow(values);
    row.eachCell((cell, colNumber) => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.font = { size: 9, bold: isBold };
      cell.alignment = { vertical: 'middle', horizontal: colNumber > 3 ? 'center' : 'left' };
      if (bgColor) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      }
    });
    return row;
  };

  // 1. MES ANTERIOR (mock for now as per screenshot)
  addRow(['DEPOSITOS DEL MES ANTERIOR CONCENTRADOS EL PRESENTE MES', '', '', '', '', '', '', '', '', '', '', '', ''], true, 'FFEFEFEF');
  worksheet.mergeCells(`A${worksheet.rowCount}:M${worksheet.rowCount}`);
  
  const totalGeneralAnt = addRow(['Total general', '', '', '', '', '', '$-', '$-', '$-', '$-', '$-', '$-', '$-'], true);
  
  // 2. PRESENTE MES
  addRow(['DEPOSITOS E INGRESOS DEL PRESENTE MES', '', '', '', '', '', '', '', '', '', '', '', ''], true, 'FFEFEFEF');
  worksheet.mergeCells(`A${worksheet.rowCount}:M${worksheet.rowCount}`);

  let totalMonto = 0;
  let totalComision = 0;
  let totalConcentrado = 0;
  let totalPasaporte = 0;
  let totalDui = 0;
  let totalConsulares = 0;
  let totalDiversos = 0;

  for (const [region, items] of Object.entries(grouped)) {
    let subMonto = 0;
    let subComision = 0;
    let subConcentrado = 0;
    let subPasaporte = 0;
    let subDui = 0;
    let subConsulares = 0;
    const subDiversos = 0;

    let isFirst = true;

    (items as any[]).forEach((item, index) => {
      const concentrado = item.depositAmount; // Assuming concentrado is depositAmount
      subMonto += item.depositAmount;
      subComision += item.commissionValue;
      subConcentrado += concentrado;
      subPasaporte += item.passportValue;
      subDui += item.duiValue;
      subConsulares += item.consularValue;
      
      const rowVals = [
        isFirst ? `IDENTIFICADO ${region}` : '',
        region, // REGION column
        item.location ? `${item.location}, ${item.country}` : item.country,
        format(new Date(item.depositDate), 'M/d/yyyy'),
        item.concentrationDate ? format(new Date(item.concentrationDate), 'M/d/yyyy') : '',
        item.days || '1',
        formatCurrency(item.depositAmount),
        formatCurrency(item.commissionValue),
        formatCurrency(concentrado),
        formatCurrency(item.passportValue),
        formatCurrency(item.duiValue),
        formatCurrency(item.consularValue),
        formatCurrency(0) // Diversos
      ];
      addRow(rowVals);
      isFirst = false;
    });

    totalMonto += subMonto;
    totalComision += subComision;
    totalConcentrado += subConcentrado;
    totalPasaporte += subPasaporte;
    totalDui += subDui;
    totalConsulares += subConsulares;
    totalDiversos += subDiversos;

    addRow([
      `Total ${region}`, '', '', '', '', '',
      formatCurrency(subMonto), formatCurrency(subComision), formatCurrency(subConcentrado),
      formatCurrency(subPasaporte), formatCurrency(subDui), formatCurrency(subConsulares), formatCurrency(subDiversos)
    ], true);
  }

  // Totals
  addRow(['Total IDENTIFICADO DISTRIBUID', '', '', '', '', '',
    formatCurrency(totalMonto), formatCurrency(totalComision), formatCurrency(totalConcentrado),
    formatCurrency(totalPasaporte), formatCurrency(totalDui), formatCurrency(totalConsulares), formatCurrency(totalDiversos)
  ], true, 'FFEFEFEF');

  addRow(['Total general', '', '', '', '', '',
    formatCurrency(totalMonto), formatCurrency(totalComision), formatCurrency(totalConcentrado),
    formatCurrency(totalPasaporte), formatCurrency(totalDui), formatCurrency(totalConsulares), formatCurrency(totalDiversos)
  ], true);

  addRow(['Gran Total', '', '', '', '', '',
    formatCurrency(totalMonto), formatCurrency(totalComision), formatCurrency(totalConcentrado),
    formatCurrency(totalPasaporte), formatCurrency(totalDui), formatCurrency(totalConsulares), formatCurrency(totalDiversos)
  ], true);

  // 3. SIGUIENTE MES
  addRow(['CONCENTRADOS EL SIGUIENTE MES', '', '', '', '', '', '', '', '', '', '', '', ''], true, 'FFEFEFEF');
  worksheet.mergeCells(`A${worksheet.rowCount}:M${worksheet.rowCount}`);
  addRow(['Total general', '', '', '', '', '', '$-', '$-', '$-', '$-', '$-', '$-', '$-'], true);

  // Signatures
  worksheet.addRow([]);
  worksheet.addRow([]);
  
  const elabNombre = settings.firma_elaboro_nombre || 'JOSE MARLON AVILES CHACON';
  const elabCargo = settings.firma_elaboro_cargo || 'TECNICO DE CONCENTRACIONES';
  const aprobNombre = settings.firma_aprobo_nombre || 'HUGO ORLANDO MARTINEZ PARADA';
  const aprobCargo = settings.firma_aprobo_cargo || 'JEFE DEPTO. DE INGRESOS DE COLECTURIAS DE ADUANAS';

  const sr1 = worksheet.rowCount + 1;
  worksheet.addRow(['', 'ELABORO:', '', '', '', '', 'APROBO:']);
  worksheet.mergeCells(`B${sr1}:D${sr1}`);
  worksheet.mergeCells(`G${sr1}:J${sr1}`);
  
  const sr2 = worksheet.rowCount + 1;
  worksheet.addRow(['', elabNombre, '', '', '', '', aprobNombre]);
  worksheet.mergeCells(`B${sr2}:D${sr2}`);
  worksheet.mergeCells(`G${sr2}:J${sr2}`);
  
  const sr3 = worksheet.rowCount + 1;
  worksheet.addRow(['', elabCargo, '', '', '', '', aprobCargo]);
  worksheet.mergeCells(`B${sr3}:D${sr3}`);
  worksheet.mergeCells(`G${sr3}:J${sr3}`);

  // Adjust column widths
  worksheet.columns.forEach((col, i) => {
    if (i === 0) col.width = 25; // ESTADO
    else if (i === 1) col.width = 18;  // REGION
    else if (i === 2) col.width = 30; // PROCEDENCIA
    else if (i === 3 || i === 4) col.width = 12; // Fechas
    else col.width = 15; // Montos
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer]);
  const filename = `Transferencias_${month}_${year}.xlsx`;
  return { blob, filename };
}

export async function generateTransferenciasPDF(records: any[], month: number, year: number, settings: Record<string, string> = {}) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.width;
  const margin = 10;

  // Add logos
  if (settings.logo_izquierdo) {
    const ext = settings.logo_izquierdo.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
    doc.addImage(settings.logo_izquierdo, ext, margin, 10, 30, 18);
  }
  if (settings.logo_derecho) {
    const ext = settings.logo_derecho.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
    doc.addImage(settings.logo_derecho, ext, pageWidth - margin - 30, 10, 30, 18);
  }

  // Header Text
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  doc.text('MINISTERIO DE HACIENDA', pageWidth / 2, 15, { align: 'center' });
  doc.text('DIRECCIÓN GENERAL DE TESORERÍA', pageWidth / 2, 20, { align: 'center' });
  doc.text('DEPARTAMENTO DE INGRESOS DE COLECTURIAS DE ADUANAS', pageWidth / 2, 25, { align: 'center' });
  doc.text('CUADRO CONTROL DE INGRESOS TRANSFERENCIAS CABLEGRAFICAS', pageWidth / 2, 30, { align: 'center' });
  doc.text(`MES: ${getMonthNameSpanish(month).toUpperCase()} ${year}`, pageWidth / 2, 35, { align: 'center' });

  doc.setFontSize(7);
  doc.text(`FECHA ELABORACIÓN:   ${getMetadataString()}`, pageWidth - margin, 40, { align: 'right' });

  // Data processing (Group by country/region)
  const groupedData: Record<string, {
    records: any[],
    subtotal: { dep: number, pas: number, dui: number, con: number, com: number }
  }> = {};
  
  const totalGeneral = { dep: 0, pas: 0, dui: 0, con: 0, com: 0 };

  records.forEach(r => {
    let region = (r.region || 'OTROS').toUpperCase().trim();
    if (region === 'AMERICA DEL NORTE' || region === 'AMÉRICA DEL NORTE' || region === 'ESTADOS UNIDOS') {
      region = 'ESTADOS UNIDOS';
    }

    if (!groupedData[region]) {
      groupedData[region] = {
        records: [],
        subtotal: { dep: 0, pas: 0, dui: 0, con: 0, com: 0 }
      };
    }

    groupedData[region].records.push(r);
    groupedData[region].subtotal.dep += r.depositAmount;
    groupedData[region].subtotal.pas += r.passportValue;
    groupedData[region].subtotal.dui += r.duiValue;
    groupedData[region].subtotal.con += r.consularValue;
    groupedData[region].subtotal.com += r.commissionValue;

    totalGeneral.dep += r.depositAmount;
    totalGeneral.pas += r.passportValue;
    totalGeneral.dui += r.duiValue;
    totalGeneral.con += r.consularValue;
    totalGeneral.com += r.commissionValue;
  });

  const bodyData: any[] = [];
  let index = 1;

  for (const [region, data] of Object.entries(groupedData)) {
    data.records.forEach(r => {
      bodyData.push([
        index++,
        r.consulate,
        r.status || 'INGRESADO',
        r.period,
        r.noMgDocument || '',
        r.noConsularReceipt || '',
        format(new Date(r.depositDate), 'M/d/yyyy'),
        r.bank,
        formatCurrency(r.depositAmount),
        formatCurrency(r.passportValue),
        formatCurrency(r.duiValue),
        formatCurrency(r.consularValue),
        formatCurrency(r.commissionValue)
      ]);
    });

    bodyData.push([
      '', '', '', '', '', '', '',
      `SUBTOTAL IDENTIFICADO ${region}`,
      formatCurrency(data.subtotal.dep),
      formatCurrency(data.subtotal.pas),
      formatCurrency(data.subtotal.dui),
      formatCurrency(data.subtotal.con),
      formatCurrency(data.subtotal.com)
    ]);
    
    // Add blank row
    bodyData.push(['', '', '', '', '', '', '', '', '', '', '', '', '']);
  }

  bodyData.push([
    '', '', '', '', '', '', '',
    'TOTAL GENERAL',
    formatCurrency(totalGeneral.dep),
    formatCurrency(totalGeneral.pas),
    formatCurrency(totalGeneral.dui),
    formatCurrency(totalGeneral.con),
    formatCurrency(totalGeneral.com)
  ]);

  // Table
  autoTable(doc, {
    startY: 45,
    head: [[
      'N°', 'CONSULADO', 'ESTADO', 'MES AL QUE CORRESPONDE', 'N° DOCUMENTO MG', 'N° RECIBO INGRESO',
      'FECHA DEPOSITO/ REMESA BCR', 'BANCO/ INSTITUCION', 'TOTAL TRASFERENCIA O DEPOSITO',
      'PASAPORTES', 'DUI', 'CONSULARES', 'COMISIONES Y OTROS'
    ]],
    body: bodyData,
    theme: 'grid',
    styles: { fontSize: 6, font: 'helvetica', textColor: 0, cellPadding: 1 },
    headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', halign: 'center', lineWidth: 0.1, lineColor: 0 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { cellWidth: 20, halign: 'center' },
      7: { cellWidth: 35 },
      8: { cellWidth: 20, halign: 'right' },
      9: { cellWidth: 18, halign: 'right' },
      10: { cellWidth: 18, halign: 'right' },
      11: { cellWidth: 18, halign: 'right' },
      12: { cellWidth: 18, halign: 'right' }
    },
    didParseCell: (data) => {
      // Bold subtotal and total rows
      const isSubtotal = (data.row.raw as any)[7] && (data.row.raw as any)[7].toString().includes('SUBTOTAL');
      const isTotal = (data.row.raw as any)[7] && (data.row.raw as any)[7].toString() === 'TOTAL GENERAL';
      if (isSubtotal || isTotal) {
        data.cell.styles.fontStyle = 'bold';
        if (data.column.index < 7) {
          data.cell.styles.lineWidth = 0; // Hide left borders for totals
        }
      }
    }
  });

  // Signatures
  const finalY = (doc as any).lastAutoTable.finalY || 100;
  
  const elabNombre = settings.firma_elaboro_nombre || 'JOSE MARLON AVILES CHACON';
  const elabCargo = settings.firma_elaboro_cargo || 'TECNICO DE CONCENTRACIONES';
  const aprobNombre = settings.firma_aprobo_nombre || 'HUGO ORLANDO MARTINEZ PARADA';
  const aprobCargo = settings.firma_aprobo_cargo || 'JEFE DEPTO. DE INGRESOS DE COLECTURIAS DE ADUANAS';

  let sigY = finalY + 20;
  if (sigY > doc.internal.pageSize.height - 30) {
    doc.addPage();
    sigY = 20;
  }

  doc.setFontSize(8);
  doc.text('ELABORO:', margin + 30, sigY);
  doc.text(elabNombre, margin + 30, sigY + 15);
  doc.text(elabCargo, margin + 30, sigY + 20);

  doc.text('APROBO:', pageWidth / 2 + 30, sigY);
  doc.text(aprobNombre, pageWidth / 2 + 30, sigY + 15);
  doc.text(aprobCargo, pageWidth / 2 + 30, sigY + 20);

  const blob = doc.output('blob');
  const filename = `Transferencias_${month}_${year}.pdf`;
  return { blob, filename };
}
