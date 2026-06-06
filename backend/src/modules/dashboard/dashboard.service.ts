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

    let todayQuery = this.supabase
      .from('sales_orders')
      .select('total_amount, paid_amount')
      .eq('status', 'completed')
      .gte('sold_at', startOfDay);
    if (branchId) todayQuery = todayQuery.eq('branch_id', branchId);
    const { data: todayOrders, error: todayOrdersError } = await todayQuery;
    if (todayOrdersError) throw new Error(todayOrdersError.message);

    let monthQuery = this.supabase
      .from('sales_orders')
      .select('total_amount, paid_amount')
      .eq('status', 'completed')
      .gte('sold_at', startOfMonth);
    if (branchId) monthQuery = monthQuery.eq('branch_id', branchId);
    const { data: monthOrders, error: monthOrdersError } = await monthQuery;
    if (monthOrdersError) throw new Error(monthOrdersError.message);

    let todayOrdersCountQuery = this.supabase
      .from('sales_orders')
      .select('id', { count: 'exact' })
      .gte('sold_at', startOfDay);
    if (branchId) todayOrdersCountQuery = todayOrdersCountQuery.eq('branch_id', branchId);
    const { count: todayOrderCount, error: todayOrderCountError } = await todayOrdersCountQuery;
    if (todayOrderCountError) throw new Error(todayOrderCountError.message);

    const { data: debtData, error: debtDataError } = await this.supabase
      .from('customer_debt_summary')
      .select('current_debt');
    if (debtDataError) throw new Error(debtDataError.message);

    const { data: allStocks, error: allStocksError } = await this.supabase
      .from('product_stock_summary')
      .select('*');
    if (allStocksError) throw new Error(allStocksError.message);

    const lowStock = (allStocks ?? []).filter(
      (product: any) =>
        Number(product.total_on_hand_qty) <= Number(product.reorder_level) &&
        Number(product.reorder_level) > 0,
    );

    let recentOrdersQuery = this.supabase
      .from('sales_orders')
      .select('*, customers(full_name)')
      .order('sold_at', { ascending: false })
      .limit(10);
    if (branchId) recentOrdersQuery = recentOrdersQuery.eq('branch_id', branchId);
    const { data: recentOrders, error: recentOrdersError } = await recentOrdersQuery;
    if (recentOrdersError) throw new Error(recentOrdersError.message);

    const todayRevenue = (todayOrders ?? []).reduce(
      (sum: number, order: any) => sum + Number(order.total_amount),
      0,
    );
    const monthRevenue = (monthOrders ?? []).reduce(
      (sum: number, order: any) => sum + Number(order.total_amount),
      0,
    );
    const totalDebt = (debtData ?? []).reduce(
      (sum: number, debt: any) => sum + Number(debt.current_debt),
      0,
    );

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

    let query = this.supabase
      .from('sales_orders')
      .select('sold_at, total_amount, paid_amount')
      .eq('status', 'completed')
      .gte('sold_at', from.toISOString())
      .order('sold_at');

    if (branchId) query = query.eq('branch_id', branchId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const grouped: Record<string, number> = {};
    (data ?? []).forEach((order: any) => {
      const date = order.sold_at.slice(0, 10);
      grouped[date] = (grouped[date] ?? 0) + Number(order.total_amount);
    });

    return Object.entries(grouped).map(([date, revenue]) => ({ date, revenue }));
  }
}
