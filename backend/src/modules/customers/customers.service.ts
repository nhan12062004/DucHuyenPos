import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants.js';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto.js';
import { CreateCustomerGroupDto, UpdateCustomerGroupDto } from './dto/customer-group.dto.js';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto.js';
import { generateNextCode, normalizeManualCode } from '../../common/code-generator.js';
import { ActivityActor, ActivityLogsService } from '../../common/activity-logs.service.js';

@Injectable()
export class CustomersService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async findAll(query: PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, status } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = this.supabase
      .from('customers')
      .select('*, customer_groups(id, name)', { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (search) {
      q = q.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,code.ilike.%${search}%`);
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
      .from('customers')
      .select('*, customer_groups(id, name), customer_addresses(*)')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy khách hàng');
    return data;
  }

  async create(dto: CreateCustomerDto, actor?: ActivityActor) {
    const code =
      normalizeManualCode(dto.code) ??
      await generateNextCode(this.supabase, {
        table: 'customers',
        column: 'code',
        prefix: 'KH',
      });

    const { data, error } = await this.supabase
      .from('customers')
      .insert({
        ...dto,
        code,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await this.activityLogsService.logActivity({
      actor,
      action: 'create',
      entityType: 'customer',
      entityId: data.id,
      description: `${this.activityLogsService.getActorName(actor)} vừa thêm mới khách hàng ${data.full_name}`,
      metadata: {
        customer_name: data.full_name,
        customer_code: data.code,
      },
    });

    return data;
  }

  async update(id: string, dto: UpdateCustomerDto, actor?: ActivityActor) {
    const { data, error } = await this.supabase
      .from('customers')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy khách hàng');

    await this.activityLogsService.logActivity({
      actor,
      action: 'update',
      entityType: 'customer',
      entityId: data.id,
      description: `${this.activityLogsService.getActorName(actor)} vừa cập nhật khách hàng ${data.full_name}`,
      metadata: {
        customer_name: data.full_name,
        customer_code: data.code,
      },
    });

    return data;
  }

  async remove(id: string, actor?: ActivityActor) {
    const { data, error } = await this.supabase
      .from('customers')
      .update({ status: 'inactive' })
      .eq('id', id)
      .select('id, full_name, code')
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy khách hàng');

    await this.activityLogsService.logActivity({
      actor,
      action: 'delete',
      entityType: 'customer',
      entityId: data.id,
      description: `${this.activityLogsService.getActorName(actor)} vừa xóa khách hàng ${data.full_name}`,
      metadata: {
        customer_name: data.full_name,
        customer_code: data.code,
      },
    });

    return { message: 'Đã vô hiệu hóa khách hàng' };
  }

  async getDebtSummary() {
    const { data, error } = await this.supabase
      .from('customer_debt_summary')
      .select('*')
      .order('current_debt', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getGroups() {
    const { data, error } = await this.supabase
      .from('customer_groups')
      .select('*')
      .order('name');
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async createGroup(dto: CreateCustomerGroupDto) {
    const normalizedCode = normalizeManualCode(dto.code);
    const derivedCode = dto.name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '')
      .slice(0, 12);
    const generatedCode = await generateNextCode(this.supabase, {
      table: 'customer_groups',
      column: 'code',
      prefix: 'NHOM',
    });
    const code = normalizedCode ?? (derivedCode || generatedCode);

    const { data, error } = await this.supabase
      .from('customer_groups')
      .insert({
        ...dto,
        code,
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Tạo nhóm khách hàng thất bại');
    return data;
  }

  async updateGroup(id: string, dto: UpdateCustomerGroupDto) {
    const payload = {
      ...dto,
      code: dto.code ? normalizeManualCode(dto.code) : undefined,
    };

    const { data, error } = await this.supabase
      .from('customer_groups')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy nhóm khách hàng');
    return data;
  }

  async removeGroup(id: string) {
    const { count, error: customersError } = await this.supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('customer_group_id', id);

    if (customersError) throw new Error(customersError.message);
    if ((count ?? 0) > 0) {
      throw new Error('Nhóm khách hàng đang được sử dụng, không thể xóa');
    }

    const { error } = await this.supabase
      .from('customer_groups')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { message: 'Đã xóa nhóm khách hàng' };
  }
}
