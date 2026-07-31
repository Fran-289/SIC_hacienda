import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getMonthNameEnglish } from '../utils';
import { format } from 'date-fns';

export async function generatePendientesExcel(records: any[], month: number, year: number, title: string, filename: string) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte Pendientes');

  const centerAlign: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };

  // Headers (Like in the screenshot)
  worksheet.mergeCells('A1:F1');
  worksheet.getCell('A1').value = 'MINISTERIO DE HACIENDA';
  worksheet.getCell('A1').font = { bold: true, size: 10 };
  worksheet.getCell('A1').alignment = centerAlign;
  
  worksheet.mergeCells('A2:F2');
  worksheet.getCell('A2').value = 'DIRECCION GENERAL DE TESORERIA';
  worksheet.getCell('A2').font = { bold: true, size: 10 };
  worksheet.getCell('A2').alignment = centerAlign;

  worksheet.mergeCells('A3:F3');
  worksheet.getCell('A3').value = 'DEPARTAMENTO DE INGRESOS DE COLECTURIAS DE ADUANA';
  worksheet.getCell('A3').font = { bold: true, size: 10 };
  worksheet.getCell('A3').alignment = centerAlign;

  worksheet.mergeCells('A4:F4');
  worksheet.getCell('A4').value = title;
  worksheet.getCell('A4').font = { bold: true, size: 10 };
  worksheet.getCell('A4').alignment = centerAlign;

  worksheet.mergeCells('A5:F5');
  worksheet.getCell('A5').value = `PERIODO:          ${getMonthNameEnglish(month).toLowerCase()}/${year}`;
  worksheet.getCell('A5').font = { bold: true, size: 10 };
  worksheet.getCell('A5').alignment = centerAlign;

  worksheet.getCell('G2').value = 'Pag. 1 de 1';
  worksheet.getCell('G2').font = { size: 9 };
  worksheet.getCell('G2').alignment = centerAlign;

  worksheet.addRow([]); // empty spacing

  // Columns Header
  const headerRow = worksheet.addRow(['FECHA DE INGRESO', 'VALOR', 'PROCEDENCIA', 'PASAPORTE', 'DUI', 'SALDO']);
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 9 };
    cell.alignment = centerAlign;
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  // Add Data
  records.forEach(r => {
    // FECHA DE INGRESO
    const fecha = format(new Date(r.depositDate), 'M/d/yyyy');
    // VALOR
    const valor = r.depositAmount;
    // PROCEDENCIA (only fill if it exists, otherwise leave empty for the bank to fill)
    let procedencia = '';
    if (r.location && r.country) {
      procedencia = `${r.location}, ${r.country}`;
    } else if (r.country) {
      procedencia = r.country;
    } else if (r.location) {
      procedencia = r.location;
    }
    
    // The other columns (PASAPORTE, DUI, SALDO) will be blank for the bank/RREE to fill
    const row = worksheet.addRow([fecha, valor, procedencia, '', '', '']);
    
    row.eachCell((cell, colNum) => {
      cell.font = { size: 9 };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      if (colNum === 2 || colNum >= 4) {
        cell.alignment = { horizontal: 'right' };
        if (colNum === 2) {
          cell.numFmt = '"$"#,##0.00';
        }
      } else {
        cell.alignment = { horizontal: 'center' };
      }
    });
  });

  // Adjust column widths
  worksheet.getColumn(1).width = 18;
  worksheet.getColumn(2).width = 15;
  worksheet.getColumn(3).width = 35;
  worksheet.getColumn(4).width = 15;
  worksheet.getColumn(5).width = 15;
  worksheet.getColumn(6).width = 15;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer]);
  const finalFilename = `${filename}_${month}_${year}.xlsx`;
  return { blob, filename: finalFilename };
}
