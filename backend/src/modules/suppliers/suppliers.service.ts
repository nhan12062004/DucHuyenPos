import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants.js';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto.js';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto.js';
import { CODE_PREFIXES, generateNextCode, normalizeManualCode } from '../../common/code-generator.js';

@Injectable()
export class SuppliersService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async findAll(query: PaginationDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 20, search, status } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let q = this.supabase
      .from('suppliers')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (search) {
      q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,code.ilike.%${search}%`);
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
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy nhà cung cấp');
    return data;
  }

  async create(dto: CreateSupplierDto) {
    const code =
      normalizeManualCode(dto.code) ??
      await generateNextCode(this.supabase, {
        table: 'suppliers',
        column: 'code',
        prefix: CODE_PREFIXES.supplier,
      });

    const { data, error } = await this.supabase
      .from('suppliers')
      .insert({
        ...dto,
        code,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async update(id: string, dto: UpdateSupplierDto) {
    const { data, error } = await this.supabase
      .from('suppliers')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException('Không tìm thấy nhà cung cấp');
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase
      .from('suppliers')
      .update({ status: 'inactive' })
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { message: 'Đã vô hiệu hóa nhà cung cấp' };
  }

  async getDebtSummary() {
    const { data, error } = await this.supabase
      .from('supplier_debt_summary')
      .select('*')
      .order('current_debt', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  }
}
