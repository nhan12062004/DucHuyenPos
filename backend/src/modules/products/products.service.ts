import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants.js';
import { CreateProductDto, ProductInitialInventoryDto, UpdateProductDto } from './dto/product.dto.js';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto.js';
import { CODE_PREFIXES, generateNextCode, normalizeManualCode } from '../../common/code-generator.js';
import { ActivityActor, ActivityLogsService } from '../../common/activity-logs.service.js';

const PRODUCT_SELECT = `*, 
        product_categories(id, name), 
        brands(id, name), 
        suppliers:default_supplier_id(id, name),
        default_branch:default_branch_id(id, name, is_default)`;

@Injectable()
export class ProductsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async findAll(query: PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, status } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = this.supabase
      .from('products')
      .select(PRODUCT_SELECT, { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (search) {
      // Multi-keyword search: tách từng từ, mỗi từ phải khớp ít nhất 1 trong name/sku/barcode
      // Ví dụ: "tủ dle 2/4" → tìm sản phẩm có chứa "tủ" VÀ "dle" VÀ "2/4"
      const keywords = search.trim().split(/\s+/).filter(Boolean);
      for (const keyword of keywords) {
        const escaped = keyword.replace(/[%_]/g, '\\$&');
        q = q.or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%,barcode.ilike.%${escaped}%`);
      }
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
        `${PRODUCT_SELECT},
        branch_stocks(branch_id, on_hand_qty, available_qty, average_cost, branches(id, name))`,
      )
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy sản phẩm');
    return data;
  }

  async create(dto: CreateProductDto, actor?: ActivityActor) {
    const { initial_inventory: initialInventory = [], ...productDto } = dto;
    const sku =
      normalizeManualCode(productDto.sku) ??
      await generateNextCode(this.supabase, {
        table: 'products',
        column: 'sku',
        prefix: CODE_PREFIXES.product,
      });

    let defaultBranchId = productDto.default_branch_id;
    if (!defaultBranchId) {
      const { data: defaultBranch, error: defaultBranchError } = await this.supabase
        .from('branches')
        .select('id')
        .eq('status', 'active')
        .eq('is_default', true)
        .maybeSingle();

      if (defaultBranchError) {
        throw new Error(defaultBranchError.message);
      }

      defaultBranchId = defaultBranch?.id;
    }

    const { data, error } = await this.supabase
      .from('products')
      .insert({
        ...productDto,
        default_branch_id: defaultBranchId,
        sku,
      })
      .select(PRODUCT_SELECT)
      .single();

    if (error) throw new Error(error.message);

    await this.createInitialInventory(data.id, Number(data.cost_price ?? 0), initialInventory, actor);

    await this.activityLogsService.logActivity({
      actor,
      action: 'create',
      entityType: 'product',
      entityId: data.id,
      description: `${this.activityLogsService.getActorName(actor)} vừa thêm mới sản phẩm ${data.name}`,
      metadata: {
        product_name: data.name,
        sku: data.sku,
      },
    });

    return data;
  }

  private async createInitialInventory(
    productId: string,
    defaultCost: number,
    initialInventory: ProductInitialInventoryDto[],
    actor?: ActivityActor,
  ) {
    for (const row of initialInventory) {
      const openingQty = Number(row.opening_qty ?? 0);
      const openingCost = Number(row.opening_cost ?? defaultCost ?? 0);
      const reorderPoint = row.reorder_point === undefined ? null : Number(row.reorder_point);
      const maxStock = row.max_stock === undefined ? null : Number(row.max_stock);
      const shouldCreateStock =
        openingQty > 0 ||
        openingCost > 0 ||
        reorderPoint !== null ||
        maxStock !== null;

      if (!shouldCreateStock) {
        continue;
      }

      const { error: stockError } = await this.supabase
        .from('branch_stocks')
        .upsert(
          {
            branch_id: row.branch_id,
            product_id: productId,
            on_hand_qty: openingQty,
            reserved_qty: 0,
            average_cost: openingCost,
            reorder_point: reorderPoint,
            max_stock: maxStock,
          },
          { onConflict: 'branch_id,product_id' },
        );

      if (stockError) throw new Error(stockError.message);

      if (openingQty <= 0) {
        continue;
      }

      const { error: transactionError } = await this.supabase
        .from('inventory_transactions')
        .insert({
          branch_id: row.branch_id,
          product_id: productId,
          transaction_type: 'opening',
          reference_type: 'product_create',
          quantity: openingQty,
          unit_cost: openingCost,
          note: 'Khởi tạo kho khi tạo sản phẩm',
          created_by: actor?.actorId || null,
        });

      if (transactionError) throw new Error(transactionError.message);
    }
  }

  async update(id: string, dto: UpdateProductDto, actor?: ActivityActor) {
    const { data, error } = await this.supabase
      .from('products')
      .update(dto)
      .eq('id', id)
      .select(PRODUCT_SELECT)
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy sản phẩm');

    await this.activityLogsService.logActivity({
      actor,
      action: 'update',
      entityType: 'product',
      entityId: data.id,
      description: `${this.activityLogsService.getActorName(actor)} vừa cập nhật sản phẩm ${data.name}`,
      metadata: {
        product_name: data.name,
        sku: data.sku,
      },
    });

    return data;
  }

  async remove(id: string, actor?: ActivityActor) {
    const { data, error } = await this.supabase
      .from('products')
      .update({ status: 'inactive' })
      .eq('id', id)
      .select('id, name, sku')
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy sản phẩm');

    await this.activityLogsService.logActivity({
      actor,
      action: 'delete',
      entityType: 'product',
      entityId: data.id,
      description: `${this.activityLogsService.getActorName(actor)} vừa xóa sản phẩm ${data.name}`,
      metadata: {
        product_name: data.name,
        sku: data.sku,
      },
    });

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
