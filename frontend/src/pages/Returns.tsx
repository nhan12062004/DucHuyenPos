import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  ChevronDown,
  Loader2,
  PackageCheck,
  Printer,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { PageLoader } from '../components/PageLoader';
import { salesOrdersService, type SalesOrder, type SalesOrderItem } from '../services/salesOrdersService';
import {
  salesReturnsService,
  type SalesReturn,
  type SalesReturnStatus,
} from '../services/salesReturnsService';
import { ToastBridge } from '../components/Toast';

type ReturnsRouteState = {
  orderId?: string;
  orderNo?: string;
  selectedReturnId?: string;
} | null;

function formatCurrency(value: number) {
  return value.toLocaleString('vi-VN');
}

function formatDateTime(value?: string | null) {
  if (!value) return '---';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
}

function getOrderNo(record: SalesReturn) {
  return record.sales_orders?.order_no ?? '---';
}

function getCustomerName(record: SalesReturn) {
  return record.customers?.full_name ?? 'Khách lẻ';
}

function getStatusMeta(status: SalesReturnStatus) {
  switch (status) {
    case 'approved':
      return { label: 'Đã duyệt', className: 'border-blue-300 bg-blue-50 text-blue-600' };
    case 'refunded':
      return { label: 'Đã hoàn tiền', className: 'border-emerald-300 bg-emerald-50 text-emerald-600' };
    case 'completed':
      return { label: 'Hoàn tất', className: 'border-emerald-300 bg-emerald-50 text-emerald-600' };
    case 'cancelled':
      return { label: 'Đã hủy', className: 'border-red-300 bg-red-50 text-red-600' };
    default:
      return { label: 'Chờ xử lý', className: 'border-amber-300 bg-amber-50 text-amber-600' };
  }
}

