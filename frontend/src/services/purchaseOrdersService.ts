import { api } from './apiClient';
import type { PaginatedResult } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  received_qty: number;
  unit_cost: number;
  line_total: number;
  products?: { name: string; sku: string } | null;
}

export interface PurchaseOrder {
  id: string;
  branch_id: string;
  supplier_id: string;
  order_no: string;
  ordered_at: string;
  status: 'draft' | 'ordered' | 'receiving' | 'received' | 'cancelled';
  payment_status: 'unpaid' | 'partial' | 'paid';
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  note?: string;
  expected_delivery_at?: string;
  created_at: string;
  // Relations
  suppliers?: { id: string; name: string; phone?: string } | null;
  branches?: { id: string; name: string } | null;
  purchase_order_items?: PurchaseOrderItem[];
}

export interface PurchaseOrdersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const purchaseOrdersService = {
  getAll: (params?: PurchaseOrdersQuery) =>
    api.get<PaginatedResult<PurchaseOrder>>('/purchase-orders', params as any),

  getOne: (id: string) =>
    api.get<PurchaseOrder>(`/purchase-orders/${id}`),

  create: (dto: {
    branch_id: string;
    supplier_id: string;
    status?: PurchaseOrder['status'];
    payment_status?: PurchaseOrder['payment_status'];
    paid_amount?: number;
    payment_method?: 'cash' | 'bank_transfer' | 'card' | 'ewallet' | 'other';
    note?: string;
    discount_amount?: number;
    expected_delivery_at?: string;
    items: { product_id: string; product_name: string; quantity: number; unit_cost: number }[];
  }) => api.post<PurchaseOrder>('/purchase-orders', dto),

  update: (id: string, dto: Partial<Pick<PurchaseOrder, 'status' | 'payment_status' | 'paid_amount' | 'note'>>) =>
    api.put<PurchaseOrder>(`/purchase-orders/${id}`, dto),
};
