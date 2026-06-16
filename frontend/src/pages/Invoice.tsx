import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { PageLoader } from '../components/PageLoader';
import { salesOrdersService, type SalesOrder } from '../services/salesOrdersService';

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

export function Invoice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
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

  const items = order?.sales_order_items ?? [];
  const subtotal = Number(order?.subtotal ?? 0);
  const discountAmount = Number(order?.discount_amount ?? 0);
  const totalAmount = Number(order?.total_amount ?? 0);
  const paidAmount = Number(order?.paid_amount ?? 0);
  const debtAmount = useMemo(
    () => Math.max(0, totalAmount - paidAmount),
    [paidAmount, totalAmount],
  );

  const handleBack = () => {
    navigate('/orders', {
      state: orderId
        ? {
            selectedOrderId: orderId,
          }
        : undefined,
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
    <div className="invoice-screen min-h-screen bg-[#eef1f5] px-6 py-8 text-[#141923]">
      <div className="invoice-actions fixed right-8 top-6 z-20 flex items-center gap-4">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 items-center gap-2 border border-slate-300 bg-[#f3f5f8] px-5 text-sm font-medium text-slate-700 shadow-sm hover:bg-white"
        >
          <ArrowLeft size={17} />
          Quay Lại
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex h-10 items-center gap-2 bg-[#0b57d0] px-6 text-sm font-semibold text-white shadow-sm hover:bg-[#0848ad]"
        >
          <Printer size={17} />
          In Hóa Đơn
        </button>
      </div>

      <main className="invoice-paper mx-auto min-h-[1123px] w-[794px] bg-white px-[54px] py-[62px] shadow-md">
        <header className="grid grid-cols-[1fr_250px] gap-8">
          <div className="pt-3">
            <Logo className="mb-8 h-9 w-9" />
            <h1 className="text-[20px] font-bold">Vật tư Điện Nước Đức Huyền</h1>
            <div className="mt-3 space-y-1 text-[14px] leading-5 text-slate-700">
              <p>Số 123, Đường ABC, Phường X, Quận Y, TP. HCM</p>
              <p>Hotline: 090 123 4567</p>
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-[30px] font-black uppercase leading-[1.15] tracking-tight">
              Hóa đơn
              <br />
              Bán hàng
            </h2>
            <div className="mt-5 inline-flex border border-slate-300 bg-slate-100 px-5 py-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-700">
              Bản gốc
            </div>
          </div>
        </header>

        <div className="my-8 border-t-2 border-[#141923]" />

        <section className="grid grid-cols-[1fr_300px] gap-16">
          <div>
            <h3 className="border-b border-slate-300 pb-2 text-[13px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Thông tin khách hàng
            </h3>
            <dl className="mt-4 grid grid-cols-[88px_1fr] gap-x-4 gap-y-4 text-[14px] leading-5">
              <dt className="font-bold">Khách hàng:</dt>
              <dd>{order.customers?.full_name ?? 'Khách lẻ'}</dd>
              <dt className="font-bold">Điện thoại:</dt>
              <dd>{order.customers?.phone ?? '---'}</dd>
              <dt className="font-bold">Địa chỉ:</dt>
              <dd>{order.delivery_address ?? order.customers?.address ?? '---'}</dd>
            </dl>
          </div>

          <div>
            <h3 className="border-b border-slate-300 pb-2 text-[13px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Chi tiết giao dịch
            </h3>
            <dl className="mt-4 grid grid-cols-[88px_1fr] gap-x-4 gap-y-4 text-[14px] leading-5">
              <dt>Mã Hóa Đơn:</dt>
              <dd className="font-bold">#{order.invoice_no ?? order.order_no}</dd>
              <dt>Ngày tạo:</dt>
              <dd>{formatDateTime(order.sold_at)}</dd>
              <dt>Thu ngân:</dt>
              <dd>{order.cashier?.full_name ?? '---'}</dd>
            </dl>
          </div>
        </section>

        <table className="mt-10 w-full border-collapse text-[14px]">
          <thead>
            <tr className="border-y-2 border-[#141923] bg-slate-50 text-[12px] uppercase tracking-[0.08em] text-slate-700">
              <th className="w-12 py-4 text-center font-bold">STT</th>
              <th className="py-4 text-left font-bold">Tên hàng hóa</th>
              <th className="w-20 py-4 text-center font-bold">ĐVT</th>
              <th className="w-20 py-4 text-right font-bold">SL</th>
              <th className="w-32 py-4 text-right font-bold">Đơn giá</th>
              <th className="w-36 py-4 text-right font-bold">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="border-b border-slate-200 py-8 text-center text-slate-500">
                  Chưa có sản phẩm trong đơn hàng.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item.id ?? `${item.product_id}-${index}`} className="border-b border-slate-200">
                  <td className="py-5 text-center">{index + 1}</td>
                  <td className="py-5 pr-5 text-[15px] leading-6">{item.product_name}</td>
                  <td className="py-5 text-center">{item.unit_name ?? 'cái'}</td>
                  <td className="py-5 text-right">{formatCurrency(Number(item.quantity || 0))}</td>
                  <td className="py-5 text-right">{formatCurrency(Number(item.unit_price || 0))}</td>
                  <td className="py-5 text-right font-bold">{formatCurrency(Number(item.line_total || 0))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <section className="mt-10 flex justify-end">
          <div className="w-[350px] text-[14px]">
            <div className="flex justify-between border-b border-slate-200 py-3">
              <span>Tổng tiền hàng:</span>
              <span>{formatCurrency(subtotal)} đ</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 py-3">
              <span>Chiết khấu / Giảm giá:</span>
              <span>{discountAmount ? `- ${formatCurrency(discountAmount)} đ` : '0 đ'}</span>
            </div>
            <div className="flex items-end justify-between border-b-2 border-[#141923] py-5">
              <span className="text-[22px] font-black uppercase">Tổng cộng:</span>
              <span className="text-[26px] font-black">{formatCurrency(totalAmount)} đ</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 py-4">
              <span>Khách đã thanh toán:</span>
              <span>{formatCurrency(paidAmount)} đ</span>
            </div>
            <div className="mt-3 flex items-center justify-between border border-slate-300 bg-slate-100 px-3 py-3">
              <span className="font-bold uppercase">Ghi nợ:</span>
              <span className="text-[22px] font-black text-red-600">{formatCurrency(debtAmount)} đ</span>
            </div>
          </div>
        </section>

        <footer className="mt-16 border-t border-slate-300 pt-9 text-center">
          <p className="text-[16px] italic">"Cảm ơn Quý khách đã tin tưởng và ủng hộ Đức Huyền!"</p>
          <p className="mt-2 text-[14px] text-slate-700">
            Hàng mua rồi vui lòng không đổi trả nếu không do lỗi kỹ thuật.
          </p>

          <div className="mt-14 grid grid-cols-2 text-[13px]">
            <div>
              <div className="font-black uppercase">Người mua hàng</div>
              <div className="mt-1 italic">(Ký, ghi rõ họ tên)</div>
            </div>
            <div>
              <div className="font-black uppercase">Người bán hàng</div>
              <div className="mt-1 italic">(Ký, ghi rõ họ tên)</div>
              <div className="mx-auto mt-24 w-56 border-t border-slate-300 pt-4 text-[14px]">
                {order.cashier?.full_name ?? 'Người bán hàng'}
              </div>
            </div>
          </div>
        </footer>
      </main>

      <style>{`
        @page {
          size: A4;
          margin: 0;
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
            width: 210mm !important;
            min-height: 297mm !important;
            box-shadow: none !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
