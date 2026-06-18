import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { readSheet } from 'read-excel-file/browser';
import {
  Search,
  ChevronDown,
  Filter,
  Settings,
  Download,
  Upload,
  Plus,
  ChevronLeft,
  ChevronRight,
  Printer,
  Copy,
  Check,
  Receipt,
  CheckCircle,
  Package,
  Info,
  ImageIcon,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  salesOrdersService,
  type CreateSalesOrderPayload,
  type SalesOrder,
  type SalesOrdersProcessingSummary,
  type SalesOrdersQuery,
} from '../services/salesOrdersService';
import { productsService, type Product } from '../services/productsService';
import { inventoryService, type Branch } from '../services/inventoryService';
import { PageLoader } from '../components/PageLoader';
import { getDeliveryLabel, getDeliveryStatusFromTab, parseLegacyDeliveryTab } from '../utils/delivery';
import { exportRowsToXlsx } from '../utils/excel';

type OrderTab = 'all' | 'trading';
type DatePreset = 'today' | 'this_month';
type ExportScope = 'all' | 'current';
type OrderExportType = 'orders' | 'products' | 'details';

type DashboardOrderFilter = {
  branchId?: string;
  status?: SalesOrder['status'];
  paymentStatus?: SalesOrder['payment_status'] | 'open';
  deliveryStatus?: SalesOrder['delivery_status'] | 'cancelled_delivery';
  datePreset?: DatePreset;
  onlyProcessing?: boolean;
};

type OrdersRouteState = {
  selectedOrderId?: string;
  message?: string;
  activeTab?: OrderTab;
  searchTerm?: string;
  filters?: DashboardOrderFilter;
} | null;

const ORDER_FILTERS_KEY = 'duc-huyen-pos.orders.filters';

const EMPTY_PROCESSING_SUMMARY: SalesOrdersProcessingSummary = {
  days: 90,
  pending: { count: 0, total_amount: 0 },
  unpaid: { count: 0, total_amount: 0 },
  packing: { count: 0, total_amount: 0 },
  waitingPickup: { count: 0, total_amount: 0 },
  delivering: { count: 0, total_amount: 0 },
  cancelledDelivery: { count: 0, total_amount: 0 },
};

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

  return date.toLocaleString('vi-VN');
}

function getOrderStatusMeta(status?: SalesOrder['status']) {
  switch (status) {
    case 'draft':
      return {
        label: 'Chờ duyệt',
        badge: 'border-orange-300 text-orange-600 bg-orange-50',
      };
    case 'pending':
      return {
        label: 'Đang giao dịch',
        badge: 'border-blue-300 text-blue-600 bg-blue-50',
      };
    case 'completed':
      return {
        label: 'Hoàn thành',
        badge: 'border-emerald-300 text-emerald-600 bg-emerald-50',
      };
    case 'cancelled':
      return {
        label: 'Đã hủy',
        badge: 'border-red-300 text-red-500 bg-red-50',
      };
    default:
      return {
        label: 'Không xác định',
        badge: 'border-slate-300 text-slate-600 bg-slate-50',
      };
  }
}

function getPaymentStatusMeta(status?: SalesOrder['payment_status']) {
  switch (status) {
    case 'paid':
      return {
        label: 'Đã thanh toán toàn bộ',
        dotClass: 'bg-[#182537]',
        titleClass: 'text-emerald-600',
      };
    case 'partial':
      return {
        label: 'Đã thanh toán một phần',
        dotClass: 'bg-amber-500',
        titleClass: 'text-amber-600',
      };
    case 'unpaid':
      return {
        label: 'Chưa thanh toán',
        dotClass: 'border-2 border-slate-400',
        titleClass: 'text-slate-600',
      };
    case 'refunded':
      return {
        label: 'Đã hoàn tiền',
        dotClass: 'bg-red-500',
        titleClass: 'text-red-600',
      };
    default:
      return {
        label: 'Không xác định',
        dotClass: 'border-2 border-slate-300',
        titleClass: 'text-slate-600',
      };
  }
}

function getTimelineProgress(status?: SalesOrder['status']) {
  switch (status) {
    case 'draft':
      return 1;
    case 'pending':
      return 3;
    case 'completed':
      return 5;
    case 'cancelled':
      return 1;
    default:
      return 1;
  }
}

function getCustomerStats(orders: SalesOrder[], customerId?: string) {
  if (!customerId) {
    return {
      totalSpent: 0,
      debt: 0,
      ordersCount: 0,
      returnedCount: 0,
      failedDeliveryCount: 0,
    };
  }

  const matched = orders.filter((order) => order.customer_id === customerId);

  return {
    totalSpent: matched.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
    debt: matched
      .filter((order) => order.status !== 'cancelled')
      .reduce(
        (sum, order) =>
          sum + Math.max(0, Number(order.total_amount || 0) - Number(order.paid_amount || 0)),
        0,
      ),
    ordersCount: matched.length,
    returnedCount: 0,
    failedDeliveryCount: 0,
  };
}

function isSameDay(value?: string) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isThisMonth(value?: string) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth()
  );
}

function isWithinRecentDays(value: string | null | undefined, days: number) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= 0 && diffDays <= days;
}

function normalizeImportKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseImportNumber(value?: string) {
  if (!value?.trim()) {
    return 0;
  }

  const cleaned = value.replace(/[^\d,.-]/g, '');
  const separatorMatches = [...cleaned.matchAll(/[,.]/g)];
  const lastSeparator = separatorMatches.at(-1);
  const decimalIndex = lastSeparator?.index ?? -1;
  const trailingDigits = decimalIndex >= 0 ? cleaned.slice(decimalIndex + 1).replace(/[^\d]/g, '') : '';
  const hasDecimal = decimalIndex >= 0 && trailingDigits.length > 0 && trailingDigits.length <= 2;
  const normalized = hasDecimal
    ? `${cleaned.slice(0, decimalIndex).replace(/[^\d-]/g, '')}.${trailingDigits}`
    : cleaned.replace(/[^\d-]/g, '');
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
}

async function parseImportFile(file: File) {
  const rows = await readSheet(file);
  return rows
    .map((row) => row.map((cell) => (cell === null ? '' : String(cell).trim())))
    .filter((row) => row.some(Boolean));
}

function getImportValue(record: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const value = record[normalizeImportKey(alias)];
    if (value?.trim()) {
      return value.trim();
    }
  }

  return '';
}

function findImportBranch(branches: Branch[], value: string) {
  if (!value.trim()) {
    return branches.find((branch) => branch.is_default) ?? branches[0];
  }

  const normalized = normalizeImportKey(value);
  return branches.find((branch) =>
    branch.id === value ||
    normalizeImportKey(branch.code) === normalized ||
    normalizeImportKey(branch.name) === normalized,
  );
}

function findImportProduct(products: Product[], record: Record<string, string>) {
  const productId = getImportValue(record, ['product_id', 'ID sản phẩm', 'Id san pham']);
  const sku = getImportValue(record, ['SKU', 'Mã sản phẩm', 'Ma san pham', 'Mã SP']);
  const barcode = getImportValue(record, ['Barcode', 'Mã vạch', 'Ma vach']);
  const name = getImportValue(record, ['Sản phẩm', 'San pham', 'Tên sản phẩm', 'Ten san pham', 'Product']);
  const normalizedName = normalizeImportKey(name);

  return products.find((product) =>
    (productId ? product.id === productId : false) ||
    (sku ? normalizeImportKey(product.sku) === normalizeImportKey(sku) : false) ||
    (barcode ? normalizeImportKey(product.barcode ?? '') === normalizeImportKey(barcode) : false) ||
    (name ? normalizeImportKey(product.name) === normalizedName : false),
  );
}

