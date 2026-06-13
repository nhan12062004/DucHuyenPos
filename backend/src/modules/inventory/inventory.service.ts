import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants.js';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto.js';
import { CODE_PREFIXES, generateNextCode } from '../../common/code-generator.js';

@Injectable()
export class InventoryService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async getStock(query: PaginationDto & { branch_id?: string }): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, branch_id } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = this.supabase
      .from('branch_stocks')
      .select(
        `*, 
        products(id, name, sku, barcode, reorder_level, status, product_categories(name), brands(name)),
        branches(id, name)`,
        { count: 'exact' },
      )
      .range(from, to)
      .order('updated_at', { ascending: false });

    if (branch_id) q = q.eq('branch_id', branch_id);
    if (search) {
      // Filter via product name - phải dùng cách khác vì nested
    }

    const { data, error, count } = await q;
    if (error) throw new Error(error.message);

    let filtered = data ?? [];
    if (search) {
      filtered = filtered.filter((row: any) =>
        row.products?.name?.toLowerCase().includes(search.toLowerCase()) ||
        row.products?.sku?.toLowerCase().includes(search.toLowerCase()),
      );
    }

    return {
      data: filtered,
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }

  async getTransactions(query: PaginationDto & { branch_id?: string; product_id?: string }) {
    const { page = 1, limit = 50, branch_id, product_id } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = this.supabase
      .from('inventory_transactions')
      .select(
        `*, 
        products(name, sku), 
        branches(name)`,
        { count: 'exact' },
      )
      .range(from, to)
      .order('created_at', { ascending: false });

    if (branch_id) q = q.eq('branch_id', branch_id);
    if (product_id) q = q.eq('product_id', product_id);

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

  async getBranches() {
    const { data, error } = await this.supabase
      .from('branches')
      .select('*')
      .eq('status', 'active')
      .order('name');
    if (error) throw new Error(error.message);

    if (data?.length) {
      return data;
    }

    const code = await generateNextCode(this.supabase, {
      table: 'branches',
      column: 'code',
      prefix: CODE_PREFIXES.branch,
    });

    const { data: defaultBranch, error: createError } = await this.supabase
      .from('branches')
      .insert({
        code,
        name: 'Chi nhánh mặc định',
        is_default: true,
        status: 'active',
      })
      .select('*')
      .single();

    if (createError) throw new Error(createError.message);
    return defaultBranch ? [defaultBranch] : [];
  }
}
