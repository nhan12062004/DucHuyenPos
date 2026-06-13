import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants.js';

@Injectable()
export class StaffService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async getUsers() {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id, full_name, phone, role, is_active, branch_id')
      .order('full_name', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }
}