function parseImportStatus(value: string): SalesOrder['status'] {
  const normalized = normalizeImportKey(value);
  if (['draft', 'cho duyet', 'nhap'].includes(normalized)) return 'draft';
  if (['pending', 'dang giao dich', 'dang xu ly', 'cho xu ly'].includes(normalized)) return 'pending';
  if (['cancelled', 'da huy', 'huy'].includes(normalized)) return 'cancelled';
  return 'completed';
}

function parseImportSource(value: string): SalesOrder['source'] {
  const normalized = normalizeImportKey(value);
  if (['pos', 'web', 'phone', 'manual'].includes(normalized)) {
    return normalized as SalesOrder['source'];
  }
  if (['dien thoai', 'sdt'].includes(normalized)) return 'phone';
  if (['thu cong'].includes(normalized)) return 'manual';
  return 'manual';
}

function getImportPaymentStatus(totalAmount: number, paidAmount: number): SalesOrder['payment_status'] {
  if (paidAmount <= 0) return 'unpaid';
  if (paidAmount >= totalAmount) return 'paid';
  return 'partial';
}

function getDatePresetRange(datePreset?: DatePreset) {
  if (!datePreset) {
    return {};
  }

  const fromDate = new Date();
  const toDate = new Date();

  if (datePreset === 'today') {
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);
  } else {
    fromDate.setDate(1);
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);
  }

  return {
    from_date: fromDate.toISOString(),
    to_date: toDate.toISOString(),
  };
}

function buildOrdersQuery({
  activeTab,
  dashboardFilter,
  searchTerm,
  page,
  limit,
  includeItems = false,
}: {
  activeTab: OrderTab;
  dashboardFilter: DashboardOrderFilter | null;
  searchTerm: string;
  page: number;
  limit: number;
  includeItems?: boolean;
}): SalesOrdersQuery {
  const query: SalesOrdersQuery = {
    page,
    limit,
    search: searchTerm.trim() || undefined,
    include_items: includeItems,
    ...getDatePresetRange(dashboardFilter?.datePreset),
  };

  if (dashboardFilter?.branchId) {
    query.branch_id = dashboardFilter.branchId;
  }

  if (dashboardFilter?.status) {
    query.status = dashboardFilter.status;
  } else if (dashboardFilter?.onlyProcessing || activeTab === 'trading') {
    query.status_in = 'draft,pending';
  }

  if (dashboardFilter?.paymentStatus === 'open') {
    query.payment_status_in = 'unpaid,partial';
  } else if (dashboardFilter?.paymentStatus) {
    query.payment_status = dashboardFilter.paymentStatus;
  }

  if (dashboardFilter?.deliveryStatus === 'cancelled_delivery') {
    query.delivery_issue = 'cancelled_delivery';
  } else if (dashboardFilter?.deliveryStatus) {
    query.delivery_status = dashboardFilter.deliveryStatus;
  }

  return query;
}

async function loadAllSalesOrders(query: SalesOrdersQuery) {
  const limit = 200;
  const firstPage = await salesOrdersService.getAll({ ...query, page: 1, limit });
  const allOrders = [...firstPage.data];

  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const response = await salesOrdersService.getAll({ ...query, page, limit });
    allOrders.push(...response.data);
  }

  return allOrders;
}

