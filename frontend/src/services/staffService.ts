import { supabase } from '../lib/supabase';
import { api } from './apiClient';

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
   * Lay toan bo user/nhan vien tu bang profiles.
   * profiles la bang public map voi auth.users trong schema hien tai.
   */
  getAllUsers: async (): Promise<StaffProfile[]> => {
    return api.get<StaffProfile[]>('/staff/users');
  },

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
