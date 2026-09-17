import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  DollarSign,
  ShoppingBag,
  FileText,
  CreditCard,
  Package,
  Truck,
  XSquare,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Loader2,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  dashboardService,
  type DashboardStats,
  type InventorySummary,
  type RecentActivity,
  type RevenueChartPoint,
} from '../services/dashboardService';
import { PageLoader } from '../components/PageLoader';
import { inventoryService, type Branch } from '../services/inventoryService';

const DEFAULT_BRANCH_FILTER = '__default__';

function fmt(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toLocaleString('vi-VN');
}

function fmtFull(value: number) {
  return `${value.toLocaleString('vi-VN')}đ`;
}

function fmtRank(index: number) {
  return String(index + 1).padStart(2, '0');
}

function getActivityAction(activity: RecentActivity) {
  if (activity.description.startsWith(activity.actor_name)) {
    return activity.description.slice(activity.actor_name.length).trim();
  }
  return activity.description;
}

function getActivityRoute(activity: RecentActivity) {
  const entityType = activity.entity_type.toLowerCase();

  if (entityType.includes('sales_order') || entityType === 'order') {
    return {
      path: '/orders',
      state: {
        selectedOrderId: activity.entity_id ?? undefined,
      },
    };
  }

  if (entityType.includes('product')) {
    return {
      path: '/products',
      state: {
        selectedProductId: activity.entity_id ?? undefined,
        detailTab: 'stock' as const,
      },
    };
  }

  if (entityType.includes('customer')) {
    return {
      path: '/customers',
      state: {
        selectedCustomerId: activity.entity_id ?? undefined,
        detailTab: 'history' as const,
      },
    };
  }

  if (entityType.includes('inventory')) {
    return {
      path: '/inventory',
      state: null,
    };
  }

  if (entityType.includes('purchase')) {
    return {
      path: '/purchase-orders',
      state: null,
    };
  }

  return null;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chart, setChart] = useState<RevenueChartPoint[]>([]);
  const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartDays, setChartDays] = useState(7);
  const [topProductsDays, setTopProductsDays] = useState(7);
  const [salesInsightTab, setSalesInsightTab] = useState<'revenue' | 'share'>('revenue');
  const [topProductsMetric, setTopProductsMetric] = useState<'orders' | 'quantity' | 'revenue'>('quantity');
  const [isTopProductsMenuOpen, setIsTopProductsMenuOpen] = useState(false);
  const [dashboardBranchId, setDashboardBranchId] = useState('');
  const navigate = useNavigate();
  const topProductsMenuRef = useRef<HTMLDivElement | null>(null);

  const selectClassName =
    'appearance-none bg-white border border-slate-200 text-slate-700 rounded-lg font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10';
  const defaultBranch = branches.find((branch) => branch.is_default) ?? branches[0] ?? null;
  const effectiveDashboardBranchId =
    dashboardBranchId === DEFAULT_BRANCH_FILTER ? defaultBranch?.id ?? '' : dashboardBranchId;

  useEffect(() => {
    inventoryService.getBranches().then(setBranches).catch(() => {
      // Keep dashboard usable even if the branch list cannot be loaded.
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (topProductsMenuRef.current && !topProductsMenuRef.current.contains(event.target as Node)) {
        setIsTopProductsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const [nextStats, nextChart, nextInventory] = await Promise.all([
          dashboardService.getStats(effectiveDashboardBranchId || undefined, topProductsDays),
          dashboardService.getRevenueChart(chartDays, effectiveDashboardBranchId || undefined),
          dashboardService.getInventorySummary(effectiveDashboardBranchId || undefined),
        ]);

        if (!active) {
          return;
        }

        setStats(nextStats);
        setChart(nextChart);
        setInventorySummary(nextInventory);
      } catch (nextError: any) {
        if (!active) {
          return;
        }
        setError(nextError?.message ?? 'Không tải được dữ liệu tổng quan.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [chartDays, effectiveDashboardBranchId, topProductsDays]);

  const chartData = chart.map((point) => ({
    name: point.date.slice(5).replace('-', '/'),
    total: point.revenue,
  }));
  const totalTopProductsQty = (stats?.top_products ?? []).reduce((sum, item) => sum + Number(item.sold_qty ?? 0), 0);
  const shareRows = (stats?.top_products ?? []).map((item) => ({
    ...item,
    sharePercent: totalTopProductsQty > 0 ? (Number(item.sold_qty ?? 0) / totalTopProductsQty) * 100 : 0,
  }));
  const topProductsRows = [...(stats?.top_products ?? [])].sort((a, b) => {
    if (topProductsMetric === 'orders') {
      return Number(b.order_count ?? 0) - Number(a.order_count ?? 0);
    }
    if (topProductsMetric === 'revenue') {
      return Number(b.revenue ?? 0) - Number(a.revenue ?? 0);
    }
    return Number(b.sold_qty ?? 0) - Number(a.sold_qty ?? 0);
  });

  function getTopProductsMetricLabel() {
    if (topProductsMetric === 'orders') {
      return 'đơn hàng';
    }
    if (topProductsMetric === 'revenue') {
      return 'doanh thu';
    }
    return 'đã bán';
  }

  function getTopProductsMetricValue(item: DashboardStats['top_products'][number]) {
    if (topProductsMetric === 'orders') {
      return fmt(item.order_count ?? 0);
    }
    if (topProductsMetric === 'revenue') {
      return fmtFull(Number(item.revenue ?? 0));
    }
    return fmt(item.sold_qty ?? 0);
  }

  const openOrders = (options: {
    activeTab?: 'all' | 'trading';
      filters?: {
        branchId?: string;
        status?: 'draft' | 'pending' | 'completed' | 'cancelled';
        paymentStatus?: 'unpaid' | 'partial' | 'paid' | 'refunded' | 'open';
      deliveryStatus?: 'pending_packing' | 'waiting_pick_up' | 'delivering' | 'cancelled' | 'cancelled_delivery';
      datePreset?: 'today' | 'this_month';
      onlyProcessing?: boolean;
    };
  }) => {
    navigate('/orders', {
      state: {
        activeTab: options.activeTab ?? 'all',
        filters: options.filters,
      },
    });
  };

  const openProducts = (options: {
    selectedProductId?: string;
    searchTerm?: string;
  }) => {
    navigate('/products', {
      state: {
        selectedProductId: options.selectedProductId,
        detailTab: 'stock',
        searchTerm: options.searchTerm,
      },
    });
  };

  const openInventory = (options: {
    lowStockOnly?: boolean;
  }) => {
    navigate('/inventory', {
      state: {
        branchId: effectiveDashboardBranchId || undefined,
        lowStockOnly: options.lowStockOnly,
      },
    });
  };

  const openDebts = () => {
    navigate('/debts');
  };

  if (loading) {
    return (
      <PageLoader text="Đang tải dữ liệu báo cáo..." fullScreen />
    );
  }

  if (error) {
    return (
      <div className="page-shell flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-red-500">
          <AlertCircle className="w-8 h-8" />
          <p className="text-sm font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-blue-600 underline"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6 text-sm">
      <div className="grid grid-cols-1 gap-6 text-sm xl:grid-cols-4">
        <div className="xl:col-span-3 space-y-6">
          <div className="ui-card">
            <div className="ui-card-header">
              <h2 className="font-bold text-slate-800 uppercase">Kết quả kinh doanh trong ngày</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              <ResultItem
                icon={<div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><DollarSign size={20} /></div>}
                label="Doanh thu"
                value={fmt(stats?.today_revenue ?? 0)}
                sub={fmtFull(stats?.today_revenue ?? 0)}
                onClick={() =>
                  openOrders({
                    filters: {
                      branchId: effectiveDashboardBranchId || undefined,
                      status: 'completed',
                      datePreset: 'today',
                    },
                  })
                }
              />
              <ResultItem
                icon={<div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><ShoppingBag size={20} /></div>}
                label="Đơn hàng mới"
                value={String(stats?.today_orders ?? 0)}
                onClick={() =>
                  openOrders({
                    filters: {
                      branchId: effectiveDashboardBranchId || undefined,
                      datePreset: 'today',
                    },
                  })
                }
              />
              <ResultItem
                icon={<div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600"><TrendingUp size={20} /></div>}
                label="Doanh thu tháng"
                value={fmt(stats?.month_revenue ?? 0)}
                sub={fmtFull(stats?.month_revenue ?? 0)}
                onClick={() =>
                  openOrders({
                    filters: {
                      branchId: effectiveDashboardBranchId || undefined,
                      status: 'completed',
                      datePreset: 'this_month',
                    },
                  })
                }
              />
              <ResultItem
                icon={<div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600"><Users size={20} /></div>}
                label="Tổng nợ KH"
                value={fmt(stats?.total_customer_debt ?? 0)}
                sub={fmtFull(stats?.total_customer_debt ?? 0)}
                onClick={() => openDebts()}
              />
            </div>
          </div>

          <div className="ui-card overflow-hidden">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pr-5 pt-2">
              <div className="flex">
                <button
                  type="button"
                  onClick={() => setSalesInsightTab('revenue')}
                  className={`border-b-2 px-4 py-3 text-[14px] font-medium transition-colors ${
                    salesInsightTab === 'revenue'
                      ? 'border-[#0088FF] text-[#0088FF]'
                      : 'border-transparent text-slate-600 hover:text-[#0088FF]'
                  }`}
                >
                  Doanh thu bán hàng
                </button>
                <button
                  type="button"
                  onClick={() => setSalesInsightTab('share')}
                  className={`border-b-2 px-4 py-3 text-[14px] font-medium transition-colors ${
                    salesInsightTab === 'share'
                      ? 'border-[#0088FF] text-[#0088FF]'
                      : 'border-transparent text-slate-600 hover:text-[#0088FF]'
                  }`}
                >
                  Tỷ trọng bán hàng
                </button>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <div className="relative">
                  <select
                    className={`${selectClassName} py-1.5 pl-3 pr-8 text-[12px]`}
                    value={dashboardBranchId}
                    onChange={(event) => setDashboardBranchId(event.target.value)}
                  >
                    <option value="">Tất cả chi nhánh</option>
                    <option value={DEFAULT_BRANCH_FILTER}>Chi nhánh mặc định</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                </div>
                <div className="relative">
                  <select
                    className={`${selectClassName} py-1.5 pl-4`}
                    value={salesInsightTab === 'revenue' ? chartDays : topProductsDays}
                    onChange={(event) =>
                      salesInsightTab === 'revenue'
                        ? setChartDays(Number(event.target.value))
                        : setTopProductsDays(Number(event.target.value))
                    }
                  >
                    <option value={7}>7 ngày qua</option>
                    <option value={30}>30 ngày qua</option>
                    <option value={90}>3 tháng qua</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                </div>
              </div>
            </div>

            {salesInsightTab === 'revenue' ? (
              <div className="h-[300px] min-w-0 p-6">
                {chartData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <p className="text-sm">Chưa có dữ liệu doanh thu</p>
                  </div>
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={1}
                    initialDimension={{ width: 1, height: 1 }}
                  >
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#94A3B8' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => fmt(value)}
                      />
                      <Tooltip
                        formatter={(value: number) => [fmtFull(value), 'Doanh thu']}
                        contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 13 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#2563EB"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            ) : (
              <div className="p-6">
                {shareRows.length === 0 ? (
                  <div className="flex h-[252px] flex-col items-center justify-center text-slate-400">
                    <p className="text-sm">Chưa có dữ liệu tỷ trọng bán hàng</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {shareRows.map((item, index) => (
                      <button
                        key={`share-${item.product_id}-${index}`}
                        type="button"
                        onClick={() =>
                          openProducts({
                            selectedProductId: item.product_id,
                            searchTerm: item.name,
                          })
                        }
                        className="block w-full rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-4 text-left transition-colors hover:bg-slate-50"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-slate-800">{item.name}</p>
                            <p className="truncate text-[11px] uppercase text-slate-400">{item.sku ?? 'N/A'}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[14px] font-bold text-slate-800">{item.sharePercent.toFixed(1)}%</p>
                            <p className="text-[11px] text-slate-400">{fmt(item.sold_qty)} đã bán</p>
                          </div>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-[#0088FF]"
                            style={{ width: `${Math.max(6, item.sharePercent)}%` }}
                          ></div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="ui-card">
            <div className="ui-card-header">
              <h2 className="font-bold text-slate-800 uppercase">Đơn hàng chờ xử lý</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-slate-100 text-center">
              <PendingItem
                icon={<FileText size={24} className="text-blue-500" />}
                label="Chờ duyệt"
                value={String(stats?.pending_summary?.pending_approval ?? 0)}
                onClick={() =>
                  openOrders({
                    activeTab: 'trading',
                    filters: {
                      branchId: effectiveDashboardBranchId || undefined,
                      status: 'draft',
                      onlyProcessing: true,
                    },
                  })
                }
              />
              <PendingItem
                icon={<CreditCard size={24} className="text-blue-500" />}
                label="Chờ thanh toán"
                value={String(stats?.pending_summary?.pending_payment ?? 0)}
                onClick={() =>
                  openOrders({
                    activeTab: 'trading',
                    filters: {
                      branchId: effectiveDashboardBranchId || undefined,
                      paymentStatus: 'open',
                      onlyProcessing: true,
                    },
                  })
                }
              />
              <PendingItem
                icon={<Package size={24} className="text-blue-500" />}
                label="Chờ đóng gói"
                value={String(stats?.pending_summary?.pending_packing ?? 0)}
                onClick={() =>
                  openOrders({
                    activeTab: 'trading',
                    filters: {
                      branchId: effectiveDashboardBranchId || undefined,
                      status: 'pending',
                      deliveryStatus: 'pending_packing',
                      onlyProcessing: true,
                    },
                  })
                }
              />
              <PendingItem
                icon={<Truck size={24} className="text-blue-500" />}
                label="Chờ lấy hàng"
                value={String(stats?.pending_summary?.waiting_pick_up ?? 0)}
                onClick={() =>
                  openOrders({
                    activeTab: 'trading',
                    filters: {
                      branchId: effectiveDashboardBranchId || undefined,
                      status: 'pending',
                      deliveryStatus: 'waiting_pick_up',
                      onlyProcessing: true,
                    },
                  })
                }
              />
              <PendingItem
                icon={<Truck size={24} className="text-blue-500" />}
                label="Đang giao hàng"
                value={String(stats?.pending_summary?.delivering ?? 0)}
                onClick={() =>
                  openOrders({
                    activeTab: 'trading',
                    filters: {
                      branchId: effectiveDashboardBranchId || undefined,
                      status: 'pending',
                      deliveryStatus: 'delivering',
                      onlyProcessing: true,
                    },
                  })
                }
              />
              <PendingItem
                icon={<XSquare size={24} className="text-red-500" />}
                label="Hủy giao"
                value={String(stats?.pending_summary?.cancelled_delivery ?? 0)}
                onClick={() =>
                  openOrders({
                    filters: {
                      branchId: effectiveDashboardBranchId || undefined,
                      deliveryStatus: 'cancelled_delivery',
                    },
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="ui-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-800">Top sản phẩm</h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select
                      className="appearance-none rounded-md border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-[12px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={topProductsDays}
                      onChange={(event) => setTopProductsDays(Number(event.target.value))}
                    >
                      <option value={7}>7 ngày qua</option>
                      <option value={30}>30 ngày qua</option>
                      <option value={90}>3 tháng qua</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  </div>
                  <div ref={topProductsMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsTopProductsMenuOpen((current) => !current)}
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-[12px] font-bold tracking-widest text-slate-400 hover:bg-slate-50"
                    >
                      ...
                    </button>
                    {isTopProductsMenuOpen ? (
                      <div className="absolute right-0 top-full z-20 mt-2 min-w-[160px] overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-[13px] text-slate-700 shadow-lg shadow-slate-200/70">
                        <button
                          type="button"
                          onClick={() => {
                            setTopProductsMetric('orders');
                            setIsTopProductsMenuOpen(false);
                          }}
                          className={`block w-full px-4 py-2 text-left hover:bg-slate-50 ${
                            topProductsMetric === 'orders' ? 'text-[#0088FF]' : ''
                          }`}
                        >
                          Theo đơn hàng
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTopProductsMetric('quantity');
                            setIsTopProductsMenuOpen(false);
                          }}
                          className={`block w-full px-4 py-2 text-left hover:bg-slate-50 ${
                            topProductsMetric === 'quantity' ? 'text-[#0088FF]' : ''
                          }`}
                        >
                          Theo số lượng
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTopProductsMetric('revenue');
                            setIsTopProductsMenuOpen(false);
                          }}
                          className={`block w-full px-4 py-2 text-left hover:bg-slate-50 ${
                            topProductsMetric === 'revenue' ? 'text-[#0088FF]' : ''
                          }`}
                        >
                          Theo doanh thu
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              {!stats?.top_products?.length ? (
                <div className="px-4 py-10 text-center text-sm text-slate-400">Chưa có dữ liệu bán hàng</div>
              ) : (
                <div className="min-h-[178px] divide-y divide-slate-100">
                  {topProductsRows.map((item, index) => (
                    <button
                      key={`${item.product_id}-${index}`}
                      type="button"
                      onClick={() =>
                        openProducts({
                          selectedProductId: item.product_id,
                          searchTerm: item.name,
                        })
                      }
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">
                          {fmtRank(index)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-slate-800">{item.name}</p>
                          <p className="truncate text-[11px] uppercase text-slate-400">{item.sku ?? 'N/A'}</p>
                        </div>
                      </div>
                      <div className="ml-3 shrink-0 text-right">
                        <span className="block text-[13px] font-bold text-slate-700">{getTopProductsMetricValue(item)}</span>
                        <span className="block text-[11px] text-slate-400">{getTopProductsMetricLabel()}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="ui-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-800">Thông tin kho</h2>
                <div className="relative">
                  <select
                    className={`${selectClassName} py-1.5 pl-3 pr-8 text-[12px]`}
                    value={dashboardBranchId}
                    onChange={(event) => setDashboardBranchId(event.target.value)}
                  >
                    <option value="">Tất cả chi nhánh</option>
                    <option value={DEFAULT_BRANCH_FILTER}>Chi nhánh mặc định</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                </div>
              </div>
              <div className="space-y-3 bg-white px-3 py-4">
                <InventorySummaryRow
                  label="Sản phẩm dưới định mức"
                  value={fmt(inventorySummary?.low_stock_count ?? 0)}
                  accent="text-red-500"
                  showAlert
                  onClick={() =>
                    openInventory({
                      lowStockOnly: true,
                    })
                  }
                />
                <InventorySummaryRow
                  label="Số tồn kho chi nhánh"
                  value={fmt(inventorySummary?.total_stock_qty ?? 0)}
                  onClick={() =>
                    openInventory({})
                  }
                />
                <InventorySummaryRow
                  label="Giá trị tồn kho chi nhánh"
                  value={fmtFull(inventorySummary?.total_stock_value ?? 0)}
                  onClick={() =>
                    openInventory({})
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-1 space-y-6">
          <div className="ui-card flex flex-col">
            <div className="ui-card-header">
              <h2 className="font-bold text-slate-800 uppercase">Hoạt động gần đây</h2>
            </div>
            <div className="p-6 flex-1 relative">
              {!stats?.recent_activities?.length ? (
                <p className="text-sm text-slate-400 text-center py-4">Chưa có hoạt động nào</p>
              ) : (
                <>
                  <div className="absolute left-[31px] top-8 bottom-6 w-px bg-slate-200 border-l border-dashed border-slate-300" />
                  <div className="space-y-5 relative ml-1">
                    {stats.recent_activities.slice(0, 10).map((activity) => {
                      const nextRoute = getActivityRoute(activity);
                      return (
                        <div key={activity.id}>
                          <ActivityItem
                            user={activity.actor_name}
                            action={getActivityAction(activity)}
                            time={new Date(activity.created_at).toLocaleString('vi-VN')}
                            clickable={Boolean(nextRoute)}
                            onClick={() => {
                              if (!nextRoute) {
                                return;
                              }
                              navigate(nextRoute.path, { state: nextRoute.state });
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultItem({
  icon,
  label,
  value,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-4 py-4 px-6 md:px-4 lg:px-6 hover:bg-slate-50/50 transition-colors cursor-pointer text-left"
    >
      {icon}
      <div>
        <p className="text-[13px] font-semibold text-slate-600 mb-0.5 whitespace-nowrap">{label}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
        {sub ? <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p> : null}
      </div>
    </button>
  );
}

function PendingItem({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="py-6 px-2 flex flex-col items-center gap-3 hover:bg-slate-50/50 transition-colors cursor-pointer group"
    >
      <div className="opacity-80 group-hover:opacity-100 transition-opacity">{icon}</div>
      <div>
        <p className="text-[13px] font-semibold text-slate-600 mb-1 leading-snug h-8 flex items-center justify-center text-center">{label}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
      </div>
    </button>
  );
}

function InventorySummaryRow({
  label,
  value,
  accent = 'text-slate-800',
  showAlert = false,
  onClick,
}: {
  label: string;
  value: string;
  accent?: string;
  showAlert?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-md bg-cyan-50/60 px-4 py-4 transition-colors hover:bg-cyan-50 text-left"
    >
      <div>
        <div className="mb-1 flex items-center gap-1.5 text-[12px] text-slate-500">
          <span>{label}</span>
          {showAlert ? (
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-red-500 text-[10px] font-bold text-red-500">
              !
            </span>
          ) : null}
        </div>
        <p className={`text-[22px] font-bold leading-none ${accent}`}>{value}</p>
      </div>
      <ChevronRight size={18} className="text-slate-400" />
    </button>
  );
}

function ActivityItem({
  user,
  action,
  time,
  clickable,
  onClick,
}: {
  user: string;
  action: string;
  time: string;
  clickable: boolean;
  onClick: () => void;
}) {
  const content = (
    <>
      <div className="w-[9px] h-[9px] rounded-full bg-blue-500 shadow-sm mt-1.5 shrink-0 relative z-10" />
      <div>
        <p className="text-[13px] text-slate-700 leading-relaxed">
          <span className="font-semibold">{user}</span> {action}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">{time}</p>
      </div>
    </>
  );

  if (!clickable) {
    return <div className="flex gap-4 relative">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full gap-4 relative text-left transition-colors hover:text-blue-600"
    >
      {content}
    </button>
  );
}
