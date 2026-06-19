import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  MapPin,
  PackageCheck,
  PackageOpen,
  Phone,
  RefreshCcw,
  Save,
  Search,
  Truck,
  UserRound,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageLoader } from '../components/PageLoader';
import { ToastBridge } from '../components/Toast';
import { salesOrdersService, type SalesOrder } from '../services/salesOrdersService';
import {
  DELIVERY_STATUSES,
  getDeliveryLabel,
  parseLegacyDeliveryTab,
  type DeliveryStatus,
  type DeliveryTab,
} from '../utils/delivery';
import { cn } from '../utils/cn';

type ShippingFilter = 'all' | DeliveryStatus;

const STATUS_META: Record<DeliveryStatus, { label: string; className: string; icon: React.ElementType }> = {
  pending_packing: {
    label: 'Chờ đóng gói',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: PackageOpen,
  },
  waiting_pick_up: {
    label: 'Chờ lấy hàng',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
    icon: Clock3,
  },
  delivering: {
    label: 'Đang giao',
    className: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    icon: Truck,
  },
  delivered: {
    label: 'Đã giao',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Giao thất bại',
    className: 'border-red-200 bg-red-50 text-red-700',
    icon: XCircle,
  },
};

const FILTERS: { value: ShippingFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending_packing', label: 'Chờ đóng gói' },
  { value: 'waiting_pick_up', label: 'Chờ lấy hàng' },
  { value: 'delivering', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Thất bại' },
];

const METHOD_OPTIONS: { value: DeliveryTab; label: string }[] = [
  { value: 'hang_van_chuyen', label: 'Đẩy qua hãng vận chuyển' },
  { value: 'van_chuyen_ngoai', label: 'Đẩy vận chuyển ngoài' },
  { value: 'giao_hang_sau', label: 'Giao hàng sau' },
  { value: 'nhan_tai_cua_hang', label: 'Khách nhận tại cửa hàng' },
];

function formatCurrency(value: number) {
  return Math.round(value).toLocaleString('vi-VN');
}

function formatDateTime(value?: string | null) {
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

function toDateTimeInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getDeliveryStatus(order: SalesOrder): DeliveryStatus {
  if (order.delivery_status && DELIVERY_STATUSES.includes(order.delivery_status)) {
    return order.delivery_status;
  }
  const method = order.delivery_method ?? parseLegacyDeliveryTab(order.note, order.status);
  if (method === 'hang_van_chuyen') return 'waiting_pick_up';
  if (method === 'van_chuyen_ngoai') return 'delivering';
  if (method === 'giao_hang_sau') return 'pending_packing';
  return order.status === 'completed' ? 'delivered' : 'pending_packing';
}

function getDeliveryMethod(order: SalesOrder): DeliveryTab {
  return order.delivery_method ?? parseLegacyDeliveryTab(order.note, order.status) ?? 'giao_hang_sau';
}

function getCustomerName(order?: SalesOrder | null) {
  return order?.customers?.full_name || 'Khách lẻ';
}

function getCustomerPhone(order?: SalesOrder | null) {
  return order?.customers?.phone || '---';
}

function getDeliveryAddress(order?: SalesOrder | null) {
  return order?.delivery_address || order?.customers?.address || '---';
}

export function Shipping() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [activeFilter, setActiveFilter] = useState<ShippingFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [editStatus, setEditStatus] = useState<DeliveryStatus>('pending_packing');
  const [editMethod, setEditMethod] = useState<DeliveryTab>('giao_hang_sau');
  const [editAddress, setEditAddress] = useState('');
  const [editShippingFee, setEditShippingFee] = useState('0');
  const [editDueAt, setEditDueAt] = useState('');

  async function loadOrders(nextFilter = activeFilter) {
    setIsLoading(true);
    setError('');

    try {
      const result = await salesOrdersService.getAll({
        page: 1,
        limit: 200,
        delivery_status: nextFilter === 'all' ? undefined : nextFilter,
      });
      const deliveryOrders = (result.data ?? []).filter((order) => getDeliveryMethod(order) !== 'nhan_tai_cua_hang');
      setOrders(deliveryOrders);
      setSelectedOrderId((current) => {
        if (current && deliveryOrders.some((order) => order.id === current)) return current;
        return deliveryOrders[0]?.id ?? '';
      });
    } catch (nextError: any) {
      setError(nextError?.message ?? 'Không tải được dữ liệu vận chuyển.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOrders(activeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  const visibleOrders = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return orders;

    return orders.filter((order) => {
      const haystack = [
        order.order_no,
        order.invoice_no,
        getCustomerName(order),
        getCustomerPhone(order),
        getDeliveryAddress(order),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [orders, searchTerm]);

  const stats = useMemo(() => {
    return DELIVERY_STATUSES.reduce(
      (acc, status) => {
        acc[status] = orders.filter((order) => getDeliveryStatus(order) === status).length;
        return acc;
      },
      {} as Record<DeliveryStatus, number>,
    );
  }, [orders]);

  const selectedOrder = useMemo(
    () => visibleOrders.find((order) => order.id === selectedOrderId) ?? visibleOrders[0] ?? null,
    [selectedOrderId, visibleOrders],
  );

  useEffect(() => {
    if (!selectedOrder) return;
    setEditStatus(getDeliveryStatus(selectedOrder));
    setEditMethod(getDeliveryMethod(selectedOrder));
    setEditAddress(getDeliveryAddress(selectedOrder) === '---' ? '' : getDeliveryAddress(selectedOrder));
    setEditShippingFee(String(Math.round(Number(selectedOrder.shipping_fee ?? 0))));
    setEditDueAt(toDateTimeInput(selectedOrder.delivery_due_at));
  }, [selectedOrder?.id]);

  const updateOrderInList = (updatedOrder: SalesOrder) => {
    setOrders((current) => current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
    setSelectedOrderId(updatedOrder.id);
  };

  const handleQuickStatus = async (status: DeliveryStatus) => {
    if (!selectedOrder) return;
    setIsSaving(true);
    setError('');
    setInfoMessage('');

    try {
      const updatedOrder = await salesOrdersService.update(selectedOrder.id, {
        delivery_status: status,
        delivery_method: getDeliveryMethod(selectedOrder),
        status: status === 'delivered' ? 'completed' : status === 'cancelled' ? 'pending' : 'pending',
      });
      updateOrderInList(updatedOrder);
      setInfoMessage(`Đã cập nhật ${updatedOrder.order_no} sang trạng thái ${STATUS_META[status].label}.`);
    } catch (nextError: any) {
      setError(nextError?.message ?? 'Cập nhật trạng thái vận chuyển thất bại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDetail = async () => {
    if (!selectedOrder) return;
    setIsSaving(true);
    setError('');
    setInfoMessage('');

    try {
      const updatedOrder = await salesOrdersService.update(selectedOrder.id, {
        delivery_status: editStatus,
        delivery_method: editMethod,
        delivery_address: editAddress.trim() || undefined,
        delivery_due_at: toIsoDateTime(editDueAt),
        shipping_fee: Math.max(0, Number(editShippingFee.replace(/[^\d]/g, '')) || 0),
        status: editStatus === 'delivered' ? 'completed' : editStatus === 'cancelled' ? 'pending' : 'pending',
      });
      updateOrderInList(updatedOrder);
      setInfoMessage(`Đã lưu thông tin vận chuyển cho ${updatedOrder.order_no}.`);
    } catch (nextError: any) {
      setError(nextError?.message ?? 'Không lưu được thông tin vận chuyển.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <PageLoader text="Đang tải quản lý vận chuyển..." fullScreen />;
  }

  return (
    <div className="page-shell page-stack">
      <ToastBridge message={infoMessage} variant="success" onDone={() => setInfoMessage('')} />
      <ToastBridge message={error} variant="error" onDone={() => setError('')} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#182537]">Quản lý vận chuyển</h1>
          <p className="mt-1 text-[13px] text-slate-500">Theo dõi đóng gói, lấy hàng, giao hàng và xử lý giao thất bại.</p>
        </div>
        <button
          type="button"
          onClick={() => loadOrders(activeFilter)}
          className="flex h-9 items-center gap-2 border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCcw size={15} /> Tải lại
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="ui-card p-4">
          <div className="text-[13px] text-slate-500">Tổng đơn giao</div>
          <div className="mt-2 text-2xl font-semibold text-[#182537]">{orders.length}</div>
        </div>
        {DELIVERY_STATUSES.slice(0, 4).map((status) => {
          const Icon = STATUS_META[status].icon;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setActiveFilter(status)}
              className="ui-card p-4 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/40"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-slate-500">{STATUS_META[status].label}</span>
                <Icon size={17} className="text-slate-400" />
              </div>
              <div className="mt-2 text-2xl font-semibold text-[#182537]">{stats[status] ?? 0}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="ui-card overflow-hidden">
          <div className="ui-card-header">
            <div>
              <h2 className="text-[16px] font-semibold text-[#182537]">Danh sách vận chuyển</h2>
              <p className="mt-1 text-[13px] text-slate-500">Hiển thị {visibleOrders.length} đơn phù hợp.</p>
            </div>
            <div className="relative w-[320px] max-w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm mã đơn, khách hàng, SĐT..."
                className="h-9 w-full border border-slate-300 bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[#0088FF]"
              />
            </div>
          </div>

          <div className="border-b border-slate-100 px-5 py-3">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  className={cn(
                    'h-8 border px-3 text-[13px] font-medium transition-colors',
                    activeFilter === filter.value
                      ? 'border-[#0088FF] bg-blue-50 text-[#0088FF]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-[#0088FF]',
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-200 bg-slate-50 text-[#182537]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Đơn hàng</th>
                  <th className="px-3 py-3 font-semibold">Khách hàng</th>
                  <th className="px-3 py-3 font-semibold">Hình thức</th>
                  <th className="px-3 py-3 font-semibold">Trạng thái</th>
                  <th className="px-3 py-3 text-right font-semibold">Tiền hàng</th>
                  <th className="px-5 py-3 font-semibold">Hẹn giao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleOrders.length ? (
                  visibleOrders.map((order) => {
                    const status = getDeliveryStatus(order);
                    const meta = STATUS_META[status];
                    return (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrderId(order.id)}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-blue-50/50',
                          selectedOrder?.id === order.id ? 'bg-blue-50/60' : 'bg-white',
                        )}
                      >
                        <td className="px-5 py-3">
                          <div className="font-semibold text-[#0088FF]">{order.order_no}</div>
                          <div className="mt-1 text-[12px] text-slate-500">{formatDateTime(order.sold_at)}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-[#182537]">{getCustomerName(order)}</div>
                          <div className="mt-1 text-[12px] text-slate-500">{getCustomerPhone(order)}</div>
                        </td>
                        <td className="px-3 py-3 text-slate-600">{getDeliveryLabel(getDeliveryMethod(order))}</td>
                        <td className="px-3 py-3">
                          <span className={cn('inline-flex border px-2.5 py-0.5 text-[12px] font-medium', meta.className)}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-[#182537]">
                          {formatCurrency(Number(order.total_amount || 0))} đ
                        </td>
                        <td className="px-5 py-3 text-slate-600">{formatDateTime(order.delivery_due_at)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                      Chưa có đơn vận chuyển phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="ui-card p-5">
          {selectedOrder ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] text-slate-500">Chi tiết vận chuyển</div>
                  <h3 className="mt-1 text-xl font-semibold text-[#182537]">{selectedOrder.order_no}</h3>
                </div>
                <span className={cn('inline-flex border px-2.5 py-0.5 text-[12px] font-medium', STATUS_META[getDeliveryStatus(selectedOrder)].className)}>
                  {STATUS_META[getDeliveryStatus(selectedOrder)].label}
                </span>
              </div>

              <div className="space-y-3 text-[13px]">
                <div className="flex gap-3">
                  <UserRound size={16} className="mt-0.5 text-slate-400" />
                  <div>
                    <div className="font-medium text-[#182537]">{getCustomerName(selectedOrder)}</div>
                    <div className="text-slate-500">{getCustomerPhone(selectedOrder)}</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <MapPin size={16} className="mt-0.5 text-slate-400" />
                  <div className="text-slate-600">{getDeliveryAddress(selectedOrder)}</div>
                </div>
                <div className="flex gap-3">
                  <CalendarClock size={16} className="mt-0.5 text-slate-400" />
                  <div className="text-slate-600">Hẹn giao: {formatDateTime(selectedOrder.delivery_due_at)}</div>
                </div>
                <div className="flex gap-3">
                  <Phone size={16} className="mt-0.5 text-slate-400" />
                  <div className="text-slate-600">Phí giao hàng: {formatCurrency(Number(selectedOrder.shipping_fee || 0))} đ</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickStatus('waiting_pick_up')}
                  disabled={isSaving}
                  className="h-9 border border-blue-200 text-[13px] font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                >
                  Chờ lấy hàng
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickStatus('delivering')}
                  disabled={isSaving}
                  className="h-9 border border-indigo-200 text-[13px] font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
                >
                  Đang giao
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickStatus('delivered')}
                  disabled={isSaving}
                  className="h-9 border border-emerald-200 text-[13px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                >
                  Đã giao
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickStatus('cancelled')}
                  disabled={isSaving}
                  className="h-9 border border-red-200 text-[13px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  Thất bại
                </button>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="mb-3 text-[13px] font-semibold text-[#182537]">Cập nhật thông tin</div>
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-[13px] text-slate-600">Trạng thái</span>
                    <select
                      value={editStatus}
                      onChange={(event) => setEditStatus(event.target.value as DeliveryStatus)}
                      className="h-9 w-full border border-slate-300 bg-white px-3 text-[13px] outline-none focus:border-[#0088FF]"
                    >
                      {DELIVERY_STATUSES.map((status) => (
                        <option key={status} value={status}>{STATUS_META[status].label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[13px] text-slate-600">Hình thức</span>
                    <select
                      value={editMethod}
                      onChange={(event) => setEditMethod(event.target.value as DeliveryTab)}
                      className="h-9 w-full border border-slate-300 bg-white px-3 text-[13px] outline-none focus:border-[#0088FF]"
                    >
                      {METHOD_OPTIONS.map((method) => (
                        <option key={method.value} value={method.value}>{method.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[13px] text-slate-600">Hẹn giao</span>
                    <input
                      type="datetime-local"
                      value={editDueAt}
                      onChange={(event) => setEditDueAt(event.target.value)}
                      className="h-9 w-full border border-slate-300 px-3 text-[13px] outline-none focus:border-[#0088FF]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[13px] text-slate-600">Phí giao hàng</span>
                    <input
                      value={editShippingFee}
                      onChange={(event) => setEditShippingFee(event.target.value.replace(/[^\d]/g, ''))}
                      className="h-9 w-full border border-slate-300 px-3 text-right text-[13px] outline-none focus:border-[#0088FF]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[13px] text-slate-600">Địa chỉ giao hàng</span>
                    <textarea
                      value={editAddress}
                      onChange={(event) => setEditAddress(event.target.value)}
                      rows={3}
                      className="w-full resize-none border border-slate-300 px-3 py-2 text-[13px] outline-none focus:border-[#0088FF]"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleSaveDetail}
                  disabled={isSaving}
                  className="flex h-9 items-center justify-center gap-2 bg-[#0088FF] text-[13px] font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
                >
                  {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/orders', { state: { selectedOrderId: selectedOrder.id } })}
                  className="flex h-9 items-center justify-center gap-2 border border-slate-300 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink size={15} /> Mở đơn
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center text-slate-500">
              <PackageCheck size={34} className="mb-3 text-slate-300" />
              <div className="font-medium text-[#182537]">Chưa chọn đơn vận chuyển</div>
              <p className="mt-2 text-[13px]">Chọn một đơn trong danh sách để xem chi tiết.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
