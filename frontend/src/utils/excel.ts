import * as XLSX from 'xlsx';

export function exportRowsToXlsx(rows: Array<Array<string | number>>, fileName: string, sheetName = 'Sheet1') {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31) || 'Sheet1');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
