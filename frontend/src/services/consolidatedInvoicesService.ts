import { api } from './apiClient';
import type { SalesOrder, SalesOrderItem } from './salesOrdersService';

export interface ConsolidatedInvoiceItem {
  id: string;
  consolidated_invoice_id: string;
  product_id?: string | null;
  product_name: string;
  sku?: string | null;
  unit_name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  line_total: number;
  sort_order: number;
}

export interface ConsolidatedInvoiceSourceOrder {
  id: string;
  sales_order_id?: string | null;
  source_order_no: string;
  source_sold_at?: string | null;
  source_total_amount: number;
  sales_orders?: Pick<SalesOrder, 'id' | 'order_no' | 'sold_at' | 'total_amount'> | null;
}

export interface ConsolidatedInvoice {
  id: string;
  branch_id: string;
  customer_id: string;
  invoice_no: string;
  status: 'draft' | 'issued' | 'printed' | 'cancelled';
  issued_at: string;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  note?: string | null;
  created_at: string;
  customers?: { id: string; full_name: string; phone?: string; address?: string } | null;
  branches?: { id: string; name: string } | null;
  consolidated_invoice_items: ConsolidatedInvoiceItem[];
  consolidated_invoice_orders: ConsolidatedInvoiceSourceOrder[];
}

export interface CreateConsolidatedInvoicePayload {
  sales_order_ids: string[];
  note?: string;
}

export const consolidatedInvoicesService = {
  getEligible: (customerId: string) =>
    api.get<SalesOrder[]>('/consolidated-invoices/eligible', { customer_id: customerId }),

  getOne: (id: string) =>
    api.get<ConsolidatedInvoice>(`/consolidated-invoices/${id}`),

  getByOrder: (salesOrderId: string) =>
    api.get<ConsolidatedInvoice>(`/consolidated-invoices/by-order/${salesOrderId}`),

  create: (dto: CreateConsolidatedInvoicePayload) =>
    api.post<ConsolidatedInvoice>('/consolidated-invoices', dto),
};

export type PrintableConsolidatedInvoiceItem = ConsolidatedInvoiceItem & Pick<SalesOrderItem, 'sales_order_id'>;
