import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageLoader } from '../components/PageLoader';
import { salesOrdersService, type SalesOrder } from '../services/salesOrdersService';
import { consolidatedInvoicesService, type ConsolidatedInvoice } from '../services/consolidatedInvoicesService';
import { STORE_INFO } from '../utils/storeInfo';
type InvoiceItem = NonNullable<SalesOrder['sales_order_items']>[number];

interface InvoicePage {
  items: InvoiceItem[];
  startIndex: number;
  showHeader: boolean;
  showSummary: boolean;
}

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

function toPrintableSalesOrder(invoice: ConsolidatedInvoice): SalesOrder {
  const totalAmount = Number(invoice.total_amount ?? 0);
  const paidAmount = Number(invoice.paid_amount ?? 0);

  return {
    id: invoice.id,
    branch_id: invoice.branch_id,
    order_no: invoice.invoice_no,
    invoice_no: invoice.invoice_no,
    customer_id: invoice.customer_id,
    cashier_id: null,
    sold_at: invoice.issued_at,
    source: 'manual',
    status: 'completed',
    payment_status: paidAmount >= totalAmount ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
    subtotal: Number(invoice.subtotal ?? 0),
    discount_amount: Number(invoice.discount_amount ?? 0),
    shipping_fee: Number(invoice.shipping_fee ?? 0),
    tax_amount: Number(invoice.tax_amount ?? 0),
    total_amount: totalAmount,
    paid_amount: paidAmount,
    note: invoice.note ?? undefined,
    delivery_address: invoice.customers?.address,
    delivery_method: 'nhan_tai_cua_hang',
    delivery_status: 'delivered',
    created_at: invoice.created_at,
    customers: invoice.customers ?? null,
    branches: invoice.branches ?? null,
    sales_order_items: invoice.consolidated_invoice_items.map((item) => ({
      id: item.id,
      sales_order_id: invoice.id,
      product_id: item.product_id ?? null,
      product_name: item.product_name,
      sku: item.sku ?? undefined,
      unit_name: item.unit_name,
      quantity: Number(item.quantity ?? 0),
      unit_price: Number(item.unit_price ?? 0),
      discount_amount: Number(item.discount_amount ?? 0),
      line_total: Number(item.line_total ?? 0),
      sort_order: Number(item.sort_order ?? 0),
    })),
  };
}

function getOuterHeight(element: Element | null) {
  if (!element) return 0;

  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);
  const marginTop = parseFloat(styles.marginTop || '0');
  const marginBottom = parseFloat(styles.marginBottom || '0');
  return rect.height + (Number.isFinite(marginTop) ? marginTop : 0) + (Number.isFinite(marginBottom) ? marginBottom : 0);
}

