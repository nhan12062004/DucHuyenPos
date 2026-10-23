import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { ActivityActor, ActivityLogsService } from '../../common/activity-logs.service.js';
import { CODE_PREFIXES, generateNextCode } from '../../common/code-generator.js';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants.js';
import { CreateConsolidatedInvoiceDto } from './dto/consolidated-invoice.dto.js';

const ORDER_SELECT = `
  id, branch_id, customer_id, order_no, sold_at, status,
  subtotal, discount_amount, shipping_fee, tax_amount, total_amount, paid_amount,
  customers(id, full_name, phone, address),
  branches(id, name),
  sales_order_items(id, product_id, product_name, sku, unit_name, quantity, unit_price, discount_amount, line_total, sort_order)
`;

const CONSOLIDATED_INVOICE_SELECT = `
  *,
  customers(id, full_name, phone, address),
  branches(id, name),
  consolidated_invoice_items(*),
  consolidated_invoice_orders(
    id, sales_order_id, source_order_no, source_sold_at, source_total_amount,
    sales_orders(id, order_no, sold_at, total_amount)
  )
`;

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

@Injectable()
export class ConsolidatedInvoicesService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async findEligible(customerId?: string) {
    if (!customerId) throw new BadRequestException('Thiếu mã khách hàng');

    const { data: orders, error } = await this.supabase
      .from('sales_orders')
      .select(ORDER_SELECT)
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .order('sold_at', { ascending: false });

    if (error) throw new Error(error.message);

    const orderRows = orders ?? [];
    if (!orderRows.length) return [];

    const { data: usedOrders, error: usedOrdersError } = await this.supabase
      .from('consolidated_invoice_orders')
      .select('sales_order_id')
      .in('sales_order_id', orderRows.map((order: any) => order.id));

    if (usedOrdersError) throw new Error(usedOrdersError.message);

    const usedOrderIds = new Set((usedOrders ?? []).map((item: any) => item.sales_order_id));
    return orderRows.filter((order: any) => !usedOrderIds.has(order.id));
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('consolidated_invoices')
      .select(CONSOLIDATED_INVOICE_SELECT)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy hóa đơn tổng hợp');

