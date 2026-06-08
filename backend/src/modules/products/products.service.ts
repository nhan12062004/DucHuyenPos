import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants.js';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto.js';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto.js';
import { generateNextCode, normalizeManualCode } from '../../common/code-generator.js';
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
        `${PRODUCT_SELECT},
        branch_stocks(branch_id, on_hand_qty, available_qty, average_cost, branches(id, name))`,
      )
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy sản phẩm');
    return data;
  }

  async create(dto: CreateProductDto, actor?: ActivityActor) {
    const sku =
      normalizeManualCode(dto.sku) ??
      await generateNextCode(this.supabase, {
        table: 'products',
        column: 'sku',
        prefix: 'SP',
      });

    let defaultBranchId = dto.default_branch_id;
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
        ...dto,
        default_branch_id: defaultBranchId,
        sku,
      })
      .select(PRODUCT_SELECT)
      .single();

    if (error) throw new Error(error.message);

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
