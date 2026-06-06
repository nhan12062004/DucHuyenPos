import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants.js';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async getStats(branchId?: string) {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    // Doanh thu hôm nay
    let todayQuery = this.supabase
      .from('sales_orders')
      .select('total_amount, paid_amount')
      .eq('status', 'completed')
      .gte('sold_at', startOfDay);
    if (branchId) todayQuery = todayQuery.eq('branch_id', branchId);
    const { data: todayOrders } = await todayQuery;

    // Doanh thu tháng này
    let monthQuery = this.supabase
      .from('sales_orders')
      .select('total_amount, paid_amount')
      .eq('status', 'completed')
      .gte('sold_at', startOfMonth);
    if (branchId) monthQuery = monthQuery.eq('branch_id', branchId);
    const { data: monthOrders } = await monthQuery;

    // Đơn hàng hôm nay (mọi trạng thái)
    let todayOrdersCountQuery = this.supabase
      .from('sales_orders')
      .select('id', { count: 'exact' })
      .gte('sold_at', startOfDay);
    if (branchId) todayOrdersCountQuery = todayOrdersCountQuery.eq('branch_id', branchId);
    const { count: todayOrderCount } = await todayOrdersCountQuery;

    // Tổng nợ khách hàng
    const { data: debtData } = await this.supabase
      .from('customer_debt_summary')
      .select('current_debt');

    // Hàng sắp hết (dưới reorder level)
    const { data: lowStockData } = await this.supabase
      .from('product_stock_summary')
      .select('product_id, name, total_on_hand_qty, reorder_level')
      .lt('total_on_hand_qty', this.supabase.rpc as any)
      .limit(10);

    // Lấy tồn kho thấp bằng cách khác
    const { data: allStocks } = await this.supabase
      .from('product_stock_summary')
      .select('*');

    const lowStock = (allStocks ?? []).filter(
      (p: any) => p.total_on_hand_qty <= p.reorder_level && p.reorder_level > 0,
    );

    // Đơn hàng gần nhất
    let recentOrdersQuery = this.supabase
      .from('sales_orders')
      .select(`*, customers(full_name)`)
      .order('sold_at', { ascending: false })
      .limit(10);
    if (branchId) recentOrdersQuery = recentOrdersQuery.eq('branch_id', branchId);
    const { data: recentOrders } = await recentOrdersQuery;

    const todayRevenue = (todayOrders ?? []).reduce((s: number, o: any) => s + Number(o.total_amount), 0);
    const monthRevenue = (monthOrders ?? []).reduce((s: number, o: any) => s + Number(o.total_amount), 0);
    const totalDebt = (debtData ?? []).reduce((s: number, d: any) => s + Number(d.current_debt), 0);

    return {
      today_revenue: todayRevenue,
      today_orders: todayOrderCount ?? 0,
      month_revenue: monthRevenue,
      total_customer_debt: totalDebt,
      low_stock_count: lowStock.length,
      low_stock_items: lowStock.slice(0, 5),
      recent_orders: recentOrders ?? [],
    };
  }

  async getRevenueChart(days = 30, branchId?: string) {
    const from = new Date();
    from.setDate(from.getDate() - days);

    let q = this.supabase
      .from('sales_orders')
      .select('sold_at, total_amount, paid_amount')
      .eq('status', 'completed')
      .gte('sold_at', from.toISOString())
      .order('sold_at');

    if (branchId) q = q.eq('branch_id', branchId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);

    // Group by date
    const grouped: Record<string, number> = {};
    (data ?? []).forEach((o: any) => {
      const date = o.sold_at.slice(0, 10);
      grouped[date] = (grouped[date] ?? 0) + Number(o.total_amount);
    });

    return Object.entries(grouped).map(([date, revenue]) => ({ date, revenue }));
  }
}
