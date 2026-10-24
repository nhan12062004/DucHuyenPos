import { api } from './apiClient';

export interface RecentActivity {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  description: string;
  actor_name: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface InventorySummary {
  low_stock_count: number;
  total_stock_qty: number;
  total_stock_value: number;
}

export interface DashboardStats {
  today_revenue: number;
  today_orders: number;
  month_revenue: number;
  total_customer_debt: number;
  pending_summary: {
    pending_approval: number;
    pending_payment: number;
    pending_packing: number;
    waiting_pick_up: number;
    delivering: number;
    cancelled_delivery: number;
  };
  recent_activities: RecentActivity[];
}

export interface TopProductStats {
  product_id: string;
  name: string;
  sku: string | null;
  order_count: number;
  sold_qty: number;
  revenue: number;
}

export interface RevenueChartPoint {
  date: string;
  revenue: number;
}

export const dashboardService = {
  getStats: (branchId?: string) =>
    api.get<DashboardStats>('/dashboard/stats', {
      summary_only: true,
      ...(branchId ? { branch_id: branchId } : {}),
    }),

  getTopProducts: (days = 7, branchId?: string) =>
    api.get<TopProductStats[]>('/dashboard/top-products', {
      days,
      ...(branchId ? { branch_id: branchId } : {}),
    }),

  getInventorySummary: (branchId?: string) =>
    api.get<InventorySummary>('/dashboard/inventory-summary', branchId ? { branch_id: branchId } : undefined),

  getRevenueChart: (days = 30, branchId?: string) =>
    api.get<RevenueChartPoint[]>('/dashboard/revenue-chart', {
      days,
      ...(branchId ? { branch_id: branchId } : {}),
    }),
};
