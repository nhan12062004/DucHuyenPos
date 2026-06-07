import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  DollarSign, ShoppingBag,
  FileText, CreditCard, Package, Truck, XSquare,
  ChevronDown, ChevronRight, AlertCircle, Loader2,
  TrendingUp, Users, AlertTriangle,
} from 'lucide-react';
import { dashboardService } from '../services/dashboardService';
import type { DashboardStats, RecentActivity, RevenueChartPoint } from '../services/dashboardService';

function fmt(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}tỷ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}tr`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString('vi-VN');
}

function fmtFull(n: number) {
  return `${n.toLocaleString('vi-VN')}đ`;
}

function getActivityAction(activity: RecentActivity) {
  if (activity.description.startsWith(activity.actor_name)) {
    return activity.description.slice(activity.actor_name.length).trim();
  }
  return activity.description;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chart, setChart] = useState<RevenueChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'DOANH_THU' | 'TY_TRONG'>('DOANH_THU');
  const [chartDays, setChartDays] = useState(7);

  const selectClassName =
    'appearance-none bg-white border border-slate-200 text-slate-700 rounded-lg font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10';

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dashboardService.getStats(),
      dashboardService.getRevenueChart(chartDays),
    ])
      .then(([s, c]) => {
        setStats(s);
        setChart(c);
      })
      .catch((e) => setError(e?.message ?? 'Lỗi tải dữ liệu'))
      .finally(() => setLoading(false));
  }, [chartDays]);

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

  const chartData = chart.map((p) => ({
    name: p.date.slice(5).replace('-', '/'),
    total: p.revenue,
  }));

  return (
    <div className="page-shell grid grid-cols-1 gap-6 text-sm xl:grid-cols-4">
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
            />
            <ResultItem
              icon={<div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><ShoppingBag size={20} /></div>}
              label="Đơn hàng mới"
              value={String(stats?.today_orders ?? 0)}
            />
            <ResultItem
              icon={<div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600"><TrendingUp size={20} /></div>}
              label="Doanh thu tháng"
              value={fmt(stats?.month_revenue ?? 0)}
              sub={fmtFull(stats?.month_revenue ?? 0)}
            />
            <ResultItem
              icon={<div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600"><Users size={20} /></div>}
              label="Tổng nợ KH"
              value={fmt(stats?.total_customer_debt ?? 0)}
              sub={fmtFull(stats?.total_customer_debt ?? 0)}
            />
          </div>
        </div>

        <div className="ui-card relative pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('DOANH_THU')}
                className={`pb-3 font-semibold text-[13px] uppercase tracking-wide border-b-2 transition-colors whitespace-nowrap ${activeTab === 'DOANH_THU' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Doanh thu bán hàng
              </button>
            </div>
            <div className="flex gap-2 pb-2">
              <div className="relative">
                <select
                  className={`${selectClassName} py-1.5 pl-4`}
                  value={chartDays}
                  onChange={(e) => setChartDays(Number(e.target.value))}
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
                    tickFormatter={(v) => fmt(v)}
                  />
                  <Tooltip
                    formatter={(v: number) => [fmtFull(v), 'Doanh thu']}
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
            <PendingItem icon={<FileText size={24} className="text-blue-500" />} label="Chờ duyệt" value="0" />
            <PendingItem icon={<CreditCard size={24} className="text-blue-500" />} label="Chờ thanh toán" value="0" />
            <PendingItem icon={<Package size={24} className="text-blue-500" />} label="Chờ đóng gói" value="0" />
            <PendingItem icon={<Truck size={24} className="text-blue-500" />} label="Chờ lấy hàng" value="0" />
            <PendingItem icon={<Truck size={24} className="text-blue-500" />} label="Đang giao hàng" value="0" />
            <PendingItem icon={<XSquare size={24} className="text-red-500" />} label="Hủy giao - chờ nhận" value="0" />
          </div>
        </div>
      </div>

      <div className="xl:col-span-1 space-y-6">
        <div className="ui-card">
          <div className="ui-card-header">
            <h2 className="font-bold text-slate-800 uppercase flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              Hàng sắp hết
            </h2>
            <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              {stats?.low_stock_count ?? 0}
            </span>
          </div>
          {!stats?.low_stock_items?.length ? (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">Không có sản phẩm nào sắp hết</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.low_stock_items.map((item) => (
                <div key={item.product_id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{item.name}</p>
                    <p className="text-[11px] text-slate-400">Định mức: {item.reorder_level}</p>
                  </div>
                  <span className="ml-3 text-sm font-bold text-red-600 shrink-0">{item.total_on_hand_qty}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ui-card">
          <div className="ui-card-header">
            <h2 className="font-bold text-slate-800 uppercase">Thông tin kho</h2>
          </div>
          <div className="flex flex-col divide-y divide-slate-100">
            <div className="px-6 py-4 flex justify-between items-center hover:bg-slate-50 cursor-pointer transition-colors">
              <div>
                <div className="flex items-center gap-1.5 mb-1 text-[13px] text-slate-600 font-medium">
                  Sản phẩm dưới định mức
                  <span className="flex items-center justify-center w-[14px] h-[14px] rounded-full border border-red-500 text-red-500 text-[10px] font-bold">!</span>
                </div>
                <p className="text-[17px] font-bold text-slate-800">{stats?.low_stock_count ?? 0}</p>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </div>
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
                  {stats.recent_activities.map((activity) => (
                    <div key={activity.id}>
                      <ActivityItem
                        user={activity.actor_name}
                        action={getActivityAction(activity)}
                        time={new Date(activity.created_at).toLocaleString('vi-VN')}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultItem({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-4 py-4 px-6 md:px-4 lg:px-6 hover:bg-slate-50/50 transition-colors cursor-pointer">
      {icon}
      <div>
        <p className="text-[13px] font-semibold text-slate-600 mb-0.5 whitespace-nowrap">{label}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function PendingItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="py-6 px-2 flex flex-col items-center gap-3 hover:bg-slate-50/50 transition-colors cursor-pointer group">
      <div className="opacity-80 group-hover:opacity-100 transition-opacity">{icon}</div>
      <div>
        <p className="text-[13px] font-semibold text-slate-600 mb-1 leading-snug h-8 flex items-center justify-center text-center">{label}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function ActivityItem({ user, action, time }: { user: string; action: string; time: string }) {
  return (
    <div className="flex gap-4 relative">
      <div className="w-[9px] h-[9px] rounded-full bg-blue-500 shadow-sm mt-1.5 shrink-0 relative z-10" />
      <div>
        <p className="text-[13px] text-slate-700 leading-relaxed">
          <span className="font-semibold">{user}</span> {action}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">{time}</p>
      </div>
    </div>
  );
}
