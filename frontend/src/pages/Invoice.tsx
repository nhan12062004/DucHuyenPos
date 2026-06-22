import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { PageLoader } from '../components/PageLoader';
import { salesOrdersService, type SalesOrder } from '../services/salesOrdersService';

const STORE_NAME = 'Vật tư Điện Nước Đức Huyền';
const STORE_ADDRESS = '277 Nguyễn Thị Duệ, Việt Hòa, TP. Hải Phòng';
const STORE_PHONE = '0989 245 272 - 0904 538 786';
const SINGLE_PAGE_ITEM_LIMIT = 12;
const FIRST_PAGE_ITEM_LIMIT = 20;
const CONTINUATION_PAGE_ITEM_LIMIT = 28;
const LAST_PAGE_ITEM_LIMIT = 12;

function formatCurrency(value: number) {
  return value.toLocaleString('vi-VN');
}

function formatDateTime(value?: string) {
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

function getLineTotal(item: NonNullable<SalesOrder['sales_order_items']>[number]) {
  return Number(item.line_total ?? 0) ||
    Number(item.quantity ?? 0) * Number(item.unit_price ?? 0) - Number(item.discount_amount ?? 0);
}

function getPdfFileName(invoiceNo: string) {
  const safeInvoiceNo = invoiceNo.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `Hoa_don_${safeInvoiceNo}`;
}

export function Invoice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const shouldAutoPrint = searchParams.get('autoPrint') === '1';
  const hasAutoPrintedRef = useRef(false);
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      if (!orderId) {
        setError('Thiếu mã đơn hàng để in hóa đơn.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const detail = await salesOrdersService.getOne(orderId);
        if (active) setOrder(detail);
      } catch (loadError: any) {
        if (active) setError(loadError?.message ?? 'Không tải được hóa đơn.');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadOrder();

    return () => {
      active = false;
    };
  }, [orderId]);

  const items = order?.sales_order_items ?? [];
  const subtotal = Number(order?.subtotal ?? 0);
  const discountAmount = Number(order?.discount_amount ?? 0);
  const shippingFee = Number(order?.shipping_fee ?? 0);
  const taxAmount = Number(order?.tax_amount ?? 0);
  const totalAmount = Number(order?.total_amount ?? 0);
  const paidAmount = Number(order?.paid_amount ?? 0);
  const debtAmount = useMemo(() => Math.max(0, totalAmount - paidAmount), [paidAmount, totalAmount]);
  const invoiceNo = order?.invoice_no ?? order?.order_no ?? '---';
  const invoicePages = useMemo(() => {
    if (!items.length) {
      return [{ items: [], startIndex: 0, showHeader: true, showSummary: true }];
    }

    if (items.length <= SINGLE_PAGE_ITEM_LIMIT) {
      return [{ items, startIndex: 0, showHeader: true, showSummary: true }];
    }

    const pages: Array<{
      items: typeof items;
      startIndex: number;
      showHeader: boolean;
      showSummary: boolean;
    }> = [];
    let cursor = 0;

    pages.push({
      items: items.slice(cursor, cursor + FIRST_PAGE_ITEM_LIMIT),
      startIndex: cursor,
      showHeader: true,
      showSummary: false,
    });
    cursor += FIRST_PAGE_ITEM_LIMIT;

    while (items.length - cursor > LAST_PAGE_ITEM_LIMIT) {
      const remaining = items.length - cursor;
      const pageSize = Math.min(
        CONTINUATION_PAGE_ITEM_LIMIT,
        Math.max(LAST_PAGE_ITEM_LIMIT, remaining - LAST_PAGE_ITEM_LIMIT),
      );

      pages.push({
        items: items.slice(cursor, cursor + pageSize),
        startIndex: cursor,
        showHeader: false,
        showSummary: false,
      });
      cursor += pageSize;
    }

    pages.push({
      items: items.slice(cursor),
      startIndex: cursor,
      showHeader: false,
      showSummary: true,
    });

    return pages;
  }, [items]);

  const handlePrintInvoice = useCallback(() => {
    const previousTitle = document.title;
    const pdfTitle = getPdfFileName(invoiceNo);
    let restored = false;

    const restoreTitle = () => {
      if (restored) return;
      restored = true;
      document.title = previousTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };

    document.title = pdfTitle;
    window.addEventListener('afterprint', restoreTitle);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.print();
        window.setTimeout(restoreTitle, 1500);
      });
    });
  }, [invoiceNo]);

  useEffect(() => {
    if (!shouldAutoPrint || isLoading || !order || hasAutoPrintedRef.current) return;

    hasAutoPrintedRef.current = true;
    const timer = window.setTimeout(handlePrintInvoice, 600);

    return () => window.clearTimeout(timer);
  }, [handlePrintInvoice, isLoading, order, shouldAutoPrint]);

  const handleBack = () => {
    navigate('/orders', {
      state: orderId ? { selectedOrderId: orderId } : undefined,
    });
  };

  if (isLoading) {
    return <PageLoader text="Đang tải hóa đơn..." fullScreen />;
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f5f8] px-6">
        <div className="border border-red-200 bg-white px-6 py-5 text-sm text-red-600 shadow-sm">
          {error ?? 'Không tìm thấy hóa đơn.'}
          <button
            type="button"
            onClick={handleBack}
            className="mt-4 flex h-9 items-center gap-2 border border-slate-300 px-4 text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="invoice-screen min-h-screen bg-[#eef1f5] px-5 py-7 text-[#07152b]">
      <div className="invoice-actions fixed right-7 top-5 z-20 flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 items-center gap-2 border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Quay lại
        </button>
        <button
          type="button"
          onClick={handlePrintInvoice}
          className="flex h-10 items-center gap-2 bg-[#111827] px-5 text-sm font-semibold text-white shadow-sm hover:bg-black"
        >
          <Printer size={17} />
          In hóa đơn
        </button>
      </div>

      <div className="invoice-pages mx-auto">
        {invoicePages.map((page, pageIndex) => (
          <main key={pageIndex} className="invoice-paper bg-white shadow-[0_22px_70px_rgba(15,23,42,0.18)]">
            {page.showHeader ? (
              <>
        <header className="invoice-hero">
          <div className="invoice-store">
            <Logo className="invoice-logo" />
            <div className="invoice-store-copy">
              <h1>{STORE_NAME}</h1>
              <p>{STORE_ADDRESS}</p>
              <p>Hotline: {STORE_PHONE}</p>
            </div>
          </div>
        </header>

        <div className="invoice-rule" />

        <section className="invoice-meta-grid">
          <div>
            <h3>THÔNG TIN KHÁCH HÀNG</h3>
            <dl>
              <div>
                <dt>Khách hàng:</dt>
                <dd>{order.customers?.full_name ?? 'Khách lẻ'}</dd>
              </div>
              <div>
                <dt>Điện thoại:</dt>
                <dd>{order.customers?.phone ?? '---'}</dd>
              </div>
              <div>
                <dt>Địa chỉ:</dt>
                <dd>{order.delivery_address ?? order.customers?.address ?? '---'}</dd>
              </div>
            </dl>
          </div>

          <div className="invoice-transaction">
            <h3>CHI TIẾT GIAO DỊCH</h3>
            <dl>
              <div>
                <dt>Mã hóa đơn:</dt>
                <dd>#{invoiceNo}</dd>
              </div>
              <div>
                <dt>Ngày tạo:</dt>
                <dd>{formatDateTime(order.sold_at)}</dd>
              </div>
              <div>
                <dt>Thu ngân:</dt>
                <dd>{order.cashier?.full_name ?? '---'}</dd>
              </div>
            </dl>
          </div>
        </section>
              </>
            ) : (
              <header className="invoice-continuation-header">
                <strong>#{invoiceNo}</strong>
                <span>Trang {pageIndex + 1}/{invoicePages.length}</span>
              </header>
            )}

            {page.items.length || pageIndex === 0 ? (
        <section className="invoice-order-section">
          <h3>{pageIndex === 0 ? 'ĐƠN HÀNG' : 'ĐƠN HÀNG (tiếp)'}</h3>
          <table className="invoice-items">
            <thead>
              <tr>
                <th>STT</th>
                <th>TÊN HÀNG HÓA</th>
                <th>ĐVT</th>
                <th>SL</th>
                <th>ĐƠN GIÁ</th>
                <th>THÀNH TIỀN</th>
              </tr>
            </thead>
            <tbody>
              {page.items.length ? (
                page.items.map((item, index) => (
                  <tr key={item.id ?? `${item.product_id}-${page.startIndex + index}`}>
                    <td>{page.startIndex + index + 1}</td>
                  <td>
                    <strong>{item.product_name}</strong>
                  </td>
                    <td>{item.unit_name || 'Cái'}</td>
                    <td>{formatCurrency(Number(item.quantity ?? 0))}</td>
                    <td>{formatCurrency(Number(item.unit_price ?? 0))}</td>
                    <td>{formatCurrency(getLineTotal(item))}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="empty-row">
                    Chưa có sản phẩm trong đơn hàng.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
            ) : null}

        {page.showSummary ? (
          <>
        <section className="invoice-summary">
          <div className="invoice-summary-row">
            <span>Tổng tiền hàng:</span>
            <strong>{formatCurrency(subtotal)} đ</strong>
          </div>
          <div className="invoice-summary-row">
            <span>Chiết khấu / Giảm giá:</span>
            <strong>{discountAmount ? `- ${formatCurrency(discountAmount)} đ` : '0 đ'}</strong>
          </div>
          {shippingFee > 0 ? (
            <div className="invoice-summary-row">
              <span>Phí giao hàng:</span>
              <strong>{formatCurrency(shippingFee)} đ</strong>
            </div>
          ) : null}
          {taxAmount > 0 ? (
            <div className="invoice-summary-row">
              <span>Thuế:</span>
              <strong>{formatCurrency(taxAmount)} đ</strong>
            </div>
          ) : null}
          <div className="invoice-grand-total">
            <span>TỔNG CỘNG:</span>
            <strong>{formatCurrency(totalAmount)} đ</strong>
          </div>
          <div className="invoice-summary-row paid">
            <span>Khách đã thanh toán:</span>
            <strong>{formatCurrency(paidAmount)} đ</strong>
          </div>
          <div className="invoice-debt">
            <span>GHI NỢ:</span>
            <strong>{formatCurrency(debtAmount)} đ</strong>
          </div>
        </section>

        <section className="invoice-signatures">
          <div>
            <strong>NGƯỜI MUA HÀNG</strong>
            <span>(Ký, ghi rõ họ tên)</span>
          </div>
          <div>
            <strong>NGƯỜI BÁN HÀNG</strong>
            <span>(Ký, ghi rõ họ tên)</span>
            <em>{order.cashier?.full_name ?? ''}</em>
          </div>
        </section>
          </>
        ) : null}
          </main>
        ))}
      </div>

      <style>{`
        @page {
          size: A5 portrait;
          margin: 0;
        }

        .invoice-pages {
          width: 148mm;
          display: grid;
          gap: 18px;
        }

        .invoice-paper {
          width: 148mm;
          min-height: 210mm;
          box-sizing: border-box;
          padding: 11mm 10mm 9mm;
          font-size: 10.5px;
          line-height: 1.32;
        }

        .invoice-continuation-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #111827;
          padding-bottom: 4mm;
          color: #0f172a;
          font-size: 10px;
        }

        .invoice-continuation-header strong {
          font-weight: 700;
        }

        .invoice-continuation-header span {
          color: #475569;
          font-weight: 600;
        }

        .invoice-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          align-items: start;
          gap: 24px;
        }

        .invoice-store {
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
        }

        .invoice-logo {
          width: 32px;
          height: 32px;
        }

        .invoice-store-copy {
          padding-top: 0;
        }

        .invoice-store h1 {
          margin: 0 0 6px;
          color: #07152b;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0;
        }

        .invoice-store p {
          margin: 2px 0;
          color: #334155;
          font-size: 10px;
        }

        .invoice-rule {
          margin: 6mm 0 5mm;
          border-top: 2px solid #111827;
        }

        .invoice-meta-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 56mm;
          gap: 7mm;
        }

        .invoice-meta-grid h3 {
          margin: 0 0 12px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
          color: #475569;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.06em;
        }

        .invoice-meta-grid dl {
          display: grid;
          gap: 4px;
          margin: 0;
        }

        .invoice-meta-grid dl div {
          display: grid;
          grid-template-columns: 72px minmax(0, 1fr);
          gap: 8px;
        }

        .invoice-transaction dl div {
          grid-template-columns: 78px minmax(0, 1fr);
        }

        .invoice-meta-grid dt,
        .invoice-meta-grid dd {
          margin: 0;
        }

        .invoice-meta-grid dt {
          color: #07152b;
          font-weight: 700;
        }

        .invoice-meta-grid dd {
          color: #0f172a;
          font-weight: 400;
        }

        .invoice-transaction {
          text-align: right;
        }

        .invoice-transaction dl div {
          justify-content: end;
        }

        .invoice-transaction dd {
          font-weight: 600;
        }

        .invoice-order-section {
          margin-top: 5mm;
        }

        .invoice-order-section h3 {
          margin: 0 0 6px;
          color: #020617;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-align: center;
        }

        .invoice-items {
          width: 100%;
          border-collapse: collapse;
          break-inside: auto;
          page-break-inside: auto;
        }

        .invoice-items thead {
          border-top: 2px solid #111827;
          border-bottom: 1px solid #111827;
          display: table-header-group;
        }

        .invoice-items tbody {
          display: table-row-group;
        }

        .invoice-items tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .invoice-items th {
          padding: 1.8mm 1.4mm;
          color: #0f172a;
          font-size: 9px;
          font-weight: 600;
          text-align: left;
        }

        .invoice-items td {
          border-bottom: 1px solid #eef2f7;
          padding: 2mm 1.4mm;
          color: #0f172a;
          vertical-align: top;
        }

        .invoice-items th:nth-child(1),
        .invoice-items td:nth-child(1) {
          width: 34px;
          text-align: center;
          color: #334155;
        }

        .invoice-items th:nth-child(3),
        .invoice-items td:nth-child(3) {
          width: 14mm;
          text-align: center;
        }

        .invoice-items th:nth-child(4),
        .invoice-items td:nth-child(4) {
          width: 11mm;
          text-align: right;
        }

        .invoice-items th:nth-child(5),
        .invoice-items td:nth-child(5),
        .invoice-items th:nth-child(6),
        .invoice-items td:nth-child(6) {
          width: 21mm;
          text-align: right;
        }

        .invoice-items td:nth-child(6) {
          font-weight: 600;
        }

        .invoice-items td strong,
        .invoice-items td span {
          display: block;
        }

        .invoice-items td strong {
          font-weight: 400;
          line-height: 1.35;
        }

        .invoice-items td span {
          margin-top: 3px;
          color: #64748b;
          font-size: 9px;
        }

        .invoice-items .empty-row {
          padding: 22px;
          text-align: center;
          color: #64748b;
        }

        .invoice-summary {
          display: grid;
          gap: 1.8mm;
          width: 74mm;
          margin: 5mm 0 0 auto;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .invoice-summary-row,
        .invoice-grand-total,
        .invoice-debt {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 18px;
        }

        .invoice-summary-row span {
          color: #475569;
        }

        .invoice-summary-row strong {
          color: #0f172a;
          font-weight: 600;
          white-space: nowrap;
        }

        .invoice-grand-total {
          border-top: 2px solid #111827;
          border-bottom: 2px solid #111827;
          padding: 1.9mm 0;
          color: #020617;
        }

        .invoice-grand-total span {
          font-size: 13px;
          font-weight: 950;
        }

        .invoice-grand-total strong {
          font-size: 20px;
          font-weight: 950;
          white-space: nowrap;
        }

        .invoice-summary-row.paid {
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 8px;
        }

        .invoice-debt {
          padding: 0;
        }

        .invoice-debt span {
          color: #111827;
          font-weight: 600;
        }

        .invoice-debt strong {
          color: #111827;
          font-size: 15px;
          font-weight: 600;
          white-space: nowrap;
        }

        .invoice-signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32mm;
          margin-top: 8mm;
          padding: 0;
          text-align: center;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .invoice-signatures strong,
        .invoice-signatures span,
        .invoice-signatures em {
          display: block;
        }

        .invoice-signatures strong {
          color: #020617;
          font-size: 10px;
          font-weight: 700;
        }

        .invoice-signatures span {
          margin-top: 2px;
          color: #0f172a;
          font-size: 9px;
          font-style: italic;
        }

        .invoice-signatures em {
          margin-top: 12mm;
          border-top: 1px solid #e5e7eb;
          padding-top: 6px;
          color: #0f172a;
          font-style: normal;
          font-weight: 400;
        }

        @media print {
          html,
          body,
          #root {
            background: white !important;
            height: auto !important;
            overflow: visible !important;
          }

          .square-ui,
          .square-ui > div,
          .square-ui main,
          .square-ui main > div {
            display: block !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
          }

          .invoice-screen {
            min-height: auto !important;
            padding: 0 !important;
            background: white !important;
          }

          .invoice-actions {
            display: none !important;
          }

          .invoice-pages {
            display: block !important;
            width: 148mm !important;
            gap: 0 !important;
            margin: 0 auto !important;
          }

          .invoice-paper {
            width: 148mm !important;
            min-height: 210mm !important;
            height: auto !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 11mm 10mm 9mm !important;
            overflow: visible !important;
            break-after: page;
            page-break-after: always;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .invoice-paper + .invoice-paper {
            break-before: page;
            page-break-before: always;
          }

          .invoice-paper:last-child {
            break-after: auto;
            page-break-after: auto;
          }

          .invoice-meta-grid,
          .invoice-summary,
          .invoice-signatures {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .invoice-order-section,
          .invoice-items,
          .invoice-items tbody {
            break-inside: auto;
            page-break-inside: auto;
          }

          .invoice-items thead {
            display: table-header-group;
          }

          .invoice-items tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
