import { api } from './apiClient';
import type { SalesOrder } from './salesOrdersService';
import type { PaginatedResult } from './types';

export type SalesReturnStatus = 'pending' | 'approved' | 'refunded' | 'completed' | 'cancelled';

export interface SalesReturnItem {
  id: string;
  sales_return_id: string;
  sales_order_item_id?: string | null;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  reason?: string | null;
}

export interface SalesReturn {
  id: string;
  branch_id: string;
  sales_order_id?: string | null;
  customer_id?: string | null;
  return_no: string;
  returned_at: string;
  status: SalesReturnStatus;
  reason?: string | null;
  subtotal: number;
  refund_amount: number;
  note?: string | null;
  created_at: string;
  updated_at?: string;
  sales_return_items?: SalesReturnItem[];
  sales_orders?: Pick<SalesOrder, 'id' | 'order_no' | 'total_amount' | 'sold_at'> | null;
  customers?: { id: string; full_name: string; phone?: string } | null;
  branches?: { id: string; name: string } | null;
}

export interface SalesReturnsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface CreateSalesReturnPayload {
  branch_id?: string;
  sales_order_id?: string;
  customer_id?: string;
  return_no?: string;
  status?: SalesReturnStatus;
  reason?: string;
  refund_amount?: number;
  note?: string;
  items: {
    sales_order_item_id?: string;
    product_id: string;
    product_name: string;
    sku?: string;
    unit_name?: string;
    quantity: number;
    unit_price: number;
    line_total?: number;
    reason?: string;
  }[];
}

export interface UpdateSalesReturnPayload {
  status?: SalesReturnStatus;
  reason?: string;
  refund_amount?: number;
  note?: string;
}

export const salesReturnsService = {
  getAll: (params?: SalesReturnsQuery) =>
    api.get<PaginatedResult<SalesReturn>>('/sales-returns', params as any),

  getOne: (id: string) =>
    api.get<SalesReturn>(`/sales-returns/${id}`),

  create: (dto: CreateSalesReturnPayload) =>
    api.post<SalesReturn>('/sales-returns', dto),

  update: (id: string, dto: UpdateSalesReturnPayload) =>
    api.put<SalesReturn>(`/sales-returns/${id}`, dto),

  cancel: (id: string) =>
    api.put<SalesReturn>(`/sales-returns/${id}/cancel`, {}),
};
