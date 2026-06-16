import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { PageLoader } from '../components/PageLoader';
import { salesOrdersService, type SalesOrder } from '../services/salesOrdersService';

const STORE_NAME = 'CỬA HÀNG ĐIỆN NƯỚC ĐỨC HUYỀN';
const STORE_ADDRESS = '277 Nguyễn Thị Duệ, Việt Hòa, TP. Hải Phòng';
const STORE_PHONE = '0989 245 272 - 0904 538 786';

const VIETNAMESE_DIGITS = [
  'không',
  'một',
  'hai',
  'ba',
  'bốn',
  'năm',
  'sáu',
  'bảy',
  'tám',
  'chín',
];

function formatCurrency(value: number) {
  return value.toLocaleString('vi-VN');
}

function formatDateTime(value?: string) {
  if (!value) {
    return '---';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function readThreeDigits(value: number, hasHigherGroup: boolean) {
  const hundred = Math.floor(value / 100);
  const ten = Math.floor((value % 100) / 10);
  const unit = value % 10;
  const parts: string[] = [];

  if (hundred > 0) {
    parts.push(`${VIETNAMESE_DIGITS[hundred]} trăm`);
  } else if (hasHigherGroup && (ten > 0 || unit > 0)) {
    parts.push('không trăm');
  }

  if (ten > 1) {
    parts.push(`${VIETNAMESE_DIGITS[ten]} mươi`);
    if (unit === 1) {
      parts.push('mốt');
    } else if (unit === 5) {
      parts.push('lăm');
    } else if (unit > 0) {
      parts.push(VIETNAMESE_DIGITS[unit]);
    }
  } else if (ten === 1) {
    parts.push('mười');
    if (unit === 5) {
      parts.push('lăm');
    } else if (unit > 0) {
      parts.push(VIETNAMESE_DIGITS[unit]);
    }
  } else if (unit > 0) {
    if (hundred > 0 || hasHigherGroup) {
      parts.push('lẻ');
    }
    parts.push(VIETNAMESE_DIGITS[unit]);
  }

  return parts.join(' ');
}

function numberToVietnameseCurrency(value: number) {
  const amount = Math.round(Math.max(0, value));
  if (amount === 0) {
    return 'Không đồng chẵn.';
  }

  const units = ['', 'nghìn', 'triệu', 'tỷ'];
  const groups: number[] = [];
  let remaining = amount;

  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const words: string[] = [];
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const groupValue = groups[index];
    if (groupValue === 0) {
      continue;
    }

    const groupWords = readThreeDigits(groupValue, index < groups.length - 1);
    words.push(`${groupWords}${units[index] ? ` ${units[index]}` : ''}`);
  }

  const sentence = `${words.join(' ')} đồng chẵn.`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
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
        if (active) {
          setOrder(detail);
        }
      } catch (loadError: any) {
        if (active) {
          setError(loadError?.message ?? 'Không tải được hóa đơn.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      active = false;
    };
  }, [orderId]);

  useEffect(() => {
    if (!shouldAutoPrint || isLoading || !order || hasAutoPrintedRef.current) {
      return;
    }

    hasAutoPrintedRef.current = true;
    const timer = window.setTimeout(() => {
      window.print();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [isLoading, order, shouldAutoPrint]);

  const items = order?.sales_order_items ?? [];
  const subtotal = Number(order?.subtotal ?? 0);
  const discountAmount = Number(order?.discount_amount ?? 0);
  const shippingFee = Number(order?.shipping_fee ?? 0);
  const taxAmount = Number(order?.tax_amount ?? 0);
  const totalAmount = Number(order?.total_amount ?? 0);
  const paidAmount = Number(order?.paid_amount ?? 0);
  const debtAmount = useMemo(
    () => Math.max(0, totalAmount - paidAmount),
    [paidAmount, totalAmount],
  );
  const amountInWords = useMemo(() => numberToVietnameseCurrency(totalAmount), [totalAmount]);

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
      <div className="flex min-h-screen items-center justify-center bg-[#eef1f5] px-6">
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
    <div className="invoice-screen min-h-screen bg-[#eef1f5] px-5 py-7 text-[#111827]">
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
          onClick={() => window.print()}
          className="flex h-10 items-center gap-2 bg-[#0b57d0] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#0848ad]"
        >
          <Printer size={17} />
          In hóa đơn A5
        </button>
      </div>

      <main className="invoice-paper mx-auto bg-white shadow-md">
        <header className="invoice-header">
          <div className="invoice-store">
            <Logo className="invoice-logo" />
            <div>
              <h1>{STORE_NAME}</h1>
              <p>{STORE_ADDRESS}</p>
              <p>ĐT: {STORE_PHONE}</p>
            </div>
          </div>
          <div className="invoice-id">
            <div>Số HĐ: <strong>{order.invoice_no ?? order.order_no}</strong></div>
            <div>Ngày: <strong>{formatDateTime(order.sold_at)}</strong></div>
          </div>
        </header>

        <section className="invoice-title">
          <h2>HÓA ĐƠN BÁN HÀNG</h2>
          <span>Bản in A5</span>
        </section>

        <section className="invoice-info-grid">
          <div>
            <label>Khách hàng</label>
            <strong>{order.customers?.full_name ?? 'Khách lẻ'}</strong>
          </div>
          <div>
            <label>Điện thoại</label>
            <strong>{order.customers?.phone ?? '---'}</strong>
          </div>
          <div className="span-2">
            <label>Địa chỉ giao hàng</label>
            <strong>{order.delivery_address ?? order.customers?.address ?? '---'}</strong>
          </div>
          <div>
            <label>Thu ngân</label>
            <strong>{order.cashier?.full_name ?? '---'}</strong>
          </div>
          <div>
            <label>Chi nhánh</label>
            <strong>{order.branches?.name ?? '---'}</strong>
          </div>
          {order.note?.trim() ? (
            <div className="span-2">
              <label>Ghi chú</label>
              <strong>{order.note.trim()}</strong>
            </div>
          ) : null}
        </section>

        <table className="invoice-items">
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên hàng</th>
              <th>SL</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-row">
                  Chưa có sản phẩm trong đơn hàng.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item.id ?? `${item.product_id}-${index}`}>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{item.product_name}</strong>
                    <span>{item.sku ? `SKU: ${item.sku}` : item.unit_name ?? 'cái'}</span>
                  </td>
                  <td>{formatCurrency(Number(item.quantity || 0))}</td>
                  <td>{formatCurrency(Number(item.unit_price || 0))}</td>
                  <td>{formatCurrency(Number(item.line_total || 0))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <section className="invoice-bottom">
          <div className="invoice-words">
            <label>Bằng chữ</label>
            <strong>{amountInWords}</strong>
          </div>

          <div className="invoice-totals">
            <div>
              <span>Tổng tiền hàng</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            <div>
              <span>Chiết khấu</span>
              <strong>{discountAmount ? `- ${formatCurrency(discountAmount)}` : '0'}</strong>
            </div>
            <div>
              <span>Phí giao hàng</span>
              <strong>{formatCurrency(shippingFee)}</strong>
            </div>
            <div>
              <span>Thuế</span>
              <strong>{formatCurrency(taxAmount)}</strong>
            </div>
            <div className="total">
              <span>Tổng cộng</span>
              <strong>{formatCurrency(totalAmount)} đ</strong>
            </div>
            <div>
              <span>Đã thanh toán</span>
              <strong>{formatCurrency(paidAmount)} đ</strong>
            </div>
            <div className="debt">
              <span>Còn nợ</span>
              <strong>{formatCurrency(debtAmount)} đ</strong>
            </div>
          </div>
        </section>

        <section className="invoice-signatures">
          <div>
            <strong>Người mua hàng</strong>
            <span>(Ký, ghi rõ họ tên)</span>
          </div>
          <div>
            <strong>Người bán hàng</strong>
            <span>(Ký, ghi rõ họ tên)</span>
            <em>{order.cashier?.full_name ?? ''}</em>
          </div>
        </section>

        <footer className="invoice-footer">
          Cảm ơn Quý khách đã tin tưởng và ủng hộ Đức Huyền.
        </footer>
      </main>

      <style>{`
        @page {
          size: A5;
          margin: 0;
        }

        .invoice-paper {
          width: 559px;
          min-height: 794px;
          padding: 34px 34px 30px;
          font-size: 12px;
          line-height: 1.42;
        }

        .invoice-header {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 156px;
          gap: 18px;
          align-items: start;
          border-bottom: 2px solid #0b57d0;
          padding-bottom: 16px;
        }

        .invoice-store {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          gap: 12px;
          align-items: start;
        }

        .invoice-logo {
          width: 42px;
          height: 42px;
        }

        .invoice-store h1 {
          margin: 0 0 6px;
          color: #0b57d0;
          font-size: 14px;
          font-weight: 900;
          line-height: 1.25;
          text-transform: uppercase;
        }

        .invoice-store p,
        .invoice-id div {
          margin: 2px 0;
          color: #344054;
        }

        .invoice-id {
          display: grid;
          gap: 8px;
          text-align: right;
        }

        .invoice-title {
          display: grid;
          justify-items: center;
          gap: 4px;
          margin: 18px 0;
          text-align: center;
        }

        .invoice-title h2 {
          margin: 0;
          color: #111827;
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 0.02em;
        }

        .invoice-title span {
          border: 1px solid #c5cede;
          background: #f8fafc;
          padding: 2px 10px;
          color: #667085;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .invoice-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 14px;
          border: 1px solid #d0d7e2;
          background: #fbfcfe;
          padding: 12px;
        }

        .invoice-info-grid .span-2 {
          grid-column: 1 / -1;
        }

        .invoice-info-grid label,
        .invoice-words label {
          display: block;
          margin-bottom: 3px;
          color: #667085;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .invoice-info-grid strong,
        .invoice-words strong {
          color: #111827;
          font-weight: 700;
        }

        .invoice-items {
          width: 100%;
          margin-top: 16px;
          border-collapse: collapse;
        }

        .invoice-items th,
        .invoice-items td {
          border: 1px solid #d0d7e2;
        }

        .invoice-items th {
          background: #eef3fb;
          padding: 8px 6px;
          color: #1f2937;
          font-size: 11px;
          font-weight: 900;
          text-align: center;
        }

        .invoice-items td {
          padding: 8px 6px;
          vertical-align: top;
        }

        .invoice-items th:nth-child(1),
        .invoice-items td:nth-child(1) {
          width: 34px;
          text-align: center;
        }

        .invoice-items th:nth-child(3),
        .invoice-items td:nth-child(3) {
          width: 46px;
          text-align: center;
        }

        .invoice-items th:nth-child(4),
        .invoice-items td:nth-child(4),
        .invoice-items th:nth-child(5),
        .invoice-items td:nth-child(5) {
          width: 82px;
          text-align: right;
        }

        .invoice-items td:nth-child(5) {
          font-weight: 800;
        }

        .invoice-items td strong,
        .invoice-items td span {
          display: block;
        }

        .invoice-items td span {
          margin-top: 3px;
          color: #667085;
          font-size: 10px;
        }

        .invoice-items .empty-row {
          padding: 18px;
          text-align: center;
          color: #667085;
        }

        .invoice-bottom {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 210px;
          gap: 16px;
          align-items: start;
          margin-top: 14px;
        }

        .invoice-words {
          border: 1px solid #e2e8f0;
          padding: 10px;
          min-height: 90px;
        }

        .invoice-words strong {
          font-style: italic;
        }

        .invoice-totals {
          border: 1px solid #d0d7e2;
          border-bottom: 0;
        }

        .invoice-totals div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid #d0d7e2;
          padding: 7px 8px;
        }

        .invoice-totals span {
          color: #475467;
        }

        .invoice-totals strong {
          font-weight: 800;
          text-align: right;
          white-space: nowrap;
        }

        .invoice-totals .total {
          background: #eaf1ff;
          color: #0b57d0;
          font-size: 13px;
          text-transform: uppercase;
        }

        .invoice-totals .total span,
        .invoice-totals .total strong {
          color: #0b57d0;
          font-weight: 900;
        }

        .invoice-totals .debt strong {
          color: #047857;
        }

        .invoice-signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
          margin-top: 34px;
          text-align: center;
        }

        .invoice-signatures strong,
        .invoice-signatures span,
        .invoice-signatures em {
          display: block;
        }

        .invoice-signatures strong {
          font-weight: 900;
        }

        .invoice-signatures span {
          margin-top: 3px;
          color: #475467;
          font-style: italic;
        }

        .invoice-signatures em {
          margin-top: 54px;
          color: #111827;
          font-style: normal;
          font-weight: 700;
        }

        .invoice-footer {
          margin-top: 22px;
          border-top: 1px solid #d0d7e2;
          padding-top: 12px;
          text-align: center;
          color: #344054;
          font-style: italic;
          font-weight: 700;
        }

        @media print {
          html,
          body,
          #root {
            background: white !important;
          }

          .invoice-screen {
            min-height: auto !important;
            padding: 0 !important;
            background: white !important;
          }

          .invoice-actions {
            display: none !important;
          }

          .invoice-paper {
            width: 148mm !important;
            min-height: 210mm !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 9mm !important;
          }
        }
      `}</style>
    </div>
  );
}
