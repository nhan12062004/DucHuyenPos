import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, 'backend/.env'), quiet: true });

const dryRun = process.argv.includes('--dry-run');
const runStamp = new Date().toISOString().replace(/[:.]/g, '-');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function code(prefix, index) {
  return `${prefix}${String(index + 1).padStart(7, '0')}`;
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

async function countTable(table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) throw new Error(`count ${table}: ${error.message}`);
  return count ?? 0;
}

async function backupExistingData(tables) {
  const backup = {};
  for (const table of tables) {
    backup[table] = await selectAll(table, '*', null);
  }

  const backupDir = path.join(rootDir, 'database/backups');
  await fs.mkdir(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `before-standardize-primary-codes-${runStamp}.json`);
  await fs.writeFile(backupPath, JSON.stringify(backup, null, 2), 'utf8');
  return backupPath;
}

async function runWithConcurrency(items, worker, concurrency = 25) {
  let cursor = 0;
  let completed = 0;

  async function runWorker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
      completed += 1;

      if (completed % 1000 === 0 || completed === items.length) {
        console.log(`updated=${completed}/${items.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
}

async function updateRows(table, column, mappings, label) {
  if (mappings.length === 0) return;

  console.log(`phase=${label}:temporary count=${mappings.length}`);
  await runWithConcurrency(mappings, async (row) => {
    const { error } = await supabase
      .from(table)
      .update({ [column]: `tmp_${runStamp}_${row.id}` })
      .eq('id', row.id);
    if (error) throw new Error(`temporary ${table}.${column}: ${error.message}`);
  });

  console.log(`phase=${label}:final count=${mappings.length}`);
  await runWithConcurrency(mappings, async (row) => {
    const { error } = await supabase
      .from(table)
      .update({ [column]: row.nextCode })
      .eq('id', row.id);
    if (error) throw new Error(`final ${table}.${column}: ${error.message}`);
  });
}

function duplicateCodes(rows, column) {
  const counts = new Map();
  for (const row of rows) {
    const value = row[column];
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1);
}

async function main() {
  const [products, customers, orders] = await Promise.all([
    selectAll('products', 'id, sku, name, created_at', 'created_at'),
    selectAll('customers', 'id, code, full_name, created_at', 'created_at'),
    selectAll('sales_orders', 'id, order_no, sold_at, created_at', 'sold_at'),
  ]);

  const orderedProducts = [...products].sort((left, right) => naturalCodeCompare(left, right, 'sku'));
  const orderedCustomers = [...customers].sort((left, right) => naturalCodeCompare(left, right, 'code'));

  const productMappings = orderedProducts.map((product, index) => ({
    ...product,
    nextCode: code('SP', index),
  }));
  const customerMappings = orderedCustomers.map((customer, index) => ({
    ...customer,
    nextCode: code('KH', index),
  }));
  const orderMappings = orders.map((order, index) => ({
    ...order,
    nextCode: code('DH', index),
  }));

  const beforeCounts = Object.fromEntries(
    await Promise.all(['products', 'customers', 'sales_orders', 'sales_order_items', 'sales_payments'].map(async (table) => [table, await countTable(table)])),
  );

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? 'dry-run' : 'execute',
        beforeCounts,
        planned: {
          products: productMappings.length,
          customers: customerMappings.length,
          sales_orders: orderMappings.length,
        },
        samples: {
          products: productMappings.slice(0, 5).map((item) => ({ from: item.sku, to: item.nextCode, name: item.name })),
          customers: customerMappings.slice(0, 5).map((item) => ({ from: item.code, to: item.nextCode, name: item.full_name })),
          sales_orders: orderMappings.slice(0, 5).map((item) => ({ from: item.order_no, to: item.nextCode })),
        },
      },
      null,
      2,
    ),
  );

  if (dryRun) return;

  const backupPath = await backupExistingData([
    'products',
    'customers',
    'sales_orders',
    'sales_order_items',
    'sales_payments',
    'invoices',
    'activity_logs',
  ]);
  console.log(`backup=${backupPath}`);

  await updateRows('products', 'sku', productMappings, 'products');
  await updateRows('customers', 'code', customerMappings, 'customers');
  await updateRows('sales_orders', 'order_no', orderMappings, 'sales_orders');

  const updatedProducts = await selectAll('products', 'id, sku', null);
  const updatedCustomers = await selectAll('customers', 'id, code', null);
  const updatedOrders = await selectAll('sales_orders', 'id, order_no', null);

  const duplicateSummary = {
    products: duplicateCodes(updatedProducts, 'sku'),
    customers: duplicateCodes(updatedCustomers, 'code'),
    sales_orders: duplicateCodes(updatedOrders, 'order_no'),
  };

  console.log(
    JSON.stringify(
      {
        after: {
          products: updatedProducts.length,
          customers: updatedCustomers.length,
          sales_orders: updatedOrders.length,
        },
        duplicateSummary,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
