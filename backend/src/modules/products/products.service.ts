import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants.js';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto.js';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto.js';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async findAll(query: PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, status } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = this.supabase
      .from('products')
      .select(
        `*, 
        product_categories(id, name), 
        brands(id, name), 
        suppliers:default_supplier_id(id, name)`,
        { count: 'exact' },
      )
      .range(from, to)
      .order('created_at', { ascending: false });

    if (search) {
      q = q.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`);
    }
    if (status) {
      q = q.eq('status', status);
    }

    const { data, error, count } = await q;
    if (error) throw new Error(error.message);

    return {
      data: data ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('products')
      .select(
        `*, 
        product_categories(id, name), 
        brands(id, name), 
        suppliers:default_supplier_id(id, name),
        branch_stocks(branch_id, on_hand_qty, available_qty, average_cost, branches(name))`,
      )
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy sản phẩm');
    return data;
  }

  async create(dto: CreateProductDto) {
    const { data, error } = await this.supabase
      .from('products')
      .insert(dto)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async update(id: string, dto: UpdateProductDto) {
    const { data, error } = await this.supabase
      .from('products')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy sản phẩm');
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase
      .from('products')
      .update({ status: 'inactive' })
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { message: 'Đã vô hiệu hóa sản phẩm' };
  }

  async getStockSummary() {
    const { data, error } = await this.supabase
      .from('product_stock_summary')
      .select('*')
      .order('name');

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getCategories() {
    const { data, error } = await this.supabase
      .from('product_categories')
      .select('*')
      .order('name');
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getBrands() {
    const { data, error } = await this.supabase
      .from('brands')
      .select('*')
      .order('name');
    if (error) throw new Error(error.message);
    return data ?? [];
  }
}
