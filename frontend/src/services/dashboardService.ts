import { api } from './apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  today_revenue: number;
  today_orders: number;
  month_revenue: number;
  total_customer_debt: number;
  low_stock_count: number;
  low_stock_items: {
    product_id: string;
    name: string;
    total_on_hand_qty: number;
    reorder_level: number;
  }[];
  recent_orders: {
    id: string;
    order_no: string;
    total_amount: number;
    payment_status: string;
    sold_at: string;
    customers?: { full_name: string } | null;
  }[];
}

export interface RevenueChartPoint {
  date: string;
  revenue: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const dashboardService = {
  getStats: (branchId?: string) =>
    api.get<DashboardStats>('/dashboard/stats', branchId ? { branch_id: branchId } : undefined),

  getRevenueChart: (days = 30, branchId?: string) =>
    api.get<RevenueChartPoint[]>('/dashboard/revenue-chart', {
      days,
      ...(branchId ? { branch_id: branchId } : {}),
    }),
};