export function Invoice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const consolidatedInvoiceId = searchParams.get('consolidatedInvoiceId');
  const shouldAutoPrint = searchParams.get('autoPrint') === '1';
  const shouldHideDiscount = searchParams.get('hideDiscount') === '1';
  const hasAutoPrintedRef = useRef(false);
  const measureRef = useRef<HTMLDivElement>(null);
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [consolidatedInvoice, setConsolidatedInvoice] = useState<ConsolidatedInvoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoicePages, setInvoicePages] = useState<InvoicePage[]>([]);

  useEffect(() => {
    let active = true;

    async function loadOrder() {
      if (!orderId && !consolidatedInvoiceId) {
        setError('Thiếu mã đơn hàng để in hóa đơn.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        if (consolidatedInvoiceId) {
          const detail = await consolidatedInvoicesService.getOne(consolidatedInvoiceId);
          if (active) {
            setConsolidatedInvoice(detail);
            setOrder(toPrintableSalesOrder(detail));
          }
        } else if (orderId) {
          const detail = await salesOrdersService.getOne(orderId);
          if (active) {
            setConsolidatedInvoice(null);
            setOrder(detail);
          }
        }
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
  }, [consolidatedInvoiceId, orderId]);

  const items = useMemo(() => order?.sales_order_items ?? [], [order?.sales_order_items]);
  const subtotal = Number(order?.subtotal ?? 0);
  const discountAmount = Number(order?.discount_amount ?? 0);
  const shippingFee = Number(order?.shipping_fee ?? 0);
  const taxAmount = Number(order?.tax_amount ?? 0);
  const totalAmount = Number(order?.total_amount ?? 0);
  const invoiceNo = order?.invoice_no ?? order?.order_no ?? '---';
  const documentTitle = consolidatedInvoice ? 'HÓA ĐƠN TỔNG HỢP' : 'ĐƠN HÀNG';
  const sourceOrderNos = consolidatedInvoice?.consolidated_invoice_orders
    .map((item) => item.source_order_no)
    .filter(Boolean) ?? [];
  const fallbackInvoicePages = useMemo<InvoicePage[]>(() => {
    if (!items.length) {
      return [{ items: [], startIndex: 0, showHeader: true, showSummary: true }];
    }

    return [{ items, startIndex: 0, showHeader: true, showSummary: true }];
  }, [items]);

  useLayoutEffect(() => {
    if (!order) return;

    const measure = measureRef.current;
    if (!measure) {
      setInvoicePages(fallbackInvoicePages);
      return;
    }

    if (!items.length) {
      setInvoicePages(fallbackInvoicePages);
      return;
    }

    const paper = measure.querySelector<HTMLElement>('[data-measure="paper"]');
    const paperStyles = paper ? window.getComputedStyle(paper) : null;
    const paperHeight = paperStyles ? parseFloat(paperStyles.minHeight || '0') : 0;
    const paddingTop = paperStyles ? parseFloat(paperStyles.paddingTop || '0') : 0;
    const paddingBottom = paperStyles ? parseFloat(paperStyles.paddingBottom || '0') : 0;
    const availableHeight = Math.max(0, paperHeight - paddingTop - paddingBottom);

    const firstHeaderHeight = getOuterHeight(measure.querySelector('[data-measure="first-header"]'));
    const continuationHeaderHeight = getOuterHeight(measure.querySelector('[data-measure="continuation-header"]'));
    const orderHeaderHeight = getOuterHeight(measure.querySelector('[data-measure="order-header"]'));
    const orderTitleHeight = getOuterHeight(measure.querySelector('[data-measure="order-title"]'));
    const summaryHeight =
      getOuterHeight(measure.querySelector('[data-measure="summary"]')) +
      getOuterHeight(measure.querySelector('[data-measure="signatures"]'));
    const measuredRows = measure.querySelectorAll('[data-measure-row]') as NodeListOf<Element>;
    const rowHeights = Array.from(measuredRows).map((row) => getOuterHeight(row));

    if (!availableHeight || !rowHeights.length) {
      setInvoicePages(fallbackInvoicePages);
      return;
    }

    const nextPages: InvoicePage[] = [];
    let cursor = 0;
    let pageIndex = 0;

    while (cursor < items.length) {
      const showHeader = pageIndex === 0;
      const currentOrderHeaderHeight = showHeader ? orderHeaderHeight : orderHeaderHeight - orderTitleHeight;
      const fixedHeight = (showHeader ? firstHeaderHeight : continuationHeaderHeight) + currentOrderHeaderHeight;
      const availableForRows = Math.max(0, availableHeight - fixedHeight);
      const availableForLastPageRows = Math.max(0, availableForRows - summaryHeight);

      const remainingHeight = items.slice(cursor).reduce((sum, _item, index) => sum + (rowHeights[cursor + index] ?? 0), 0);
      if (remainingHeight <= availableForLastPageRows) {
        nextPages.push({
          items: items.slice(cursor),
          startIndex: cursor,
          showHeader,
          showSummary: true,
        });
        break;
      }

      let usedHeight = 0;
      let end = cursor;
      while (end < items.length && usedHeight + (rowHeights[end] ?? 0) <= availableForRows) {
        usedHeight += rowHeights[end] ?? 0;
        end += 1;
      }

      if (end === cursor) end += 1;

      nextPages.push({
        items: items.slice(cursor, end),
        startIndex: cursor,
        showHeader,
        showSummary: false,
      });

      cursor = end;
      pageIndex += 1;
    }

    if (nextPages.length && !nextPages[nextPages.length - 1].showSummary) {
      nextPages.push({
        items: [],
        startIndex: items.length,
        showHeader: false,
        showSummary: true,
      });
    }

    setInvoicePages(nextPages.length ? nextPages : fallbackInvoicePages);
  }, [fallbackInvoicePages, items, order]);

  const renderedInvoicePages = invoicePages.length ? invoicePages : fallbackInvoicePages;

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
    if (!shouldAutoPrint || isLoading || !order || !invoicePages.length || hasAutoPrintedRef.current) return;

    hasAutoPrintedRef.current = true;
    const timer = window.setTimeout(handlePrintInvoice, 600);

    return () => window.clearTimeout(timer);
  }, [handlePrintInvoice, invoicePages.length, isLoading, order, shouldAutoPrint]);

  const handleBack = () => {
    navigate('/orders', { state: orderId ? { selectedOrderId: orderId } : undefined });
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
        {renderedInvoicePages.map((page, pageIndex) => (
          <main
            key={pageIndex}
            className={`invoice-paper bg-white shadow-[0_22px_70px_rgba(15,23,42,0.18)] ${page.showHeader ? '' : 'invoice-paper-compact'}`}
          >
            {page.showHeader ? (
              <>
        <header className="invoice-hero">
          <div className="invoice-store">
            <div className="invoice-store-copy">
              <h1>{STORE_INFO.name}</h1>
              <p>{STORE_INFO.address}</p>
              <p>Hotline: {STORE_INFO.phone}</p>
            </div>
          </div>
        </header>

        <section className="invoice-meta-grid">
          <div>
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
              {sourceOrderNos.length ? (
                <div>
                  <dt>Đơn gốc:</dt>
                  <dd>{sourceOrderNos.join(', ')}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="invoice-transaction">
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
              <div className="invoice-continuation-spacer" />
            )}

            {page.items.length || pageIndex === 0 ? (
        <section className="invoice-order-section">
          {pageIndex === 0 ? <h3>{documentTitle}</h3> : null}
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
          {!shouldHideDiscount ? (
            <div className="invoice-summary-row">
              <span>Chiết khấu / Giảm giá:</span>
              <strong>{discountAmount ? `- ${formatCurrency(discountAmount)} đ` : '0 đ'}</strong>
            </div>
          ) : null}
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
        </section>

        <section className="invoice-signatures">
          <div>
            <strong>NGƯỜI MUA HÀNG</strong>
            <span>(Ký, ghi rõ họ tên)</span>
          </div>
          <div>
            <strong>NGƯỜI BÁN HÀNG</strong>
            <span>(Ký, ghi rõ họ tên)</span>
          </div>
        </section>
          </>
        ) : null}
          </main>
        ))}
      </div>

      <div ref={measureRef} className="invoice-measure" aria-hidden="true">
        <main className="invoice-paper bg-white" data-measure="paper">
          <div data-measure="first-header">
            <header className="invoice-hero">
              <div className="invoice-store">
                <div className="invoice-store-copy">
                  <h1>{STORE_INFO.name}</h1>
                  <p>{STORE_INFO.address}</p>
                  <p>Hotline: {STORE_INFO.phone}</p>
                </div>
              </div>
            </header>

            <section className="invoice-meta-grid">
              <div>
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
                  {sourceOrderNos.length ? (
                    <div>
                      <dt>Đơn gốc:</dt>
                      <dd>{sourceOrderNos.join(', ')}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              <div className="invoice-transaction">
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
          </div>

          <div className="invoice-continuation-spacer" data-measure="continuation-header" />

          <section className="invoice-order-section" data-measure="order-header">
            <h3 data-measure="order-title">{documentTitle}</h3>
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
            </table>
          </section>

          <table className="invoice-items">
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id ?? `${item.product_id}-${index}`} data-measure-row>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{item.product_name}</strong>
                  </td>
                  <td>{item.unit_name || 'Cái'}</td>
                  <td>{formatCurrency(Number(item.quantity ?? 0))}</td>
                  <td>{formatCurrency(Number(item.unit_price ?? 0))}</td>
                  <td>{formatCurrency(getLineTotal(item))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <section className="invoice-summary" data-measure="summary">
            <div className="invoice-summary-row">
              <span>Tổng tiền hàng:</span>
              <strong>{formatCurrency(subtotal)} đ</strong>
            </div>
            {!shouldHideDiscount ? (
              <div className="invoice-summary-row">
                <span>Chiết khấu / Giảm giá:</span>
                <strong>{discountAmount ? `- ${formatCurrency(discountAmount)} đ` : '0 đ'}</strong>
              </div>
            ) : null}
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
          </section>

          <section className="invoice-signatures" data-measure="signatures">
            <div>
              <strong>NGƯỜI MUA HÀNG</strong>
              <span>(Ký, ghi rõ họ tên)</span>
            </div>
            <div>
              <strong>NGƯỜI BÁN HÀNG</strong>
              <span>(Ký, ghi rõ họ tên)</span>
            </div>
          </section>

        </main>
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
          position: relative;
          display: flex;
          flex-direction: column;
          padding: 7mm 10mm 6mm;
          font-family: "Times New Roman", Times, serif;
          font-size: 12px;
          line-height: 1.32;
        }

        .invoice-paper-compact {
          padding-top: 4mm;
        }

        .invoice-measure {
          position: absolute;
          left: -10000px;
          top: 0;
          width: 148mm;
          visibility: hidden;
          pointer-events: none;
          overflow: hidden;
          z-index: -1;
        }

        .invoice-measure .invoice-paper {
          box-shadow: none;
        }

        .invoice-continuation-spacer {
          height: 0;
        }

        .invoice-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          align-items: start;
          gap: 24px;
        }

        .invoice-store {
          display: block;
        }

        .invoice-store-copy {
          padding-top: 0;
        }

        .invoice-store h1 {
          margin: 0 0 6px;
          color: #07152b;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0;
          line-height: 1.2;
        }

        .invoice-store p {
          margin: 2px 0;
          color: #334155;
          font-size: 12px;
        }

        .invoice-meta-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 56mm;
          gap: 7mm;
          margin-top: 6mm;
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
          margin-top: 3mm;
        }

        .invoice-order-section h3 {
          margin: 0 0 6px;
          color: #020617;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-align: center;
        }

        .invoice-items {
          width: 100%;
          border-right: 1px solid #64748b;
          border-left: 1px solid #64748b;
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
          font-size: 12px;
          font-weight: 600;
          text-align: left;
        }

        .invoice-items th + th {
          border-left: 1px solid #64748b;
        }

        .invoice-items td {
          border-bottom: 1.5px solid #64748b;
          padding: 1mm 1.4mm;
          color: #0f172a;
          vertical-align: top;
        }

        .invoice-items td + td {
          border-left: 1px solid #64748b;
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
          line-height: 1.2;
        }

        .invoice-items td span {
          margin-top: 3px;
          color: #64748b;
          font-size: 12px;
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
        .invoice-grand-total {
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
          font-size: 12px;
          font-weight: 950;
        }

        .invoice-grand-total strong {
          font-size: 12px;
          font-weight: 950;
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
        .invoice-signatures span {
          display: block;
        }

        .invoice-signatures strong {
          color: #020617;
          font-size: 12px;
          font-weight: 700;
        }

        .invoice-signatures span {
          margin-top: 2px;
          color: #0f172a;
          font-size: 12px;
          font-style: italic;
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

          .invoice-measure {
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
            min-height: 100vh !important;
            height: 100vh !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 7mm 10mm 6mm !important;
            overflow: visible !important;
            break-inside: avoid;
            page-break-inside: avoid;
            break-after: page;
            page-break-after: always;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .invoice-paper-compact {
            padding-top: 4mm !important;
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
