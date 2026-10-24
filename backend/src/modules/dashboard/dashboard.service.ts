import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants.js';
import { ActivityLogsService } from '../../common/activity-logs.service.js';
import { resolveDeliveryFields } from '../sales-orders/delivery-fields.js';

type TopProductStats = {
  product_id: string;
  name: string;
  sku: string | null;
  order_count: number;
  sold_qty: number;
  revenue: number;
};

@Injectable()
export class DashboardService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async getStats(branchId?: string, topProductsDays = 7, summaryOnly = false) {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    let todayQuery = this.supabase
      .from('sales_orders')
      .select('total_amount')
      .eq('status', 'completed')
      .gte('sold_at', startOfDay);
    if (branchId) todayQuery = todayQuery.eq('branch_id', branchId);
    let monthQuery = this.supabase
      .from('sales_orders')
      .select('total_amount')
      .eq('status', 'completed')
      .gte('sold_at', startOfMonth);
    if (branchId) monthQuery = monthQuery.eq('branch_id', branchId);
    let todayOrdersCountQuery = this.supabase
      .from('sales_orders')
      .select('id', { count: 'exact', head: true })
      .gte('sold_at', startOfDay);
    if (branchId) todayOrdersCountQuery = todayOrdersCountQuery.eq('branch_id', branchId);
    const debtQuery = this.supabase
      .from('customer_debt_summary')
      .select('current_debt');

    let pendingOrdersQuery = this.supabase
      .from('sales_orders')
      .select('status, payment_status, note, delivery_method, delivery_status');
    if (branchId) pendingOrdersQuery = pendingOrdersQuery.eq('branch_id', branchId);
    const [todayResult, monthResult, countResult, debtResult, pendingResult, recentActivities, topProducts] =
      await Promise.all([
        todayQuery,
        monthQuery,
        todayOrdersCountQuery,
        debtQuery,
        pendingOrdersQuery,
        this.activityLogsService.getRecentActivities(10),
        summaryOnly ? Promise.resolve(null) : this.getTopProducts(topProductsDays, branchId),
      ]);

    for (const result of [todayResult, monthResult, countResult, debtResult, pendingResult]) {
      if (result.error) throw new Error(result.error.message);
    }

    const todayOrders = todayResult.data;
    const monthOrders = monthResult.data;
    const todayOrderCount = countResult.count;
    const debtData = debtResult.data;
    const pendingOrders = pendingResult.data;

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

    const pendingSummary = (pendingOrders ?? []).reduce(
      (summary: {
        pending_approval: number;
        pending_payment: number;
        pending_packing: number;
        waiting_pick_up: number;
        delivering: number;
        cancelled_delivery: number;
      }, order: any) => {
        if (order.status === 'draft') {
          summary.pending_approval += 1;
        }

        if (order.status !== 'cancelled' && ['unpaid', 'partial'].includes(order.payment_status)) {
          summary.pending_payment += 1;
        }

        const deliveryFields = resolveDeliveryFields(order);

        if (order.status === 'pending') {
          if (deliveryFields.delivery_status === 'waiting_pick_up') {
            summary.waiting_pick_up += 1;
          } else if (deliveryFields.delivery_status === 'delivering') {
            summary.delivering += 1;
          } else {
            summary.pending_packing += 1;
          }
        }

        if (order.status === 'cancelled' || deliveryFields.delivery_status === 'cancelled') {
          summary.cancelled_delivery += 1;
        }

        return summary;
      },
      {
        pending_approval: 0,
        pending_payment: 0,
        pending_packing: 0,
        waiting_pick_up: 0,
        delivering: 0,
        cancelled_delivery: 0,
      },
    );

