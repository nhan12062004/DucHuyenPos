import { api } from './apiClient';
import type { PaginatedResult } from './types';
import type { DeliveryStatus, DeliveryTab } from '../utils/delivery';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SalesOrderItem {
  id: string;
  sales_order_id: string;
  product_id: string;
  product_name: string;
  sku?: string;
  unit_name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  line_total: number;
  products?: { name: string; sku: string; image_url?: string } | null;
}

export interface SalesOrder {
  id: string;
  branch_id: string;
  order_no: string;
  invoice_no?: string;
  customer_id?: string;
  cashier_id?: string | null;
  sold_at: string;
  source: 'pos' | 'web' | 'phone' | 'manual';
  status: 'draft' | 'pending' | 'completed' | 'cancelled';
  payment_status: 'unpaid' | 'partial' | 'paid' | 'refunded';
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  note?: string;
  delivery_address?: string;
  delivery_method?: DeliveryTab;
  delivery_status?: DeliveryStatus;
  delivery_due_at?: string | null;
  created_at: string;
  // Relations
  customers?: { id: string; full_name: string; phone?: string; address?: string } | null;
  branches?: { id: string; name: string } | null;
  cashier?: { id: string; full_name: string; branch_id?: string } | null;
  sales_order_items?: SalesOrderItem[];
  sales_payments?: SalesPayment[];
}

export interface SalesPayment {
  id: string;
  sales_order_id: string;
  payment_no: string;
  payment_method: 'cash' | 'bank_transfer' | 'card' | 'ewallet' | 'other';
  amount: number;
  paid_at: string;
  note?: string;
}

export interface SalesOrdersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  payment_status?: string;
  delivery_status?: DeliveryStatus;
  delivery_method?: DeliveryTab;
  from_date?: string;
  to_date?: string;
}

export interface CreateSalesOrderPayload {
  branch_id: string;
  customer_id?: string;
  cashier_id?: string | null;
  order_no?: string;
  source?: string;
  status?: string;
  payment_status?: string;
  discount_amount?: number;
  shipping_fee?: number;
  tax_amount?: number;
  paid_amount?: number;
  note?: string;
  delivery_address?: string;
  delivery_method?: DeliveryTab;
  delivery_status?: DeliveryStatus;
  delivery_due_at?: string | null;
  items: {
    product_id: string;
    product_name: string;
    sku?: string;
    unit_name?: string;
    quantity: number;
    unit_price: number;
    discount_amount?: number;
  }[];
}

export interface UpdateSalesOrderPayload {
  branch_id?: string;
  customer_id?: string;
  cashier_id?: string;
  order_no?: string;
  source?: SalesOrder['source'];
  status?: SalesOrder['status'];
  payment_status?: SalesOrder['payment_status'];
  discount_amount?: number;
  shipping_fee?: number;
  tax_amount?: number;
  paid_amount?: number;
  note?: string;
  delivery_address?: string;
  delivery_method?: DeliveryTab;
  delivery_status?: DeliveryStatus;
  delivery_due_at?: string;
  items?: CreateSalesOrderPayload['items'];
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const salesOrdersService = {
  getAll: (params?: SalesOrdersQuery) =>
    api.get<PaginatedResult<SalesOrder>>('/sales-orders', params as any),

  getOne: (id: string) =>
    api.get<SalesOrder>(`/sales-orders/${id}`),

  create: (dto: CreateSalesOrderPayload) =>
    api.post<SalesOrder>('/sales-orders', dto),

  update: (id: string, dto: UpdateSalesOrderPayload) =>
    api.put<SalesOrder>(`/sales-orders/${id}`, dto),

  cancel: (id: string) =>
    api.put<SalesOrder>(`/sales-orders/${id}/cancel`, {}),
};
