import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(rootDir, 'backend/.env'), quiet: true });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase credentials.');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const cutoff = new Date();
cutoff.setUTCDate(cutoff.getUTCDate() - 30);

const { count, error: countError } = await supabase
  .from('sales_orders')
  .select('id', { count: 'exact', head: true })
  .lt('sold_at', cutoff.toISOString());

if (countError) throw countError;

const { error: deleteError } = await supabase
  .from('sales_orders')
  .delete()
  .lt('sold_at', cutoff.toISOString());

if (deleteError) throw deleteError;

console.log(`Đã xóa vĩnh viễn ${count ?? 0} đơn hàng quá 30 ngày.`);