export function Returns() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as ReturnsRouteState;
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [selectedReturnId, setSelectedReturnId] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SalesReturnStatus>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [workingReturnId, setWorkingReturnId] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('Khách trả hàng');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const [ordersResponse, returnsResponse] = await Promise.all([
          salesOrdersService.getAll({ page: 1, limit: 200 }),
          salesReturnsService.getAll({ page: 1, limit: 200 }),
        ]);
        if (!active) return;
        let loadedOrders = ordersResponse.data;
        if (routeState?.orderId && !loadedOrders.some((order) => order.id === routeState.orderId)) {
          try {
            const routedOrder = await salesOrdersService.getOne(routeState.orderId);
            loadedOrders = [...loadedOrders, routedOrder];
          } catch {
            // The order may have expired or been deleted.
          }
        }
        setOrders(loadedOrders);
        setReturns(returnsResponse.data);
        if (routeState?.selectedReturnId) {
          setSelectedReturnId(routeState.selectedReturnId);
        }
        const routedOrder = loadedOrders.find((order) => order.id === routeState?.orderId);
        if (routeState?.orderId && !routedOrder) {
          setShowCreateModal(false);
          setError('Không tìm thấy đơn hàng gốc để trả hàng.');
        } else if (routeState?.orderId && routedOrder?.status !== 'completed') {
          setShowCreateModal(false);
          setError('Chỉ có thể tạo phiếu trả cho đơn đã hoàn thành.');
        }
      } catch (nextError: any) {
        if (active) setError(nextError?.message ?? 'Không tải được dữ liệu trả hàng.');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadData();

    if (routeState?.orderId) {
      setSelectedOrderId(routeState.orderId);
      setShowCreateModal(true);
      navigate('/returns', { replace: true, state: null });
    }

    return () => {
      active = false;
    };
  }, [navigate, routeState?.orderId]);

  useEffect(() => {
    const selectedOrder = orders.find((order) => order.id === selectedOrderId);
    const nextQuantities = (selectedOrder?.sales_order_items ?? []).reduce<Record<string, number>>((acc, item) => {
      acc[item.id] = 0;
      return acc;
    }, {});
    setReturnQuantities(nextQuantities);
  }, [orders, selectedOrderId]);

  const filteredReturns = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return returns.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!normalizedQuery) return true;
      return (
        item.return_no.toLowerCase().includes(normalizedQuery) ||
        getOrderNo(item).toLowerCase().includes(normalizedQuery) ||
        getCustomerName(item).toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query, returns, statusFilter]);

  const selectedReturn = returns.find((item) => item.id === selectedReturnId) ?? filteredReturns[0] ?? null;
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;
  const selectedOrderItems = selectedOrder?.sales_order_items ?? [];
  const returnedQuantities = useMemo(() => {
    const quantities: Record<string, number> = {};
    returns
      .filter((item) => item.sales_order_id === selectedOrderId && item.status !== 'cancelled')
      .flatMap((item) => item.sales_return_items ?? [])
      .forEach((item) => {
        if (item.sales_order_item_id) {
          quantities[item.sales_order_item_id] = (quantities[item.sales_order_item_id] ?? 0) + Number(item.quantity ?? 0);
        }
      });
    return quantities;
  }, [returns, selectedOrderId]);
  const returnItemsPreview = selectedOrderItems
    .map((item) => {
      const quantity = Number(returnQuantities[item.id] ?? 0);
      const orderedQuantity = Number(item.quantity ?? 0);
      const returnedQuantity = Number(returnedQuantities[item.id] ?? 0);
      const remainingQuantity = Math.max(0, orderedQuantity - returnedQuantity);
      const orderedLineTotal =
        Number(item.line_total ?? 0) ||
        orderedQuantity * Number(item.unit_price ?? 0) - Number(item.discount_amount ?? 0);
      const refundableUnitPrice = orderedQuantity > 0 ? orderedLineTotal / orderedQuantity : Number(item.unit_price ?? 0);
      return {
        item,
        quantity,
        returnedQuantity,
        remainingQuantity,
        unitPrice: refundableUnitPrice,
        lineTotal: Math.max(0, quantity * refundableUnitPrice),
      };
    })
    .filter((row) => row.quantity > 0);
  const refundAmount = returnItemsPreview.reduce((sum, row) => sum + row.lineTotal, 0);
  const totalRefunded = returns
    .filter((item) => item.status !== 'cancelled')
    .reduce((sum, item) => sum + Number(item.refund_amount || 0), 0);

  const handleQuantityChange = (item: SalesOrderItem, value: number) => {
    const maxQuantity = Math.max(0, Number(item.quantity ?? 0) - Number(returnedQuantities[item.id] ?? 0));
    const safeValue = Math.max(0, Math.min(maxQuantity, value));
    setReturnQuantities((current) => ({ ...current, [item.id]: safeValue }));
  };

  const handleCreateReturn = async () => {
    if (!selectedOrder) {
      setInfoMessage('Vui lòng chọn đơn hàng cần trả.');
      return;
    }

    if (returnItemsPreview.length === 0) {
      setInfoMessage('Vui lòng nhập số lượng hàng trả.');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const created = await salesReturnsService.create({
        sales_order_id: selectedOrder.id,
        reason: reason.trim() || 'Khách trả hàng',
        refund_amount: refundAmount,
        note: note.trim() || undefined,
        items: returnItemsPreview.map(({ item, quantity, unitPrice, lineTotal }) => ({
          sales_order_item_id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku,
          unit_name: item.unit_name,
          quantity,
          unit_price: unitPrice,
          line_total: lineTotal,
          reason: reason.trim() || 'Khách trả hàng',
        })),
      });

      setReturns((current) => [created, ...current]);
      setSelectedReturnId(created.id);
      setShowCreateModal(false);
      setSelectedOrderId('');
      setReason('Khách trả hàng');
      setNote('');
      setInfoMessage(`Đã tạo phiếu trả hàng ${created.return_no}.`);
    } catch (nextError: any) {
      setError(nextError?.message ?? 'Tạo phiếu trả hàng thất bại.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateStatus = async (record: SalesReturn, status: SalesReturnStatus) => {
    setWorkingReturnId(record.id);
    setError(null);

    try {
      const updated = await salesReturnsService.update(record.id, { status });
      setReturns((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setInfoMessage(`Đã cập nhật ${record.return_no} sang trạng thái ${getStatusMeta(status).label}.`);
    } catch (nextError: any) {
      setError(nextError?.message ?? 'Cập nhật phiếu trả hàng thất bại.');
    } finally {
      setWorkingReturnId('');
    }
  };

  if (isLoading) {
    return <PageLoader text="Đang tải khách trả hàng..." fullScreen />;
  }

  return (
    <div className="flex flex-col gap-4">
      <ToastBridge message={infoMessage} onDone={() => setInfoMessage(null)} />
      <ToastBridge message={error} variant="error" onDone={() => setError(null)} />

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-4 pt-10">
          <div className="flex max-h-[90vh] w-full max-w-[980px] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-[16px] font-semibold text-[#182537]">Tạo phiếu trả hàng</h2>
                <p className="mt-1 text-[13px] text-slate-500">Chọn đơn gốc và số lượng sản phẩm khách trả.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Đóng"
              >
                <X size={22} />
              </button>
            </div>

            <div className="grid flex-1 gap-4 overflow-y-auto p-5 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[13px] font-medium text-slate-600">Đơn hàng gốc</label>
                  <div className="relative">
                    <select
                      value={selectedOrderId}
                      onChange={(event) => setSelectedOrderId(event.target.value)}
                      className="h-9 w-full appearance-none border border-slate-300 bg-white px-3 pr-8 text-[13px] outline-none focus:border-[#0088FF]"
                    >
                      <option value="">Chọn đơn hàng</option>
                      {orders
                        .filter((order) => order.status === 'completed')
                        .map((order) => (
                          <option key={order.id} value={order.id}>
                            {order.order_no} - {order.customers?.full_name ?? 'Khách lẻ'}
                          </option>
                        ))}
                    </select>
                    <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[13px] font-medium text-slate-600">Lý do trả hàng</label>
                  <input
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="h-9 w-full border border-slate-300 px-3 text-[13px] outline-none focus:border-[#0088FF]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[13px] font-medium text-slate-600">Ghi chú</label>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={4}
                    className="w-full resize-none border border-slate-300 px-3 py-2 text-[13px] outline-none focus:border-[#0088FF]"
                  />
                </div>

                <div className="border border-slate-200 bg-slate-50 p-3 text-[13px]">
                  <div className="flex justify-between"><span className="text-slate-500">Khách hàng</span><strong>{selectedOrder?.customers?.full_name ?? '---'}</strong></div>
                  <div className="mt-2 flex justify-between"><span className="text-slate-500">Tổng đơn</span><strong>{formatCurrency(Number(selectedOrder?.total_amount ?? 0))} đ</strong></div>
                  <div className="mt-2 flex justify-between"><span className="text-slate-500">Tiền hoàn</span><strong className="text-red-600">{formatCurrency(refundAmount)} đ</strong></div>
                </div>
              </div>

              <div className="border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-semibold text-[#182537]">
                  Sản phẩm trong đơn
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="border-b border-slate-200 bg-white text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Sản phẩm</th>
                        <th className="px-3 py-3 text-right">Đã mua</th>
                        <th className="px-3 py-3 text-right">Đơn giá</th>
                        <th className="px-4 py-3 text-right">Trả</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrderItems.length ? (
                        selectedOrderItems.map((item) => {
                          const returnedQuantity = Number(returnedQuantities[item.id] ?? 0);
                          const remainingQuantity = Math.max(0, Number(item.quantity ?? 0) - returnedQuantity);
                          return (
                          <tr key={item.id}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-[#182537]">{item.product_name}</div>
                              <div className="mt-1 text-[12px] text-slate-500">{item.sku || '---'} - {item.unit_name || 'cái'}</div>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <div>{Number(item.quantity ?? 0)}</div>
                              {returnedQuantity > 0 ? <div className="text-[11px] text-slate-500">Đã trả: {returnedQuantity}</div> : null}
                            </td>
                            <td className="px-3 py-3 text-right">{formatCurrency(Number(item.unit_price ?? 0))} đ</td>
                            <td className="px-4 py-3 text-right">
                              <input
                                type="number"
                                min={0}
                                max={remainingQuantity}
                                value={returnQuantities[item.id] ?? 0}
                                onChange={(event) => handleQuantityChange(item, Number(event.target.value))}
                                className="h-8 w-20 border border-slate-300 px-2 text-right outline-none focus:border-[#0088FF]"
                              />
                              {remainingQuantity === 0 ? <div className="mt-1 text-[11px] text-slate-500">Đã trả đủ</div> : null}
                            </td>
                          </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                            Chọn đơn hàng để xem sản phẩm.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="h-9 border border-[#0088FF] bg-white px-5 text-[13px] font-medium text-[#0088FF] hover:bg-blue-50"
              >
                Thoát
              </button>
              <button
                type="button"
                onClick={handleCreateReturn}
                disabled={isCreating}
                className="flex h-9 items-center gap-2 bg-[#0088FF] px-5 text-[13px] font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
              >
                {isCreating ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
                Tạo phiếu trả
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="border border-slate-200 bg-white p-4">
          <div className="text-[13px] text-slate-500">Tổng phiếu trả</div>
          <div className="mt-2 text-2xl font-semibold text-[#182537]">{returns.length}</div>
        </div>
        <div className="border border-slate-200 bg-white p-4">
          <div className="text-[13px] text-slate-500">Chờ xử lý</div>
          <div className="mt-2 text-2xl font-semibold text-amber-600">{returns.filter((item) => item.status === 'pending').length}</div>
        </div>
        <div className="border border-slate-200 bg-white p-4">
          <div className="text-[13px] text-slate-500">Đã hoàn tiền</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-600">{returns.filter((item) => item.status === 'refunded').length}</div>
        </div>
        <div className="border border-slate-200 bg-white p-4">
          <div className="text-[13px] text-slate-500">Tổng tiền hoàn</div>
          <div className="mt-2 text-2xl font-semibold text-red-600">{formatCurrency(totalRefunded)} đ</div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-[16px] font-semibold text-[#182537]">Khách trả hàng</h2>
              <p className="mt-1 text-[13px] text-slate-500">Tạo phiếu trả, duyệt và ghi nhận hoàn tiền.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm mã phiếu, mã đơn, khách hàng"
                  className="h-9 w-[300px] border border-slate-300 pl-9 pr-3 text-[13px] outline-none focus:border-[#0088FF]"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="h-9 border border-slate-300 bg-white px-3 text-[13px] outline-none focus:border-[#0088FF]"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ xử lý</option>
                <option value="approved">Đã duyệt</option>
                <option value="refunded">Đã hoàn tiền</option>
                <option value="completed">Hoàn tất</option>
                <option value="cancelled">Đã hủy</option>
              </select>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="flex h-9 items-center gap-2 bg-[#0088FF] px-4 text-[13px] font-medium text-white hover:bg-blue-700"
              >
                <RotateCcw size={15} /> Tạo phiếu trả
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-200 bg-slate-50 text-[#182537]">
                <tr>
                  <th className="px-5 py-3">Mã phiếu</th>
                  <th className="px-3 py-3">Mã đơn gốc</th>
                  <th className="px-3 py-3">Khách hàng</th>
                  <th className="px-3 py-3">Ngày trả</th>
                  <th className="px-3 py-3 text-right">Tiền hoàn</th>
                  <th className="px-5 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReturns.length ? (
                  filteredReturns.map((record) => {
                    const statusMeta = getStatusMeta(record.status);
                    return (
                      <tr
                        key={record.id}
                        onClick={() => setSelectedReturnId(record.id)}
                        className="cursor-pointer hover:bg-slate-50"
                      >
                        <td className="px-5 py-3 font-medium text-[#0088FF]">{record.return_no}</td>
                        <td className="px-3 py-3 font-mono text-slate-500">{getOrderNo(record)}</td>
                        <td className="px-3 py-3">{getCustomerName(record)}</td>
                        <td className="px-3 py-3 text-slate-600">{formatDateTime(record.returned_at)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-red-600">{formatCurrency(Number(record.refund_amount ?? 0))} đ</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex border px-2.5 py-0.5 text-[12px] font-medium ${statusMeta.className}`}>
                            {statusMeta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                      Chưa có phiếu trả hàng phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="border border-slate-200 bg-white p-5">
          {selectedReturn ? (
            <div className="space-y-5">
              <div>
                <div className="text-[13px] text-slate-500">Chi tiết phiếu trả</div>
                <h3 className="mt-1 text-xl font-semibold text-[#182537]">{selectedReturn.return_no}</h3>
                <div className={`mt-3 inline-flex border px-2.5 py-0.5 text-[12px] font-medium ${getStatusMeta(selectedReturn.status).className}`}>
                  {getStatusMeta(selectedReturn.status).label}
                </div>
              </div>

              <div className="space-y-3 text-[13px]">
                <div className="flex justify-between gap-3"><span className="text-slate-500">Đơn gốc</span><strong>{getOrderNo(selectedReturn)}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Khách hàng</span><strong>{getCustomerName(selectedReturn)}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Lý do</span><strong>{selectedReturn.reason || '---'}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Tiền hoàn</span><strong className="text-red-600">{formatCurrency(Number(selectedReturn.refund_amount ?? 0))} đ</strong></div>
              </div>

              <div>
                <div className="mb-2 text-[13px] font-semibold text-[#182537]">Sản phẩm trả</div>
                <div className="space-y-2">
                  {(selectedReturn.sales_return_items ?? []).map((item) => (
                    <div key={item.id} className="border border-slate-200 p-3 text-[13px]">
                      <div className="font-medium text-[#182537]">{item.product_name}</div>
                      <div className="mt-1 flex justify-between text-slate-500">
                        <span>{Number(item.quantity ?? 0)} cái</span>
                        <span>{formatCurrency(Number(item.line_total ?? 0))} đ</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams({ returnId: selectedReturn.id, autoPrint: '1' });
                    window.location.assign(`/invoice?${params.toString()}`);
                  }}
                  className="flex h-9 items-center justify-center gap-2 border border-[#0088FF] bg-white text-[13px] font-medium text-[#0088FF] hover:bg-blue-50"
                >
                  <Printer size={15} /> In phiếu trả
                </button>
                {selectedReturn.status === 'pending' ? (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedReturn, 'approved')}
                    disabled={workingReturnId === selectedReturn.id}
                    className="flex h-9 items-center justify-center gap-2 bg-[#0088FF] text-[13px] font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
                  >
                    <CheckCircle size={15} /> Duyệt phiếu trả
                  </button>
                ) : null}
                {selectedReturn.status === 'approved' ? (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedReturn, 'refunded')}
                    disabled={workingReturnId === selectedReturn.id}
                    className="flex h-9 items-center justify-center gap-2 bg-emerald-600 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:bg-slate-300"
                  >
                    <PackageCheck size={15} /> Xác nhận hoàn tiền
                  </button>
                ) : null}
                {selectedReturn.status === 'pending' ? (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedReturn, 'cancelled')}
                    disabled={workingReturnId === selectedReturn.id}
                    className="flex h-9 items-center justify-center gap-2 border border-red-300 text-[13px] font-medium text-red-600 hover:bg-red-50 disabled:border-slate-200 disabled:text-slate-400"
                  >
                    <X size={15} /> Hủy phiếu trả
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => navigate('/orders', { state: { selectedOrderId: selectedReturn.sales_order_id } })}
                  className="h-9 border border-slate-300 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Mở đơn gốc
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center text-slate-500">
              <RotateCcw size={34} className="mb-3 text-slate-300" />
              <div className="font-medium text-[#182537]">Chưa chọn phiếu trả</div>
              <p className="mt-2 text-[13px]">Chọn một phiếu trong danh sách hoặc tạo phiếu trả mới.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
