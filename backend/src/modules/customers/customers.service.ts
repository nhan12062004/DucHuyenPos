import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants.js';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto.js';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto.js';

@Injectable()
export class CustomersService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async findAll(query: PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, status } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = this.supabase
      .from('customers')
      .select(`*, customer_groups(id, name)`, { count: 'exact' })
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
      .select(`*, customer_groups(id, name), customer_addresses(*)`)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy khách hàng');
    return data;
  }

  async create(dto: CreateCustomerDto) {
    const { data, error } = await this.supabase
      .from('customers')
      .insert(dto)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const { data, error } = await this.supabase
      .from('customers')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy khách hàng');
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase
      .from('customers')
      .update({ status: 'inactive' })
      .eq('id', id);

    if (error) throw new Error(error.message);
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
}
