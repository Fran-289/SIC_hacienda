import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, differenceInDays } from 'date-fns';
import { getMonthNameSpanish, formatCurrency } from '../utils';
import ExcelJS from 'exceljs';

export async function generateCablegraficasPDF(records: any[], month: number, year: number, settings: Record<string, string> = {}) {
  const doc = new jsPDF({ orientation: 'landscape' }); // Need landscape for many columns
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  
  doc.text('MINISTERIO DE HACIENDA', pageWidth / 2, 12, { align: 'center' });
  doc.text('DIRECCIÓN GENERAL DE TESORERIA', pageWidth / 2, 17, { align: 'center' });
  doc.text('DEPARTAMENTO DE INGRESOS DE COLECTURIAS DE ADUANA', pageWidth / 2, 22, { align: 'center' });
  doc.text('CUADRO CONTROL DE INGRESOS TRANSFERENCIAS CABLEGRAFICAS', pageWidth / 2, 27, { align: 'center' });
  doc.text(`${getMonthNameSpanish(month)}/${year}`, pageWidth / 2, 32, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const estado = (settings.estado_informe || 'PRELIMINAR').toUpperCase();
  doc.text(estado, margin, 35);
  doc.text(`FECHA ELABORACIÓN: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - margin, 35, { align: 'right' });

  // Separate records into the 3 sections
  const sec1Records: any[] = []; // prev month dep, curr month conc
  const sec2Records: any[] = []; // curr month dep, curr month conc
  const sec3Records: any[] = []; // curr month dep, next month conc or null

  records.forEach(r => {
    const dMonth = new Date(r.depositDate).getMonth() + 1;
    const dYear = new Date(r.depositDate).getFullYear();
    const cMonth = r.concentrationDate ? new Date(r.concentrationDate).getMonth() + 1 : -1;
    const cYear = r.concentrationDate ? new Date(r.concentrationDate).getFullYear() : -1;

    // Is deposit in previous month?
    const isPrevDep = (dYear === year && dMonth === month - 1) || (month === 1 && dYear === year - 1 && dMonth === 12);
    // Is deposit in current month?
    const isCurrDep = dYear === year && dMonth === month;
    // Is concentration in current month?
    const isCurrConc = cYear === year && cMonth === month;
    // Is concentration in next month or later?
    const isNextConc = !r.concentrationDate || (cYear === year && cMonth === month + 1) || (month === 12 && cYear === year + 1 && cMonth === 1);

    if (isPrevDep && isCurrConc) sec1Records.push(r);
    else if (isCurrDep && isCurrConc) sec2Records.push(r);
    else if (isCurrDep && isNextConc) sec3Records.push(r);
  });

  const columns = ['REGION', 'PROCEDENCIA', 'FECHA DEPÓSITO', 'FECHA CONCENTRA', 'DIAS', 'TOTAL INGRESOS', 'COMISIÓN', 'VALOR DEPOSITO', 'PASAPORTE', 'DUI', 'CONSULARES'];

  const buildSection = (title: string, data: any[]) => {
    const rows: any[] = [];
    if (data.length === 0) return { rows, gTotalIngresos: 0, gTotalComision: 0, gTotalDep: 0, gPasa: 0, gDui: 0, gCons: 0 };

    rows.push([{ content: title, colSpan: columns.length, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]);

    // Group by state
    const byState: Record<string, any[]> = {};
    data.forEach(r => {
      const state = r.country || r.region || 'SIN ESTADO';
      if (!byState[state]) byState[state] = [];
      byState[state].push(r);
    });

    let gTotalIngresos = 0, gTotalComision = 0, gTotalDep = 0, gPasa = 0, gDui = 0, gCons = 0;

    Object.keys(byState).sort().forEach(state => {
      const stateRecords = byState[state];
      // Sort by procedencia
      stateRecords.sort((a, b) => (a.location || '').localeCompare(b.location || ''));

      let sTotalIngresos = 0, sTotalComision = 0, sTotalDep = 0, sPasa = 0, sDui = 0, sCons = 0;

      stateRecords.forEach((r, idx) => {
        const tIngresos = r.passportValue + r.duiValue + r.consularValue + r.commissionValue;
        
        sTotalIngresos += tIngresos;
        sTotalComision += r.commissionValue;
        sTotalDep += r.depositAmount;
        sPasa += r.passportValue;
        sDui += r.duiValue;
        sCons += r.consularValue;
        
        const diffDays = r.concentrationDate && r.depositDate ? differenceInDays(new Date(r.concentrationDate), new Date(r.depositDate)) : 0;
        rows.push([
          idx === 0 ? state : '',
          r.location || 'NO IDENTIFICADO',
          format(new Date(r.depositDate), 'dd/MM/yyyy'),
          r.concentrationDate ? format(new Date(r.concentrationDate), 'dd/MM/yyyy') : '-',
          diffDays,
          formatCurrency(tIngresos),
          formatCurrency(r.commissionValue),
          formatCurrency(r.depositAmount),
          formatCurrency(r.passportValue),
          formatCurrency(r.duiValue),
          formatCurrency(r.consularValue)
        ]);
      });

      // Subtotal row
      rows.push([
        { content: `Total ${state}`, colSpan: 5, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatCurrency(sTotalIngresos), styles: { fontStyle: 'bold' } },
        { content: formatCurrency(sTotalComision), styles: { fontStyle: 'bold' } },
        { content: formatCurrency(sTotalDep), styles: { fontStyle: 'bold' } },
        { content: formatCurrency(sPasa), styles: { fontStyle: 'bold' } },
        { content: formatCurrency(sDui), styles: { fontStyle: 'bold' } },
        { content: formatCurrency(sCons), styles: { fontStyle: 'bold' } }
      ]);

      gTotalIngresos += sTotalIngresos;
      gTotalComision += sTotalComision;
      gTotalDep += sTotalDep;
      gPasa += sPasa;
      gDui += sDui;
      gCons += sCons;
          });

    return { rows, gTotalIngresos, gTotalComision, gTotalDep, gPasa, gDui, gCons };
  };

  const bodyData: any[] = [];
  
  let grandTotalIngresos = 0, grandTotalComision = 0, grandTotalDep = 0, grandPasa = 0, grandDui = 0, grandCons = 0;

  const s1 = buildSection('DEPOSITOS DEL MES ANTERIOR CONCENTRADOS EL PRESENTE MES', sec1Records);
  if (s1.rows) {
    bodyData.push(...s1.rows);
    grandTotalIngresos += s1.gTotalIngresos;
    grandTotalComision += s1.gTotalComision;
    grandTotalDep += s1.gTotalDep;
    grandPasa += s1.gPasa;
    grandDui += s1.gDui;
    grandCons += s1.gCons;
    
  }

  const s2 = buildSection('DEPOSITOS E INGRESOS DEL PRESENTE MES', sec2Records);
  if (s2.rows) {
    bodyData.push(...s2.rows);
    grandTotalIngresos += s2.gTotalIngresos;
    grandTotalComision += s2.gTotalComision;
    grandTotalDep += s2.gTotalDep;
    grandPasa += s2.gPasa;
    grandDui += s2.gDui;
    grandCons += s2.gCons;
    
  }

  // Grand Total for section 1 + 2
  bodyData.push([
    { content: `Total IDENTIFICADO DISTRIBUIDO`, colSpan: 5, styles: { fontStyle: 'bold', halign: 'right' } },
    { content: formatCurrency(grandTotalIngresos), styles: { fontStyle: 'bold' } },
    { content: formatCurrency(grandTotalComision), styles: { fontStyle: 'bold' } },
    { content: formatCurrency(grandTotalDep), styles: { fontStyle: 'bold' } },
    { content: formatCurrency(grandPasa), styles: { fontStyle: 'bold' } },
    { content: formatCurrency(grandDui), styles: { fontStyle: 'bold' } },
    { content: formatCurrency(grandCons), styles: { fontStyle: 'bold' } }
  ]);

  const s3 = buildSection('CONCENTRACIONES EL SIGUIENTE MES', sec3Records);
  if (s3.rows) {
    bodyData.push(...s3.rows);
    // As per rule, s3 is also added to the Gran Total for specific columns?
    // "Siempre en la fila de Gran Total Para los campos PASPORTE, DUI, CONSULARES e INGRESOS DIVERSOS debe sumar el total General de las secciones 1+2+3"
    // "habrá una fila de Gran total que para los campos TOTAL INGRESOS, VALOR COMISION, VALOR DEPOSITO debe sumar los totales generales de 1+2"
    
    // We will do a Gran Total row combining logic
    bodyData.push([
      { content: `Gran Total`, colSpan: 5, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: formatCurrency(grandTotalIngresos + s3.gTotalIngresos), styles: { fontStyle: 'bold' } },
      { content: formatCurrency(grandTotalComision + s3.gTotalComision), styles: { fontStyle: 'bold' } },
      { content: formatCurrency(grandTotalDep + s3.gTotalDep), styles: { fontStyle: 'bold' } },
      { content: formatCurrency(grandPasa + s3.gPasa), styles: { fontStyle: 'bold' } },
      { content: formatCurrency(grandDui + s3.gDui), styles: { fontStyle: 'bold' } },
      { content: formatCurrency(grandCons + s3.gCons), styles: { fontStyle: 'bold' } }
    ]);
  }

  autoTable(doc, {
    startY: 38,
    head: [columns],
    body: bodyData,
    theme: 'grid',
    styles: { fontSize: 6, font: 'helvetica', textColor: 0, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 10, halign: 'center' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 15, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' },
      8: { cellWidth: 20, halign: 'right' },
      9: { cellWidth: 20, halign: 'right' },
      10: { cellWidth: 20, halign: 'right' },
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 15;
  
  if (finalY + 40 > doc.internal.pageSize.height) {
    doc.addPage();
    finalY = 20;
  }

  const signatureY = finalY + 5;

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
  return { blob, filename: `Cablegraficas_${month}_${year}.pdf`, signatureY };
}

export async function generateCablegraficasExcel(records: any[], month: number, year: number, settings: Record<string, string> = {}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Cablegraficas');

  const centerAlign: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };

  // Headers
  worksheet.mergeCells('A1:K1');
  worksheet.getCell('A1').value = 'MINISTERIO DE HACIENDA';
  worksheet.getCell('A1').font = { bold: true, size: 9 };
  worksheet.getCell('A1').alignment = centerAlign;
  
  worksheet.mergeCells('A2:K2');
  worksheet.getCell('A2').value = 'DIRECCIÓN GENERAL DE TESORERIA';
  worksheet.getCell('A2').font = { bold: true, size: 9 };
  worksheet.getCell('A2').alignment = centerAlign;

  worksheet.mergeCells('A3:K3');
  worksheet.getCell('A3').value = 'DEPARTAMENTO DE INGRESOS DE COLECTURIAS DE ADUANA';
  worksheet.getCell('A3').font = { bold: true, size: 9 };
  worksheet.getCell('A3').alignment = centerAlign;

  worksheet.mergeCells('A4:K4');
  worksheet.getCell('A4').value = `CUADRO CONTROL DE INGRESOS TRANSFERENCIAS CABLEGRAFICAS`;
  worksheet.getCell('A4').font = { bold: true, size: 9 };
  worksheet.getCell('A4').alignment = centerAlign;

  worksheet.mergeCells('A5:K5');
  worksheet.getCell('A5').value = `${getMonthNameSpanish(month)}/${year}`;
  worksheet.getCell('A5').font = { bold: true, size: 9 };
  worksheet.getCell('A5').alignment = centerAlign;

  worksheet.addRow([]); // empty

  const estado = (settings.estado_informe || 'PRELIMINAR').toUpperCase();
  const subheaderRow = worksheet.addRow([estado, '', '', '', '', '', '', '', '', '', `FECHA ELABORACIÓN: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`]);
  worksheet.mergeCells(`A${subheaderRow.number}:D${subheaderRow.number}`);
  worksheet.mergeCells(`I${subheaderRow.number}:K${subheaderRow.number}`);
  subheaderRow.getCell(1).font = { size: 8 };
  subheaderRow.getCell(9).font = { size: 8 };
  subheaderRow.getCell(9).alignment = { horizontal: 'right' };

  const columns = ['REGION', 'PROCEDENCIA', 'FECHA DEPÓSITO', 'FECHA CONCENTRA', 'DIAS', 'TOTAL INGRESOS', 'COMISIÓN', 'VALOR DEPOSITO', 'PASAPORTE', 'DUI', 'CONSULARES'];
  const headerRow = worksheet.addRow(columns);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 8 };
    cell.alignment = centerAlign;
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  // Data processing exactly like PDF
  const sec1Records: any[] = [];
  const sec2Records: any[] = [];
  const sec3Records: any[] = [];

  records.forEach(r => {
    const dMonth = new Date(r.depositDate).getMonth() + 1;
    const dYear = new Date(r.depositDate).getFullYear();
    const cMonth = r.concentrationDate ? new Date(r.concentrationDate).getMonth() + 1 : -1;
    const cYear = r.concentrationDate ? new Date(r.concentrationDate).getFullYear() : -1;

    const isPrevDep = (dYear === year && dMonth === month - 1) || (month === 1 && dYear === year - 1 && dMonth === 12);
    const isCurrDep = dYear === year && dMonth === month;
    const isCurrConc = cYear === year && cMonth === month;
    const isNextConc = !r.concentrationDate || (cYear === year && cMonth === month + 1) || (month === 12 && cYear === year + 1 && cMonth === 1);

    if (isPrevDep && isCurrConc) sec1Records.push(r);
    else if (isCurrDep && isCurrConc) sec2Records.push(r);
    else if (isCurrDep && isNextConc) sec3Records.push(r);
  });

  const buildSection = (title: string, data: any[]) => {
    if (data.length === 0) return { gTotalIngresos: 0, gTotalComision: 0, gTotalDep: 0, gPasa: 0, gDui: 0, gCons: 0, gDiv: 0 };

    const titleRow = worksheet.addRow([title]);
    worksheet.mergeCells(`A${titleRow.number}:K${titleRow.number}`);
    titleRow.getCell(1).font = { bold: true, size: 8 };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
    titleRow.getCell(1).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    const byState: Record<string, any[]> = {};
    data.forEach(r => {
      const state = r.country || r.region || 'SIN ESTADO';
      if (!byState[state]) byState[state] = [];
      byState[state].push(r);
    });

    let gTotalIngresos = 0, gTotalComision = 0, gTotalDep = 0, gPasa = 0, gDui = 0, gCons = 0;

    Object.keys(byState).sort().forEach(state => {
      const stateRecords = byState[state];
      stateRecords.sort((a, b) => (a.location || '').localeCompare(b.location || ''));

      let sTotalIngresos = 0, sTotalComision = 0, sTotalDep = 0, sPasa = 0, sDui = 0, sCons = 0;

      stateRecords.forEach((r, idx) => {
        const tIngresos = r.passportValue + r.duiValue + r.consularValue + r.commissionValue;
        
        sTotalIngresos += tIngresos;
        sTotalComision += r.commissionValue;
        sTotalDep += r.depositAmount;
        sPasa += r.passportValue;
        sDui += r.duiValue;
        sCons += r.consularValue;
        
        const diffDays = r.concentrationDate && r.depositDate ? differenceInDays(new Date(r.concentrationDate), new Date(r.depositDate)) : 0;
        const row = worksheet.addRow([
          idx === 0 ? state : '',
          r.location || 'NO IDENTIFICADO',
          format(new Date(r.depositDate), 'dd/MM/yyyy'),
          r.concentrationDate ? format(new Date(r.concentrationDate), 'dd/MM/yyyy') : '-',
          diffDays,
          tIngresos,
          r.commissionValue,
          r.depositAmount,
          r.passportValue,
          r.duiValue,
          r.consularValue
        ]);

        row.eachCell((cell, colNum) => {
          cell.font = { size: 8 };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          if (colNum >= 6) cell.numFmt = '"$"#,##0.00';
        });
      });

      const subtotalRow = worksheet.addRow([
        `Total ${state}`, '', '', '', '',
        sTotalIngresos, sTotalComision, sTotalDep, sPasa, sDui, sCons
      ]);
      worksheet.mergeCells(`A${subtotalRow.number}:E${subtotalRow.number}`);
      subtotalRow.eachCell((cell, colNum) => {
        cell.font = { bold: true, size: 8 };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (colNum >= 6) cell.numFmt = '"$"#,##0.00';
      });
      subtotalRow.getCell(1).alignment = { horizontal: 'right' };

      gTotalIngresos += sTotalIngresos;
      gTotalComision += sTotalComision;
      gTotalDep += sTotalDep;
      gPasa += sPasa;
      gDui += sDui;
      gCons += sCons;
          });

    return { gTotalIngresos, gTotalComision, gTotalDep, gPasa, gDui, gCons };
  };

  let grandTotalIngresos = 0, grandTotalComision = 0, grandTotalDep = 0, grandPasa = 0, grandDui = 0, grandCons = 0;

  const s1 = buildSection('DEPOSITOS DEL MES ANTERIOR CONCENTRADOS EL PRESENTE MES', sec1Records);
  grandTotalIngresos += s1.gTotalIngresos; grandTotalComision += s1.gTotalComision; grandTotalDep += s1.gTotalDep; grandPasa += s1.gPasa; grandDui += s1.gDui; grandCons += s1.gCons; 

  const s2 = buildSection('DEPOSITOS E INGRESOS DEL PRESENTE MES', sec2Records);
  grandTotalIngresos += s2.gTotalIngresos; grandTotalComision += s2.gTotalComision; grandTotalDep += s2.gTotalDep; grandPasa += s2.gPasa; grandDui += s2.gDui; grandCons += s2.gCons; 

  if (s1.gTotalIngresos > 0 || s2.gTotalIngresos > 0) {
    const grandRow = worksheet.addRow([
      `Total IDENTIFICADO DISTRIBUIDO`, '', '', '', '',
      grandTotalIngresos, grandTotalComision, grandTotalDep, grandPasa, grandDui, grandCons
    ]);
    worksheet.mergeCells(`A${grandRow.number}:E${grandRow.number}`);
    grandRow.eachCell((cell, colNum) => {
      cell.font = { bold: true, size: 8 };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      if (colNum >= 6) cell.numFmt = '"$"#,##0.00';
    });
    grandRow.getCell(1).alignment = { horizontal: 'right' };
  }

  const s3 = buildSection('CONCENTRACIONES EL SIGUIENTE MES', sec3Records);
  if (s3.gTotalIngresos > 0) {
    const finalGrandRow = worksheet.addRow([
      `Gran Total`, '', '', '', '',
      grandTotalIngresos + s3.gTotalIngresos, grandTotalComision + s3.gTotalComision, grandTotalDep + s3.gTotalDep, 
      grandPasa + s3.gPasa, grandDui + s3.gDui, grandCons + s3.gCons
    ]);
    worksheet.mergeCells(`A${finalGrandRow.number}:E${finalGrandRow.number}`);
    finalGrandRow.eachCell((cell, colNum) => {
      cell.font = { bold: true, size: 8 };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      if (colNum >= 6) cell.numFmt = '"$"#,##0.00';
    });
    finalGrandRow.getCell(1).alignment = { horizontal: 'right' };
  }

  worksheet.columns = [
    { width: 25 }, { width: 35 }, { width: 15 }, { width: 8 },
    { width: 15 }, { width: 12 }, { width: 15 }, { width: 15 },
    { width: 15 }
  ];

  worksheet.addRow([]);
  worksheet.addRow([]);

  const elabNombre = settings.firma_elaboro_nombre || 'JOSE MARLON AVILES CHACON';
  const elabCargo = settings.firma_elaboro_cargo || 'TECNICO DE CONCENTRACIONES';
  const aprobNombre = settings.firma_aprobo_nombre || 'HUGO ORLANDO MARTINEZ PARADA';
  const aprobCargo = settings.firma_aprobo_cargo || 'JEFE DEPTO. DE INGRESOS DE COLECTURIAS DE ADUANAS';

  const sigRow1 = worksheet.addRow(['ELABORO:', '', '', '', '', 'APROBO:']);
  const sigRow2 = worksheet.addRow([elabNombre, '', '', '', '', aprobNombre]);
  const sigRow3 = worksheet.addRow([elabCargo, '', '', '', '', aprobCargo]);

  [sigRow1, sigRow2, sigRow3].forEach(row => {
    row.getCell(1).font = { size: 8 };
    row.getCell(6).font = { size: 8 };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return { blob: new Blob([buffer]), filename: `Cablegraficas_${month}_${year}.xlsx` };
}
