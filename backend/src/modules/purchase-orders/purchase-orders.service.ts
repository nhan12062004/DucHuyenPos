import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants.js';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from './dto/purchase-order.dto.js';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto.js';
import { CODE_PREFIXES, generateNextCode, normalizeManualCode } from '../../common/code-generator.js';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async findAll(query: PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, status } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = this.supabase
      .from('purchase_orders')
      .select(
        `*, 
        suppliers(id, name, phone), 
        branches(id, name),
        purchase_order_items(*, products(name, sku))`,
        { count: 'exact' },
      )
      .range(from, to)
      .order('ordered_at', { ascending: false });

    if (search) {
      q = q.ilike('order_no', `%${search}%`);
    }
    if (status) q = q.eq('status', status);

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
      .from('purchase_orders')
      .select(
        `*, 
        suppliers(id, name, phone, address), 
        branches(id, name),
        purchase_order_items(*, products(name, sku)),
        supplier_payments(*)`,
      )
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy đơn nhập');
    return data;
  }

  async create(dto: CreatePurchaseOrderDto) {
    const { items, ...orderData } = dto;

    orderData.order_no =
      normalizeManualCode(orderData.order_no) ??
      await generateNextCode(this.supabase, {
        table: 'purchase_orders',
        column: 'order_no',
        prefix: CODE_PREFIXES.purchaseOrder,
      });

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);
    const totalAmount = subtotal - (orderData.discount_amount ?? 0);

    const { data: order, error: orderErr } = await this.supabase
      .from('purchase_orders')
      .insert({ ...orderData, subtotal, total_amount: totalAmount })
      .select()
      .single();

    if (orderErr || !order) throw new Error(orderErr?.message ?? 'Tạo đơn nhập thất bại');

    const itemsToInsert = items.map((item) => ({
      purchase_order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      line_total: item.quantity * item.unit_cost,
    }));

    const { error: itemsErr } = await this.supabase
      .from('purchase_order_items')
      .insert(itemsToInsert);

    if (itemsErr) throw new Error(itemsErr.message);

    return this.findOne(order.id);
  }

  async update(id: string, dto: UpdatePurchaseOrderDto) {
    const { data, error } = await this.supabase
      .from('purchase_orders')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy đơn nhập');
    return data;
  }
}
