import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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

    if (!dto.sales_order_id) {
      throw new BadRequestException('Phieu tra hang phai gan voi mot don hang goc');
    }

    const { data: order, error: orderError } = await this.supabase
      .from('sales_orders')
      .select('id, order_no, status, branch_id, customer_id, total_amount, paid_amount, payment_status, sales_order_items(id, product_id, product_name, quantity, unit_price, discount_amount, line_total)')
      .eq('id', dto.sales_order_id)
      .single();

    if (orderError || !order) throw new NotFoundException('Khong tim thay don hang goc');
    if (order.status !== 'completed') {
      throw new ConflictException('Chi co the tra hang cho don da hoan thanh');
    }

    const returnedQuantities = await this.getReturnedQuantities(order.id);
    const orderItems = new Map((order.sales_order_items ?? []).map((item: any) => [item.id, item]));
    const requestedQuantities = new Map<string, number>();
    dto.items.forEach((item) => {
      if (item.sales_order_item_id) {
        requestedQuantities.set(
          item.sales_order_item_id,
          (requestedQuantities.get(item.sales_order_item_id) ?? 0) + Number(item.quantity ?? 0),
        );
      }
    });

    const items = dto.items.map((item) => {
      if (!item.sales_order_item_id) {
        throw new BadRequestException('Moi san pham tra phai thuoc mot dong san pham trong don goc');
      }

      const orderItem = orderItems.get(item.sales_order_item_id);
      if (!orderItem) {
        throw new ConflictException('San pham tra khong thuoc don hang goc');
      }

      if (item.product_id && item.product_id !== orderItem.product_id) {
        throw new ConflictException(`San pham ${orderItem.product_name} khong khop voi don goc`);
      }

      const orderedQuantity = Number(orderItem.quantity ?? 0);
      const returnedQuantity = returnedQuantities.get(orderItem.id) ?? 0;
      const remainingQuantity = Math.max(0, orderedQuantity - returnedQuantity);
      const quantity = Number(item.quantity ?? 0);
      const totalRequestedQuantity = requestedQuantities.get(orderItem.id) ?? quantity;
      if (quantity <= 0 || totalRequestedQuantity > remainingQuantity) {
        throw new ConflictException(
          `San pham ${orderItem.product_name} chi con ${remainingQuantity} ${orderItem.unit_name ?? 'cai'} co the tra`,
        );
      }

      const orderedLineTotal =
        Number(orderItem.line_total ?? 0) ||
        orderedQuantity * Number(orderItem.unit_price ?? 0) - Number(orderItem.discount_amount ?? 0);
      const unitPrice = orderedQuantity > 0 ? orderedLineTotal / orderedQuantity : Number(orderItem.unit_price ?? 0);

      return {
        sales_order_item_id: orderItem.id,
        product_id: orderItem.product_id ?? null,
        product_name: orderItem.product_name,
        quantity,
        unit_price: unitPrice,
        line_total: Math.max(0, quantity * unitPrice),
        reason: item.reason ?? dto.reason,
      };
    });

    const returnNo =
      normalizeManualCode(dto.return_no) ??
      await generateNextCode(this.supabase, {
        table: 'sales_returns',
        column: 'return_no',
        prefix: CODE_PREFIXES.salesReturn,
      });

    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    const refundAmount = subtotal;

    const { data: salesReturn, error } = await this.supabase
      .from('sales_returns')
      .insert({
        branch_id: dto.branch_id ?? order.branch_id,
        sales_order_id: dto.sales_order_id,
        customer_id: dto.customer_id ?? order.customer_id,
        return_no: returnNo,
        status: 'pending',
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
        order_no: order.order_no,
        refund_amount: createdReturn.refund_amount,
      },
    });

    return createdReturn;
  }

  async update(id: string, dto: UpdateSalesReturnDto, actor?: ActivityActor) {
    const current = await this.findOne(id);

    if (!dto.status || dto.status === current.status) {
      return current;
    }
    if (current.status === 'cancelled' || current.status === 'refunded' || current.status === 'completed') {
      throw new ConflictException('Phieu tra hang da ket thuc va khong the thay doi');
    }
    if (dto.status === 'cancelled' && current.status !== 'pending') {
      throw new ConflictException('Chi co the huy phieu tra hang dang cho xu ly');
    }
    if (current.status === 'pending' && !['approved', 'cancelled'].includes(dto.status)) {
      throw new ConflictException('Phieu tra hang phai duoc duyet truoc khi hoan tien');
    }
    if (current.status === 'approved' && !['refunded', 'completed'].includes(dto.status)) {
      throw new ConflictException('Phieu tra hang da duyet chi co the hoan tien hoac hoan tat');
    }

    const nextRefundAmount = dto.refund_amount ?? current.refund_amount;
    const processingRecord = { ...current, refund_amount: nextRefundAmount };
    if (['approved', 'completed'].includes(dto.status) && !current.stock_applied_at) {
      await this.applyReturnStock(processingRecord);
    }
    if (['refunded', 'completed'].includes(dto.status) && !current.refund_applied_at) {
      await this.applyRefund(processingRecord);
    }

    const { data, error } = await this.supabase
      .from('sales_returns')
      .update({
        status: dto.status,
        reason: dto.reason ?? current.reason,
        refund_amount: nextRefundAmount,
        note: dto.note ?? current.note,
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

  private async getReturnedQuantities(orderId: string) {
    const { data: returns, error: returnsError } = await this.supabase
      .from('sales_returns')
      .select('id, status')
      .eq('sales_order_id', orderId);

    if (returnsError) throw new Error(returnsError.message);
    const activeReturnIds = (returns ?? [])
      .filter((item: any) => item.status !== 'cancelled')
      .map((item: any) => item.id);
    const quantities = new Map<string, number>();
    if (!activeReturnIds.length) return quantities;

    const { data: returnItems, error: returnItemsError } = await this.supabase
      .from('sales_return_items')
      .select('sales_order_item_id, quantity')
      .in('sales_return_id', activeReturnIds);

    if (returnItemsError) throw new Error(returnItemsError.message);
    (returnItems ?? []).forEach((item: any) => {
      if (!item.sales_order_item_id) return;
      quantities.set(
        item.sales_order_item_id,
        (quantities.get(item.sales_order_item_id) ?? 0) + Number(item.quantity ?? 0),
      );
    });
    return quantities;
  }

  private async applyReturnStock(returnRecord: any) {
    if (returnRecord.sales_order_id) {
      const { data: saleTransactions, error: saleTransactionsError } = await this.supabase
        .from('inventory_transactions')
        .select('id')
        .eq('reference_id', returnRecord.sales_order_id)
        .in('reference_type', ['sales_order', 'sales_order_edit'])
        .eq('transaction_type', 'sale_out')
        .limit(1);
      if (saleTransactionsError) throw new Error(saleTransactionsError.message);
      // Older orders were not connected to stock movements. Do not invent a
      // stock increase for those orders when their goods are returned.
      if (!saleTransactions?.length) {
        const { error } = await this.supabase
          .from('sales_returns')
          .update({ stock_applied_at: new Date().toISOString() })
          .eq('id', returnRecord.id);
        if (error) throw new Error(error.message);
        return;
      }
    }

    for (const item of returnRecord.sales_return_items ?? []) {
      if (!item.product_id || Number(item.quantity ?? 0) <= 0) continue;

      const { data: currentStock, error: stockError } = await this.supabase
        .from('branch_stocks')
        .select('id, on_hand_qty, average_cost')
        .eq('branch_id', returnRecord.branch_id)
        .eq('product_id', item.product_id)
        .maybeSingle();

      if (stockError) throw new Error(stockError.message);
      const quantity = Number(item.quantity);
      if (currentStock) {
        const { error } = await this.supabase
          .from('branch_stocks')
          .update({ on_hand_qty: Number(currentStock.on_hand_qty ?? 0) + quantity })
          .eq('id', currentStock.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await this.supabase.from('branch_stocks').insert({
          branch_id: returnRecord.branch_id,
          product_id: item.product_id,
          on_hand_qty: quantity,
          average_cost: 0,
        });
        if (error) throw new Error(error.message);
      }

      const { error: transactionError } = await this.supabase.from('inventory_transactions').insert({
        branch_id: returnRecord.branch_id,
        product_id: item.product_id,
        transaction_type: 'sale_return_in',
        reference_type: 'sales_return',
        reference_id: returnRecord.id,
        quantity,
        unit_cost: Number(currentStock?.average_cost ?? 0),
        note: `Nhap lai hang tu phieu tra ${returnRecord.return_no}`,
      });
      if (transactionError) throw new Error(transactionError.message);
    }

    const { error } = await this.supabase
      .from('sales_returns')
      .update({ stock_applied_at: new Date().toISOString() })
      .eq('id', returnRecord.id);
    if (error) throw new Error(error.message);
  }

  private async applyRefund(returnRecord: any) {
    if (!returnRecord.sales_order_id) return;

    const { data: order, error: orderError } = await this.supabase
      .from('sales_orders')
      .select('id, total_amount, paid_amount, payment_status')
      .eq('id', returnRecord.sales_order_id)
      .single();
    if (orderError || !order) throw new NotFoundException('Khong tim thay don hang de hoan tien');

    const paidAmount = Math.max(0, Number(order.paid_amount ?? 0));
    const refundAmount = Math.min(paidAmount, Math.max(0, Number(returnRecord.refund_amount ?? 0)));
    const nextPaidAmount = Math.max(0, paidAmount - refundAmount);
    const nextPaymentStatus =
      refundAmount <= 0
        ? order.payment_status
        : nextPaidAmount <= 0
          ? 'refunded'
          : nextPaidAmount >= Number(order.total_amount ?? 0)
            ? 'paid'
            : 'partial';

    const { error: updateError } = await this.supabase
      .from('sales_orders')
      .update({ paid_amount: nextPaidAmount, payment_status: nextPaymentStatus })
      .eq('id', order.id);
    if (updateError) throw new Error(updateError.message);

    const { error: markerError } = await this.supabase
      .from('sales_returns')
      .update({ refund_applied_at: new Date().toISOString() })
      .eq('id', returnRecord.id);
    if (markerError) throw new Error(markerError.message);
  }

  async cancel(id: string, actor?: ActivityActor) {
    return this.update(id, { status: 'cancelled' }, actor);
  }
}
