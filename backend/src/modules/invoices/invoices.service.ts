import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { ActivityActor, ActivityLogsService } from '../../common/activity-logs.service.js';
import { CODE_PREFIXES, generateNextCode, normalizeManualCode } from '../../common/code-generator.js';
import { PaginatedResult, PaginationDto } from '../../common/dto/pagination.dto.js';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants.js';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto.js';

const INVOICE_SELECT = `*,
  sales_orders(
    id,
    order_no,
    invoice_no,
    total_amount,
    sold_at,
    customers(id, full_name, phone),
    branches(id, name)
  )`;

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async findAll(query: PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, status } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = this.supabase
      .from('invoices')
      .select(INVOICE_SELECT, { count: 'exact' })
      .range(from, to)
      .order('issued_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (search) {
      q = q.or(`invoice_no.ilike.%${search}%`);
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
      .from('invoices')
      .select(INVOICE_SELECT)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Khong tim thay hoa don dien tu');
    return data;
  }

  async create(dto: CreateInvoiceDto, actor?: ActivityActor) {
    const existing = await this.supabase
      .from('invoices')
      .select('id')
      .eq('sales_order_id', dto.sales_order_id)
      .maybeSingle();

    if (existing.error) throw new Error(existing.error.message);
    if (existing.data?.id) return this.findOne(existing.data.id);

    const { data: order, error: orderError } = await this.supabase
      .from('sales_orders')
      .select('id, order_no, status')
      .eq('id', dto.sales_order_id)
      .single();

    if (orderError || !order) throw new NotFoundException('Khong tim thay don hang de phat hanh hoa don');
    if (order.status === 'cancelled') throw new ConflictException('Khong the phat hanh hoa don cho don da huy');

    const invoiceNo =
      normalizeManualCode(dto.invoice_no) ??
      await generateNextCode(this.supabase, {
        table: 'invoices',
        column: 'invoice_no',
        prefix: CODE_PREFIXES.invoice,
      });

    const { data: invoice, error } = await this.supabase
      .from('invoices')
      .insert({
        sales_order_id: dto.sales_order_id,
        invoice_no: invoiceNo,
        invoice_type: dto.invoice_type ?? 'retail',
        status: 'issued',
        issued_at: new Date().toISOString(),
        note: dto.note,
      })
      .select('id')
      .single();

    if (error || !invoice) throw new Error(error?.message ?? 'Tao hoa don dien tu that bai');

    const { error: updateOrderError } = await this.supabase
      .from('sales_orders')
      .update({ invoice_no: invoiceNo })
      .eq('id', dto.sales_order_id);

    if (updateOrderError) throw new Error(updateOrderError.message);

    const createdInvoice = await this.findOne(invoice.id);

    await this.activityLogsService.logActivity({
      actor,
      action: 'create',
      entityType: 'invoice',
      entityId: createdInvoice.id,
      description: `${this.activityLogsService.getActorName(actor)} vua phat hanh hoa don ${createdInvoice.invoice_no}`,
      metadata: {
        invoice_no: createdInvoice.invoice_no,
        sales_order_id: createdInvoice.sales_order_id,
        order_no: order.order_no,
      },
    });

    return createdInvoice;
  }

  async update(id: string, dto: UpdateInvoiceDto, actor?: ActivityActor) {
    const current = await this.findOne(id);

    const { data, error } = await this.supabase
      .from('invoices')
      .update({
        status: dto.status,
        note: dto.note,
      })
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) throw new NotFoundException('Khong tim thay hoa don dien tu');

    const updatedInvoice = await this.findOne(id);
    await this.activityLogsService.logActivity({
      actor,
      action: dto.status === 'cancelled' && current.status !== 'cancelled' ? 'cancel' : 'update',
      entityType: 'invoice',
      entityId: updatedInvoice.id,
      description: `${this.activityLogsService.getActorName(actor)} vua cap nhat hoa don ${updatedInvoice.invoice_no}`,
      metadata: {
        invoice_no: updatedInvoice.invoice_no,
        status: updatedInvoice.status,
      },
    });

    return updatedInvoice;
  }

  async print(id: string, actor?: ActivityActor) {
    const current = await this.findOne(id);
    if (current.status === 'cancelled') throw new ConflictException('Hoa don da huy khong the in');

    const { data, error } = await this.supabase
      .from('invoices')
      .update({
        status: 'printed',
        printed_at: new Date().toISOString(),
        printed_count: Number(current.printed_count ?? 0) + 1,
      })
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) throw new NotFoundException('Khong tim thay hoa don dien tu');

    const printedInvoice = await this.findOne(id);
    await this.activityLogsService.logActivity({
      actor,
      action: 'print',
      entityType: 'invoice',
      entityId: printedInvoice.id,
      description: `${this.activityLogsService.getActorName(actor)} vua in hoa don ${printedInvoice.invoice_no}`,
      metadata: {
        invoice_no: printedInvoice.invoice_no,
        printed_count: printedInvoice.printed_count,
      },
    });

    return printedInvoice;
  }
}
