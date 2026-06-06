import { api } from './apiClient';
import type { PaginatedResult } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  code: string;
  customer_group_id?: string;
  full_name: string;
  phone?: string;
  email?: string;
  company_name?: string;
  tax_code?: string;
  address?: string;
  notes?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  // Relations
  customer_groups?: { id: string; name: string } | null;
  customer_addresses?: CustomerAddress[];
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  contact_name?: string;
  contact_phone?: string;
  address_line: string;
  ward?: string;
  district?: string;
  province?: string;
  is_default: boolean;
}

export interface CustomerGroup {
  id: string;
  code: string;
  name: string;
  group_type: 'fixed' | 'dynamic';
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerDebtSummary {
  customer_id: string;
  customer_code: string;
  full_name: string;
  total_sales: number;
  total_paid: number;
  current_debt: number;
}

export interface CustomersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const customersService = {
  getAll: (params?: CustomersQuery) =>
    api.get<PaginatedResult<Customer>>('/customers', params as any),

  getOne: (id: string) =>
    api.get<Customer>(`/customers/${id}`),

  create: (dto: Partial<Customer>) =>
    api.post<Customer>('/customers', dto),

  update: (id: string, dto: Partial<Customer>) =>
    api.put<Customer>(`/customers/${id}`, dto),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/customers/${id}`),

  getDebtSummary: () =>
    api.get<CustomerDebtSummary[]>('/customers/debt-summary'),

  getGroups: () =>
    api.get<CustomerGroup[]>('/customers/groups'),

  createGroup: (dto: Partial<CustomerGroup>) =>
    api.post<CustomerGroup>('/customers/groups', dto),

  updateGroup: (id: string, dto: Partial<CustomerGroup>) =>
    api.put<CustomerGroup>(`/customers/groups/${id}`, dto),

  deleteGroup: (id: string) =>
    api.delete<{ message: string }>(`/customers/groups/${id}`),
};
