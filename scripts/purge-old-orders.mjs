/**
 * purge-old-orders.mjs
 * Xóa đơn hàng và toàn bộ dữ liệu liên quan có ngày bán (sold_at) cũ hơn 90 ngày.
 *
 * Usage:
 *   node scripts/purge-old-orders.mjs --dry-run          # Xem trước, không xóa
 *   node scripts/purge-old-orders.mjs                    # Xóa thật
 *   node scripts/purge-old-orders.mjs --days=60          # Đổi ngưỡng (mặc định 90)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, 'backend/.env'), quiet: true });

const dryRun = process.argv.includes('--dry-run');
const daysArg = process.argv.find((a) => a.startsWith('--days='));
const DAYS = daysArg ? parseInt(daysArg.slice('--days='.length), 10) : 90;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

// Tính ngưỡng ngày
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - DAYS);
const cutoffIso = cutoffDate.toISOString();

async function countWhere(table, column, ids) {
  if (ids.length === 0) return 0;
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .in(column, ids);
  if (error) throw new Error(`count ${table}: ${error.message}`);
  return count ?? 0;
}

async function countTable(table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) throw new Error(`count ${table}: ${error.message}`);
  return count ?? 0;
}

async function fetchOldOrderIds() {
  const ids = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('sales_orders')
      .select('id, order_no, sold_at')
      .lt('sold_at', cutoffIso)
      .order('sold_at', { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`fetch old orders: ${error.message}`);
    if (!data || data.length === 0) break;
    ids.push(...data.map((o) => o.id));
    from += 1000;
    if (data.length < 1000) break;
  }
  return ids;
}

async function fetchOldOrderSample() {
  const { data, error } = await supabase
    .from('sales_orders')
    .select('order_no, sold_at, total_amount')
    .lt('sold_at', cutoffIso)
    .order('sold_at', { ascending: true })
    .limit(5);
  if (error) throw new Error(`sample old orders: ${error.message}`);
  return data ?? [];
}

async function fetchNewestOldOrder() {
  const { data, error } = await supabase
    .from('sales_orders')
    .select('order_no, sold_at')
    .lt('sold_at', cutoffIso)
    .order('sold_at', { ascending: false })
    .limit(1);
  if (error) return null;
  return data?.[0] ?? null;
}

async function deleteInChunks(table, column, ids, chunkSize = 500) {
  let deleted = 0;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).delete().in(column, chunk);
    if (error) throw new Error(`delete ${table}: ${error.message}`);
    deleted += chunk.length;
    console.log(`  ${table}: đã xóa ${deleted}/${ids.length}`);
  }
  return deleted;
}

async function backupOldOrders(orderIds) {
  console.log('💾 Đang backup dữ liệu cũ...');
  const [orders, items, payments, returns, returnItems, invoices] = await Promise.all([
    supabase.from('sales_orders').select('*').in('id', orderIds.slice(0, 5000)),
    supabase.from('sales_order_items').select('*').in('sales_order_id', orderIds.slice(0, 5000)),
    supabase.from('sales_payments').select('*').in('sales_order_id', orderIds.slice(0, 5000)),
    supabase.from('sales_returns').select('*').in('sales_order_id', orderIds.slice(0, 5000)),
    supabase.from('invoices').select('*').in('sales_order_id', orderIds.slice(0, 5000)),
  ]);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(rootDir, 'database/backups');
  await fs.mkdir(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `before-purge-old-orders-${stamp}.json`);

  await fs.writeFile(
    backupPath,
    JSON.stringify(
      {
        cutoffDate: cutoffIso,
        days: DAYS,
        totalOrdersPurged: orderIds.length,
        sales_orders: orders.data ?? [],
        sales_order_items: items.data ?? [],
        sales_payments: payments.data ?? [],
        sales_returns: returns.data ?? [],
        invoices: invoices.data ?? [],
        note: orderIds.length > 5000 ? `Chỉ backup 5000 đơn đầu, tổng cộng ${orderIds.length} đơn bị xóa` : undefined,
      },
      null,
      2
    ),
    'utf8'
  );
  return backupPath;
}

async function main() {
  console.log(`📅 Ngưỡng xóa: đơn hàng có sold_at < ${cutoffIso} (trước ${DAYS} ngày)`);
  console.log(`   Ngày hôm nay: ${new Date().toLocaleDateString('vi-VN')}`);
  console.log(`   Giữ lại từ:  ${cutoffDate.toLocaleDateString('vi-VN')} trở đi\n`);

  // Đếm đơn cũ
  console.log('🔍 Đang phân tích dữ liệu...');
  const oldOrderIds = await fetchOldOrderIds();
  const sample = await fetchOldOrderSample();
  const newest = await fetchNewestOldOrder();

  const [
    totalOrders,
    totalItems,
    totalPayments,
  ] = await Promise.all([
    countTable('sales_orders'),
    countTable('sales_order_items'),
    countTable('sales_payments'),
  ]);

  const relatedItems = oldOrderIds.length > 0
    ? await countWhere('sales_order_items', 'sales_order_id', oldOrderIds)
    : 0;
  const relatedPayments = oldOrderIds.length > 0
    ? await countWhere('sales_payments', 'sales_order_id', oldOrderIds)
    : 0;
  const relatedReturns = oldOrderIds.length > 0
    ? await countWhere('sales_returns', 'sales_order_id', oldOrderIds)
    : 0;
  const relatedInvoices = oldOrderIds.length > 0
    ? await countWhere('invoices', 'sales_order_id', oldOrderIds)
    : 0;

  console.log(`\n📊 Kết quả phân tích:`);
  console.log(`  Tổng đơn hàng hiện tại:          ${totalOrders.toLocaleString()}`);
  console.log(`  Đơn sẽ bị XÓA (> ${DAYS} ngày):       ${oldOrderIds.length.toLocaleString()}`);
  console.log(`  Đơn sẽ GIỮ LẠI (≤ ${DAYS} ngày):      ${(totalOrders - oldOrderIds.length).toLocaleString()}`);
  console.log(`\n  Dữ liệu liên quan sẽ xóa:`);
  console.log(`    sales_order_items:  ${relatedItems.toLocaleString()}`);
  console.log(`    sales_payments:     ${relatedPayments.toLocaleString()}`);
  console.log(`    sales_returns:      ${relatedReturns.toLocaleString()}`);
  console.log(`    invoices:           ${relatedInvoices.toLocaleString()}`);

  if (sample.length > 0) {
    console.log(`\n  📋 Mẫu đơn cũ nhất sẽ bị xóa:`);
    sample.forEach((o) =>
      console.log(
        `    ${o.order_no}  ${new Date(o.sold_at).toLocaleDateString('vi-VN')}  ${Number(o.total_amount).toLocaleString('vi-VN')}đ`
      )
    );
    if (newest) {
      console.log(`  📋 Đơn mới nhất trong nhóm xóa:`);
      console.log(`    ${newest.order_no}  ${new Date(newest.sold_at).toLocaleDateString('vi-VN')}`);
    }
  }

  if (oldOrderIds.length === 0) {
    console.log('\n✅ Không có đơn nào cũ hơn 90 ngày. Không cần làm gì.');
    return;
  }

  if (dryRun) {
    console.log('\n[DRY-RUN] Không thực hiện xóa. Chạy lại không có --dry-run để xóa thật.');
    return;
  }

  // Backup trước khi xóa
  const backupPath = await backupOldOrders(oldOrderIds);
  console.log(`\n✅ Backup xong: ${backupPath}`);

  console.log(`\n🗑️  Bắt đầu xóa ${oldOrderIds.length} đơn và dữ liệu liên quan...\n`);

  // Xóa theo thứ tự đúng với foreign key constraints
  // 1. invoices (references sales_orders)
  if (relatedInvoices > 0) {
    console.log(`🔸 Xóa invoices (${relatedInvoices})...`);
    await deleteInChunks('invoices', 'sales_order_id', oldOrderIds);
  }

  // 2. sales_return_items → sales_returns
  if (relatedReturns > 0) {
    console.log(`🔸 Xóa sales_returns (${relatedReturns})...`);
    // Lấy return IDs trước
    const { data: returnData } = await supabase
      .from('sales_returns')
      .select('id')
      .in('sales_order_id', oldOrderIds.slice(0, 5000));
    const returnIds = (returnData ?? []).map((r) => r.id);
    if (returnIds.length > 0) {
      await deleteInChunks('sales_return_items', 'sales_return_id', returnIds);
    }
    await deleteInChunks('sales_returns', 'sales_order_id', oldOrderIds);
  }

  // 3. sales_payments
  if (relatedPayments > 0) {
    console.log(`🔸 Xóa sales_payments (${relatedPayments})...`);
    await deleteInChunks('sales_payments', 'sales_order_id', oldOrderIds);
  }

  // 4. sales_order_items
  if (relatedItems > 0) {
    console.log(`🔸 Xóa sales_order_items (${relatedItems})...`);
    await deleteInChunks('sales_order_items', 'sales_order_id', oldOrderIds);
  }

  // 5. sales_orders (cuối cùng)
  console.log(`🔸 Xóa sales_orders (${oldOrderIds.length})...`);
  await deleteInChunks('sales_orders', 'id', oldOrderIds);

  // Kiểm tra lại
  const [afterOrders, afterItems, afterPayments] = await Promise.all([
    countTable('sales_orders'),
    countTable('sales_order_items'),
    countTable('sales_payments'),
  ]);

  console.log(`\n✅ Hoàn tất! Kết quả sau khi xóa:`);
  console.log(`  sales_orders:       ${totalOrders.toLocaleString()} → ${afterOrders.toLocaleString()} (xóa ${(totalOrders - afterOrders).toLocaleString()})`);
  console.log(`  sales_order_items:  ${totalItems.toLocaleString()} → ${afterItems.toLocaleString()} (xóa ${(totalItems - afterItems).toLocaleString()})`);
  console.log(`  sales_payments:     ${totalPayments.toLocaleString()} → ${afterPayments.toLocaleString()} (xóa ${(totalPayments - afterPayments).toLocaleString()})`);
}

main().catch((error) => {
  console.error('\n❌ Lỗi:', error.message);
  process.exit(1);
});
