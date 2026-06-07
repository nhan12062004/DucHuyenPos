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
  recent_activities: RecentActivity[];
}

export interface RevenueChartPoint {
  date: string;
  revenue: number;
}

export const dashboardService = {
  getStats: (branchId?: string) =>
    api.get<DashboardStats>('/dashboard/stats', branchId ? { branch_id: branchId } : undefined),

  getRevenueChart: (days = 30, branchId?: string) =>
    api.get<RevenueChartPoint[]>('/dashboard/revenue-chart', {
      days,
      ...(branchId ? { branch_id: branchId } : {}),
    }),
};
