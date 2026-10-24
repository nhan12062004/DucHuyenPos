import type { SalesOrder } from '../services/salesOrdersService';

export async function exportRowsToXlsx(rows: Array<Array<string | number>>, fileName: string, sheetName = 'Sheet1') {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31) || 'Sheet1');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

function formatOrderDateTime(value?: string) {
  if (!value) return '---';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getOrderItemLineTotal(item: NonNullable<SalesOrder['sales_order_items']>[number]) {
  const lineTotal = Number(item.line_total ?? 0);
  if (Number.isFinite(lineTotal) && lineTotal !== 0) return lineTotal;

  return Number(item.quantity ?? 0) * Number(item.unit_price ?? 0) - Number(item.discount_amount ?? 0);
}

function getQuantityNumberFormat(value: number) {
  if (!Number.isFinite(value) || Number.isInteger(value)) return '#,##0';

  const fraction = value.toString().split('.')[1] ?? '';
  const decimalPlaces = fraction.length || 2;
  return '#,##0.' + '0'.repeat(decimalPlaces);
}

export async function exportSalesOrderInvoiceToXlsx(
  order: SalesOrder,
  store: { name: string; address: string; phone: string },
  fileName: string,
) {
  const XLSX = await import('xlsx-js-style');
  const items = order.sales_order_items ?? [];
  const invoiceNo = order.invoice_no ?? order.order_no;
  const totalAmount = Number(order.total_amount ?? 0);
  const customerBlock =
    'Khách hàng:     ' + (order.customers?.full_name ?? 'Khách lẻ') +
    '\nĐiện thoại:        ' + (order.customers?.phone ?? '---') +
    '\nĐịa chỉ:             ' + (order.delivery_address ?? order.customers?.address ?? '---');
  const invoiceBlock =
    'Mã hóa đơn:                       #' + invoiceNo +
    '\nNgày tạo:               ' + formatOrderDateTime(order.sold_at) +
    '\nThu ngân:                   ' + (order.cashier?.full_name ?? '---') +
    '\nĐƠN HÀNG';

  const itemStartRow = 4;
  const totalRow = itemStartRow + items.length;
  const grandTotalRow = totalRow + 1;
  const signatureRow = grandTotalRow + 1;
  const rows: Array<Array<string | number>> = [
    [store.name],
    [store.address + ' Hotline: ' + store.phone],
    [customerBlock, '', invoiceBlock],
    ['STT', 'TÊN HÀNG HÓA', '', '', '', 'ĐVT', 'SL', 'ĐƠN GIÁ', 'THÀNH\nTIỀN', ''],
    ...items.map((item, index) => [
      index + 1,
      item.product_name,
      '',
      '',
      '',
      item.unit_name ?? '',
      Number(item.quantity ?? 0),
      Number(item.unit_price ?? 0),
      getOrderItemLineTotal(item),
      '',
    ]),
    ['Tổng tiền hàng:', '', '', '', '', '', '', '', totalAmount, ''],
    ['', '', '', '', 'TỔNG CỘNG:', '', '', totalAmount, '', ''],
    ['NGƯỜI MUA HÀNG\n(Ký, ghi rõ họ tên)', '', '', 'NGƯỜI BÁN HÀNG\n(Ký, ghi rõ họ tên)', '', '', '', '', '', ''],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 5.22 },
    { wch: 16.78 },
    { wch: 1.67 },
    { wch: 9.89 },
    { wch: 4.11 },
    { wch: 8.78 },
    { wch: 6.33 },
    { wch: 13.44 },
    { wch: 12.11 },
    { wch: 6.33 },
  ];
  worksheet['!rows'] = rows.map((_, row) => ({
    hpt: row === 0 ? 30 : row === 1 ? 20 : row === 2 ? 62 : row === 3 ? 35 : row < totalRow ? 19 : row === signatureRow ? 55 : 26,
  }));
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
    { s: { r: 2, c: 2 }, e: { r: 2, c: 9 } },
    { s: { r: 3, c: 1 }, e: { r: 3, c: 4 } },
    ...items.map((_, index) => ({
      s: { r: itemStartRow + index, c: 1 },
      e: { r: itemStartRow + index, c: 4 },
    })),
    { s: { r: totalRow, c: 0 }, e: { r: totalRow, c: 7 } },
    { s: { r: totalRow, c: 8 }, e: { r: totalRow, c: 9 } },
    { s: { r: grandTotalRow, c: 4 }, e: { r: grandTotalRow, c: 6 } },
    { s: { r: grandTotalRow, c: 7 }, e: { r: grandTotalRow, c: 9 } },
    { s: { r: signatureRow, c: 0 }, e: { r: signatureRow, c: 2 } },
    { s: { r: signatureRow, c: 3 }, e: { r: signatureRow, c: 9 } },
  ];
  worksheet['!margins'] = {
    left: 0.7,
    right: 0.7,
    top: 0.75,
    bottom: 0.75,
    header: 0.3,
    footer: 0.3,
  };
  worksheet['!pageSetup'] = {
    orientation: 'portrait',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };

  const setCellStyle = (row: number, column: number, style: Record<string, unknown>) => {
    const address = XLSX.utils.encode_cell({ r: row, c: column });
    const cell = worksheet[address] ?? { t: 's', v: '' };
    cell.s = { ...(cell.s ?? {}), ...style };
    worksheet[address] = cell;
  };

  const applyStyle = (
    startRow: number,
    endRow: number,
    startColumn: number,
    endColumn: number,
    style: Record<string, unknown>,
  ) => {
    for (let row = startRow; row <= endRow; row += 1) {
      for (let column = startColumn; column <= endColumn; column += 1) {
        setCellStyle(row, column, style);
      }
    }
  };

  const borderColor = { rgb: 'FF324F73' };
  const thinBorder = { style: 'thin', color: borderColor };
  const baseFont = { name: 'Arial', sz: 10, color: { rgb: 'FF172B4D' } };
  const horizontalBorder = { top: thinBorder, bottom: thinBorder };

  applyStyle(0, 0, 0, 9, {
    font: { name: 'Arial', sz: 16, bold: true, color: { rgb: 'FF10233F' } },
    alignment: { vertical: 'center', horizontal: 'left' },
  });
  applyStyle(1, 1, 0, 9, {
    font: { name: 'Arial', sz: 10, color: { rgb: 'FF172B4D' } },
    alignment: { vertical: 'center', horizontal: 'left' },
  });
  applyStyle(2, 2, 0, 9, {
    font: baseFont,
    alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
  });

  for (let row = 3; row < totalRow; row += 1) {
    for (let column = 0; column <= 8; column += 1) {
      const cellBorder: Record<string, unknown> = { ...horizontalBorder };
      if (column === 0 || column === 1) cellBorder.left = thinBorder;
      if (column === 0 || column === 4 || column >= 5) cellBorder.right = thinBorder;

      const alignment =
        row === 3
          ? { vertical: 'center', horizontal: 'center', wrapText: true }
          : column === 1
            ? { vertical: 'center', horizontal: 'left', wrapText: true }
            : column === 0 || column === 5
              ? { vertical: 'center', horizontal: 'center' }
              : { vertical: 'center', horizontal: 'right' };

      setCellStyle(row, column, {
        font: row === 3 ? { ...baseFont, bold: true } : baseFont,
        border: cellBorder,
        alignment,
      });
    }
  }

  for (let row = itemStartRow; row < totalRow; row += 1) {
    const quantity = Number(items[row - itemStartRow]?.quantity ?? 0);
    setCellStyle(row, 6, { numFmt: getQuantityNumberFormat(quantity) });
    [7, 8].forEach((column) => setCellStyle(row, column, { numFmt: '#,##0' }));
  }

  applyStyle(totalRow, totalRow, 0, 9, {
    font: { ...baseFont, bold: true },
    alignment: { vertical: 'center', horizontal: 'left' },
  });
  setCellStyle(totalRow, 8, {
    font: { ...baseFont, bold: true },
    numFmt: '#,##0 "₫"',
    alignment: { vertical: 'center', horizontal: 'right' },
  });
  applyStyle(grandTotalRow, grandTotalRow, 4, 9, {
    font: { ...baseFont, bold: true },
    border: { top: thinBorder, bottom: thinBorder },
    alignment: { vertical: 'center', horizontal: 'right' },
  });
  setCellStyle(grandTotalRow, 4, {
    font: { ...baseFont, bold: true },
    alignment: { vertical: 'center', horizontal: 'left' },
  });
  setCellStyle(grandTotalRow, 7, {
    font: { ...baseFont, bold: true },
    numFmt: '#,##0 "₫"',
    alignment: { vertical: 'center', horizontal: 'right' },
  });
  applyStyle(signatureRow, signatureRow, 0, 9, {
    font: { ...baseFont, bold: true },
    alignment: { vertical: 'top', horizontal: 'center', wrapText: true },
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Table 1');
  workbook.Workbook = {
    ...workbook.Workbook,
    Names: [
      ...(workbook.Workbook?.Names ?? []),
      { Name: '_xlnm.Print_Titles', Ref: "'Table 1'!$4:$4", Sheet: 0 },
    ],
  };
  XLSX.writeFile(workbook, fileName + '.xlsx');
}
