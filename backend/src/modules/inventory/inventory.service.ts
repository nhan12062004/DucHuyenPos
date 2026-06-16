import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants.js';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto.js';
import { CODE_PREFIXES, generateNextCode } from '../../common/code-generator.js';
import { CreateInventoryAdjustmentDto } from './dto/inventory-adjustment.dto.js';

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

  async createAdjustment(dto: CreateInventoryAdjustmentDto) {
    const checkCode = await this.generateInventoryCheckCode();
    const transactions: any[] = [];

    for (const item of dto.items) {
      const actualQty = Number(item.actual_qty ?? 0);

      const { data: currentStock, error: stockError } = await this.supabase
        .from('branch_stocks')
        .select('id, on_hand_qty, average_cost')
        .eq('branch_id', dto.branch_id)
        .eq('product_id', item.product_id)
        .maybeSingle();

      if (stockError) throw new Error(stockError.message);

      const currentQty = Number(currentStock?.on_hand_qty ?? 0);
      const difference = actualQty - currentQty;

      if (currentStock) {
        const { error: updateStockError } = await this.supabase
          .from('branch_stocks')
          .update({ on_hand_qty: actualQty })
          .eq('id', currentStock.id);

        if (updateStockError) throw new Error(updateStockError.message);
      } else {
        const { error: insertStockError } = await this.supabase
          .from('branch_stocks')
          .insert({
            branch_id: dto.branch_id,
            product_id: item.product_id,
            on_hand_qty: actualQty,
            average_cost: 0,
          });

        if (insertStockError) throw new Error(insertStockError.message);
      }

      if (difference === 0) continue;

      const { data: transaction, error: transactionError } = await this.supabase
        .from('inventory_transactions')
        .insert({
          branch_id: dto.branch_id,
          product_id: item.product_id,
          transaction_type: difference > 0 ? 'adjustment_in' : 'adjustment_out',
          reference_type: 'inventory_check',
          quantity: Math.abs(difference),
          unit_cost: Number(currentStock?.average_cost ?? 0),
          note: `${checkCode}${dto.note ? ` - ${dto.note}` : ''}`,
        })
        .select('*, products(name, sku), branches(name)')
        .single();

      if (transactionError) throw new Error(transactionError.message);
      transactions.push(transaction);
    }

    return {
      check_code: checkCode,
      adjusted_count: transactions.length,
      transactions,
    };
  }

  private async generateInventoryCheckCode() {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');

    const { count, error } = await this.supabase
      .from('inventory_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('reference_type', 'inventory_check')
      .gte('created_at', `${yyyy}-${mm}-${dd}T00:00:00.000Z`);

    if (error) throw new Error(error.message);
    return `KK${yyyy}${mm}${dd}${String((count ?? 0) + 1).padStart(4, '0')}`;
  }
}
