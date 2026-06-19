import { api } from './apiClient';
import type { PaginatedResult } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  product_category_id?: string;
  brand_id?: string;
  default_supplier_id?: string;
  default_branch_id?: string;
  unit_name: string;
  image_url?: string;
  description?: string;
  wholesale_price?: number;
  weight?: number;
  weight_unit?: string;
  tags?: string[];
  tax_applicable?: boolean;
  warranty_applicable?: boolean;
  attributes?: ProductAttribute[];
  unit_conversions?: ProductUnitConversion[];
  sale_price: number;
  cost_price: number;
  reorder_level: number;
  track_inventory: boolean;
  allow_negative_stock: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  // Relations
  product_categories?: { id: string; name: string } | null;
  brands?: { id: string; name: string } | null;
  suppliers?: { id: string; name: string } | null;
  default_branch?: { id: string; name: string; is_default?: boolean } | null;
  branch_stocks?: BranchStock[];
}

export interface ProductAttribute {
  name: string;
  value: string;
}

export interface ProductUnitConversion {
  unit_name: string;
  conversion_rate: number;
  sale_price?: number;
  barcode?: string;
}

export interface ProductInitialInventory {
  branch_id: string;
  opening_qty: number;
  opening_cost: number;
  reorder_point?: number;
  max_stock?: number;
}

export type ProductCreatePayload = Partial<Product> & {
  initial_inventory?: ProductInitialInventory[];
};

export interface BranchStock {
  branch_id: string;
  on_hand_qty: number;
  available_qty: number;
  average_cost: number;
  branches?: { id?: string; name: string };
}

export interface ProductCategory {
  id: string;
  code?: string;
  name: string;
  parent_id?: string;
}

export interface Brand {
  id: string;
  code?: string;
  name: string;
}

export interface ProductStockSummary {
  product_id: string;
  sku: string;
  name: string;
  sale_price: number;
  cost_price: number;
  reorder_level: number;
  total_on_hand_qty: number;
  total_available_qty: number;
}

// ─── Query Params ─────────────────────────────────────────────────────────────

export interface ProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const productsService = {
  getAll: (params?: ProductsQuery) =>
    api.get<PaginatedResult<Product>>('/products', params as any),

  getOne: (id: string) =>
    api.get<Product>(`/products/${id}`),

  create: (dto: ProductCreatePayload) =>
    api.post<Product>('/products', dto),

  update: (id: string, dto: Partial<Product>) =>
    api.put<Product>(`/products/${id}`, dto),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/products/${id}`),

  getStockSummary: () =>
    api.get<ProductStockSummary[]>('/products/stock-summary'),

  getCategories: () =>
    api.get<ProductCategory[]>('/products/categories'),

  getBrands: () =>
    api.get<Brand[]>('/products/brands'),
};