    return {
      today_revenue: todayRevenue,
      today_orders: todayOrderCount ?? 0,
      month_revenue: monthRevenue,
      total_customer_debt: totalDebt,
      pending_summary: pendingSummary,
      ...(topProducts === null ? {} : { top_products: topProducts }),
      recent_activities: recentActivities,
    };
  }

  async getTopProducts(days = 7, branchId?: string): Promise<TopProductStats[]> {
    const from = new Date();
    from.setDate(from.getDate() - days);
    const fromIso = from.toISOString();
    const orderPageSize = 500;
    const itemBatchSize = 100;
    const groupedProducts = new Map<string, TopProductStats & { order_ids: Set<string> }>();

    for (let from = 0; ; from += orderPageSize) {
      let topProductsOrdersQuery = this.supabase
        .from('sales_orders')
        .select('id')
        .eq('status', 'completed')
        .gte('sold_at', fromIso)
        .range(from, from + orderPageSize - 1);

      if (branchId) topProductsOrdersQuery = topProductsOrdersQuery.eq('branch_id', branchId);

      const { data: topProductsOrders, error: topProductsOrdersError } = await topProductsOrdersQuery;
      if (topProductsOrdersError) throw new Error(topProductsOrdersError.message);

      const topProductsOrderIds = (topProductsOrders ?? []).map((order: any) => order.id).filter(Boolean);
      if (topProductsOrderIds.length === 0) break;

      const itemBatches: string[][] = [];
      for (let i = 0; i < topProductsOrderIds.length; i += itemBatchSize) {
        itemBatches.push(topProductsOrderIds.slice(i, i + itemBatchSize));
      }

      const itemResults = await Promise.all(itemBatches.map((orderIdBatch) =>
        this.supabase
          .from('sales_order_items')
          .select('sales_order_id, product_id, product_name, sku, quantity, line_total')
          .in('sales_order_id', orderIdBatch),
      ));

      for (const { data: orderItems, error: orderItemsError } of itemResults) {
        if (orderItemsError) throw new Error(orderItemsError.message);

        (orderItems ?? []).forEach((item: any) => {
          const key = item.product_id ?? `${item.product_name}-${item.sku ?? ''}`;
          const current = groupedProducts.get(key) ?? {
            product_id: item.product_id ?? key,
            name: item.product_name,
            sku: item.sku ?? null,
            order_count: 0,
            sold_qty: 0,
            revenue: 0,
            order_ids: new Set<string>(),
          };

          current.sold_qty += Number(item.quantity ?? 0);
          current.revenue += Number(item.line_total ?? 0);
          if (item.sales_order_id) {
            current.order_ids.add(String(item.sales_order_id));
            current.order_count = current.order_ids.size;
          }
          groupedProducts.set(key, current);
        });
      }

      if (topProductsOrderIds.length < orderPageSize) break;
    }

    return Array.from(groupedProducts.values())
      .map((item) => ({
        product_id: item.product_id,
        name: item.name,
        sku: item.sku,
        order_count: item.order_count,
        sold_qty: item.sold_qty,
        revenue: item.revenue,
      }))
      .sort((a, b) => b.sold_qty - a.sold_qty)
      .slice(0, 5);
  }

  async getInventorySummary(branchId?: string) {
    if (branchId) {
      const { data, error } = await this.supabase
        .from('branch_stocks')
        .select('on_hand_qty, average_cost, products(reorder_level)')
        .eq('branch_id', branchId);

      if (error) throw new Error(error.message);

      const rows = data ?? [];
      const totalStockQty = rows.reduce(
        (sum: number, row: any) => sum + Number(row.on_hand_qty ?? 0),
        0,
      );
      const totalStockValue = rows.reduce(
        (sum: number, row: any) => sum + Number(row.on_hand_qty ?? 0) * Number(row.average_cost ?? 0),
        0,
      );
      const lowStockCount = rows.filter((row: any) => {
        const reorderLevel = Number(row.products?.reorder_level ?? 0);
        return reorderLevel > 0 && Number(row.on_hand_qty ?? 0) <= reorderLevel;
      }).length;

      return {
        low_stock_count: lowStockCount,
        total_stock_qty: totalStockQty,
        total_stock_value: totalStockValue,
      };
    }

    const { data, error } = await this.supabase
      .from('product_stock_summary')
      .select('total_on_hand_qty, cost_price, reorder_level');

    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const totalStockQty = rows.reduce(
      (sum: number, row: any) => sum + Number(row.total_on_hand_qty ?? 0),
      0,
    );
    const totalStockValue = rows.reduce(
      (sum: number, row: any) => sum + Number(row.total_on_hand_qty ?? 0) * Number(row.cost_price ?? 0),
      0,
    );
    const lowStockCount = rows.filter((row: any) => {
      const reorderLevel = Number(row.reorder_level ?? 0);
      return reorderLevel > 0 && Number(row.total_on_hand_qty ?? 0) <= reorderLevel;
    }).length;

    return {
      low_stock_count: lowStockCount,
      total_stock_qty: totalStockQty,
      total_stock_value: totalStockValue,
    };
  }

  async getRevenueChart(days = 30, branchId?: string) {
    const from = new Date();
    from.setDate(from.getDate() - days);

    let query = this.supabase
      .from('sales_orders')
      .select('sold_at, total_amount')
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
