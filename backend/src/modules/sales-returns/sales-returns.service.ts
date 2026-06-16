import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { ActivityActor, ActivityLogsService } from '../../common/activity-logs.service.js';
import { CODE_PREFIXES, generateNextCode, normalizeManualCode } from '../../common/code-generator.js';
import { PaginatedResult, PaginationDto } from '../../common/dto/pagination.dto.js';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants.js';
import { CreateSalesReturnDto, UpdateSalesReturnDto } from './dto/sales-return.dto.js';

const SALES_RETURN_SELECT = `*,
  sales_return_items(*),
  sales_orders(id, order_no, total_amount, sold_at),
  customers(id, full_name, phone),
  branches(id, name)`;

@Injectable()
export class SalesReturnsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async findAll(query: PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, status } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = this.supabase
      .from('sales_returns')
      .select(SALES_RETURN_SELECT, { count: 'exact' })
      .range(from, to)
      .order('returned_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (search) {
      q = q.or(`return_no.ilike.%${search}%`);
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
      .from('sales_returns')
      .select(SALES_RETURN_SELECT)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Khong tim thay phieu tra hang');
    return data;
  }

  async create(dto: CreateSalesReturnDto, actor?: ActivityActor) {
    if (!dto.items.length) {
      throw new BadRequestException('Can co it nhat mot san pham tra hang');
    }

    let branchId = dto.branch_id;
    let customerId = dto.customer_id;
    let orderNo: string | undefined;

    if (dto.sales_order_id) {
      const { data: order, error: orderError } = await this.supabase
        .from('sales_orders')
        .select('id, order_no, branch_id, customer_id')
        .eq('id', dto.sales_order_id)
        .single();

      if (orderError || !order) throw new NotFoundException('Khong tim thay don hang goc');
      branchId = branchId ?? order.branch_id;
      customerId = customerId ?? order.customer_id ?? undefined;
      orderNo = order.order_no;
    }

    if (!branchId) {
      const { data: defaultBranch, error: defaultBranchError } = await this.supabase
        .from('branches')
        .select('id')
        .eq('status', 'active')
        .eq('is_default', true)
        .maybeSingle();

      if (defaultBranchError) throw new Error(defaultBranchError.message);
      branchId = defaultBranch?.id;
    }

    if (!branchId) throw new BadRequestException('Chua co chi nhanh de tao phieu tra hang');

    const returnNo =
      normalizeManualCode(dto.return_no) ??
      await generateNextCode(this.supabase, {
        table: 'sales_returns',
        column: 'return_no',
        prefix: CODE_PREFIXES.salesReturn,
      });

    const items = dto.items.map((item) => {
      const quantity = Number(item.quantity ?? 0);
      const unitPrice = Number(item.unit_price ?? 0);
      const lineTotal = Number(item.line_total ?? quantity * unitPrice);

      return {
        sales_order_item_id: item.sales_order_item_id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity,
        unit_price: unitPrice,
        line_total: Math.max(0, lineTotal),
        reason: item.reason ?? dto.reason,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    const refundAmount = dto.refund_amount ?? subtotal;

    const { data: salesReturn, error } = await this.supabase
      .from('sales_returns')
      .insert({
        branch_id: branchId,
        sales_order_id: dto.sales_order_id,
        customer_id: customerId,
        return_no: returnNo,
        status: dto.status ?? 'pending',
        reason: dto.reason,
        subtotal,
        refund_amount: refundAmount,
        note: dto.note,
      })
      .select('id')
      .single();

    if (error || !salesReturn) throw new Error(error?.message ?? 'Tao phieu tra hang that bai');

    const { error: itemsError } = await this.supabase
      .from('sales_return_items')
      .insert(items.map((item) => ({ ...item, sales_return_id: salesReturn.id })));

    if (itemsError) throw new Error(itemsError.message);

    const createdReturn = await this.findOne(salesReturn.id);
    await this.activityLogsService.logActivity({
      actor,
      action: 'create',
      entityType: 'sales_return',
      entityId: createdReturn.id,
      description: `${this.activityLogsService.getActorName(actor)} vua tao phieu tra hang ${createdReturn.return_no}`,
      metadata: {
        return_no: createdReturn.return_no,
        order_no: orderNo,
        refund_amount: createdReturn.refund_amount,
      },
    });

    return createdReturn;
  }

  async update(id: string, dto: UpdateSalesReturnDto, actor?: ActivityActor) {
    const current = await this.findOne(id);

    const { data, error } = await this.supabase
      .from('sales_returns')
      .update({
        status: dto.status,
        reason: dto.reason,
        refund_amount: dto.refund_amount,
        note: dto.note,
      })
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) throw new NotFoundException('Khong tim thay phieu tra hang');

    const updatedReturn = await this.findOne(id);
    await this.activityLogsService.logActivity({
      actor,
      action: dto.status === 'cancelled' && current.status !== 'cancelled' ? 'cancel' : 'update',
      entityType: 'sales_return',
      entityId: updatedReturn.id,
      description: `${this.activityLogsService.getActorName(actor)} vua cap nhat phieu tra hang ${updatedReturn.return_no}`,
      metadata: {
        return_no: updatedReturn.return_no,
        status: updatedReturn.status,
        refund_amount: updatedReturn.refund_amount,
      },
    });

    return updatedReturn;
  }

  async cancel(id: string, actor?: ActivityActor) {
    return this.update(id, { status: 'cancelled' }, actor);
  }
}
