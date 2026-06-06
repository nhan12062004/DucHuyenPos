import { api } from './apiClient';
import type { PaginatedResult } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  code: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_code?: string;
  notes?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface SupplierDebtSummary {
  supplier_id: string;
  supplier_code: string;
  supplier_name: string;
  total_purchase: number;
  total_paid: number;
  current_debt: number;
}

export interface SuppliersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const suppliersService = {
  getAll: (params?: SuppliersQuery) =>
    api.get<PaginatedResult<Supplier>>('/suppliers', params as any),

  getOne: (id: string) =>
    api.get<Supplier>(`/suppliers/${id}`),

  create: (dto: Partial<Supplier>) =>
    api.post<Supplier>('/suppliers', dto),

  update: (id: string, dto: Partial<Supplier>) =>
    api.put<Supplier>(`/suppliers/${id}`, dto),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/suppliers/${id}`),

  getDebtSummary: () =>
    api.get<SupplierDebtSummary[]>('/suppliers/debt-summary'),
};
