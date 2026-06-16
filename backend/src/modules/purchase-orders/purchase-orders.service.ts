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
    const paymentMethod = orderData.payment_method ?? 'cash';
    delete (orderData as any).payment_method;

    orderData.order_no =
      normalizeManualCode(orderData.order_no) ??
      await generateNextCode(this.supabase, {
        table: 'purchase_orders',
        column: 'order_no',
        prefix: CODE_PREFIXES.purchaseOrder,
      });

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);
    const totalAmount = subtotal - (orderData.discount_amount ?? 0);
    const paidAmount = Math.min(Number(orderData.paid_amount ?? 0), totalAmount);
    orderData.paid_amount = paidAmount;
    orderData.payment_status =
      orderData.payment_status ??
      (paidAmount <= 0 ? 'unpaid' : paidAmount >= totalAmount ? 'paid' : 'partial');

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
      received_qty: order.status === 'received' ? item.quantity : 0,
      unit_cost: item.unit_cost,
      line_total: item.quantity * item.unit_cost,
    }));

    const { error: itemsErr } = await this.supabase
      .from('purchase_order_items')
      .insert(itemsToInsert);

    if (itemsErr) throw new Error(itemsErr.message);

    if (order.status === 'received') {
      await this.applyPurchaseStock(order.id, order.branch_id, itemsToInsert);
    }

    if (paidAmount > 0) {
      const paymentNo = await generateNextCode(this.supabase, {
        table: 'supplier_payments',
        column: 'payment_no',
        prefix: CODE_PREFIXES.payment,
      });

      const { error: paymentError } = await this.supabase
        .from('supplier_payments')
        .insert({
          supplier_id: order.supplier_id,
          purchase_order_id: order.id,
          payment_no: paymentNo,
          payment_method: paymentMethod,
          amount: paidAmount,
          note: `Thanh toan phieu nhap ${order.order_no}`,
        });

      if (paymentError) throw new Error(paymentError.message);
    }

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

  private async applyPurchaseStock(
    purchaseOrderId: string,
    branchId: string,
    items: { product_id: string; quantity: number; unit_cost: number }[],
  ) {
    for (const item of items) {
      const quantity = Number(item.quantity ?? 0);
      const unitCost = Number(item.unit_cost ?? 0);
      if (quantity <= 0) continue;

      const { data: currentStock, error: stockError } = await this.supabase
        .from('branch_stocks')
        .select('id, on_hand_qty, average_cost')
        .eq('branch_id', branchId)
        .eq('product_id', item.product_id)
        .maybeSingle();

      if (stockError) throw new Error(stockError.message);

      if (currentStock) {
        const currentQty = Number(currentStock.on_hand_qty ?? 0);
        const currentAverageCost = Number(currentStock.average_cost ?? 0);
        const nextQty = currentQty + quantity;
        const nextAverageCost =
          nextQty > 0
            ? ((currentQty * currentAverageCost) + (quantity * unitCost)) / nextQty
            : unitCost;

        const { error: updateStockError } = await this.supabase
          .from('branch_stocks')
          .update({
            on_hand_qty: nextQty,
            average_cost: nextAverageCost,
          })
          .eq('id', currentStock.id);

        if (updateStockError) throw new Error(updateStockError.message);
      } else {
        const { error: insertStockError } = await this.supabase
          .from('branch_stocks')
          .insert({
            branch_id: branchId,
            product_id: item.product_id,
            on_hand_qty: quantity,
            average_cost: unitCost,
          });

        if (insertStockError) throw new Error(insertStockError.message);
      }

      const { error: transactionError } = await this.supabase
        .from('inventory_transactions')
        .insert({
          branch_id: branchId,
          product_id: item.product_id,
          transaction_type: 'purchase_in',
          reference_type: 'purchase_order',
          reference_id: purchaseOrderId,
          quantity,
          unit_cost: unitCost,
          note: 'Nhap hang tu phieu nhap',
        });

      if (transactionError) throw new Error(transactionError.message);
    }
  }
}
