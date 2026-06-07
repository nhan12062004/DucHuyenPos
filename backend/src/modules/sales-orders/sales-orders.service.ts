import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants.js';
import { CreateSalesOrderDto, UpdateSalesOrderDto } from './dto/sales-order.dto.js';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto.js';
import { generateNextCode, normalizeManualCode } from '../../common/code-generator.js';
import { ActivityActor, ActivityLogsService } from '../../common/activity-logs.service.js';

@Injectable()
export class SalesOrdersService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async findAll(query: PaginationDto & { from_date?: string; to_date?: string; payment_status?: string }): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, status, payment_status, from_date, to_date } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = this.supabase
      .from('sales_orders')
      .select(
        `*, 
        customers(id, full_name, phone), 
        branches(id, name),
        sales_order_items(*, products(name, sku))`,
        { count: 'exact' },
      )
      .range(from, to)
      .order('sold_at', { ascending: false });

    if (search) {
      q = q.or(`order_no.ilike.%${search}%,invoice_no.ilike.%${search}%`);
    }
    if (status) q = q.eq('status', status);
    if (payment_status) q = q.eq('payment_status', payment_status);
    if (from_date) q = q.gte('sold_at', from_date);
    if (to_date) q = q.lte('sold_at', to_date);

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
      .from('sales_orders')
      .select(
        `*, 
        customers(id, full_name, phone, address), 
        branches(id, name),
        sales_order_items(*, products(name, sku, image_url)),
        sales_payments(*)`,
      )
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy đơn hàng');
    return data;
  }

  async create(dto: CreateSalesOrderDto, actor?: ActivityActor) {
    const { items, ...orderData } = dto;

    orderData.order_no =
      normalizeManualCode(orderData.order_no) ??
      await generateNextCode(this.supabase, {
        table: 'sales_orders',
        column: 'order_no',
        prefix: 'HD',
      });

    const subtotal = items.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unit_price - (item.discount_amount ?? 0);
      return sum + lineTotal;
    }, 0);

    const totalAmount =
      subtotal -
      (orderData.discount_amount ?? 0) +
      (orderData.shipping_fee ?? 0) +
      (orderData.tax_amount ?? 0);

    const { data: order, error: orderErr } = await this.supabase
      .from('sales_orders')
      .insert({ ...orderData, subtotal, total_amount: totalAmount })
      .select()
      .single();

    if (orderErr || !order) throw new Error(orderErr?.message ?? 'Tạo đơn hàng thất bại');

    const itemsToInsert = items.map((item) => ({
      sales_order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      sku: item.sku,
      unit_name: item.unit_name ?? 'cái',
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_amount: item.discount_amount ?? 0,
      line_total: item.quantity * item.unit_price - (item.discount_amount ?? 0),
    }));

    const { error: itemsErr } = await this.supabase
      .from('sales_order_items')
      .insert(itemsToInsert);

    if (itemsErr) throw new Error(itemsErr.message);

    const createdOrder = await this.findOne(order.id);

    await this.activityLogsService.logActivity({
      actor,
      action: 'create',
      entityType: 'sales_order',
      entityId: createdOrder.id,
      description: `${this.activityLogsService.getActorName(actor)} vừa thêm mới đơn hàng ${createdOrder.order_no}`,
      metadata: {
        order_no: createdOrder.order_no,
        total_amount: createdOrder.total_amount,
        branch_id: createdOrder.branch_id,
      },
    });

    return createdOrder;
  }

  async update(id: string, dto: UpdateSalesOrderDto, actor?: ActivityActor) {
    const currentOrder = await this.findOne(id);
    const { items, ...orderData } = dto;

    const orderItems = items ?? currentOrder.sales_order_items ?? [];
    const subtotal = orderItems.reduce((sum: number, item: any) => {
      const quantity = Number(item.quantity ?? 0);
      const unitPrice = Number(item.unit_price ?? 0);
      const discountAmount = Number(item.discount_amount ?? 0);
      return sum + quantity * unitPrice - discountAmount;
    }, 0);

    const discountAmount = Number(orderData.discount_amount ?? currentOrder.discount_amount ?? 0);
    const shippingFee = Number(orderData.shipping_fee ?? currentOrder.shipping_fee ?? 0);
    const taxAmount = Number(orderData.tax_amount ?? currentOrder.tax_amount ?? 0);
    const totalAmount = subtotal - discountAmount + shippingFee + taxAmount;

    const { error } = await this.supabase
      .from('sales_orders')
      .update({
        ...orderData,
        subtotal,
        total_amount: totalAmount,
      })
      .eq('id', id)
      .select('id')
      .single();

    if (error) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (items) {
      const { error: deleteItemsError } = await this.supabase
        .from('sales_order_items')
        .delete()
        .eq('sales_order_id', id);

      if (deleteItemsError) throw new Error(deleteItemsError.message);

      if (items.length > 0) {
        const itemsToInsert = items.map((item) => ({
          sales_order_id: id,
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku,
          unit_name: item.unit_name ?? 'cái',
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount_amount ?? 0,
          line_total: item.quantity * item.unit_price - (item.discount_amount ?? 0),
        }));

        const { error: insertItemsError } = await this.supabase
          .from('sales_order_items')
          .insert(itemsToInsert);

        if (insertItemsError) throw new Error(insertItemsError.message);
      }
    }

    const updatedOrder = await this.findOne(id);
    const isCancelled = orderData.status === 'cancelled' && currentOrder.status !== 'cancelled';

    await this.activityLogsService.logActivity({
      actor,
      action: isCancelled ? 'cancel' : 'update',
      entityType: 'sales_order',
      entityId: updatedOrder.id,
      description: isCancelled
        ? `${this.activityLogsService.getActorName(actor)} vừa hủy đơn hàng ${updatedOrder.order_no}`
        : `${this.activityLogsService.getActorName(actor)} vừa cập nhật đơn hàng ${updatedOrder.order_no}`,
      metadata: {
        order_no: updatedOrder.order_no,
        total_amount: updatedOrder.total_amount,
        branch_id: updatedOrder.branch_id,
      },
    });

    return updatedOrder;
  }

  async cancel(id: string, actor?: ActivityActor) {
    return this.update(id, { status: 'cancelled' }, actor);
  }
}
