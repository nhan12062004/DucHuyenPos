import { ConflictException, Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants.js';
import { CreateSalesOrderDto, UpdateSalesOrderDto } from './dto/sales-order.dto.js';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto.js';
import { CODE_PREFIXES, generateNextCode, normalizeManualCode } from '../../common/code-generator.js';
import { ActivityActor, ActivityLogsService } from '../../common/activity-logs.service.js';
import { resolveDeliveryFields } from './delivery-fields.js';

@Injectable()
export class SalesOrdersService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async findAll(
    query: PaginationDto & {
      branch_id?: string;
      from_date?: string;
      to_date?: string;
      payment_status?: string;
      payment_status_in?: string;
      delivery_status?: string;
      delivery_method?: string;
      status_in?: string;
      delivery_issue?: string;
      include_items?: string | boolean;
    },
  ): Promise<PaginatedResult<any>> {
    await this.deleteExpiredSalesOrders();

    const {
      page = 1,
      limit = 20,
      search,
      status,
      status_in,
      branch_id,
      payment_status,
      payment_status_in,
      from_date,
      to_date,
      delivery_status,
      delivery_method,
      delivery_issue,
      include_items,
    } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const shouldIncludeItems = include_items !== false && include_items !== 'false';
    const selectFields = shouldIncludeItems
      ? `*, 
        customers(id, full_name, phone), 
        branches(id, name),
        cashier:cashier_id(id, full_name, branch_id),
        sales_order_items(*, products(name, sku))`
      : `id,
        branch_id,
        order_no,
        invoice_no,
        customer_id,
        cashier_id,
        sold_at,
        source,
        status,
        payment_status,
        subtotal,
        discount_amount,
        shipping_fee,
        tax_amount,
        total_amount,
        paid_amount,
        note,
        delivery_address,
        delivery_method,
        delivery_status,
        delivery_due_at,
        created_at,
        customers(id, full_name, phone), 
        branches(id, name),
        cashier:cashier_id(id, full_name, branch_id)`;

    let q = this.supabase
      .from('sales_orders')
      .select(selectFields, { count: 'exact' })
      .range(from, to)
      .order('sold_at', { ascending: false });

    if (search) {
      const safeSearch = search.trim().replace(/[%,()]/g, '');
      const [customerIds, cashierIds] = await Promise.all([
        this.findCustomerIdsBySearch(safeSearch),
        this.findCashierIdsBySearch(safeSearch),
      ]);
      const orderSearch = `order_no.ilike.%${safeSearch}%,invoice_no.ilike.%${safeSearch}%`;
      const searchFilters = [orderSearch];
      if (customerIds.length > 0) searchFilters.push(`customer_id.in.(${customerIds.join(',')})`);
      if (cashierIds.length > 0) searchFilters.push(`cashier_id.in.(${cashierIds.join(',')})`);
      q = q.or(searchFilters.join(','));
    }
    if (branch_id) q = q.eq('branch_id', branch_id);
    if (status) q = q.eq('status', status);
    if (!status && status_in) q = q.in('status', this.parseCsv(status_in));
    if (payment_status) q = q.eq('payment_status', payment_status);
    if (!payment_status && payment_status_in) q = q.in('payment_status', this.parseCsv(payment_status_in));
    if (delivery_status) q = q.eq('delivery_status', delivery_status);
    if (!delivery_status && delivery_issue === 'cancelled_delivery') {
      q = q.or('status.eq.cancelled,delivery_status.eq.cancelled');
    }
    if (delivery_method) q = q.eq('delivery_method', delivery_method);
    if (from_date) q = q.gte('sold_at', from_date);
    if (to_date) q = q.lte('sold_at', to_date);

    const { data, error, count } = await q;
    if (error) throw new Error(error.message);

    return {
      data: (data ?? []).map((order: any) => this.sortOrderItems(order)),
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }

  private async deleteExpiredSalesOrders() {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - 90);

    const { error } = await this.supabase
      .from('sales_orders')
      .delete()
      .lt('sold_at', cutoff.toISOString());

    if (error) {
      throw new Error(`Không thể xóa đơn hàng quá 90 ngày: ${error.message}`);
    }
  }

  async getProcessingSummary(days = 90) {
    const safeDays = Math.min(365, Math.max(1, Number(days) || 90));
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - safeDays);

    const summary = {
      pending: this.createSummaryBucket(),
      unpaid: this.createSummaryBucket(),
      packing: this.createSummaryBucket(),
      waitingPickup: this.createSummaryBucket(),
      delivering: this.createSummaryBucket(),
      cancelledDelivery: this.createSummaryBucket(),
    };

    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await this.supabase
        .from('sales_orders')
        .select('status, payment_status, delivery_status, total_amount')
        .gte('sold_at', fromDate.toISOString())
        .range(from, from + pageSize - 1);

      if (error) throw new Error(error.message);

      const rows = data ?? [];
      rows.forEach((order: any) => {
        if (order.status === 'draft') {
          this.addToSummaryBucket(summary.pending, order.total_amount);
        }
        if (
          order.status !== 'cancelled' &&
          (order.payment_status === 'unpaid' || order.payment_status === 'partial')
        ) {
          this.addToSummaryBucket(summary.unpaid, order.total_amount);
        }
        if (order.status === 'pending' && order.delivery_status === 'pending_packing') {
          this.addToSummaryBucket(summary.packing, order.total_amount);
        }
        if (order.status === 'pending' && order.delivery_status === 'waiting_pick_up') {
          this.addToSummaryBucket(summary.waitingPickup, order.total_amount);
        }
        if (order.status === 'pending' && order.delivery_status === 'delivering') {
          this.addToSummaryBucket(summary.delivering, order.total_amount);
        }
        if (order.status === 'cancelled' || order.delivery_status === 'cancelled') {
          this.addToSummaryBucket(summary.cancelledDelivery, order.total_amount);
        }
      });

      if (rows.length < pageSize) break;
    }

    return {
      days: safeDays,
      ...summary,
    };
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('sales_orders')
      .select(
        `*, 
        customers(id, full_name, phone, address), 
        branches(id, name),
        cashier:cashier_id(id, full_name, branch_id),
        sales_order_items(*, products(name, sku, image_url)),
        sales_payments(*)`,
      )
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy đơn hàng');
    return this.sortOrderItems(data);
  }

  async create(dto: CreateSalesOrderDto, actor?: ActivityActor) {
    const { items, ...orderData } = dto;
    const deliveryFields = resolveDeliveryFields(orderData);

    if (!orderData.customer_id) {
      orderData.customer_id = await this.getWalkInCustomerId();
    }

    orderData.order_no =
      normalizeManualCode(orderData.order_no) ??
      await generateNextCode(this.supabase, {
        table: 'sales_orders',
        column: 'order_no',
        prefix: CODE_PREFIXES.salesOrder,
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
      .insert({ ...orderData, ...deliveryFields, subtotal, total_amount: totalAmount })
      .select()
      .single();

    if (orderErr || !order) throw new Error(orderErr?.message ?? 'Tạo đơn hàng thất bại');

    const itemsToInsert = items.map((item, index) => ({
      sales_order_id: order.id,
      product_id: item.product_id || null,
      product_name: item.product_name,
      sku: item.sku,
      unit_name: item.unit_name ?? 'cái',
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_amount: item.discount_amount ?? 0,
      line_total: item.quantity * item.unit_price - (item.discount_amount ?? 0),
      sort_order: index,
    }));

    const { error: itemsErr } = await this.supabase
      .from('sales_order_items')
      .insert(itemsToInsert);

    if (itemsErr) throw new Error(itemsErr.message);

    try {
      if (order.status === 'completed') {
        await this.syncStockForOrder(order, [], itemsToInsert, 'sales_order');
      }
    } catch (stockError) {
      await this.supabase.from('sales_orders').delete().eq('id', order.id);
      throw stockError;
    }

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
    if (currentOrder.status === 'cancelled') {
      throw new ConflictException('Don hang da huy khong the chinh sua');
    }

    const { data: activeReturns, error: returnsError } = await this.supabase
      .from('sales_returns')
      .select('id')
      .eq('sales_order_id', id)
      .neq('status', 'cancelled');
    if (returnsError) throw new Error(returnsError.message);
    if (activeReturns?.length) {
      throw new ConflictException('Don hang da co phieu tra hang, khong the chinh sua');
    }

    const { items, ...orderData } = dto;
    const nextStatus = orderData.status ?? currentOrder.status;
    if (currentOrder.status === 'completed' && nextStatus === 'pending') {
      throw new ConflictException('Don hang da hoan thanh khong the chuyen lai dang cho xu ly');
    }
    if (orderData.order_no) {
      orderData.order_no = normalizeManualCode(orderData.order_no) ?? currentOrder.order_no;
    }
    const deliveryFields = resolveDeliveryFields({
      status: orderData.status ?? currentOrder.status,
      delivery_method: orderData.delivery_method ?? currentOrder.delivery_method,
      delivery_status: orderData.delivery_status ?? currentOrder.delivery_status,
      note: orderData.note ?? currentOrder.note,
    });

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
    const paidAmount = Math.min(
      Math.max(0, Number(orderData.paid_amount ?? currentOrder.paid_amount ?? 0)),
      Math.max(0, totalAmount),
    );
    const paymentStatus =
      paidAmount <= 0 ? 'unpaid' : paidAmount >= totalAmount ? 'paid' : 'partial';
    orderData.paid_amount = paidAmount;
    orderData.payment_status = paymentStatus;

    const { error } = await this.supabase
      .from('sales_orders')
      .update({
        ...orderData,
        ...deliveryFields,
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
        const itemsToInsert = items.map((item, index) => ({
          sales_order_id: id,
          product_id: item.product_id || null,
          product_name: item.product_name,
          sku: item.sku,
          unit_name: item.unit_name ?? 'cái',
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount_amount ?? 0,
          line_total: item.quantity * item.unit_price - (item.discount_amount ?? 0),
          sort_order: index,
        }));

        const { error: insertItemsError } = await this.supabase
          .from('sales_order_items')
          .insert(itemsToInsert);

        if (insertItemsError) throw new Error(insertItemsError.message);
      }
    }

    const updatedOrder = await this.findOne(id);
    await this.syncStockForOrder(
      currentOrder,
      currentOrder.status === 'completed' ? currentOrder.sales_order_items ?? [] : [],
      nextStatus === 'completed' ? orderItems : [],
      'sales_order_edit',
    );
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

  private async syncStockForOrder(
    order: { id: string; branch_id: string; status?: string },
    previousItems: any[],
    nextItems: any[],
    referenceType: string,
  ) {
    const { data: existingTransactions, error: transactionsError } = await this.supabase
      .from('inventory_transactions')
      .select('id')
      .eq('reference_id', order.id)
      .in('reference_type', ['sales_order', 'sales_order_edit'])
      .eq('transaction_type', 'sale_out');
    if (transactionsError) throw new Error(transactionsError.message);

    const isNewCompletedSale = !previousItems.length && nextItems.length > 0 && !existingTransactions?.length;
    if (!existingTransactions?.length && !isNewCompletedSale) return;

    const quantities = new Map<string, number>();
    previousItems.forEach((item: any) => {
      if (item.product_id) quantities.set(item.product_id, (quantities.get(item.product_id) ?? 0) - Number(item.quantity ?? 0));
    });
    nextItems.forEach((item: any) => {
      if (item.product_id) quantities.set(item.product_id, (quantities.get(item.product_id) ?? 0) + Number(item.quantity ?? 0));
    });

    const productIds = [...quantities.keys()];
    if (!productIds.length) return;
    const { data: products, error: productsError } = await this.supabase
      .from('products')
      .select('id, track_inventory, allow_negative_stock')
      .in('id', productIds);
    if (productsError) throw new Error(productsError.message);
    const productSettings = new Map((products ?? []).map((product: any) => [product.id, product]));

    for (const [productId, delta] of quantities) {
      if (!delta || productSettings.get(productId)?.track_inventory === false) continue;

      const { data: stock, error: stockError } = await this.supabase
        .from('branch_stocks')
        .select('id, on_hand_qty, average_cost')
        .eq('branch_id', order.branch_id)
        .eq('product_id', productId)
        .maybeSingle();
      if (stockError) throw new Error(stockError.message);

      const currentQuantity = Number(stock?.on_hand_qty ?? 0);
      const nextQuantity = currentQuantity - delta;
      if (delta > 0 && nextQuantity < 0 && productSettings.get(productId)?.allow_negative_stock !== true) {
        throw new ConflictException(`Khong du ton kho cho san pham ${productId}`);
      }

      if (stock) {
        const { error } = await this.supabase
          .from('branch_stocks')
          .update({ on_hand_qty: nextQuantity })
          .eq('id', stock.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await this.supabase.from('branch_stocks').insert({
          branch_id: order.branch_id,
          product_id: productId,
          on_hand_qty: nextQuantity,
          average_cost: 0,
        });
        if (error) throw new Error(error.message);
      }

      const { error: transactionError } = await this.supabase.from('inventory_transactions').insert({
        branch_id: order.branch_id,
        product_id: productId,
        transaction_type: delta > 0 ? 'sale_out' : 'sale_return_in',
        reference_type: referenceType,
        reference_id: order.id,
        quantity: Math.abs(delta),
        unit_cost: Number(stock?.average_cost ?? 0),
        note: delta > 0 ? `Xuat kho cho don ${order.id}` : `Nhap lai kho khi sua don ${order.id}`,
      });
      if (transactionError) throw new Error(transactionError.message);
    }
  }

  async cancel(id: string, actor?: ActivityActor) {
    return this.update(id, { status: 'cancelled' }, actor);
  }

  private async getWalkInCustomerId() {
    const { data: existingCustomer, error: existingCustomerError } = await this.supabase
      .from('customers')
      .select('id')
      .eq('full_name', 'Khách lẻ')
      .maybeSingle();

    if (existingCustomerError) throw new Error(existingCustomerError.message);
    if (existingCustomer?.id) return existingCustomer.id;

    const customerGroupId = await this.getRetailCustomerGroupId();
    const code = await generateNextCode(this.supabase, {
      table: 'customers',
      column: 'code',
      prefix: CODE_PREFIXES.customer,
    });

    const { data: createdCustomer, error: createCustomerError } = await this.supabase
      .from('customers')
      .insert({
        code,
        full_name: 'Khách lẻ',
        customer_group_id: customerGroupId,
        status: 'active',
        notes: 'Khách mặc định cho đơn hàng không có thông tin khách hàng',
      })
      .select('id')
      .single();

    if (createCustomerError || !createdCustomer) {
      throw new Error(createCustomerError?.message ?? 'Không tạo được khách hàng mặc định');
    }

    return createdCustomer.id;
  }

  private async getRetailCustomerGroupId() {
    const { data, error } = await this.supabase
      .from('customer_groups')
      .select('id, name')
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    const retailGroup = (data ?? []).find((group: any) => {
      const normalizedName = String(group.name ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

      return normalizedName.includes('ban le');
    });

    return retailGroup?.id;
  }

  private parseCsv(value: string) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private sortOrderItems<T extends { sales_order_items?: any[] }>(order: T): T {
    if (!order.sales_order_items) return order;

    return {
      ...order,
      sales_order_items: order.sales_order_items
        .map((item, originalIndex) => ({ item, originalIndex }))
        .sort((left, right) => {
          const leftPosition = Number(left.item.sort_order);
          const rightPosition = Number(right.item.sort_order);
          const leftHasPosition = Number.isInteger(leftPosition);
          const rightHasPosition = Number.isInteger(rightPosition);

          if (leftHasPosition && rightHasPosition && leftPosition !== rightPosition) {
            return leftPosition - rightPosition;
          }
          if (leftHasPosition !== rightHasPosition) {
            return leftHasPosition ? -1 : 1;
          }
          return left.originalIndex - right.originalIndex;
        })
        .map(({ item }) => item),
    };
  }

  private createSummaryBucket() {
    return {
      count: 0,
      total_amount: 0,
    };
  }

  private addToSummaryBucket(bucket: { count: number; total_amount: number }, amount: unknown) {
    bucket.count += 1;
    bucket.total_amount += Number(amount || 0);
  }

  private async findCustomerIdsBySearch(search: string) {
    if (!search) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('customers')
      .select('id')
      .or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
      .limit(100);

    if (error) throw new Error(error.message);
    return (data ?? []).map((customer: any) => customer.id).filter(Boolean);
  }

  private async findCashierIdsBySearch(search: string) {
    if (!search) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .select('id')
      .or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
      .limit(100);

    if (error) throw new Error(error.message);
    return (data ?? []).map((profile: any) => profile.id).filter(Boolean);
  }
}
