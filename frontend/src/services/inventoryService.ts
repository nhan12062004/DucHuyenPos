import { api } from './apiClient';
import type { PaginatedResult } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BranchStock {
  id: string;
  branch_id: string;
  product_id: string;
  on_hand_qty: number;
  reserved_qty: number;
  available_qty: number;
  average_cost: number;
  updated_at: string;
  products?: {
    id: string;
    name: string;
    sku: string;
    barcode?: string;
    reorder_level: number;
    status: string;
    product_categories?: { name: string } | null;
    brands?: { name: string } | null;
  } | null;
  branches?: { id: string; name: string } | null;
}

export interface InventoryTransaction {
  id: string;
  branch_id: string;
  product_id: string;
  transaction_type: string;
  reference_type?: string;
  reference_id?: string;
  quantity: number;
  unit_cost?: number;
  note?: string;
  created_at: string;
  products?: { name: string; sku: string } | null;
  branches?: { name: string } | null;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  phone?: string;
  address?: string;
  is_default: boolean;
  status: 'active' | 'inactive';
}

export interface InventoryQuery {
  page?: number;
  limit?: number;
  search?: string;
  branch_id?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const inventoryService = {
  getStock: (params?: InventoryQuery) =>
    api.get<PaginatedResult<BranchStock>>('/inventory', params as any),

  getTransactions: (params?: InventoryQuery & { product_id?: string }) =>
    api.get<PaginatedResult<InventoryTransaction>>('/inventory/transactions', params as any),

  getBranches: () =>
    api.get<Branch[]>('/inventory/branches'),
};
