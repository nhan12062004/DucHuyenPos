import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FileCheck2,
  FilePlus2,
  Loader2,
  Printer,
  Search,
  XCircle,
} from 'lucide-react';
import { PageLoader } from '../components/PageLoader';
import { invoicesService, type Invoice, type InvoiceStatus } from '../services/invoicesService';
import { salesOrdersService, type SalesOrder } from '../services/salesOrdersService';

type EInvoicesRouteState = {
  orderId?: string;
  orderNo?: string;
  message?: string;
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

function getOrder(invoice: Invoice) {
  return invoice.sales_orders ?? null;
}

function getOrderNo(invoice: Invoice) {
  return getOrder(invoice)?.order_no ?? '---';
}

function getCustomerName(invoice: Invoice) {
  return getOrder(invoice)?.customers?.full_name ?? 'Khách lẻ';
}

function getOrderTotal(invoice: Invoice) {
  return Number(getOrder(invoice)?.total_amount ?? 0);
}

function getStatusMeta(status: InvoiceStatus) {
  switch (status) {
    case 'issued':
      return { label: 'Đã phát hành', className: 'border-emerald-300 bg-emerald-50 text-emerald-600' };
    case 'printed':
      return { label: 'Đã in', className: 'border-blue-300 bg-blue-50 text-blue-600' };
    case 'cancelled':
      return { label: 'Đã hủy', className: 'border-red-300 bg-red-50 text-red-600' };
    default:
      return { label: 'Bản nháp', className: 'border-slate-300 bg-slate-50 text-slate-600' };
  }
}

export function EInvoices() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as EInvoicesRouteState;
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [workingInvoiceId, setWorkingInvoiceId] = useState('');
  const [issuingOrderId, setIssuingOrderId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const [ordersResponse, invoicesResponse] = await Promise.all([
          salesOrdersService.getAll({ page: 1, limit: 200 }),
          invoicesService.getAll({ page: 1, limit: 200 }),
        ]);
        if (!active) return;
        setOrders(ordersResponse.data);
        setInvoices(invoicesResponse.data);
      } catch (nextError: any) {
        if (active) setError(nextError?.message ?? 'Không tải được dữ liệu hóa đơn điện tử.');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadData();

    if (routeState?.orderNo) {
      setQuery(routeState.orderNo);
    }
    if (routeState?.message) {
      setInfoMessage(routeState.message);
      navigate('/e-invoices', { replace: true, state: null });
    }

    return () => {
      active = false;
    };
  }, [navigate, routeState?.message, routeState?.orderNo]);

  const issuedOrderIds = useMemo(() => new Set(invoices.map((invoice) => invoice.sales_order_id)), [invoices]);
  const issuableOrders = useMemo(
    () => orders.filter((order) => order.status !== 'cancelled' && !issuedOrderIds.has(order.id)),
    [issuedOrderIds, orders],
  );

  const filteredInvoices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return invoices.filter((invoice) => {
      if (statusFilter !== 'all' && invoice.status !== statusFilter) return false;
      if (!normalizedQuery) return true;
      return (
        invoice.invoice_no.toLowerCase().includes(normalizedQuery) ||
        getOrderNo(invoice).toLowerCase().includes(normalizedQuery) ||
        getCustomerName(invoice).toLowerCase().includes(normalizedQuery)
      );
    });
  }, [invoices, query, statusFilter]);

  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? filteredInvoices[0] ?? null;
  const totalIssuedAmount = invoices
    .filter((invoice) => invoice.status !== 'cancelled')
    .reduce((sum, invoice) => sum + getOrderTotal(invoice), 0);

  const handleIssueInvoice = async (order: SalesOrder) => {
    if (issuedOrderIds.has(order.id)) {
      setInfoMessage(`Đơn ${order.order_no} đã có hóa đơn điện tử.`);
      return;
    }

    setIssuingOrderId(order.id);
    setError(null);

    try {
      const created = await invoicesService.create({ sales_order_id: order.id, invoice_type: 'retail' });
      setInvoices((current) => [created, ...current.filter((invoice) => invoice.id !== created.id)]);
      setSelectedInvoiceId(created.id);
      setInfoMessage(`Đã phát hành hóa đơn ${created.invoice_no}.`);
    } catch (nextError: any) {
      setError(nextError?.message ?? 'Phát hành hóa đơn thất bại.');
    } finally {
      setIssuingOrderId('');
    }
  };

  const handlePrintInvoice = async (invoice: Invoice) => {
    setWorkingInvoiceId(invoice.id);
    setError(null);

    try {
      const printed = await invoicesService.print(invoice.id);
      setInvoices((current) => current.map((item) => (item.id === printed.id ? printed : item)));
      navigate(`/invoice?orderId=${printed.sales_order_id}`);
    } catch (nextError: any) {
      setError(nextError?.message ?? 'Không in được hóa đơn.');
    } finally {
      setWorkingInvoiceId('');
    }
  };

  const handleCancelInvoice = async (invoice: Invoice) => {
    if (!window.confirm(`Hủy hóa đơn ${invoice.invoice_no}?`)) return;

    setWorkingInvoiceId(invoice.id);
    setError(null);

    try {
      const cancelled = await invoicesService.update(invoice.id, {
        status: 'cancelled',
        note: 'Đã hủy trên màn hình hóa đơn điện tử',
      });
      setInvoices((current) => current.map((item) => (item.id === cancelled.id ? cancelled : item)));
      setInfoMessage(`Đã hủy hóa đơn ${cancelled.invoice_no}.`);
    } catch (nextError: any) {
      setError(nextError?.message ?? 'Hủy hóa đơn thất bại.');
    } finally {
      setWorkingInvoiceId('');
    }
  };

  if (isLoading) {
    return <PageLoader text="Đang tải hóa đơn điện tử..." fullScreen />;
  }

  return (
    <div className="flex flex-col gap-4">
      {infoMessage ? (
        <div className="rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {infoMessage}
        </div>
      ) : null}

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="border border-slate-200 bg-white p-4">
          <div className="text-[13px] text-slate-500">Hóa đơn đã phát hành</div>
          <div className="mt-2 text-2xl font-semibold text-[#182537]">{invoices.length}</div>
        </div>
        <div className="border border-slate-200 bg-white p-4">
          <div className="text-[13px] text-slate-500">Chờ phát hành</div>
          <div className="mt-2 text-2xl font-semibold text-amber-600">{issuableOrders.length}</div>
        </div>
        <div className="border border-slate-200 bg-white p-4">
          <div className="text-[13px] text-slate-500">Đã in</div>
          <div className="mt-2 text-2xl font-semibold text-blue-600">
            {invoices.filter((invoice) => Number(invoice.printed_count ?? 0) > 0).length}
          </div>
        </div>
        <div className="border border-slate-200 bg-white p-4">
          <div className="text-[13px] text-slate-500">Tổng giá trị</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-600">{formatCurrency(totalIssuedAmount)} đ</div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <section className="border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-[16px] font-semibold text-[#182537]">Danh sách hóa đơn điện tử</h2>
                <p className="mt-1 text-[13px] text-slate-500">Quản lý phát hành, in và hủy hóa đơn.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Tìm mã hóa đơn, mã đơn, khách hàng"
                    className="h-9 w-[300px] border border-slate-300 pl-9 pr-3 text-[13px] outline-none focus:border-[#0088FF]"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                  className="h-9 border border-slate-300 bg-white px-3 text-[13px] outline-none focus:border-[#0088FF]"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="issued">Đã phát hành</option>
                  <option value="printed">Đã in</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-slate-200 bg-slate-50 text-[#182537]">
                  <tr>
                    <th className="px-5 py-3">Mã hóa đơn</th>
                    <th className="px-3 py-3">Mã đơn</th>
                    <th className="px-3 py-3">Khách hàng</th>
                    <th className="px-3 py-3">Ngày phát hành</th>
                    <th className="px-3 py-3 text-right">Tổng tiền</th>
                    <th className="px-5 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length ? (
                    filteredInvoices.map((invoice) => {
                      const statusMeta = getStatusMeta(invoice.status);
                      return (
                        <tr
                          key={invoice.id}
                          onClick={() => setSelectedInvoiceId(invoice.id)}
                          className="cursor-pointer hover:bg-slate-50"
                        >
                          <td className="px-5 py-3 font-medium text-[#0088FF]">{invoice.invoice_no}</td>
                          <td className="px-3 py-3 font-mono text-slate-500">{getOrderNo(invoice)}</td>
                          <td className="px-3 py-3 text-[#182537]">{getCustomerName(invoice)}</td>
                          <td className="px-3 py-3 text-slate-600">{formatDateTime(invoice.issued_at)}</td>
                          <td className="px-3 py-3 text-right font-semibold">{formatCurrency(getOrderTotal(invoice))} đ</td>
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
                        Chưa có hóa đơn điện tử phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-[16px] font-semibold text-[#182537]">Đơn hàng chờ phát hành</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {issuableOrders.slice(0, 8).map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-4 px-5 py-3 text-[13px]">
                  <div>
                    <div className="font-medium text-[#182537]">{order.order_no}</div>
                    <div className="mt-1 text-slate-500">{order.customers?.full_name ?? 'Khách lẻ'} - {formatDateTime(order.sold_at)}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right font-semibold text-[#182537]">{formatCurrency(Number(order.total_amount ?? 0))} đ</div>
                    <button
                      type="button"
                      onClick={() => handleIssueInvoice(order)}
                      disabled={issuingOrderId === order.id}
                      className="flex h-8 items-center gap-2 bg-[#0088FF] px-3 text-[13px] font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
                    >
                      {issuingOrderId === order.id ? <Loader2 size={15} className="animate-spin" /> : <FilePlus2 size={15} />}
                      Phát hành
                    </button>
                  </div>
                </div>
              ))}
              {!issuableOrders.length ? (
                <div className="px-5 py-8 text-center text-[13px] text-slate-500">Không còn đơn hàng chờ phát hành.</div>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="border border-slate-200 bg-white p-5">
          {selectedInvoice ? (
            <div className="space-y-5">
              <div>
                <div className="text-[13px] text-slate-500">Chi tiết hóa đơn</div>
                <h3 className="mt-1 text-xl font-semibold text-[#182537]">{selectedInvoice.invoice_no}</h3>
                <div className={`mt-3 inline-flex border px-2.5 py-0.5 text-[12px] font-medium ${getStatusMeta(selectedInvoice.status).className}`}>
                  {getStatusMeta(selectedInvoice.status).label}
                </div>
              </div>

              <div className="space-y-3 text-[13px]">
                <div className="flex justify-between gap-3"><span className="text-slate-500">Mã đơn</span><strong>{getOrderNo(selectedInvoice)}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Khách hàng</span><strong>{getCustomerName(selectedInvoice)}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Ngày phát hành</span><strong>{formatDateTime(selectedInvoice.issued_at)}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Số lần in</span><strong>{Number(selectedInvoice.printed_count ?? 0)}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Tổng tiền</span><strong>{formatCurrency(getOrderTotal(selectedInvoice))} đ</strong></div>
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintInvoice(selectedInvoice)}
                  disabled={workingInvoiceId === selectedInvoice.id || selectedInvoice.status === 'cancelled'}
                  className="flex h-9 items-center justify-center gap-2 bg-[#0088FF] text-[13px] font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
                >
                  {workingInvoiceId === selectedInvoice.id ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
                  In / xem hóa đơn
                </button>
                {selectedInvoice.status !== 'cancelled' ? (
                  <button
                    type="button"
                    onClick={() => handleCancelInvoice(selectedInvoice)}
                    disabled={workingInvoiceId === selectedInvoice.id}
                    className="flex h-9 items-center justify-center gap-2 border border-red-300 text-[13px] font-medium text-red-600 hover:bg-red-50 disabled:border-slate-200 disabled:text-slate-400"
                  >
                    <XCircle size={15} /> Hủy hóa đơn
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center text-slate-500">
              <FileCheck2 size={34} className="mb-3 text-slate-300" />
              <div className="font-medium text-[#182537]">Chưa chọn hóa đơn</div>
              <p className="mt-2 text-[13px]">Phát hành hóa đơn từ danh sách đơn hàng chờ hoặc chọn một hóa đơn đã có.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