export function Orders() {
  const [activeTab, setActiveTab] = useState<OrderTab>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<SalesOrder | null>(null);
  const [processingSummary, setProcessingSummary] = useState<SalesOrdersProcessingSummary>(EMPTY_PROCESSING_SUMMARY);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isProcessingHidden, setIsProcessingHidden] = useState(false);
  const [processingWindowDays, setProcessingWindowDays] = useState<7 | 30 | 90>(90);
  const [showProcessingWindowMenu, setShowProcessingWindowMenu] = useState(false);
  const [showCustomerExtra, setShowCustomerExtra] = useState(false);
  const [dashboardFilter, setDashboardFilter] = useState<DashboardOrderFilter | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>('all');
  const [orderExportType, setOrderExportType] = useState<OrderExportType>('orders');
  const [isImporting, setIsImporting] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const processingWindowRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    try {
      const savedFilters = window.localStorage.getItem(ORDER_FILTERS_KEY);
      if (!savedFilters) {
        return;
      }

      const parsed = JSON.parse(savedFilters) as {
        activeTab?: OrderTab;
        searchTerm?: string;
        isProcessingHidden?: boolean;
      };

      if (parsed.activeTab === 'all' || parsed.activeTab === 'trading') {
        setActiveTab(parsed.activeTab);
      }
      if (typeof parsed.searchTerm === 'string') {
        setSearchTerm(parsed.searchTerm);
      }
      if (typeof parsed.isProcessingHidden === 'boolean') {
        setIsProcessingHidden(parsed.isProcessingHidden);
      }
    } catch {
      window.localStorage.removeItem(ORDER_FILTERS_KEY);
    }
  }, []);

  useEffect(() => {
    const routeState = location.state as OrdersRouteState;
    if (!routeState) {
      return;
    }

    if (routeState.selectedOrderId) {
      setSelectedOrderId(routeState.selectedOrderId);
    }
    if (routeState.message) {
      setInfoMessage(routeState.message);
    }
    if (routeState.activeTab === 'all' || routeState.activeTab === 'trading') {
      setActiveTab(routeState.activeTab);
    }
    if (typeof routeState.searchTerm === 'string') {
      setSearchTerm(routeState.searchTerm);
    }
    if (routeState.filters) {
      setDashboardFilter(routeState.filters);
      if (routeState.filters.onlyProcessing) {
        setIsProcessingHidden(false);
      }
    } else {
      setDashboardFilter(null);
    }

    navigate('/orders', { replace: true, state: null });
  }, [location.state, navigate]);

  useEffect(() => {
    if (!infoMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => setInfoMessage(null), 4500);
    return () => window.clearTimeout(timeoutId);
  }, [infoMessage]);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setIsListLoading(true);
      setListError(null);

      try {
        const response = await salesOrdersService.getAll(
          buildOrdersQuery({
            activeTab,
            dashboardFilter,
            searchTerm,
            page,
            limit: pageSize,
            includeItems: false,
          }),
        );
        if (!active) {
          return;
        }
        setOrders(response.data);
        setTotalOrders(response.total);
      } catch (error: any) {
        if (!active) {
          return;
        }
        setListError(error?.message ?? 'Không tải được danh sách đơn hàng.');
      } finally {
        if (active) {
          setIsListLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, [activeTab, dashboardFilter, page, pageSize, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, dashboardFilter, searchTerm]);

  useEffect(() => {
    let active = true;

    async function loadProcessingSummary() {
      try {
        const response = await salesOrdersService.getProcessingSummary(processingWindowDays);
        if (active) {
          setProcessingSummary(response);
        }
      } catch {
        if (active) {
          setProcessingSummary({ ...EMPTY_PROCESSING_SUMMARY, days: processingWindowDays });
        }
      }
    }

    loadProcessingSummary();

    return () => {
      active = false;
    };
  }, [processingWindowDays]);

  useEffect(() => {
    let active = true;

    async function loadOrderDetail(orderId: string) {
      setIsDetailLoading(true);
      setDetailError(null);

      try {
        const detail = await salesOrdersService.getOne(orderId);
        if (!active) {
          return;
        }
        setSelectedOrderDetail(detail);
      } catch (error: any) {
        if (!active) {
          return;
        }
        setDetailError(error?.message ?? 'Không tải được chi tiết đơn hàng.');
      } finally {
        if (active) {
          setIsDetailLoading(false);
        }
      }
    }

    if (!selectedOrderId) {
      setSelectedOrderDetail(null);
      setDetailError(null);
      return;
    }

    loadOrderDetail(selectedOrderId);

    return () => {
      active = false;
    };
  }, [selectedOrderId]);

  useEffect(() => {
    if (!showProcessingWindowMenu) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!processingWindowRef.current?.contains(event.target as Node)) {
        setShowProcessingWindowMenu(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [showProcessingWindowMenu]);

  const visibleOrders = orders;
  const totalPages = Math.max(1, Math.ceil((totalOrders || 1) / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedOrders = visibleOrders;
  const pageStart = pagedOrders.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = pagedOrders.length === 0 ? 0 : pageStart + pagedOrders.length - 1;

  useEffect(() => {
    if (!isListLoading && page > totalPages) {
      setPage(totalPages);
    }
  }, [isListLoading, page, totalPages]);

  const selectedOrder =
    selectedOrderDetail ?? orders.find((order) => order.id === selectedOrderId) ?? null;

  const pendingOrders = processingSummary.pending;
  const unpaidOrders = processingSummary.unpaid;
  const packingOrders = processingSummary.packing;
  const waitingPickupOrders = processingSummary.waitingPickup;
  const deliveringOrders = processingSummary.delivering;
  const cancelledDeliveryOrders = processingSummary.cancelledDelivery;
  const statusMeta = getOrderStatusMeta(selectedOrder?.status);
  const paymentMeta = getPaymentStatusMeta(selectedOrder?.payment_status);
  const selectedOrderItems = selectedOrder?.sales_order_items ?? [];
  const customerStats = getCustomerStats(orders, selectedOrder?.customer_id);

  const handleSaveFilters = () => {
    window.localStorage.setItem(
      ORDER_FILTERS_KEY,
      JSON.stringify({ activeTab, searchTerm, isProcessingHidden }),
    );
    setInfoMessage('Đã lưu bộ lọc hiện tại.');
  };

  const handlePrintOrder = () => {
    if (!selectedOrder) {
      return;
    }

    window.location.assign(`/invoice?orderId=${encodeURIComponent(selectedOrder.id)}&autoPrint=1`);
  };

  const handleExportOrders = async () => {
    try {
      const includeItems = orderExportType === 'products';
      const ordersToExport =
        exportScope === 'all'
          ? await loadAllSalesOrders(
              buildOrdersQuery({
                activeTab,
                dashboardFilter,
                searchTerm,
                page: 1,
                limit: 200,
                includeItems,
              }),
            )
          : includeItems
            ? await Promise.all(pagedOrders.map((order) => salesOrdersService.getOne(order.id)))
            : pagedOrders;

      if (ordersToExport.length === 0) {
        setInfoMessage('Không có đơn hàng phù hợp để xuất file.');
        return;
      }

      const rows =
        orderExportType === 'products'
          ? [
              ['Mã đơn hàng', 'Ngày bán', 'Khách hàng', 'SĐT', 'SKU', 'Sản phẩm', 'Đơn vị', 'Số lượng', 'Đơn giá', 'Chiết khấu', 'Thành tiền'],
              ...ordersToExport.flatMap((order) => {
                const items = order.sales_order_items?.length ? order.sales_order_items : [null];
                return items.map((item) => [
                  order.order_no,
                  formatDateTime(order.sold_at),
                  order.customers?.full_name ?? 'Khách lẻ',
                  order.customers?.phone ?? '',
                  item?.sku ?? '',
                  item?.product_name ?? '',
                  item?.unit_name ?? '',
                  item ? String(Number(item.quantity || 0)) : '',
                  item ? String(Number(item.unit_price || 0)) : '',
                  item ? String(Number(item.discount_amount || 0)) : '',
                  item ? String(Number(item.line_total || 0)) : '',
                ]);
              }),
            ]
          : orderExportType === 'details'
          ? [
              [
                'Mã đơn hàng',
                'Mã hóa đơn',
                'Ngày bán',
                'Chi nhánh',
                'Nguồn',
                'Khách hàng',
                'SĐT',
                'Trạng thái',
                'Vận chuyển',
                'Thanh toán',
                'Tạm tính',
                'Chiết khấu',
                'Phí giao hàng',
                'Thuế',
                'Tổng tiền',
                'Đã thanh toán',
                'Khách phải trả',
                'Ghi chú',
              ],
              ...ordersToExport.map((order) => [
                order.order_no,
                order.invoice_no ?? '',
                formatDateTime(order.sold_at),
                order.branches?.name ?? '',
                order.source,
                order.customers?.full_name ?? 'Khách lẻ',
                order.customers?.phone ?? '',
                getOrderStatusMeta(order.status).label,
                getDeliveryLabel(order.delivery_status),
                getPaymentStatusMeta(order.payment_status).label,
                String(Number(order.subtotal || 0)),
                String(Number(order.discount_amount || 0)),
                String(Number(order.shipping_fee || 0)),
                String(Number(order.tax_amount || 0)),
                String(Number(order.total_amount || 0)),
                String(Number(order.paid_amount || 0)),
                String(Math.max(0, Number(order.total_amount || 0) - Number(order.paid_amount || 0))),
                order.note ?? '',
              ]),
            ]
          : [
              ['Mã đơn hàng', 'Ngày bán', 'Khách hàng', 'SĐT', 'Trạng thái', 'Thanh toán', 'Tổng tiền'],
              ...ordersToExport.map((order) => [
                order.order_no,
                formatDateTime(order.sold_at),
                order.customers?.full_name ?? 'Khách lẻ',
                order.customers?.phone ?? '',
                getOrderStatusMeta(order.status).label,
                getPaymentStatusMeta(order.payment_status).label,
                String(Number(order.total_amount || 0)),
              ]),
            ];

      exportRowsToXlsx(rows, `orders-${orderExportType}-${new Date().toISOString().slice(0, 10)}`, 'Đơn hàng');
      setShowExportModal(false);
      setInfoMessage(`Đã xuất ${ordersToExport.length} đơn hàng.`);
    } catch (error: any) {
      setInfoMessage(error?.message ?? 'Xuất file đơn hàng thất bại.');
    }
  };

  const handleImportOrders = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    const lowerFileName = file.name.toLowerCase();
    const isSupportedFile = lowerFileName.endsWith('.xlsx');

    if (!isSupportedFile) {
      setInfoMessage('Hiện chức năng nhập đơn hàng chỉ hỗ trợ Excel .xlsx.');
      return;
    }

    setIsImporting(true);
    setListError(null);
    setInfoMessage(`Đang đọc file ${file.name}...`);

    try {
      const rows = await parseImportFile(file);
      const [headers, ...dataRows] = rows;

      if (!headers?.length || dataRows.length === 0) {
        setInfoMessage('File nhập chưa có dữ liệu đơn hàng.');
        return;
      }

      const [productsResponse, branchList] = await Promise.all([
        productsService.getAll({ page: 1, limit: 1000, status: 'active' }),
        inventoryService.getBranches(),
      ]);
      const products = productsResponse.data;
      const normalizedHeaders = headers.map(normalizeImportKey);
      const groupedRows = new Map<string, Record<string, string>[]>();

      dataRows.forEach((row, rowIndex) => {
        const record = normalizedHeaders.reduce<Record<string, string>>((acc, header, headerIndex) => {
          acc[header] = row[headerIndex] ?? '';
          return acc;
        }, {});
        const orderNo = getImportValue(record, ['Mã đơn hàng', 'Ma don hang', 'order_no', 'Order no']);
        const productMarker =
          getImportValue(record, ['product_id', 'SKU', 'Mã sản phẩm', 'Ma san pham', 'Sản phẩm', 'San pham']) ||
          getImportValue(record, ['Tên sản phẩm', 'Ten san pham']);

        if (!productMarker) {
          return;
        }

        const groupKey = orderNo || `__row_${rowIndex + 2}`;
        groupedRows.set(groupKey, [...(groupedRows.get(groupKey) ?? []), record]);
      });

      if (groupedRows.size === 0) {
        setInfoMessage('File nhập chưa có dòng sản phẩm hợp lệ.');
        return;
      }

      const createdOrders: SalesOrder[] = [];
      const failures: string[] = [];

      for (const [groupKey, groupRows] of groupedRows.entries()) {
        const firstRow = groupRows[0];
        const branchValue = getImportValue(firstRow, ['branch_id', 'Chi nhánh', 'Chi nhanh', 'Branch']);
        const branch = findImportBranch(branchList, branchValue);
        const orderNo = getImportValue(firstRow, ['Mã đơn hàng', 'Ma don hang', 'order_no', 'Order no']);

        if (!branch) {
          failures.push(`${orderNo || groupKey}: không tìm thấy chi nhánh.`);
          continue;
        }

        const items: CreateSalesOrderPayload['items'] = [];
        for (const record of groupRows) {
          const product = findImportProduct(products, record);
          if (!product) {
            failures.push(`${orderNo || groupKey}: không tìm thấy sản phẩm ${getImportValue(record, ['SKU', 'Sản phẩm', 'Tên sản phẩm']) || 'không rõ'}.`);
            continue;
          }

          const quantity = parseImportNumber(getImportValue(record, ['Số lượng', 'So luong', 'Quantity', 'Qty'])) || 1;
          const unitPrice =
            parseImportNumber(getImportValue(record, ['Đơn giá', 'Don gia', 'Giá bán', 'Gia ban', 'Unit price'])) ||
            Number(product.sale_price ?? 0);
          const discountAmount = parseImportNumber(getImportValue(record, ['Chiết khấu', 'Chiet khau', 'Discount']));

          items.push({
            product_id: product.id,
            product_name: product.name,
            sku: product.sku,
            unit_name: getImportValue(record, ['Đơn vị', 'Don vi', 'Unit']) || product.unit_name || 'cái',
            quantity,
            unit_price: unitPrice,
            discount_amount: discountAmount,
          });
        }

        if (items.length === 0) {
          continue;
        }

        const subtotal = items.reduce(
          (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0) - Number(item.discount_amount || 0),
          0,
        );
        const discountAmount = parseImportNumber(getImportValue(firstRow, ['Chiết khấu đơn', 'Chiet khau don', 'order_discount', 'discount_amount']));
        const shippingFee = parseImportNumber(getImportValue(firstRow, ['Phí giao hàng', 'Phi giao hang', 'shipping_fee']));
        const taxAmount = parseImportNumber(getImportValue(firstRow, ['Thuế', 'Thue', 'tax_amount']));
        const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee + taxAmount);
        const paidAmount = parseImportNumber(getImportValue(firstRow, ['Đã thanh toán', 'Da thanh toan', 'paid_amount', 'Paid']));

        try {
          const created = await salesOrdersService.create({
            branch_id: branch.id,
            customer_id: getImportValue(firstRow, ['customer_id', 'ID khách hàng', 'Id khach hang']) || undefined,
            order_no: orderNo || undefined,
            source: parseImportSource(getImportValue(firstRow, ['Nguồn', 'Nguon', 'source'])),
            status: parseImportStatus(getImportValue(firstRow, ['Trạng thái', 'Trang thai', 'status'])),
            payment_status: getImportPaymentStatus(totalAmount, paidAmount),
            paid_amount: paidAmount,
            discount_amount: discountAmount,
            shipping_fee: shippingFee,
            tax_amount: taxAmount,
            note: getImportValue(firstRow, ['Ghi chú', 'Ghi chu', 'note']) || undefined,
            delivery_address: getImportValue(firstRow, ['Địa chỉ giao hàng', 'Dia chi giao hang', 'delivery_address']) || undefined,
            items,
          });
          createdOrders.push(created);
        } catch (error: any) {
          failures.push(`${orderNo || groupKey}: ${error?.message ?? 'không nhập được đơn hàng.'}`);
        }
      }

      if (createdOrders.length > 0) {
        setOrders((current) => [...createdOrders, ...current]);
        setTotalOrders((current) => current + createdOrders.length);
        setSelectedOrderId(createdOrders[0].id);
        setSelectedOrderDetail(createdOrders[0]);
      }

      const summaryParts = [
        createdOrders.length ? `Đã nhập ${createdOrders.length} đơn hàng` : 'Chưa nhập được đơn hàng nào',
        failures.length ? `${failures.length} lỗi` : '',
      ].filter(Boolean);
      setInfoMessage(`${summaryParts.join(', ')}.${failures.length ? ` Lỗi đầu tiên: ${failures[0]}` : ''}`);
    } catch (error: any) {
      setListError(error?.message ?? 'Nhập file đơn hàng thất bại.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCopyOrder = async () => {
    if (!selectedOrder) {
      return;
    }

    setIsCopying(true);
    setDetailError(null);

    try {
      const duplicated = await salesOrdersService.create({
        branch_id: selectedOrder.branch_id,
        customer_id: selectedOrder.customer_id,
        source: selectedOrder.source,
        status: 'draft',
        payment_status: 'unpaid',
        discount_amount: Number(selectedOrder.discount_amount || 0),
        shipping_fee: Number(selectedOrder.shipping_fee || 0),
        tax_amount: Number(selectedOrder.tax_amount || 0),
        paid_amount: 0,
        note: selectedOrder.note,
        delivery_address: selectedOrder.customers?.address,
        delivery_method:
          selectedOrder.delivery_method ??
          parseLegacyDeliveryTab(selectedOrder.note, selectedOrder.status) ??
          'giao_hang_sau',
        delivery_status: getDeliveryStatusFromTab(
          selectedOrder.delivery_method ??
            parseLegacyDeliveryTab(selectedOrder.note, selectedOrder.status) ??
            'giao_hang_sau',
        ),
        items: selectedOrderItems.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku,
          unit_name: item.unit_name,
          quantity: Number(item.quantity || 0),
          unit_price: Number(item.unit_price || 0),
          discount_amount: Number(item.discount_amount || 0),
        })),
      });

      setOrders((current) => [duplicated, ...current]);
      setTotalOrders((current) => current + 1);
      setSelectedOrderId(duplicated.id);
      setSelectedOrderDetail(duplicated);
      setInfoMessage(`Đã sao chép đơn hàng sang ${duplicated.order_no}.`);
    } catch (error: any) {
      setDetailError(error?.message ?? 'Sao chép đơn hàng thất bại.');
    } finally {
      setIsCopying(false);
    }
  };

  const handleEditOrder = () => {
    if (!selectedOrder) {
      return;
    }

    navigate('/pos', { state: { orderId: selectedOrder.id } });
  };

  const handleReturnOrder = () => {
    if (!selectedOrder) {
      return;
    }

    navigate('/returns', {
      state: {
        orderId: selectedOrder.id,
        orderNo: selectedOrder.order_no,
      },
    });
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder || selectedOrder.status === 'cancelled') {
      return;
    }

    setIsCancelling(true);
    setDetailError(null);

    try {
      const updated = await salesOrdersService.cancel(selectedOrder.id);
      setOrders((current) =>
        current.map((order) => (order.id === updated.id ? { ...order, ...updated } : order)),
      );
      const refreshed = await salesOrdersService.getOne(selectedOrder.id);
      setSelectedOrderDetail(refreshed);
      setInfoMessage(`Đã hủy đơn hàng ${updated.order_no}.`);
    } catch (error: any) {
      setDetailError(error?.message ?? 'Hủy đơn hàng thất bại.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (selectedOrderId && !selectedOrder && isDetailLoading) {
    return (
      <PageLoader text="Đang tải chi tiết đơn hàng..." fullScreen />
    );
  }

  if (selectedOrder) {
    const timelineSteps = ['Đặt hàng', 'Duyệt', 'Đóng gói', 'Xuất kho', 'Hoàn thành'];
    const progress = getTimelineProgress(selectedOrder.status);

    return (
      <div className="flex flex-col gap-4">
        {infoMessage ? (
          <div className="fixed right-5 top-5 z-[70] flex max-w-[380px] items-start gap-3 border border-blue-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-xl shadow-slate-200/80">
            <CheckCircle size={18} className="mt-0.5 shrink-0 text-emerald-500" />
            <div className="font-medium">{infoMessage}</div>
            <button
              type="button"
              onClick={() => setInfoMessage(null)}
              aria-label="Đóng thông báo"
              className="ml-2 text-slate-400 transition-colors hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => setSelectedOrderId(null)}
            className="flex items-center gap-2 text-[14px] font-medium text-slate-600 transition-colors hover:text-[#0088FF]"
          >
            <ChevronLeft size={16} /> Quay lại danh sách đơn hàng
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleCancelOrder}
              disabled={isCancelling || selectedOrder.status === 'cancelled'}
              className="rounded border border-red-500 bg-white px-4 py-1.5 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
            >
              {isCancelling ? 'Đang hủy...' : 'Hủy đơn hàng'}
            </button>
            <button
              onClick={handleEditOrder}
              className="rounded border border-[#0088FF] bg-white px-4 py-1.5 text-[13px] font-medium text-[#0088FF] transition-colors hover:bg-blue-50"
            >
              Sửa đơn hàng
            </button>
            <button
              onClick={handleReturnOrder}
              className="rounded bg-[#0088FF] px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-blue-700"
            >
              Đổi trả hàng
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {detailError ? (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {detailError}
            </div>
          ) : null}

          <div className="mb-6 flex items-start justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h1 className="text-[22px] font-semibold text-[#182537]">{selectedOrder.order_no}</h1>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[12px] font-medium ${statusMeta.badge}`}
                >
                  {statusMeta.label}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrintOrder}
                  className="flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                >
                  <Printer size={14} className="text-slate-500" /> In đơn hàng{' '}
                  <ChevronDown size={14} className="text-slate-400" />
                </button>
                <button
                  onClick={handleCopyOrder}
                  disabled={isCopying}
                  className="flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  <Copy size={14} className="text-slate-500" /> {isCopying ? 'Đang sao chép...' : 'Sao chép'}
                </button>
              </div>
            </div>

            <div className="mt-2 w-[500px]">
              <div className="relative flex items-start justify-between text-[12px] font-medium text-slate-500">
                <div className="absolute left-[5%] right-[5%] top-[10px] z-0 h-[2px] bg-slate-200"></div>
                <div
                  className="absolute left-[5%] top-[10px] z-0 h-[2px] bg-[#0088FF]"
                  style={{ width: `${Math.max(18, (progress / timelineSteps.length) * 90)}%` }}
                ></div>

                {timelineSteps.map((step, idx) => {
                  const isDone = idx < progress;
                  const isFinal = idx === timelineSteps.length - 1;

                  return (
                    <div key={step} className="z-10 flex w-20 flex-col items-center gap-2">
                      <div
                        className={`relative z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full text-white ring-[6px] ring-[#f3f4f6] ${
                          isDone ? 'bg-[#0088FF]' : 'bg-slate-300'
                        }`}
                      >
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <div className="whitespace-nowrap font-medium text-[#182537]">{step}</div>
                      {isFinal && selectedOrder.status === 'completed' ? (
                        <div className="whitespace-nowrap text-[11px] font-normal text-slate-400">
                          {formatDateTime(selectedOrder.sold_at)}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <div className="ui-card">
                <div className="flex gap-8 p-5">
                  <div className="flex-1 space-y-2">
                    <h3 className="mb-4 text-[15px] font-semibold text-[#182537]">Thông tin khách hàng</h3>
                    <a href="/customers" className="flex text-[14px] font-medium text-[#0088FF] hover:underline">
                      {selectedOrder.customers?.full_name ?? 'Khách lẻ'}
                    </a>
                    <div className="mt-5 space-y-1">
                      <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold uppercase text-[#182537]">
                        Địa chỉ giao hàng
                      </div>
                      <p className="text-[13px] text-slate-500">
                        {selectedOrder.customers?.address ?? 'Chưa có thông tin giao hàng'}
                      </p>
                      <a href="#" className="mt-1 inline-block text-[13px] text-[#0088FF] hover:underline">
                        {selectedOrder.customers?.phone ?? 'Chưa có số điện thoại'}
                      </a>
                      {showCustomerExtra ? (
                        <div className="pt-3 text-[13px] text-slate-500">
                          <div>Mã khách hàng: {selectedOrder.customers?.id ?? '---'}</div>
                          <div>Ngày bán gần nhất: {formatDateTime(selectedOrder.sold_at)}</div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="w-[280px] shrink-0 self-start space-y-3 rounded border border-dashed border-slate-300 bg-white p-4 text-[13px]">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Nợ phải thu</span>
                      <span className="font-medium text-red-500">
                        {formatCurrency(customerStats.debt)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tổng chi tiêu ({customerStats.ordersCount} đơn)</span>
                      <span className="font-medium text-[#0088FF]">
                        {formatCurrency(customerStats.totalSpent)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Trả hàng ({customerStats.returnedCount} sản phẩm)</span>
                      <span className="font-medium text-red-500">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        Giao hàng thất bại ({customerStats.failedDeliveryCount} đơn)
                      </span>
                      <span className="font-medium text-red-500">0</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-100 p-3 text-center">
                  <button
                    onClick={() => setShowCustomerExtra((current) => !current)}
                    className="mx-auto flex items-center gap-1 text-[13px] font-medium text-[#0088FF] hover:text-blue-700"
                  >
                    {showCustomerExtra ? 'Thu gọn' : 'Xem thêm'} <ChevronDown size={14} />
                  </button>
                </div>
              </div>

              <div className="ui-card ui-card-body-compact flex items-center justify-between">
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-[#182537]">
                    <Receipt size={18} className="text-slate-400" /> Hóa đơn điện tử
                  </h3>
                  <p className="text-[13px] leading-relaxed text-slate-500">
                    Phát hành và quản lý hóa đơn điện tử cho đơn hàng này ở luồng hóa đơn riêng.
                    <br />
                    Sau khi phát hành, bạn có thể in lại hóa đơn từ trang hóa đơn điện tử.
                  </p>
                </div>
                <button
                  onClick={() =>
                    navigate('/e-invoices', {
                      state: {
                        orderId: selectedOrder.id,
                        orderNo: selectedOrder.order_no,
                        message: `Đang mở hóa đơn điện tử cho đơn ${selectedOrder.order_no}.`,
                      },
                    })
                  }
                  className="shrink-0 rounded bg-[#0088FF] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Tạo hóa đơn điện tử
                </button>
              </div>

              <div className="ui-card ui-card-body-compact">
                <h3 className={`mb-4 flex items-center gap-2 text-[15px] font-semibold ${paymentMeta.titleClass}`}>
                  <CheckCircle size={18} /> {paymentMeta.label}
                </h3>
                <div className="mb-4 flex justify-between text-[13px] lg:w-3/4">
                  <div className="w-1/3 text-slate-600">
                    Khách phải trả:{' '}
                    <span className="font-semibold text-[#182537]">
                      {formatCurrency(Number(selectedOrder.total_amount || 0))}
                    </span>
                  </div>
                  <div className="w-1/3 text-slate-600">
                    Đã thanh toán:{' '}
                    <span className="font-semibold text-[#182537]">
                      {formatCurrency(Number(selectedOrder.paid_amount || 0))}
                    </span>
                  </div>
                  <div className="w-1/3 text-right text-slate-600">
                    Còn phải trả:{' '}
                    <span className="font-semibold text-[#182537]">
                      {formatCurrency(
                        Math.max(
                          0,
                          Number(selectedOrder.total_amount || 0) - Number(selectedOrder.paid_amount || 0),
                        ),
                      )}
                    </span>
                  </div>
                </div>

                {selectedOrder.sales_payments?.length ? (
                  selectedOrder.sales_payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded bg-slate-50 p-3 text-[13px]"
                    >
                      <div className="flex items-center gap-2 font-medium text-[#0088FF]">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#0088FF]"></div>
                        {payment.payment_method} {formatCurrency(Number(payment.amount || 0))}
                      </div>
                      <div className="text-slate-500">{formatDateTime(payment.paid_at)}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded bg-slate-50 p-3 text-[13px] text-slate-500">
                    Chưa có giao dịch thanh toán nào.
                  </div>
                )}
              </div>

              <div className="ui-card ui-card-body-compact">
                <h3 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-[#182537]">
                  <Package size={18} className="text-slate-400" /> Đóng gói và giao hàng
                </h3>
                <div className="mb-6 flex flex-wrap items-center gap-4 rounded border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center gap-2 font-medium text-[#0088FF]">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#0088FF]"></div>
                    {selectedOrder.order_no}
                    <Copy
                      size={12}
                      className="cursor-pointer text-slate-400"
                      onClick={handleCopyOrder}
                    />
                  </div>
                  <div className={`rounded px-2 py-0.5 text-[11px] font-medium ${statusMeta.badge}`}>
                    {statusMeta.label}
                  </div>
                  <div className="text-[13px] text-slate-500">{formatDateTime(selectedOrder.sold_at)}</div>
                  <Printer
                    className="ml-auto cursor-pointer text-slate-400 hover:text-slate-700"
                    size={16}
                    onClick={handlePrintOrder}
                  />
                </div>
                <div className="space-y-3 text-[13px]">
                  <div className="flex">
                    <div className="w-40 text-slate-600">Mã đóng gói</div>
                    <div className="flex items-center gap-1 text-[#0088FF]">
                      : {selectedOrder.order_no} <Info size={14} className="text-blue-500" />
                    </div>
                  </div>
                  <div className="flex">
                    <div className="w-40 text-slate-600">Hình thức giao hàng</div>
                    <div className="text-[#182537]">
                      :{' '}
                      {getDeliveryLabel(
                        selectedOrder.delivery_method ??
                          parseLegacyDeliveryTab(selectedOrder.note, selectedOrder.status) ??
                          'nhan_tai_cua_hang',
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 xl:col-span-1">
              <div className="ui-card ui-card-body-compact">
                <h3 className="mb-5 text-[15px] font-semibold text-[#182537]">Thông tin đơn hàng</h3>
                <div className="space-y-3 text-[13px]">
                  <div className="flex">
                    <div className="w-32 text-slate-600">Chính sách giá</div>
                    <div className="text-[#182537]">: Giá bán lẻ</div>
                  </div>
                  <div className="flex">
                    <div className="w-32 text-slate-600">Bán tại</div>
                    <div className="text-[#182537]">: {selectedOrder.branches?.name ?? '---'}</div>
                  </div>
                  <div className="flex">
                    <div className="w-32 text-slate-600">Bán bởi</div>
                    <div className="text-[#182537]">: ---</div>
                  </div>
                  <div className="flex">
                    <div className="w-32 text-slate-600">Hẹn giao hàng</div>
                    <div className="text-[#182537]">: {formatDateTime(selectedOrder.delivery_due_at)}</div>
                  </div>
                  <div className="flex">
                    <div className="w-32 text-slate-600">Nguồn</div>
                    <div className="text-[#182537]">: {selectedOrder.source.toUpperCase()}</div>
                  </div>
                  <div className="flex">
                    <div className="w-32 text-slate-600">Kênh bán hàng</div>
                    <div className="text-[#182537]">: {selectedOrder.source.toUpperCase()}</div>
                  </div>
                  <div className="flex">
                    <div className="w-32 text-slate-600">Ngày bán</div>
                    <div className="text-[#182537]">: {formatDateTime(selectedOrder.sold_at)}</div>
                  </div>
                  <div className="flex">
                    <div className="w-32 text-slate-600">Đường dẫn</div>
                    <div className="text-[#182537]">: ---</div>
                  </div>
                  <div className="flex">
                    <div className="w-32 text-slate-600">Tham chiếu</div>
                    <div className="text-[#182537]">: {selectedOrder.invoice_no ?? '---'}</div>
                  </div>
                </div>
                <div className="mt-5 border-t border-slate-100 pt-3 text-center">
                  <button
                    onClick={() => setInfoMessage(`Lần cập nhật gần nhất: ${formatDateTime(selectedOrder.created_at)}`)}
                    className="text-[13px] font-medium text-[#0088FF] hover:underline"
                  >
                    Xem lịch sử đơn hàng
                  </button>
                </div>
              </div>

              <div className="ui-card ui-card-body-compact">
                <h3 className="mb-2 text-[14px] font-semibold text-[#182537]">Ghi chú</h3>
                <p className="text-[13px] text-slate-500">{selectedOrder.note || 'Chưa có ghi chú'}</p>

                <h3 className="mt-6 mb-2 flex items-center gap-1 text-[14px] font-semibold text-[#182537]">
                  Tags <Info size={14} className="text-slate-400" />
                </h3>
                <p className="text-[13px] text-slate-500">Chưa có tag</p>
              </div>
            </div>
          </div>

          <div className="ui-card mt-6">
            <div className="flex items-end justify-between border-b border-slate-200 px-5 p-0">
              <h3 className="border-b-2 border-[#0088FF] pb-3 pt-4 text-[14px] font-semibold text-[#0088FF]">
                Thông tin sản phẩm
              </h3>
              <div className="flex items-center gap-4 pb-3 text-[13px]">
                <button
                  onClick={() => navigate('/inventory')}
                  className="font-medium text-[#0088FF] hover:underline"
                >
                  Kiểm tra tồn kho
                </button>
                <Settings className="cursor-pointer text-slate-400 hover:text-slate-600" size={16} />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] font-semibold text-slate-700">
                    <th className="w-12 px-4 py-3 text-center">STT</th>
                    <th className="w-16 px-2 py-3">Ảnh</th>
                    <th className="min-w-[200px] px-2 py-3">Tên sản phẩm</th>
                    <th className="w-24 px-2 py-3 text-center">Số lượng</th>
                    <th className="w-28 px-2 py-3 text-right">Đơn giá</th>
                    <th className="w-24 px-2 py-3 text-right">Chiết khấu</th>
                    <th className="w-32 px-5 py-3 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedOrderItems.map((product, index) => (
                    <tr key={product.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-4 text-center text-[13px] font-medium text-slate-500">
                        {index + 1}
                      </td>
                      <td className="px-2 py-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded border border-slate-200 bg-white text-slate-300">
                          <ImageIcon size={20} />
                        </div>
                      </td>
                      <td className="px-2 py-4">
                        <div className="inline-block cursor-pointer text-[13px] font-medium text-[#182537] hover:text-[#0088FF]">
                          {product.product_name}
                        </div>
                        {product.unit_name ? (
                          <div className="mt-0.5 text-[12px] text-slate-500">{product.unit_name}</div>
                        ) : null}
                        {product.sku ? (
                          <div className="cursor-pointer text-[12px] text-[#0088FF] hover:underline">
                            {product.sku}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-2 py-4 text-center text-[13px] text-[#182537]">
                        {formatCurrency(Number(product.quantity || 0))}
                      </td>
                      <td className="px-2 py-4 text-right text-[13px] text-[#182537]">
                        {formatCurrency(Number(product.unit_price || 0))}
                      </td>
                      <td className="px-2 py-4 text-right text-[13px] text-[#182537]">
                        {formatCurrency(Number(product.discount_amount || 0))}
                      </td>
                      <td className="px-5 py-4 text-right text-[13px] font-medium text-[#182537]">
                        {formatCurrency(Number(product.line_total || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end p-5">
              <div className="w-[320px] space-y-3 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-slate-600">
                    Tổng tiền ({selectedOrderItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} sản phẩm)
                  </span>
                  <span className="font-medium text-[#182537]">
                    {formatCurrency(Number(selectedOrder.subtotal || 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-slate-600">
                    Chiết khấu <Info size={14} className="text-[#0088FF]" />
                  </span>
                  <span className="font-medium text-[#182537]">
                    {formatCurrency(Number(selectedOrder.discount_amount || 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Phí giao hàng</span>
                  <span className="font-medium text-[#182537]">
                    {formatCurrency(Number(selectedOrder.shipping_fee || 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <button
                    onClick={() => setInfoMessage('Mã giảm giá đang được gộp vào chiết khấu đơn hàng hiện tại.')}
                    className="flex items-center gap-1 text-[#0088FF] hover:underline"
                  >
                    Mã giảm giá <ChevronDown size={14} />
                  </button>
                  <span className="font-medium text-[#182537]">0</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3 text-[14px] font-bold text-[#182537]">
                  <span>Khách phải trả</span>
                  <span>{formatCurrency(Number(selectedOrder.total_amount || 0))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isListLoading && !selectedOrderId) {
    return <PageLoader text="Đang tải danh sách đơn hàng..." fullScreen />;
  }

  return (
    <div className="flex flex-col gap-4">
      {infoMessage ? (
        <div className="fixed right-5 top-5 z-[70] flex max-w-[380px] items-start gap-3 border border-blue-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-xl shadow-slate-200/80">
          <CheckCircle size={18} className="mt-0.5 shrink-0 text-emerald-500" />
          <div className="font-medium">{infoMessage}</div>
          <button
            type="button"
            onClick={() => setInfoMessage(null)}
            aria-label="Đóng thông báo"
            className="ml-2 text-slate-400 transition-colors hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>
      ) : null}
      {showExportModal ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-4 pt-20">
          <div className="w-full max-w-[560px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <h2 className="text-[16px] font-semibold text-[#182537]">Xuất file danh sách đơn hàng</h2>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                aria-label="Đóng"
                className="flex h-7 w-7 items-center justify-center text-slate-400 transition-colors hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-4 text-[13px] text-[#182537]">
              <div>
                <div className="mb-2 font-medium">Giới hạn kết quả xuất</div>
                <label className="flex cursor-pointer items-center gap-2 py-1">
                  <input
                    type="radio"
                    checked={exportScope === 'all'}
                    onChange={() => setExportScope('all')}
                    className="h-3.5 w-3.5 accent-[#0088FF]"
                  />
                  <span>Tất cả đơn hàng</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 py-1">
                  <input
                    type="radio"
                    checked={exportScope === 'current'}
                    onChange={() => setExportScope('current')}
                    className="h-3.5 w-3.5 accent-[#0088FF]"
                  />
                  <span>Đơn hàng trên trang này</span>
                </label>
              </div>

              <div>
                <div className="mb-2 font-medium">Loại xuất file</div>
                <label className="flex cursor-pointer items-center gap-2 py-1">
                  <input
                    type="radio"
                    checked={orderExportType === 'orders'}
                    onChange={() => setOrderExportType('orders')}
                    className="h-3.5 w-3.5 accent-[#0088FF]"
                  />
                  <span>File tổng quan theo đơn hàng</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 py-1">
                  <input
                    type="radio"
                    checked={orderExportType === 'products'}
                    onChange={() => setOrderExportType('products')}
                    className="h-3.5 w-3.5 accent-[#0088FF]"
                  />
                  <span>File tổng quan theo sản phẩm</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 py-1">
                  <input
                    type="radio"
                    checked={orderExportType === 'details'}
                    onChange={() => setOrderExportType('details')}
                    className="h-3.5 w-3.5 accent-[#0088FF]"
                  />
                  <span>File chi tiết</span>
                </label>
              </div>

              <button
                type="button"
                onClick={() => setInfoMessage('Tùy chọn trường hiển thị sẽ dùng bộ cột tương ứng với loại xuất file đã chọn.')}
                className="text-[13px] font-medium text-[#0088FF] hover:underline"
              >
                Tùy chọn trường hiển thị
              </button>
            </div>

            <div className="flex justify-end gap-3 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="h-8 border border-[#0088FF] bg-white px-5 text-[13px] font-medium text-[#0088FF] transition-colors hover:bg-blue-50"
              >
                Thoát
              </button>
              <button
                type="button"
                onClick={handleExportOrders}
                className="h-8 bg-[#0088FF] px-5 text-[13px] font-medium text-white transition-colors hover:bg-blue-700"
              >
                Xuất file
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="list-toolbar">
        <div className="list-toolbar-actions">
          <input
            ref={importFileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleImportOrders}
          />
          <button
            onClick={() => setShowExportModal(true)}
            className="list-action-button"
          >
            <Download size={16} /> Xuất file
          </button>
          <button
            onClick={() => importFileInputRef.current?.click()}
            disabled={isImporting}
            className="list-action-button"
          >
            {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Nhập file
          </button>
        </div>
        <div className="flex items-center gap-3">
          {isProcessingHidden ? (
            <button
              onClick={() => setIsProcessingHidden(false)}
              className="text-sm font-medium text-[#0088FF] transition-colors hover:text-blue-800"
            >
              Hiện đơn hàng cần xử lý
            </button>
          ) : null}
          <button
            onClick={() => navigate('/pos')}
            className="list-primary-button"
          >
            <Plus size={16} /> Tạo đơn hàng
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {listError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
            {listError}
          </div>
        ) : null}

        {!isProcessingHidden ? (
          <div className="ui-card">
            <div className="p-5">
              <div className="mb-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-[15px] font-semibold uppercase tracking-tight text-[#182537]">
                  ĐƠN HÀNG CẦN XỬ LÝ{' '}
                  <div ref={processingWindowRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setShowProcessingWindowMenu((current) => !current)}
                      className="cursor-pointer text-[14px] font-normal normal-case text-[#0088FF]"
                    >
                      {processingWindowDays} ngày gần nhất <ChevronDown size={14} className="ml-1 inline" />
                    </button>
                    {showProcessingWindowMenu ? (
                      <div className="absolute left-0 top-full z-20 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-[13px] font-medium normal-case text-slate-700 shadow-lg shadow-slate-200/70">
                        {[7, 30, 90].map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => {
                              setProcessingWindowDays(days as 7 | 30 | 90);
                              setShowProcessingWindowMenu(false);
                            }}
                            className={`flex w-full items-center justify-between px-4 py-2 text-left transition-colors hover:bg-slate-50 ${
                              processingWindowDays === days ? 'bg-sky-50 text-[#0088FF]' : ''
                            }`}
                          >
                            <span>{days} ngày gần nhất</span>
                            {processingWindowDays === days ? <Check size={14} /> : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <span className="hidden">
                    90 ngày gần nhất <ChevronDown size={14} className="ml-1 inline" />
                  </span>
                </div>
                <button
                  onClick={() => setIsProcessingHidden(true)}
                  className="font-medium text-[#0088FF] hover:text-blue-800"
                >
                  Ẩn đơn hàng cần xử lý
                </button>
              </div>

              <div className="grid grid-cols-6 gap-0 border-l border-t border-b border-slate-200 bg-white">
                <div className="border-r border-slate-200 p-3">
                  <div className="mb-1 flex items-center gap-1 text-[13px] text-slate-500">
                    Chờ duyệt <span className="font-semibold text-[#0088FF]">{pendingOrders.count}</span>
                  </div>
                  <div className="font-semibold text-[#182537]">
                    {formatCurrency(pendingOrders.total_amount)}
                  </div>
                </div>
                <div className="border-r border-slate-200 p-3">
                  <div className="mb-1 flex items-center gap-1 text-[13px] text-slate-500">
                    Chờ thanh toán <span className="font-semibold text-[#0088FF]">{unpaidOrders.count}</span>
                  </div>
                  <div className="font-semibold text-[#182537]">
                    {formatCurrency(unpaidOrders.total_amount)}
                  </div>
                </div>
                <div className="border-r border-slate-200 p-3">
                  <div className="mb-1 flex items-center gap-1 text-[13px] text-slate-500">
                    Chờ đóng gói <span className="font-semibold text-[#0088FF]">{packingOrders.count}</span>
                  </div>
                  <div className="font-semibold text-[#182537]">
                    {formatCurrency(packingOrders.total_amount)}
                  </div>
                </div>
                <div className="border-r border-slate-200 p-3">
                  <div className="mb-1 flex items-center gap-1 text-[13px] text-slate-500">
                    Chờ lấy hàng <span className="font-semibold text-[#0088FF]">{waitingPickupOrders.count}</span>
                  </div>
                  <div className="font-semibold text-[#182537]">
                    {formatCurrency(waitingPickupOrders.total_amount)}
                  </div>
                </div>
                <div className="border-r border-slate-200 p-3">
                  <div className="mb-1 flex items-center gap-1 text-[13px] text-slate-500">
                    Đang giao hàng <span className="font-semibold text-[#0088FF]">{deliveringOrders.count}</span>
                  </div>
                  <div className="font-semibold text-[#182537]">
                    {formatCurrency(deliveringOrders.total_amount)}
                  </div>
                </div>
                <div className="group relative flex flex-col justify-between border-r border-slate-200 p-3">
                  <div className="mb-1 flex items-center gap-1 text-[13px] text-slate-500">
                    Chờ giao lại <span className="rounded-full bg-red-100 px-1 text-[10px] text-red-500">!</span>{' '}
                    <span className="font-semibold text-[#0088FF]">{cancelledDeliveryOrders.count}</span>
                  </div>
                  <div className="flex items-end justify-between font-semibold text-[#182537]">
                    <span>
                      {formatCurrency(cancelledDeliveryOrders.total_amount)}
                    </span>
                    <ChevronDown size={14} className="cursor-pointer text-slate-400 group-hover:text-[#0088FF]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="ui-card overflow-hidden">
          <div className="flex border-b border-slate-200 pr-5 pt-2">
            <button
              className={`border-b-2 px-4 py-3 text-[14px] font-medium transition-colors ${
                activeTab === 'all'
                  ? 'border-[#0088FF] text-[#0088FF]'
                  : 'border-transparent text-slate-600 hover:text-[#0088FF]'
              }`}
              onClick={() => setActiveTab('all')}
            >
              Tất cả đơn hàng
            </button>
            <button
              className={`border-b-2 px-4 py-3 text-[14px] font-medium transition-colors ${
                activeTab === 'trading'
                  ? 'border-[#0088FF] text-[#0088FF]'
                  : 'border-transparent text-slate-600 hover:text-[#0088FF]'
              }`}
              onClick={() => setActiveTab('trading')}
            >
              Đang giao dịch
            </button>
          </div>

          <div className="flex items-center gap-3 bg-white p-5">
            <div className="relative max-w-lg flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm kiếm theo mã đơn hàng, tên, SĐT khách hàng / người nhận hàng"
                className="w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-4 text-[13px] transition-colors focus:border-[#0088FF] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-0">
              <button
                onClick={() => setInfoMessage('Lọc ngày tạo sẽ được mở rộng ở bước sau, hiện tại hệ thống đang lấy toàn bộ danh sách đơn hàng.')}
                className="flex w-32 items-center justify-between rounded-l border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span>Ngày tạo</span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              <button
                onClick={() => setInfoMessage('Bạn có thể dùng tab và ô tìm kiếm để lọc nhanh trạng thái giao dịch hiện tại.')}
                className="-ml-px flex w-32 items-center justify-between border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span>Trạng thái</span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              <button
                onClick={() => setInfoMessage('Chức năng lọc theo nhân viên sẽ được nối khi backend có dữ liệu người bán.')}
                className="-ml-px flex w-[190px] items-center justify-between border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span>Nhân viên phụ trách</span>
                <ChevronDown size={14} className="shrink-0 text-slate-400" />
              </button>
              <button
                onClick={() => setInfoMessage('Bộ lọc khác sẽ được mở rộng khi có thêm trạng thái vận chuyển từ backend.')}
                className="-ml-px flex w-32 items-center justify-between rounded-r border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span>Bộ lọc khác</span>
                <Filter size={14} className="text-slate-400" />
              </button>
              <button
                onClick={handleSaveFilters}
                className="ml-2 rounded bg-slate-100 px-5 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-200"
              >
                Lưu bộ lọc
              </button>
            </div>
          </div>

          {pagedOrders.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <div className="flex flex-col items-center gap-3">
                <AlertCircle className="h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium">Chưa có đơn hàng phù hợp.</p>
              </div>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50/50 text-[13px] font-semibold text-slate-700">
                    <th className="w-12 border-r border-slate-100 px-4 py-3 text-center">
                      <Settings className="mx-auto cursor-pointer text-slate-400 hover:text-slate-600" size={16} />
                    </th>
                    <th className="w-10 px-2 py-3 text-center">
                      <input type="checkbox" className="rounded border-slate-300 text-[#0088FF]" />
                    </th>
                    <th className="px-4 py-3 font-semibold">Mã đơn hàng</th>
                    <th className="px-4 py-3 font-semibold">Ngày tạo đơn</th>
                    <th className="px-4 py-3 font-semibold">Tên khách hàng</th>
                    <th className="px-4 py-3 font-semibold">Trạng thái đơn hàng</th>
                    <th className="px-4 py-3 text-center font-semibold">Trạng thái thanh toán</th>
                    <th className="px-4 py-3 text-right font-semibold">Khách phải trả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13.5px] text-[#182537]">
                  {pagedOrders.map((order) => {
                    const rowStatus = getOrderStatusMeta(order.status);
                    const rowPayment = getPaymentStatusMeta(order.payment_status);

                    return (
                      <tr key={order.id} className="group transition-colors hover:bg-slate-50">
                        <td
                          className="cursor-pointer border-r border-slate-100 px-4 py-3.5 text-center text-slate-400"
                          onClick={() => setSelectedOrderId(order.id)}
                        >
                          <ChevronDown size={16} className="mx-auto rotate-[-90deg]" />
                        </td>
                        <td className="px-2 py-3.5 text-center">
                          <input type="checkbox" className="rounded border-slate-300 text-[#0088FF]" />
                        </td>
                        <td
                          className="cursor-pointer px-4 py-3.5 text-[#0088FF] hover:underline"
                          onClick={() => setSelectedOrderId(order.id)}
                        >
                          {order.order_no}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{formatDateTime(order.sold_at)}</td>
                        <td className="px-4 py-3.5">{order.customers?.full_name ?? 'Khách lẻ'}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex rounded-full border px-3 py-0.5 text-[12px] ${rowStatus.badge}`}>
                            {rowStatus.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className={`mx-auto h-2.5 w-2.5 rounded-full ${rowPayment.dotClass}`}></div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {formatCurrency(Number(order.total_amount || 0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex min-h-16 flex-wrap items-center justify-end gap-x-6 gap-y-3 border-t border-slate-200 bg-white px-5 py-4 text-[13px] text-[#182537]">
            <div className="flex items-center gap-2">
              <span className="text-slate-600">Hiển thị</span>
              <div className="relative">
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  className="h-8 min-w-[68px] appearance-none border border-slate-300 bg-white px-3 pr-8 text-[#182537] transition-colors focus:border-[#0088FF] focus:outline-none"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
              <span className="text-slate-600">kết quả</span>
            </div>
            <div className="text-slate-600">
              Từ {pageStart} đến {pageEnd} trên tổng {totalOrders}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage === 1}
                className="flex h-7 w-7 items-center justify-center text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#0088FF] disabled:cursor-not-allowed disabled:bg-transparent disabled:text-slate-300"
                aria-label="Trang trước"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center bg-[#0088FF] font-medium text-white"
                aria-label={`Trang ${safePage}`}
              >
                {safePage}
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage === totalPages}
                className="flex h-7 w-7 items-center justify-center text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#0088FF] disabled:cursor-not-allowed disabled:bg-transparent disabled:text-slate-300"
                aria-label="Trang sau"
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
