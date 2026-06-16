import { api } from './apiClient';
import type { SalesOrder } from './salesOrdersService';
import type { PaginatedResult } from './types';

export type InvoiceStatus = 'draft' | 'issued' | 'printed' | 'cancelled';
export type InvoiceType = 'retail' | 'vat' | 'proforma';

export interface Invoice {
  id: string;
  sales_order_id: string;
  invoice_no: string;
  invoice_type: InvoiceType;
  status: InvoiceStatus;
  issued_at?: string | null;
  printed_at?: string | null;
  printed_count: number;
  note?: string | null;
  created_at: string;
  updated_at?: string;
  sales_orders?: SalesOrder | null;
}

export interface InvoicesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface CreateInvoicePayload {
  sales_order_id: string;
  invoice_no?: string;
  invoice_type?: InvoiceType;
  note?: string;
}

export interface UpdateInvoicePayload {
  status?: InvoiceStatus;
  note?: string;
}

export const invoicesService = {
  getAll: (params?: InvoicesQuery) =>
    api.get<PaginatedResult<Invoice>>('/invoices', params as any),

  getOne: (id: string) =>
    api.get<Invoice>(`/invoices/${id}`),

  create: (dto: CreateInvoicePayload) =>
    api.post<Invoice>('/invoices', dto),

  update: (id: string, dto: UpdateInvoicePayload) =>
    api.put<Invoice>(`/invoices/${id}`, dto),

  print: (id: string) =>
    api.put<Invoice>(`/invoices/${id}/print`, {}),
};
