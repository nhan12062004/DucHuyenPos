import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  Filter,
  Settings,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Plus,
} from 'lucide-react';
import {
  customersService,
  type Customer,
  type CustomerDebtSummary,
  type CustomerGroup,
} from '../services/customersService';
import { PageLoader } from '../components/PageLoader';
import {
  salesOrdersService,
  type SalesOrder,
} from '../services/salesOrdersService';

type CustomerTab = 'all' | 'trading';
type CustomerDetailTab =
  | 'history'
  | 'debt'
  | 'contact'
  | 'address'
  | 'notes'
  | 'group';

type CustomersRouteState = {
  selectedCustomerId?: string;
  detailTab?: CustomerDetailTab;
  searchTerm?: string;
  message?: string;
} | null;

type CustomerListItem = Customer & {
  debt: number;
  totalSpent: number;
  ordersCount: number;
  totalProducts: number;
  totalReturned: number;
  lastOrderDate?: string;
  groupName: string;
};

const CUSTOMER_FILTERS_KEY = 'duc-huyen-pos.customers.filters';

function formatCurrency(value: number) {
  return value.toLocaleString('vi-VN');
}

function formatDate(value?: string) {
  if (!value) {
    return '---';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('vi-VN');
}

function getOrderStatusMeta(status?: SalesOrder['status']) {
  switch (status) {
    case 'completed':
      return 'border-emerald-300 text-emerald-600 bg-emerald-50';
    case 'cancelled':
      return 'border-red-300 text-red-500 bg-red-50';
    case 'pending':
      return 'border-blue-300 text-blue-600 bg-blue-50';
    default:
      return 'border-orange-300 text-orange-600 bg-orange-50';
  }
}

function buildCustomersData(
  customers: Customer[],
  debtMap: Record<string, CustomerDebtSummary>,
  ordersByCustomer: Record<string, SalesOrder[]>,
): CustomerListItem[] {
  return customers.map((customer) => {
    const matchedOrders = ordersByCustomer[customer.id] ?? [];
    const debt = Number(debtMap[customer.id]?.current_debt ?? 0);
    const totalSpent = Number(debtMap[customer.id]?.total_sales ?? 0);
    const totalProducts = matchedOrders.reduce(
      (sum, order) =>
        sum +
        (order.sales_order_items ?? []).reduce(
          (itemSum, item) => itemSum + Number(item.quantity || 0),
          0,
        ),
      0,
    );

    return {
      ...customer,
      debt,
      totalSpent,
      ordersCount: matchedOrders.length,
      totalProducts,
      totalReturned: 0,
      lastOrderDate: matchedOrders[0]?.sold_at,
      groupName: customer.customer_groups?.name ?? 'Bán lẻ',
    };
  });
}

export function Customers() {
  const [activeTab, setActiveTab] = useState<CustomerTab>('all');
  const [detailTab, setDetailTab] = useState<CustomerDetailTab>('history');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<Customer | null>(null);
  const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>([]);
  const [debtMap, setDebtMap] = useState<Record<string, CustomerDebtSummary>>({});
  const [orderMap, setOrderMap] = useState<Record<string, SalesOrder[]>>({});
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    try {
      const savedFilters = window.localStorage.getItem(CUSTOMER_FILTERS_KEY);
      if (!savedFilters) {
        return;
      }

      const parsed = JSON.parse(savedFilters) as {
        activeTab?: CustomerTab;
        searchTerm?: string;
        statusFilter?: 'all' | 'active' | 'inactive';
        limit?: number;
      };

      if (parsed.activeTab === 'all' || parsed.activeTab === 'trading') {
        setActiveTab(parsed.activeTab);
      }
      if (typeof parsed.searchTerm === 'string') {
        setSearchTerm(parsed.searchTerm);
      }
      if (
        parsed.statusFilter === 'all' ||
        parsed.statusFilter === 'active' ||
        parsed.statusFilter === 'inactive'
      ) {
        setStatusFilter(parsed.statusFilter);
      }
      if (typeof parsed.limit === 'number' && parsed.limit > 0) {
        setLimit(parsed.limit);
      }
    } catch {
      window.localStorage.removeItem(CUSTOMER_FILTERS_KEY);
    }
  }, []);

  useEffect(() => {
    const routeState = location.state as CustomersRouteState;
    if (!routeState) {
      return;
    }

    if (routeState.selectedCustomerId) {
      setSelectedCustomerId(routeState.selectedCustomerId);
    }
    if (routeState.detailTab) {
      setDetailTab(routeState.detailTab);
    }
    if (typeof routeState.searchTerm === 'string') {
      setSearchTerm(routeState.searchTerm);
    }
    if (routeState.message) {
      setInfoMessage(routeState.message);
    }

    navigate('/customers', { replace: true, state: null });
  }, [location.state, navigate]);

  useEffect(() => {
    let active = true;

    async function loadListData() {
      setIsListLoading(true);
      setListError(null);

      try {
        const [customersResponse, debtSummary, groups, ordersResponse] = await Promise.all([
          customersService.getAll({
            page,
            limit,
            search: searchTerm || undefined,
            status: statusFilter === 'all' ? undefined : statusFilter,
          }),
          customersService.getDebtSummary(),
          customersService.getGroups(),
          salesOrdersService.getAll({ page: 1, limit: 200 }),
        ]);

        if (!active) {
          return;
        }

        const nextDebtMap = debtSummary.reduce<Record<string, CustomerDebtSummary>>((acc, item) => {
          acc[item.customer_id] = item;
          return acc;
        }, {});
        const nextOrderMap = ordersResponse.data.reduce<Record<string, SalesOrder[]>>((acc, order) => {
          if (!order.customer_id) {
            return acc;
          }
          if (!acc[order.customer_id]) {
            acc[order.customer_id] = [];
          }
          acc[order.customer_id].push(order);
          return acc;
        }, {});

        setCustomers(customersResponse.data);
        setTotalCustomers(customersResponse.total);
        setDebtMap(nextDebtMap);
        setCustomerGroups(groups);
        setOrderMap(nextOrderMap);
      } catch (error: any) {
        if (!active) {
          return;
        }
        setListError(error?.message ?? 'Không tải được danh sách khách hàng.');
      } finally {
        if (active) {
          setIsListLoading(false);
        }
      }
    }

    loadListData();

    return () => {
      active = false;
    };
  }, [page, limit, searchTerm, statusFilter]);

  useEffect(() => {
    let active = true;

    async function loadCustomerDetail(customerId: string) {
      setIsDetailLoading(true);
      setDetailError(null);

      try {
        const detail = await customersService.getOne(customerId);
        if (!active) {
          return;
        }
        setSelectedCustomerDetail(detail);
      } catch (error: any) {
        if (!active) {
          return;
        }
        setDetailError(error?.message ?? 'Không tải được chi tiết khách hàng.');
      } finally {
        if (active) {
          setIsDetailLoading(false);
        }
      }
    }

    if (!selectedCustomerId) {
      setSelectedCustomerDetail(null);
      return;
    }

    loadCustomerDetail(selectedCustomerId);

    return () => {
      active = false;
    };
  }, [selectedCustomerId]);

  const customersData = useMemo(
    () => buildCustomersData(customers, debtMap, orderMap),
    [customers, debtMap, orderMap],
  );

  const visibleCustomers = useMemo(() => {
    if (activeTab === 'all') {
      return customersData;
    }

    return customersData.filter((customer) => customer.ordersCount > 0);
  }, [activeTab, customersData]);

  const selectedCustomer =
    selectedCustomerDetail ??
    customersData.find((customer) => customer.id === selectedCustomerId) ??
    null;

  const selectedCustomerOrders = selectedCustomerId ? orderMap[selectedCustomerId] ?? [] : [];
  const selectedCustomerDebt = selectedCustomerId ? debtMap[selectedCustomerId] : undefined;
  const totalRows = activeTab === 'all' ? totalCustomers : visibleCustomers.length;
  const pageStart = visibleCustomers.length === 0 ? 0 : (page - 1) * limit + 1;
  const pageEnd = visibleCustomers.length === 0 ? 0 : pageStart + visibleCustomers.length - 1;

  const handleSaveFilters = () => {
    window.localStorage.setItem(
      CUSTOMER_FILTERS_KEY,
      JSON.stringify({ activeTab, searchTerm, statusFilter, limit }),
    );
    setInfoMessage('Đã lưu bộ lọc khách hàng.');
  };

  const handleToggleStatusFilter = () => {
    const next =
      statusFilter === 'all'
        ? 'active'
        : statusFilter === 'active'
        ? 'inactive'
        : 'all';
    setStatusFilter(next);
    setPage(1);
    setInfoMessage(
      next === 'all'
        ? 'Đang hiển thị tất cả trạng thái khách hàng.'
        : next === 'active'
        ? 'Đang lọc khách hàng còn hoạt động.'
        : 'Đang lọc khách hàng đã vô hiệu hóa.',
    );
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) {
      return;
    }

    const confirmed = window.confirm(`Vô hiệu hóa khách hàng ${selectedCustomer.full_name}?`);
    if (!confirmed) {
      return;
    }

    try {
      await customersService.delete(selectedCustomer.id);
      setCustomers((current) =>
        current.map((customer) =>
          customer.id === selectedCustomer.id ? { ...customer, status: 'inactive' } : customer,
        ),
      );
      setSelectedCustomerDetail((current) =>
        current ? { ...current, status: 'inactive' } : current,
      );
      setInfoMessage(`Đã vô hiệu hóa khách hàng ${selectedCustomer.full_name}.`);
    } catch (error: any) {
      setDetailError(error?.message ?? 'Xóa khách hàng thất bại.');
    }
  };

  const handleUpdateCustomer = async (mode: 'basic' | 'note' = 'basic') => {
    if (!selectedCustomer) {
      return;
    }

    try {
      if (mode === 'note') {
        const notes = window.prompt('Cập nhật ghi chú khách hàng', selectedCustomer.notes ?? '');
        if (notes === null) {
          return;
        }
        const updated = await customersService.update(selectedCustomer.id, { notes });
        setSelectedCustomerDetail(updated);
        setCustomers((current) =>
          current.map((customer) => (customer.id === updated.id ? { ...customer, ...updated } : customer)),
        );
        setInfoMessage(`Đã cập nhật ghi chú của ${updated.full_name}.`);
        return;
      }

      const fullName = window.prompt('Tên khách hàng', selectedCustomer.full_name);
      if (!fullName?.trim()) {
        return;
      }

      const phone = window.prompt('Số điện thoại', selectedCustomer.phone ?? '');
      if (phone === null) {
        return;
      }
      const email = window.prompt('Email', selectedCustomer.email ?? '');
      if (email === null) {
        return;
      }
      const address = window.prompt('Địa chỉ', selectedCustomer.address ?? '');
      if (address === null) {
        return;
      }

      const updated = await customersService.update(selectedCustomer.id, {
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
      });

      setSelectedCustomerDetail(updated);
      setCustomers((current) =>
        current.map((customer) => (customer.id === updated.id ? { ...customer, ...updated } : customer)),
      );
      setInfoMessage(`Đã cập nhật khách hàng ${updated.full_name}.`);
    } catch (error: any) {
      setDetailError(error?.message ?? 'Cập nhật khách hàng thất bại.');
    }
  };

  const handleOpenCustomerOrders = () => {
    if (!selectedCustomer) {
      return;
    }

    const firstOrder = selectedCustomerOrders[0];
    navigate('/orders', {
      state: firstOrder
        ? {
            selectedOrderId: firstOrder.id,
            message: `Đang mở đơn gần nhất của ${selectedCustomer.full_name}.`,
          }
        : {
            message: `Khách hàng ${selectedCustomer.full_name} chưa có đơn hàng để mở.`,
          },
    });
  };

  if (selectedCustomer) {
    const historyRows = selectedCustomerOrders;

    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => setSelectedCustomerId(null)}
            className="flex items-center gap-2 text-[14px] font-medium text-slate-600 transition-colors hover:text-[#0088FF]"
          >
            <ChevronLeft size={16} /> Quay lại danh sách khách hàng
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleDeleteCustomer}
              className="rounded border border-red-500 bg-white px-4 py-1.5 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50"
            >
              Xóa khách hàng
            </button>
            <div className="flex rounded border border-[#0088FF]">
              <button
                onClick={() => navigate('/debts')}
                className="flex items-center gap-2 border-r border-blue-700 bg-[#0088FF] px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-blue-700"
              >
                Tạo phiếu thu/chi
              </button>
              <button
                onClick={() => navigate('/debts')}
                className="flex items-center bg-[#0088FF] px-2 text-white transition-colors hover:bg-blue-700 rounded-r"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {infoMessage ? (
            <div className="mb-4 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {infoMessage}
            </div>
          ) : null}

          {detailError ? (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {detailError}
            </div>
          ) : null}

          {isDetailLoading ? (
            <div className="mb-4 rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              Đang cập nhật chi tiết khách hàng...
            </div>
          ) : null}

          <div className="mb-4">
            <h1 className="mb-0 text-[22px] font-semibold text-[#182537]">{selectedCustomer.full_name}</h1>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <div className="ui-card ui-card-body-compact">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-[15px] font-semibold text-[#182537]">Thông tin cá nhân</h3>
                    <span className="rounded-full border border-orange-300 bg-orange-50 px-2.5 py-0.5 text-[12px] font-medium text-orange-600">
                      {selectedCustomer.status === 'active' ? 'Đang giao dịch' : 'Đã ngừng'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleUpdateCustomer('basic')}
                    className="text-[13px] font-medium text-[#0088FF] hover:underline"
                  >
                    Cập nhật
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-[13px]">
                  <div className="flex"><div className="w-40 text-slate-600">Ngày sinh</div><div className="text-[#182537]">: ---</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Nhóm khách hàng</div><div className="cursor-pointer text-[#0088FF] hover:underline">: {selectedCustomer.customer_groups?.name ?? 'Bán lẻ'}</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Giới tính</div><div className="text-[#182537]">: Khác</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Mã khách hàng</div><div className="text-[#182537]">: {selectedCustomer.code}</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Số điện thoại</div><div className="text-[#182537]">: {selectedCustomer.phone || '---'}</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Mã số thuế</div><div className="text-[#182537]">: {selectedCustomer.tax_code || '---'}</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Email</div><div className="text-[#182537]">: {selectedCustomer.email || '---'}</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Website</div><div className="text-[#182537]">: ---</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Nhân viên phụ trách</div><div className="text-[#182537]">: ---</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Mô tả</div><div className="text-[#182537]">: {selectedCustomer.company_name || '---'}</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Tags</div><div className="text-[#182537]">: ---</div></div>
                </div>
              </div>

              <div className="ui-card">
                <div className="flex items-center justify-between border-b border-slate-100 p-5">
                  <h3 className="text-[15px] font-semibold text-[#182537]">Thông tin mua hàng</h3>
                  <button
                    onClick={handleOpenCustomerOrders}
                    className="text-[13px] font-medium text-[#0088FF] hover:underline"
                  >
                    Chi tiết
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 p-5 text-[13px]">
                  <div className="flex"><div className="w-48 text-slate-600">Tổng chi tiêu</div><div className="text-[#182537]">: {formatCurrency(Number(selectedCustomerDebt?.total_sales ?? 0))}</div></div>
                  <div className="flex"><div className="w-48 text-slate-600">Tổng SL sản phẩm đã mua</div><div className="text-[#182537]">: {selectedCustomerOrders.reduce((sum, order) => sum + (order.sales_order_items ?? []).reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0), 0)}</div></div>
                  <div className="flex"><div className="w-48 text-slate-600">Tổng SL đơn hàng</div><div className="text-[#182537]">: {selectedCustomerOrders.length}</div></div>
                  <div className="flex"><div className="w-48 text-slate-600">Tổng SL sản phẩm hoàn trả</div><div className="text-[#182537]">: 0</div></div>
                  <div className="flex"><div className="w-48 text-slate-600">Ngày cuối cùng mua hàng</div><div className="text-[#182537]">: {formatDate(selectedCustomerOrders[0]?.sold_at)}</div></div>
                  <div className="flex"><div className="w-48 text-slate-600">Công nợ hiện tại</div><div className="text-[#182537]">: {formatCurrency(Number(selectedCustomerDebt?.current_debt ?? 0))}</div></div>
                </div>
              </div>

              <div className="ui-card">
                <div className="flex border-b border-slate-200 px-4 pt-1">
                  <button
                    onClick={() => setDetailTab('history')}
                    className={`mr-4 border-b-2 px-4 py-3 text-[14px] font-medium transition-colors ${
                      detailTab === 'history'
                        ? 'border-[#0088FF] text-[#0088FF]'
                        : 'border-transparent text-slate-600 hover:text-[#0088FF]'
                    }`}
                  >
                    Lịch sử mua hàng
                  </button>
                  <button
                    onClick={() => setDetailTab('debt')}
                    className={`mr-4 border-b-2 px-4 py-3 text-[14px] font-medium transition-colors ${
                      detailTab === 'debt'
                        ? 'border-[#0088FF] text-[#0088FF]'
                        : 'border-transparent text-slate-600 hover:text-[#0088FF]'
                    }`}
                  >
                    Công nợ
                  </button>
                  <button
                    onClick={() => setDetailTab('contact')}
                    className={`mr-4 border-b-2 px-4 py-3 text-[14px] font-medium transition-colors ${
                      detailTab === 'contact'
                        ? 'border-[#0088FF] text-[#0088FF]'
                        : 'border-transparent text-slate-600 hover:text-[#0088FF]'
                    }`}
                  >
                    Liên hệ
                  </button>
                  <button
                    onClick={() => setDetailTab('address')}
                    className={`mr-4 border-b-2 px-4 py-3 text-[14px] font-medium transition-colors ${
                      detailTab === 'address'
                        ? 'border-[#0088FF] text-[#0088FF]'
                        : 'border-transparent text-slate-600 hover:text-[#0088FF]'
                    }`}
                  >
                    Địa chỉ
                  </button>
                  <button
                    onClick={() => setDetailTab('notes')}
                    className={`mr-4 border-b-2 px-4 py-3 text-[14px] font-medium transition-colors ${
                      detailTab === 'notes'
                        ? 'border-[#0088FF] text-[#0088FF]'
                        : 'border-transparent text-slate-600 hover:text-[#0088FF]'
                    }`}
                  >
                    Ghi chú
                  </button>
                  <button
                    onClick={() => setDetailTab('group')}
                    className={`border-b-2 px-4 py-3 text-[14px] font-medium transition-colors ${
                      detailTab === 'group'
                        ? 'border-[#0088FF] text-[#0088FF]'
                        : 'border-transparent text-slate-600 hover:text-[#0088FF]'
                    }`}
                  >
                    Nhóm khách hàng
                  </button>
                </div>

                {detailTab === 'history' ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] font-semibold text-[#182537]">
                            <th className="px-5 py-3">Mã đơn hàng</th>
                            <th className="px-2 py-3 text-center">Trạng thái</th>
                            <th className="px-2 py-3 text-center">Thanh toán</th>
                            <th className="px-2 py-3 text-center">Xuất kho</th>
                            <th className="px-4 py-3 text-right">Giá trị</th>
                            <th className="px-4 py-3">Chi nhánh</th>
                            <th className="px-2 py-3">Nguồn đơn</th>
                            <th className="px-4 py-3">Nhân viên xử lý đơn</th>
                            <th className="px-5 py-3 text-right">Ngày ghi nhận</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[13.5px]">
                          {historyRows.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                                Chưa có lịch sử mua hàng.
                              </td>
                            </tr>
                          ) : (
                            historyRows.map((order) => (
                              <tr key={order.id} className="transition-colors hover:bg-slate-50">
                                <td
                                  className="cursor-pointer px-5 py-4 text-[#0088FF] hover:underline"
                                  onClick={() =>
                                    navigate('/orders', {
                                      state: { selectedOrderId: order.id },
                                    })
                                  }
                                >
                                  {order.order_no}
                                </td>
                                <td className="px-2 py-4 text-center">
                                  <span className={`inline-flex rounded-full border px-3 py-0.5 text-[12px] ${getOrderStatusMeta(order.status)}`}>
                                    {order.status}
                                  </span>
                                </td>
                                <td className="px-2 py-4 text-center">
                                  {order.payment_status === 'paid' || order.payment_status === 'partial' ? (
                                    <div className="mx-auto h-2.5 w-2.5 rounded-full bg-[#182537]" />
                                  ) : (
                                    <div className="mx-auto h-2.5 w-2.5 rounded-full border-2 border-slate-400" />
                                  )}
                                </td>
                                <td className="px-2 py-4 text-center">
                                  {order.status === 'completed' ? (
                                    <div className="mx-auto h-2.5 w-2.5 rounded-full bg-[#182537]" />
                                  ) : (
                                    <div className="mx-auto h-2.5 w-2.5 rounded-full border-2 border-slate-400" />
                                  )}
                                </td>
                                <td className="px-4 py-4 text-right text-[#182537]">{formatCurrency(Number(order.total_amount || 0))}</td>
                                <td className="px-4 py-4 text-[#182537]">{order.branches?.name ?? 'Chi nhánh mặc định'}</td>
                                <td className="px-2 py-4 text-[#182537]">{order.source.toUpperCase()}</td>
                                <td className="px-4 py-4 text-[#182537]">---</td>
                                <td className="px-5 py-4 text-right text-[#182537]">{formatDate(order.sold_at)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-end border-t border-slate-200 px-5 py-4 text-[13px] text-slate-600">
                      <div className="mr-6">Từ 1 đến {historyRows.length} trên tổng {historyRows.length}</div>
                    </div>
                  </>
                ) : null}

                {detailTab === 'debt' ? (
                  <div className="space-y-4 p-5 text-[13px] text-[#182537]">
                    <div className="flex justify-between"><span className="text-slate-600">Tổng doanh số</span><span>{formatCurrency(Number(selectedCustomerDebt?.total_sales ?? 0))}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Đã thanh toán</span><span>{formatCurrency(Number(selectedCustomerDebt?.total_paid ?? 0))}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Công nợ hiện tại</span><span>{formatCurrency(Number(selectedCustomerDebt?.current_debt ?? 0))}</span></div>
                    <button onClick={() => navigate('/debts')} className="text-[13px] font-medium text-[#0088FF] hover:underline">
                      Mở trang công nợ
                    </button>
                  </div>
                ) : null}

                {detailTab === 'contact' ? (
                  <div className="space-y-4 p-5 text-[13px] text-[#182537]">
                    <div>Số điện thoại: {selectedCustomer.phone || '---'}</div>
                    <div>Email: {selectedCustomer.email || '---'}</div>
                    <div>Công ty: {selectedCustomer.company_name || '---'}</div>
                    <div>Mã số thuế: {selectedCustomer.tax_code || '---'}</div>
                  </div>
                ) : null}

                {detailTab === 'address' ? (
                  <div className="space-y-4 p-5 text-[13px] text-[#182537]">
                    <div>Địa chỉ chính: {selectedCustomer.address || '---'}</div>
                    {selectedCustomer.customer_addresses?.length ? (
                      selectedCustomer.customer_addresses.map((address) => (
                        <div key={address.id} className="rounded border border-slate-200 p-3">
                          <div>{address.address_line}</div>
                          <div className="text-slate-500">
                            {[address.ward, address.district, address.province].filter(Boolean).join(', ') || '---'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500">Chưa có địa chỉ phụ.</div>
                    )}
                  </div>
                ) : null}

                {detailTab === 'notes' ? (
                  <div className="space-y-4 p-5 text-[13px] text-[#182537]">
                    <div>{selectedCustomer.notes || 'Chưa có ghi chú.'}</div>
                    <button
                      onClick={() => handleUpdateCustomer('note')}
                      className="text-[13px] font-medium text-[#0088FF] hover:underline"
                    >
                      Cập nhật ghi chú
                    </button>
                  </div>
                ) : null}

                {detailTab === 'group' ? (
                  <div className="space-y-4 p-5 text-[13px] text-[#182537]">
                    <div>Nhóm hiện tại: {selectedCustomer.customer_groups?.name ?? 'Bán lẻ'}</div>
                    <div>Các nhóm đang có: {customerGroups.map((group) => group.name).join(', ') || '---'}</div>
                    <button
                      onClick={() => navigate('/customer-groups')}
                      className="text-[13px] font-medium text-[#0088FF] hover:underline"
                    >
                      Mở trang nhóm khách hàng
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-6 xl:col-span-1">
              <div className="ui-card ui-card-body-compact">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold text-[#182537]">Thông tin gợi ý khi bán hàng</h3>
                  <button
                    onClick={() => handleUpdateCustomer('note')}
                    className="text-[13px] font-medium text-[#0088FF] hover:underline"
                  >
                    Cập nhật
                  </button>
                </div>
                <div className="space-y-3 text-[13px]">
                  <div className="flex"><div className="w-48 text-slate-600">Chính sách giá mặc định</div><div className="text-[#182537]">: ---</div></div>
                  <div className="flex"><div className="w-48 text-slate-600">Chiết khấu khách hàng</div><div className="text-[#182537]">: ---</div></div>
                  <div className="flex"><div className="w-48 text-slate-600">Hình thức thanh toán mặc định</div><div className="text-[#182537]">: ---</div></div>
                </div>
              </div>

              <div className="ui-card ui-card-body-compact">
                <h3 className="mb-5 text-[15px] font-semibold text-[#182537]">Thông tin tích điểm</h3>
                <div className="space-y-3 text-[13px]">
                  <div className="flex"><div className="w-48 text-slate-600">Điểm hiện tại</div><div className="text-[#182537]">: 0</div></div>
                  <div className="flex"><div className="w-48 text-slate-600">Hạng thẻ hiện tại</div><div className="text-[#182537]">: ---</div></div>
                  <div className="flex"><div className="w-48 text-slate-600">Ngày hết hạn thẻ</div><div className="text-[#182537]">: ---</div></div>
                  <div className="flex"><div className="w-48 text-slate-600">Giá trị còn lại để lên hạng</div><div className="text-[#182537]">: 0</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil((totalRows || 1) / limit));
  if (isListLoading && !selectedCustomerId) {
    return <PageLoader text="Đang tải danh sách khách hàng..." fullScreen />;
  }

  return (
    <div className="customer-list-page -mx-2 -my-2 flex min-h-[calc(100vh-64px)] flex-col bg-[#f3f5f7] text-[13px]">
      <div className="flex min-h-10 items-center justify-between bg-[#f5f7f9] px-3 py-1">
        <div className="list-toolbar-actions">
          <button
            type="button"
            className="list-action-button"
          >
            <Download size={16} className="text-[#8a99a8]" />
            Xuất file
          </button>
          <button
            type="button"
            className="list-action-button"
          >
            <Upload size={16} className="text-[#8a99a8]" />
            Nhập file
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate('/customers/create')}
          className="list-primary-button"
        >
          <Plus size={16} />
          Thêm khách hàng
        </button>
      </div>

      <div className="flex flex-col gap-3 px-3 py-2">
      {infoMessage ? (
        <div className="rounded-[3px] border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
          {infoMessage}
        </div>
      ) : null}

      {listError ? (
        <div className="rounded-[3px] border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {listError}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[2px] border border-[#d8dde3] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
          <div className="flex border-b border-[#d8dde3] pr-5 pt-2">
            <button
              className={`border-b-2 px-4 py-3 text-[13px] font-medium transition-colors ${activeTab === 'all' ? 'border-[#0088FF] text-[#0088FF]' : 'border-transparent text-slate-600 hover:text-[#0088FF]'}`}
              onClick={() => {
                setActiveTab('all');
                setPage(1);
              }}
            >
              Tất cả khách hàng
            </button>
            <button
              className={`border-b-2 px-4 py-3 text-[13px] font-medium transition-colors ${activeTab === 'trading' ? 'border-[#0088FF] text-[#0088FF]' : 'border-transparent text-slate-600 hover:text-[#0088FF]'}`}
              onClick={() => {
                setActiveTab('trading');
                setPage(1);
              }}
            >
              Đang giao dịch
            </button>
          </div>

          <div className="flex flex-col gap-3 border-b border-[#e5e9ee] p-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                placeholder="Tìm kiếm theo mã khách hàng, tên, SĐT khách hàng"
                className="h-8 w-full rounded-[2px] border border-[#ccd3da] bg-white pl-9 pr-4 text-[13px] transition-colors placeholder:text-[#8b98a6] focus:border-[#0088FF] focus:outline-none"
              />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={handleToggleStatusFilter}
                className="flex h-8 w-24 items-center justify-between rounded-[2px] border border-[#ccd3da] bg-white px-3 text-[13px] text-[#1d2939] transition-colors hover:bg-slate-50"
              >
                <span>Bộ lọc</span>
                <Filter size={14} className="text-slate-400" />
              </button>
              <button
                onClick={handleSaveFilters}
                className="ml-2 h-8 rounded-[2px] bg-[#f2f4f6] px-4 text-[13px] font-medium text-[#7b8794] transition-colors hover:bg-slate-200"
              >
                Lưu bộ lọc
              </button>
            </div>
          </div>

          <div className="min-h-[520px] w-full overflow-x-hidden">
              <table className="w-full table-fixed text-left">
                <colgroup>
                  <col className="w-[3%]" />
                  <col className="w-[4%]" />
                  <col className="w-[12%]" />
                  <col className="w-[17%]" />
                  <col className="w-[12%]" />
                  <col className="w-[15%]" />
                  <col className="w-[13%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead>
                  <tr className="h-10 border-b border-[#dfe4ea] bg-[#f6f7fb] text-[12px] font-semibold text-[#111827]">
                    <th className="border-r border-[#dfe4ea] px-1 text-center">
                      <Settings size={16} className="mx-auto cursor-pointer text-slate-400 hover:text-slate-600" />
                    </th>
                    <th className="px-1 text-center"><input type="checkbox" className="rounded-[2px] border-slate-300 text-[#0088FF]" /></th>
                    <th className="truncate px-2 font-semibold">Mã khách hàng</th>
                    <th className="truncate px-2 font-semibold">
                      <span className="inline-flex items-center gap-1">Tên khách hàng <span className="flex flex-col"><ChevronDown size={10} className="-mb-1 rotate-180" /><ChevronDown size={10} /></span></span>
                    </th>
                    <th className="truncate px-2 font-semibold">Số điện thoại</th>
                    <th className="truncate px-2 font-semibold">Nhóm khách hàng</th>
                    <th className="truncate px-2 text-right font-semibold">
                      <span className="inline-flex items-center justify-end gap-1">Công nợ hiện tại <span className="flex flex-col"><ChevronDown size={10} className="-mb-1 rotate-180" /><ChevronDown size={10} /></span></span>
                    </th>
                    <th className="truncate px-2 text-right font-semibold">Tổng chi tiêu <ChevronDown size={10} className="ml-1 inline" /></th>
                    <th className="truncate px-2 text-right font-semibold">Tổng SL đơn hàng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8edf2] text-[12px] text-[#111827]">
                  {visibleCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                        Chưa có khách hàng phù hợp.
                      </td>
                    </tr>
                  ) : (
                    visibleCustomers.map((customer) => (
                      <tr key={customer.id} className="group h-[42px] transition-colors hover:bg-[#f7fbff]">
                        <td className="border-r border-[#eef2f6] px-1 text-center text-slate-400"></td>
                        <td className="px-1 text-center"><input type="checkbox" className="rounded-[2px] border-slate-300 text-[#0088FF]" /></td>
                        <td
                          className="cursor-pointer truncate px-2 text-[#0088FF] hover:underline"
                          onClick={() => {
                            setSelectedCustomerId(customer.id);
                            setDetailTab('history');
                          }}
                        >
                          {customer.code}
                        </td>
                        <td className="truncate px-2">{customer.full_name}</td>
                        <td className="truncate px-2">{customer.phone || ''}</td>
                        <td className="truncate px-2">{customer.groupName}</td>
                        <td className="truncate px-2 text-right">{formatCurrency(customer.debt)}</td>
                        <td className="truncate px-2 text-right">{customer.totalSpent > 0 ? formatCurrency(customer.totalSpent) : '0'}</td>
                        <td className="truncate px-2 text-right">{customer.ordersCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          <div className="flex items-center justify-end border-t border-[#dfe4ea] bg-white px-4 py-3 text-[13px] text-[#182537]">
            <div className="mr-6 flex items-center gap-2">
              <span className="text-slate-600">Hiển thị</span>
              <div className="relative">
                <select
                  value={limit}
                  onChange={(event) => {
                    setLimit(Number(event.target.value));
                    setPage(1);
                  }}
                  className="h-7 appearance-none rounded-[2px] border border-slate-300 bg-white px-2 pr-7 text-[#182537] focus:border-[#0088FF] focus:outline-none"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
              <span className="text-slate-600">kết quả</span>
            </div>
            <div className="mr-6 text-slate-600">
              Từ {pageStart} đến {pageEnd} trên tổng {totalRows}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                className="flex h-7 w-7 items-center justify-center rounded-[2px] text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button className="flex h-7 w-7 items-center justify-center rounded-[2px] bg-[#0088FF] font-medium text-white">
                {page}
              </button>
              <button
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-[2px] text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
      </div>
      </div>
    </div>
  );
}