    return {
      ...data,
      consolidated_invoice_items: [...(data.consolidated_invoice_items ?? [])].sort(
        (left: any, right: any) => Number(left.sort_order) - Number(right.sort_order),
      ),
      consolidated_invoice_orders: [...(data.consolidated_invoice_orders ?? [])].sort(
        (left: any, right: any) => String(left.source_sold_at ?? '').localeCompare(String(right.source_sold_at ?? '')),
      ),
    };
  }

  async findByOrder(salesOrderId: string) {
    const { data, error } = await this.supabase
      .from('consolidated_invoice_orders')
      .select('consolidated_invoice_id')
      .eq('sales_order_id', salesOrderId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data?.consolidated_invoice_id) {
      throw new NotFoundException('Đơn hàng chưa nằm trong hóa đơn tổng hợp');
    }

    return this.findOne(data.consolidated_invoice_id);
  }

  async create(dto: CreateConsolidatedInvoiceDto, actor?: ActivityActor) {
    const orderIds = [...new Set(dto.sales_order_ids)];
    if (orderIds.length < 2) {
      throw new BadRequestException('Cần chọn ít nhất 2 đơn hàng khác nhau để gộp');
    }

    const { data: orders, error: ordersError } = await this.supabase
      .from('sales_orders')
      .select(ORDER_SELECT)
      .in('id', orderIds);

    if (ordersError) throw new Error(ordersError.message);
    if (!orders || orders.length !== orderIds.length) {
      throw new NotFoundException('Có đơn hàng không còn tồn tại');
    }

    if (orders.some((order: any) => order.status !== 'completed')) {
      throw new ConflictException('Chỉ có thể gộp các đơn hàng đã hoàn thành');
    }

    const customerId = orders[0].customer_id;
    const branchId = orders[0].branch_id;
    if (!customerId || orders.some((order: any) => order.customer_id !== customerId)) {
      throw new ConflictException('Các đơn hàng cần thuộc cùng một khách hàng');
    }
    if (orders.some((order: any) => order.branch_id !== branchId)) {
      throw new ConflictException('Các đơn hàng cần thuộc cùng một chi nhánh');
    }

    const { data: usedOrders, error: usedOrdersError } = await this.supabase
      .from('consolidated_invoice_orders')
      .select('sales_order_id, source_order_no')
      .in('sales_order_id', orderIds);

    if (usedOrdersError) throw new Error(usedOrdersError.message);
    if (usedOrders?.length) {
      throw new ConflictException(`Đơn ${usedOrders.map((item: any) => item.source_order_no).join(', ')} đã nằm trong hóa đơn tổng hợp khác`);
    }

    const groupedItems = this.groupItems(orders);
    const totals = orders.reduce(
      (sum: any, order: any) => ({
        subtotal: sum.subtotal + asNumber(order.subtotal),
        discountAmount: sum.discountAmount + asNumber(order.discount_amount),
        shippingFee: sum.shippingFee + asNumber(order.shipping_fee),
        taxAmount: sum.taxAmount + asNumber(order.tax_amount),
        totalAmount: sum.totalAmount + asNumber(order.total_amount),
        paidAmount: sum.paidAmount + asNumber(order.paid_amount),
      }),
      { subtotal: 0, discountAmount: 0, shippingFee: 0, taxAmount: 0, totalAmount: 0, paidAmount: 0 },
    );

    const invoiceNo = await generateNextCode(this.supabase, {
      table: 'consolidated_invoices',
      column: 'invoice_no',
      prefix: CODE_PREFIXES.consolidatedOrder,
    });

    const { data: invoice, error: invoiceError } = await this.supabase
      .from('consolidated_invoices')
      .insert({
        branch_id: branchId,
        customer_id: customerId,
        invoice_no: invoiceNo,
        status: 'issued',
        issued_at: new Date().toISOString(),
        subtotal: totals.subtotal,
        discount_amount: totals.discountAmount,
        shipping_fee: totals.shippingFee,
        tax_amount: totals.taxAmount,
        total_amount: totals.totalAmount,
        paid_amount: totals.paidAmount,
        note: dto.note?.trim() || null,
        created_by: actor?.actorId ?? null,
      })
      .select('id')
      .single();

    if (invoiceError || !invoice) throw new Error(invoiceError?.message ?? 'Không thể tạo hóa đơn tổng hợp');

    try {
      const [{ error: itemError }, { error: sourceError }] = await Promise.all([
        this.supabase.from('consolidated_invoice_items').insert(
          groupedItems.map((item, index) => ({
            consolidated_invoice_id: invoice.id,
            ...item,
            sort_order: index,
          })),
        ),
        this.supabase.from('consolidated_invoice_orders').insert(
          orders.map((order: any) => ({
            consolidated_invoice_id: invoice.id,
            sales_order_id: order.id,
            source_order_no: order.order_no,
            source_sold_at: order.sold_at,
            source_total_amount: asNumber(order.total_amount),
          })),
        ),
      ]);

      if (itemError || sourceError) {
        throw new Error(itemError?.message ?? sourceError?.message ?? 'Không thể lưu chi tiết hóa đơn tổng hợp');
      }
    } catch (error) {
      await this.supabase.from('consolidated_invoices').delete().eq('id', invoice.id);
      throw error;
    }

    const createdInvoice = await this.findOne(invoice.id);
    await this.activityLogsService.logActivity({
      actor,
      action: 'create',
      entityType: 'consolidated_invoice',
      entityId: createdInvoice.id,
      description: `${this.activityLogsService.getActorName(actor)} đã tạo hóa đơn tổng hợp ${createdInvoice.invoice_no}`,
      metadata: {
        invoice_no: createdInvoice.invoice_no,
        source_order_ids: orderIds,
        source_order_nos: orders.map((order: any) => order.order_no),
      },
    });

    return createdInvoice;
  }

  private groupItems(orders: any[]) {
    const groups = new Map<string, any>();

    orders.forEach((order) => {
      (order.sales_order_items ?? []).forEach((item: any) => {
        const key = item.product_id
          ? `product:${item.product_id}|unit:${item.unit_name ?? ''}`
          : `manual:${item.sku ?? ''}|${item.product_name}|unit:${item.unit_name ?? ''}`;
        const quantity = asNumber(item.quantity);
        const grossAmount = quantity * asNumber(item.unit_price);
        const current = groups.get(key) ?? {
          product_id: item.product_id ?? null,
          product_name: item.product_name,
          sku: item.sku ?? null,
          unit_name: item.unit_name ?? 'cái',
          quantity: 0,
          gross_amount: 0,
          discount_amount: 0,
          line_total: 0,
        };

        current.quantity += quantity;
        current.gross_amount += grossAmount;
        current.discount_amount += asNumber(item.discount_amount);
        current.line_total += asNumber(item.line_total) || grossAmount - asNumber(item.discount_amount);
        groups.set(key, current);
      });
    });

    return [...groups.values()].map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      sku: item.sku,
      unit_name: item.unit_name,
      quantity: item.quantity,
      // Weighted unit price preserves totals when a product was sold at different prices.
      unit_price: item.quantity ? Number((item.gross_amount / item.quantity).toFixed(4)) : 0,
      discount_amount: item.discount_amount,
      line_total: item.line_total,
    }));
  }
}
