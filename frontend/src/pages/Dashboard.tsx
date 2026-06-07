import React, { useEffect, useState } from 'react';
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
  ArrowUpRight,
} from 'lucide-react';
import {
  dashboardService,
  type DashboardStats,
  type InventorySummary,
  type RecentActivity,
  type RevenueChartPoint,
} from '../services/dashboardService';
import { inventoryService, type Branch } from '../services/inventoryService';

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
        message: 'Đang mở giao dịch liên quan từ hoạt động gần đây.',
      },
    };
  }

  if (entityType.includes('product')) {
    return {
      path: '/products',
      state: {
        selectedProductId: activity.entity_id ?? undefined,
        detailTab: 'stock' as const,
        message: 'Đang mở sản phẩm liên quan từ hoạt động gần đây.',
      },
    };
  }

  if (entityType.includes('customer')) {
    return {
      path: '/customers',
      state: {
        selectedCustomerId: activity.entity_id ?? undefined,
        detailTab: 'history' as const,
        message: 'Đang mở khách hàng liên quan từ hoạt động gần đây.',
      },
    };
  }

  if (entityType.includes('inventory')) {
    return {
      path: '/inventory',
      state: {
        message: 'Đang mở kho hàng liên quan từ hoạt động gần đây.',
      },
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
  const [dashboardBranchId, setDashboardBranchId] = useState('');
  const navigate = useNavigate();

  const selectClassName =
    'appearance-none bg-white border border-slate-200 text-slate-700 rounded-lg font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10';

  useEffect(() => {
    inventoryService.getBranches().then(setBranches).catch(() => {
      // Keep dashboard usable even if the branch list cannot be loaded.
    });
  }, []);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const [nextStats, nextChart, nextInventory] = await Promise.all([
          dashboardService.getStats(dashboardBranchId || undefined, topProductsDays),
          dashboardService.getRevenueChart(chartDays, dashboardBranchId || undefined),
          dashboardService.getInventorySummary(dashboardBranchId || undefined),
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
  }, [chartDays, dashboardBranchId, topProductsDays]);

  const chartData = chart.map((point) => ({
    name: point.date.slice(5).replace('-', '/'),
    total: point.revenue,
  }));
  const selectedBranch = branches.find((branch) => branch.id === dashboardBranchId);
  const branchLabel = selectedBranch?.name ?? 'tất cả chi nhánh';

  const openOrders = (options: {
    message: string;
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
        message: options.message,
      },
    });
  };

  const openProducts = (options: {
    message: string;
    selectedProductId?: string;
    searchTerm?: string;
  }) => {
    navigate('/products', {
      state: {
        selectedProductId: options.selectedProductId,
        detailTab: 'stock',
        searchTerm: options.searchTerm,
        message: options.message,
      },
    });
  };

  const openInventory = (options: {
    message: string;
    lowStockOnly?: boolean;
  }) => {
    navigate('/inventory', {
      state: {
        branchId: dashboardBranchId || undefined,
        lowStockOnly: options.lowStockOnly,
        message: options.message,
      },
    });
  };

  const openDebts = (message: string) => {
    navigate('/debts', { state: { message } });
  };

  if (loading) {
    return (
      <div className="page-shell flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium">Đang tải dữ liệu...</p>
        </div>
      </div>
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
      <div className="ui-card">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-lg font-bold uppercase tracking-wide text-slate-800">Tổng quan kinh doanh</h1>
            <p className="mt-1 text-sm text-slate-500">Dữ liệu đang hiển thị theo {branchLabel}.</p>
          </div>
          <div className="relative">
            <select
              className={`${selectClassName} py-2 pl-4`}
              value={dashboardBranchId}
              onChange={(event) => setDashboardBranchId(event.target.value)}
            >
              <option value="">Tất cả chi nhánh</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>
        </div>
      </div>

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
                    message: `Đang xem doanh thu đơn hoàn thành hôm nay của ${branchLabel}.`,
                    filters: {
                      branchId: dashboardBranchId || undefined,
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
                    message: `Đang xem đơn hàng mới hôm nay của ${branchLabel}.`,
                    filters: {
                      branchId: dashboardBranchId || undefined,
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
                    message: `Đang xem doanh thu tháng hiện tại của ${branchLabel}.`,
                    filters: {
                      branchId: dashboardBranchId || undefined,
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
                onClick={() => openDebts(`Đang xem công nợ khách hàng của ${branchLabel}.`)}
              />
            </div>
          </div>

          <div className="ui-card relative pt-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6">
              <div>
                <h2 className="pb-3 font-semibold text-[13px] uppercase tracking-wide text-slate-800">Doanh thu bán hàng</h2>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <button
                  type="button"
                  onClick={() =>
                    openOrders({
                      message: `Đang xem các đơn hoàn thành trong ${chartDays} ngày của ${branchLabel}.`,
                      filters: {
                        branchId: dashboardBranchId || undefined,
                        status: 'completed',
                      },
                    })
                  }
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Xem đơn hàng
                </button>
                <div className="relative">
                  <select
                    className={`${selectClassName} py-1.5 pl-4`}
                    value={chartDays}
                    onChange={(event) => setChartDays(Number(event.target.value))}
                  >
                    <option value={7}>7 ngày qua</option>
                    <option value={30}>30 ngày qua</option>
                    <option value={90}>3 tháng qua</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                </div>
              </div>
            </div>

            <div className="p-6 h-[300px]">
              {chartData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <p className="text-sm">Chưa có dữ liệu doanh thu</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
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
                    message: `Đang xem đơn chờ duyệt của ${branchLabel}.`,
                    activeTab: 'trading',
                    filters: {
                      branchId: dashboardBranchId || undefined,
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
                    message: `Đang xem đơn chờ thanh toán của ${branchLabel}.`,
                    activeTab: 'trading',
                    filters: {
                      branchId: dashboardBranchId || undefined,
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
                    message: `Đang xem đơn chờ đóng gói của ${branchLabel}.`,
                    activeTab: 'trading',
                    filters: {
                      branchId: dashboardBranchId || undefined,
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
                    message: `Đang xem đơn chờ lấy hàng của ${branchLabel}.`,
                    activeTab: 'trading',
                    filters: {
                      branchId: dashboardBranchId || undefined,
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
                    message: `Đang xem đơn đang giao của ${branchLabel}.`,
                    activeTab: 'trading',
                    filters: {
                      branchId: dashboardBranchId || undefined,
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
                    message: `Đang xem đơn giao thất bại của ${branchLabel}.`,
                    filters: {
                      branchId: dashboardBranchId || undefined,
                      deliveryStatus: 'cancelled_delivery',
                    },
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="xl:col-span-1 space-y-6">
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
                <button
                  type="button"
                  onClick={() =>
                    openProducts({
                      message: `Đang mở danh sách sản phẩm bán chạy của ${branchLabel}.`,
                    })
                  }
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-[12px] font-bold tracking-widest text-slate-400 hover:bg-slate-50"
                >
                  ...
                </button>
              </div>
            </div>
            {!stats?.top_products?.length ? (
              <div className="px-4 py-10 text-center text-sm text-slate-400">Chưa có dữ liệu bán hàng</div>
            ) : (
              <div className="min-h-[178px] divide-y divide-slate-100">
                {stats.top_products.map((item, index) => (
                  <button
                    key={`${item.product_id}-${index}`}
                    type="button"
                    onClick={() =>
                      openProducts({
                        selectedProductId: item.product_id,
                        searchTerm: item.name,
                        message: `Đang mở sản phẩm bán chạy ${item.name}.`,
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
                    <span className="ml-3 shrink-0 text-[13px] font-bold text-slate-700">{fmt(item.sold_qty)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ui-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-800">Thông tin kho</h2>
              <button
                type="button"
                onClick={() =>
                  openInventory({
                    message: `Đang mở kho hàng của ${branchLabel}.`,
                  })
                }
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600 hover:underline"
              >
                Chi tiết <ArrowUpRight size={14} />
              </button>
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
                    message: `Đang xem sản phẩm cần nhập của ${branchLabel}.`,
                  })
                }
              />
              <InventorySummaryRow
                label="Số tồn kho chi nhánh"
                value={fmt(inventorySummary?.total_stock_qty ?? 0)}
                onClick={() =>
                  openInventory({
                    message: `Đang xem số tồn kho của ${branchLabel}.`,
                  })
                }
              />
              <InventorySummaryRow
                label="Giá trị tồn kho chi nhánh"
                value={fmtFull(inventorySummary?.total_stock_value ?? 0)}
                onClick={() =>
                  openInventory({
                    message: `Đang xem giá trị tồn kho của ${branchLabel}.`,
                  })
                }
              />
            </div>
          </div>

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
                    {stats.recent_activities.map((activity) => {
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
