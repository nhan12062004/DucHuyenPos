/**
 * fix-orders-codes.mjs
 * Recovery script: hoàn tất việc đổi mã đơn hàng về định dạng DH0000001
 * Xử lý các đơn còn mã tạm (tmp_...) hoặc chưa được cập nhật.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, 'backend/.env'), quiet: true });

const dryRun = process.argv.includes('--dry-run');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Concurrency thấp để tránh lỗi mạng
const CONCURRENCY = 5;
const CHUNK_SIZE = 200;

function orderCode(index) {
  return `DH${String(index + 1).padStart(7, '0')}`;
}

function naturalCodeCompare(left, right, column) {
  return String(left[column] ?? '').localeCompare(String(right[column] ?? ''), 'vi', {
    numeric: true,
    sensitivity: 'base',
  });
}

async function selectAll(table, columns = '*', orderColumn = 'created_at') {
  const output = [];
  for (let from = 0; ; from += 1000) {
    let query = supabase.from(table).select(columns).range(from, from + 999);
    if (orderColumn) {
      query = query.order(orderColumn, { ascending: true }).order('id', { ascending: true });
    }
    const { data, error } = await query;
    if (error) throw new Error(`select ${table}: ${error.message}`);
    output.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return output;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateWithRetry(id, newCode, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const { error } = await supabase
      .from('sales_orders')
      .update({ order_no: newCode })
      .eq('id', id);
    if (!error) return;
    if (attempt < retries) {
      console.warn(`  retry ${attempt}/${retries} for id=${id}: ${error.message}`);
      await sleep(500 * attempt);
    } else {
      throw new Error(`update sales_orders id=${id}: ${error.message}`);
    }
  }
}

async function runWithConcurrency(items, worker, concurrency = CONCURRENCY) {
  let cursor = 0;
  let completed = 0;

  async function runWorker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
      completed += 1;
      if (completed % 500 === 0 || completed === items.length) {
        console.log(`  updated=${completed}/${items.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
}

async function main() {
  console.log('🔍 Đọc tất cả đơn hàng từ database...');
  const orders = await selectAll('sales_orders', 'id, order_no, sold_at, created_at', 'sold_at');
  console.log(`  Tổng số đơn: ${orders.length}`);

  // Phân loại các đơn
  const tmpOrders = orders.filter((o) => String(o.order_no ?? '').startsWith('tmp_'));
  const correctOrders = orders.filter((o) => /^DH\d{7}$/.test(String(o.order_no ?? '')));
  const otherOrders = orders.filter(
    (o) => !String(o.order_no ?? '').startsWith('tmp_') && !/^DH\d{7}$/.test(String(o.order_no ?? ''))
  );

  console.log(`\n📊 Trạng thái hiện tại:`);
  console.log(`  ✅ Đã đúng định dạng DH...:  ${correctOrders.length}`);
  console.log(`  ⚠️  Mã tạm (tmp_...):         ${tmpOrders.length}`);
  console.log(`  ❓ Mã khác (cần xem lại):     ${otherOrders.length}`);

  if (otherOrders.length > 0) {
    console.log(`\n  Mẫu mã khác:`, otherOrders.slice(0, 5).map((o) => o.order_no));
  }

  // Sắp xếp TẤT CẢ đơn theo thứ tự sold_at để gán mã tuần tự chính xác
  const orderedAll = [...orders].sort((a, b) => naturalCodeCompare(a, b, 'order_no'));

  // Tạo mapping đầy đủ
  const allMappings = orderedAll.map((order, index) => ({
    id: order.id,
    currentCode: order.order_no,
    nextCode: orderCode(index),
  }));

  // Chỉ cập nhật những đơn chưa đúng
  const toUpdate = allMappings.filter((m) => m.currentCode !== m.nextCode);
  const alreadyCorrect = allMappings.filter((m) => m.currentCode === m.nextCode);

  console.log(`\n📝 Kế hoạch cập nhật:`);
  console.log(`  Cần cập nhật: ${toUpdate.length}`);
  console.log(`  Đã đúng:      ${alreadyCorrect.length}`);
  console.log(`\n  Mẫu 5 đơn đầu sẽ đổi:`);
  toUpdate.slice(0, 5).forEach((m) => console.log(`    ${m.currentCode} → ${m.nextCode}`));

  if (dryRun) {
    console.log('\n[DRY-RUN] Không thực hiện thay đổi.');
    return;
  }

  if (toUpdate.length === 0) {
    console.log('\n✅ Tất cả đơn hàng đã đúng định dạng. Không cần làm gì thêm.');
    return;
  }

  console.log(`\n🚀 Bắt đầu cập nhật ${toUpdate.length} đơn hàng (concurrency=${CONCURRENCY})...`);

  // Xử lý theo chunk để tránh quá tải
  for (let i = 0; i < toUpdate.length; i += CHUNK_SIZE) {
    const chunk = toUpdate.slice(i, i + CHUNK_SIZE);
    console.log(`\nChunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(toUpdate.length / CHUNK_SIZE)} (${chunk.length} đơn)`);

    await runWithConcurrency(chunk, async (mapping) => {
      await updateWithRetry(mapping.id, mapping.nextCode);
    });

    // Nghỉ giữa các chunk để tránh rate limit
    if (i + CHUNK_SIZE < toUpdate.length) {
      await sleep(300);
    }
  }

  // Kiểm tra lại kết quả
  console.log('\n🔍 Kiểm tra kết quả...');
  const updated = await selectAll('sales_orders', 'id, order_no', null);
  const stillWrong = updated.filter(
    (o) => !(/^DH\d{7}$/.test(String(o.order_no ?? '')))
  );

  if (stillWrong.length === 0) {
    console.log(`\n✅ Hoàn tất! Tất cả ${updated.length} đơn hàng đã có mã đúng định dạng DH0000001.`);
  } else {
    console.log(`\n⚠️  Vẫn còn ${stillWrong.length} đơn chưa đúng định dạng:`);
    stillWrong.slice(0, 10).forEach((o) => console.log(`  id=${o.id}, order_no=${o.order_no}`));
  }
}

main().catch((error) => {
  console.error('\n❌ Lỗi:', error.message);
  process.exit(1);
});
