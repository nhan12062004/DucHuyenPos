import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckSquare, FilePlus2, Loader2, Package, Square } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ToastBridge } from '../components/Toast';
import { PageLoader } from '../components/PageLoader';
import { consolidatedInvoicesService } from '../services/consolidatedInvoicesService';
import type { SalesOrder } from '../services/salesOrdersService';

function formatCurrency(value: number) {
  return Number(value ?? 0).toLocaleString('vi-VN');
}

function formatDateTime(value?: string) {
  if (!value) return '---';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function ConsolidatedInvoiceCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('customerId');
  const initialOrderId = searchParams.get('orderId');
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      if (!customerId) {
        setError('Hãy mở chức năng này từ chi tiết một đơn hàng có khách hàng.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const eligibleOrders = await consolidatedInvoicesService.getEligible(customerId);
        if (!active) return;
        setOrders(eligibleOrders);
        if (initialOrderId && eligibleOrders.some((order) => order.id === initialOrderId)) {
          setSelectedIds([initialOrderId]);
        }
      } catch (nextError: any) {
        if (active) setError(nextError?.message ?? 'Không tải được các đơn hàng có thể gộp.');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadOrders();
    return () => {
      active = false;
    };
  }, [customerId, initialOrderId]);

  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedIds.includes(order.id)),
    [orders, selectedIds],
  );
  const selectedBranchId = selectedOrders[0]?.branch_id;
  const customer = orders[0]?.customers;
  const totals = useMemo(
    () => selectedOrders.reduce(
      (sum, order) => ({
        total: sum.total + Number(order.total_amount ?? 0),
        paid: sum.paid + Number(order.paid_amount ?? 0),
        products: sum.products + (order.sales_order_items?.length ?? 0),
      }),
      { total: 0, paid: 0, products: 0 },
    ),
    [selectedOrders],
  );

  const toggleOrder = (order: SalesOrder) => {
    setError(null);
    setSelectedIds((current) => {
      if (current.includes(order.id)) return current.filter((id) => id !== order.id);
      if (selectedBranchId && selectedBranchId !== order.branch_id) {
        setError('Chỉ có thể gộp các đơn hàng cùng một chi nhánh.');
        return current;
      }
      return [...current, order.id];
    });
  };

  const handleCreate = async () => {
    if (selectedIds.length < 2) {
      setError('Chọn ít nhất 2 đơn hàng để tạo hóa đơn tổng hợp.');
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      const created = await consolidatedInvoicesService.create({
        sales_order_ids: selectedIds,
        note: note.trim() || undefined,
      });
      window.location.assign(`/invoice?consolidatedInvoiceId=${encodeURIComponent(created.id)}&autoPrint=1`);
    } catch (nextError: any) {
      // The server may finish creating the invoice after the browser connection times out.
      // Recover by locating the invoice from one of its source orders before allowing a retry.
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const existing = await consolidatedInvoicesService.getByOrder(selectedIds[0]);
          window.location.assign(`/invoice?consolidatedInvoiceId=${encodeURIComponent(existing.id)}&autoPrint=1`);
          return;
        } catch {
          if (attempt < 2) await wait(1_000);
        }
      }
      setError(nextError?.message ?? 'Không thể tạo hóa đơn tổng hợp.');
      setIsCreating(false);
    }
  };

  if (isLoading) return <PageLoader text="Đang tải đơn hàng của khách..." fullScreen />;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <ToastBridge message={error} variant="error" onDone={() => setError(null)} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#0088FF]"
          >
            <ArrowLeft size={16} /> Quay lại đơn hàng
          </button>
          <h1 className="text-2xl font-semibold text-[#182537]">Tạo hóa đơn tổng hợp</h1>
          <p className="mt-1 text-sm text-slate-500">Chọn các đơn đã hoàn thành chưa gộp của cùng khách; mỗi lần tạo sẽ có mã hóa đơn riêng và vẫn lưu các đơn gốc liên quan.</p>
        </div>
        <button
          type="button"
          disabled={isCreating || selectedIds.length < 2}
          onClick={handleCreate}
          className="flex h-10 items-center gap-2 bg-[#0088FF] px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isCreating ? <Loader2 size={17} className="animate-spin" /> : <FilePlus2 size={17} />}
          {isCreating ? 'Đang tạo...' : `Tạo & in (${selectedIds.length})`}
        </button>
      </div>

      {customer ? (
        <div className="border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-700">
          Khách hàng: <strong>{customer.full_name}</strong>{customer.phone ? ` · ${customer.phone}` : ''}
        </div>
      ) : null}

      {!orders.length ? (
        <div className="border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
          Khách hàng này không có ít nhất hai đơn hoàn thành chưa được gộp.
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-200 bg-white">
          <div className="grid grid-cols-[44px_minmax(130px,1fr)_minmax(140px,1.2fr)_130px_130px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span />
            <span>Mã đơn</span>
            <span>Ngày bán</span>
            <span className="text-right">Sản phẩm</span>
            <span className="text-right">Tổng tiền</span>
          </div>
          {orders.map((order) => {
            const selected = selectedIds.includes(order.id);
            const differentBranch = Boolean(selectedBranchId && selectedBranchId !== order.branch_id);
            return (
              <button
                key={order.id}
                type="button"
                disabled={differentBranch}
                onClick={() => toggleOrder(order)}
                className={`grid w-full grid-cols-[44px_minmax(130px,1fr)_minmax(140px,1.2fr)_130px_130px] items-center gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm transition-colors last:border-b-0 ${
                  selected ? 'bg-blue-50' : 'hover:bg-slate-50'
                } disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
              >
                <span className="text-[#0088FF]">{selected ? <CheckSquare size={20} /> : <Square size={20} className="text-slate-300" />}</span>
                <span className="font-semibold text-[#182537]">{order.order_no}</span>
                <span className="text-slate-500">{formatDateTime(order.sold_at)}</span>
                <span className="flex items-center justify-end gap-1 text-slate-600"><Package size={14} /> {order.sales_order_items?.length ?? 0}</span>
                <span className="text-right font-semibold text-[#182537]">{formatCurrency(Number(order.total_amount ?? 0))} đ</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <label className="block border border-slate-200 bg-white p-4">
          <span className="mb-2 block text-sm font-semibold text-[#182537]">Ghi chú trên hóa đơn (tùy chọn)</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Ví dụ: Tổng hợp mua hàng tháng 09/2026"
            className="w-full resize-none border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0088FF]"
          />
        </label>
        <div className="border border-slate-200 bg-white p-4 text-sm">
          <div className="flex justify-between py-1 text-slate-600"><span>Đơn đã chọn</span><strong>{selectedIds.length}</strong></div>
          <div className="flex justify-between py-1 text-slate-600"><span>Dòng hàng gốc</span><strong>{totals.products}</strong></div>
          <div className="mt-2 flex justify-between border-t border-slate-200 pt-3 text-base text-[#182537]"><span>Tổng cộng</span><strong>{formatCurrency(totals.total)} đ</strong></div>
          <div className="mt-1 flex justify-between text-xs text-slate-500"><span>Đã thanh toán</span><span>{formatCurrency(totals.paid)} đ</span></div>
        </div>
      </div>
    </div>
  );
}
