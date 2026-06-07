import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StaffProfile {
  id: string;
  full_name: string;
  phone?: string;
  role: 'owner' | 'manager' | 'cashier' | 'staff';
  is_active: boolean;
  branch_id?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const staffService = {
  /**
   * Lấy danh sách nhân viên đang hoạt động từ bảng profiles.
   * Truy vấn trực tiếp Supabase vì backend chưa có module staff.
   */
  getActive: async (): Promise<StaffProfile[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, role, is_active, branch_id')
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as StaffProfile[];
  },
};
