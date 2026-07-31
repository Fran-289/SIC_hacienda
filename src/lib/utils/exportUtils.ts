import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

export async function exportRecordsToExcel(records: any[], filename: string) {
  if (!records || records.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Ingresos');

  const centerAlign: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };

  // Headers
  worksheet.mergeCells('A1:L1');
  worksheet.getCell('A1').value = 'MINISTERIO DE HACIENDA';
  worksheet.getCell('A1').font = { bold: true, size: 9 };
  worksheet.getCell('A1').alignment = centerAlign;
  
  worksheet.mergeCells('A2:L2');
  worksheet.getCell('A2').value = 'DIRECCIÓN GENERAL DE TESORERIA';
  worksheet.getCell('A2').font = { bold: true, size: 9 };
  worksheet.getCell('A2').alignment = centerAlign;

  worksheet.mergeCells('A3:L3');
  worksheet.getCell('A3').value = 'DEPARTAMENTO DE INGRESOS DE COLECTURIAS DE ADUANA';
  worksheet.getCell('A3').font = { bold: true, size: 9 };
  worksheet.getCell('A3').alignment = centerAlign;

  worksheet.mergeCells('A5:L5');
  worksheet.getCell('A5').value = 'REPORTE DE INGRESOS CONSULARES';
  worksheet.getCell('A5').font = { bold: true, size: 9 };
  worksheet.getCell('A5').alignment = centerAlign;

  // Table Headers
  const headers = [
    'ID', 'Fecha Ingreso', 'Monto Depósito', 'Fecha Concentración', 'Días',
    'Procedencia', 'Monto Pasaporte', 'Monto DUI', 'Derechos Consulares', 'Monto Comisión', 'Estado', 'Usuario Registra'
  ];

  const headerRow = worksheet.getRow(7);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 8 };
    cell.alignment = centerAlign;
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  // Data
  let currentRow = 8;
  records.forEach(r => {
    const procedencia = r.location 
      ? [r.region, r.country, r.location].filter(Boolean).join(', ')
      : 'NO IDENTIFICADO';

    const rowData = [
      r.id,
      format(new Date(r.depositDate), 'dd/MM/yyyy'),
      r.depositAmount || 0,
      r.concentrationDate ? format(new Date(r.concentrationDate), 'dd/MM/yyyy') : '-',
      r.days ?? '-',
      procedencia,
      r.passportValue || 0,
      r.duiValue || 0,
      r.consularValue || 0,
      r.commissionValue || 0,
      r.status,
      r.createdBy?.name || '-',
    ];

    const row = worksheet.getRow(currentRow);
    rowData.forEach((val, i) => {
      const cell = row.getCell(i + 1);
      cell.value = val;
      cell.font = { size: 8 };
      
      let alignment: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'left' };
      if (i === 0 || i === 1 || i === 3 || i === 4) alignment.horizontal = 'center'; // ID, Fechas, Dias
      if (i === 2 || i === 6 || i === 7 || i === 8 || i === 9) alignment.horizontal = 'right'; // Montos

      cell.alignment = alignment;
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' }
      };
      
      if (i === 2 || i === 6 || i === 7 || i === 8 || i === 9) {
        if (typeof val === 'number') {
            cell.numFmt = '"$"#,##0.00';
        }
      }
    });
    currentRow++;
  });

  worksheet.columns = [
    { width: 8 },  // ID
    { width: 12 }, // Fecha
    { width: 15 }, // Monto
    { width: 15 }, // Fecha Concen
    { width: 8 },  // Dias
    { width: 45 }, // Procedencia
    { width: 15 }, // Pasaporte
    { width: 15 }, // DUI
    { width: 20 }, // Consulares
    { width: 15 }, // Comision
    { width: 25 }, // Estado
    { width: 25 }, // Usuario
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
}

export async function exportSingleRecordToExcel(record: any, filename: string) {
  if (!record) return;
  await exportRecordsToExcel([record], filename);
}
