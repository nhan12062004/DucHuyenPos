import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, 'backend/.env'), quiet: true });

const ORDER_FILE = 'c:/Users/NHAN/Downloads/danh_sach_don_hang_17.06.2026_97a76c039c46a6c0eb7155e644c16bc0.xlsx';
const IMPORT_PREFIX = 'DHIMPORT17062026';
const CUSTOMER_PREFIX = 'KHIMPORT';
const IMPORTED_AT = '2026-06-17';
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

const dryRun = process.argv.includes('--dry-run');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function text(value) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function normalizeName(value) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function numberValue(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const cleaned = String(value).replace(/,/g, '').trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function paymentStatus(totalAmount, paidAmount, status) {
  if (status === 'cancelled') {
    return paidAmount > 0 ? 'refunded' : 'unpaid';
  }
  if (paidAmount <= 0) return 'unpaid';
  if (paidAmount >= totalAmount) return 'paid';
  return 'partial';
}

function orderStatus(value) {
  const normalized = normalizeName(value);
  if (normalized === 'HOAN THANH') return 'completed';
  if (normalized === 'DA HUY') return 'cancelled';
  return 'pending';
}

function deliveryStatus(status) {
  if (status === 'completed') return 'delivered';
  if (status === 'cancelled') return 'cancelled';
  return 'pending_packing';
}

function soldAtFromSequence(sequence) {
  const startUtc = Date.UTC(2026, 5, 17, 1, 0, 0); // 08:00 Asia/Bangkok.
  return new Date(startUtc + sequence * 1000).toISOString();
}

function rowsFromXlsx(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false, range: 1 });
}

function buildOrders() {
  const rows = rowsFromXlsx(ORDER_FILE).filter((row) => text(row.STT));

  return rows.map((row, index) => {
    const stt = String(row.STT).trim();
    const status = orderStatus(row['Trạng thái đơn hàng']);
    const totalAmount = numberValue(row['Tổng tiền']);
    const customerPays = numberValue(row['Khách phải trả']) || totalAmount;
    const cashAmount = numberValue(row['Tiền mặt']);
    const bankAmount = numberValue(row['Chuyển khoản']);
    const codAmount = numberValue(row.COD);
    const pointsAmount = numberValue(row['Thanh toán bằng điểm']);
    const paidAmount = cashAmount + bankAmount + codAmount + pointsAmount;
    const productQuantity = numberValue(row['Số lượng sản phẩm']);

    return {
      sourceRow: index + 4,
      stt,
      order_no: `${IMPORT_PREFIX}-${stt.padStart(6, '0')}`,
      customer_name: text(row['Tên khách hàng']) ?? 'Khách lẻ',
      status,
      payment_status: paymentStatus(customerPays, paidAmount, status),
      sold_at: soldAtFromSequence(index),
      source: 'manual',
      subtotal: totalAmount,
      discount_amount: Math.max(0, totalAmount - customerPays),
      shipping_fee: 0,
      tax_amount: 0,
      total_amount: customerPays,
      paid_amount: Math.min(paidAmount, customerPays),
      note: `Nhập từ file danh sách đơn hàng ${IMPORTED_AT}; STT: ${stt}; số lượng sản phẩm: ${productQuantity}`,
      delivery_method: 'nhan_tai_cua_hang',
      delivery_status: deliveryStatus(status),
      payments: [
        ['cash', cashAmount, 'Tiền mặt'],
        ['bank_transfer', bankAmount, 'Chuyển khoản'],
        ['other', codAmount, 'COD'],
        ['other', pointsAmount, 'Thanh toán bằng điểm'],
      ].filter(([, amount]) => amount > 0),
    };
  });
}

async function countTable(table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) throw new Error(`count ${table}: ${error.message}`);
  return count ?? 0;
}

async function selectAll(table, columns = '*') {
  const output = [];

  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`select ${table}: ${error.message}`);
    output.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  return output;
}

async function assertNoError(result, action) {
  if (result.error) {
    throw new Error(`${action}: ${result.error.message}`);
  }
  return result;
}

async function insertChunks(table, rows, chunkSize = 500, selectColumns = '') {
  const inserted = [];

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    let query = supabase.from(table).insert(chunk);
    if (selectColumns) query = query.select(selectColumns);
    const { data, error } = await query;
    if (error) throw new Error(`insert ${table}: ${error.message}`);
    if (data) inserted.push(...data);
  }

  return inserted;
}

async function getDefaultBranchId() {
  const { data, error } = await supabase
    .from('branches')
    .select('id')
    .eq('status', 'active')
    .eq('is_default', true)
    .maybeSingle();

  if (error) throw new Error(`load default branch: ${error.message}`);
  if (data?.id) return data.id;

  const fallback = await supabase.from('branches').select('id').eq('status', 'active').limit(1).maybeSingle();
  if (fallback.error) throw new Error(`load fallback branch: ${fallback.error.message}`);
  if (!fallback.data?.id) throw new Error('No active branch found');
  return fallback.data.id;
}

async function getRetailCustomerGroupId() {
  const { data, error } = await supabase.from('customer_groups').select('id, name, code');
  if (error) throw new Error(`load customer groups: ${error.message}`);

  return (data ?? []).find((group) => group.code === 'BANLE')?.id ?? null;
}

async function backupExistingData(tables) {
  const backup = {};
  for (const table of tables) {
    backup[table] = await selectAll(table);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(rootDir, 'database/backups');
  await fs.mkdir(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `before-import-sales-orders-${stamp}.json`);
  await fs.writeFile(backupPath, JSON.stringify(backup, null, 2), 'utf8');
  return backupPath;
}

async function loadCustomerMap() {
  const customers = await selectAll('customers', 'id, code, full_name');
  return new Map(customers.map((customer) => [normalizeName(customer.full_name), customer]));
}

async function createMissingCustomers(orders, existingCustomerMap) {
  const retailGroupId = await getRetailCustomerGroupId();
  const uniqueMissingNames = [
    ...new Set(
      orders
        .map((order) => order.customer_name)
        .filter((name) => !existingCustomerMap.has(normalizeName(name))),
    ),
  ];

  if (uniqueMissingNames.length === 0) return [];

  const customerRows = uniqueMissingNames.map((fullName, index) => ({
    code: `${CUSTOMER_PREFIX}${String(index + 1).padStart(6, '0')}`,
    customer_group_id: retailGroupId,
    full_name: fullName,
    status: 'active',
    notes: `Tạo tự động khi nhập danh sách đơn hàng ${IMPORTED_AT}`,
  }));

  return insertChunks('customers', customerRows, 500, 'id, code, full_name');
}

async function main() {
  const orders = buildOrders();
  const orderNos = orders.map((order) => order.order_no);
  const existingOrders = await selectAll('sales_orders', 'id, order_no');
  const existingOrderNos = new Set(existingOrders.map((order) => order.order_no));
  const ordersToImport = orders.filter((order) => !existingOrderNos.has(order.order_no));

  const customerMap = await loadCustomerMap();
  const missingCustomerNames = [
    ...new Set(
      orders
        .map((order) => order.customer_name)
        .filter((name) => !customerMap.has(normalizeName(name))),
    ),
  ];

  const beforeCounts = Object.fromEntries(
    await Promise.all(['sales_orders', 'sales_order_items', 'sales_payments', 'customers'].map(async (table) => [table, await countTable(table)])),
  );

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? 'dry-run' : 'execute',
        beforeCounts,
        fileRows: orders.length,
        uniqueOrderNos: new Set(orderNos).size,
        existingImportOrders: orders.length - ordersToImport.length,
        ordersToImport: ordersToImport.length,
        missingCustomersToCreate: missingCustomerNames.length,
        missingCustomerSample: missingCustomerNames.slice(0, 20),
        statusCounts: orders.reduce((acc, order) => {
          acc[order.status] = (acc[order.status] ?? 0) + 1;
          return acc;
        }, {}),
      },
      null,
      2,
    ),
  );

  if (dryRun) return;

  const backupPath = await backupExistingData(['sales_orders', 'sales_order_items', 'sales_payments', 'customers', 'invoices']);
  console.log(`backup=${backupPath}`);

  const createdCustomers = await createMissingCustomers(ordersToImport, customerMap);
  for (const customer of createdCustomers) {
    customerMap.set(normalizeName(customer.full_name), customer);
  }
  console.log(`created_customers=${createdCustomers.length}`);

  const branchId = await getDefaultBranchId();
  const orderRows = ordersToImport.map(({ sourceRow, stt, customer_name, payments, ...order }) => {
    const customer = customerMap.get(normalizeName(customer_name));
    if (!customer?.id) {
      throw new Error(`Missing customer for order ${order.order_no}: ${customer_name}`);
    }

    return {
      ...order,
      branch_id: branchId,
      customer_id: customer.id,
    };
  });

  const insertedOrders = await insertChunks('sales_orders', orderRows, 400, 'id, order_no, customer_id, sold_at');
  const orderIdByNo = new Map(insertedOrders.map((order) => [order.order_no, order.id]));
  console.log(`created_orders=${insertedOrders.length}`);

  const paymentRows = [];
  for (const order of ordersToImport) {
    const orderId = orderIdByNo.get(order.order_no);
    if (!orderId) continue;

    for (const [paymentMethod, amount, label] of order.payments) {
      paymentRows.push({
        sales_order_id: orderId,
        customer_id: orderRows.find((row) => row.order_no === order.order_no)?.customer_id,
        payment_no: `PT-${order.order_no}-${paymentRows.length + 1}`,
        payment_method: paymentMethod,
        amount,
        paid_at: order.sold_at,
        note: `Nhập từ file đơn hàng: ${label}`,
      });
    }
  }

  await insertChunks('sales_payments', paymentRows, 400);
  console.log(`created_payments=${paymentRows.length}`);

  await assertNoError(
    await supabase.from('sales_orders').delete().eq('id', NIL_UUID),
    'noop verify access',
  );

  const afterCounts = Object.fromEntries(
    await Promise.all(['sales_orders', 'sales_order_items', 'sales_payments', 'customers'].map(async (table) => [table, await countTable(table)])),
  );

  console.log(JSON.stringify({ afterCounts }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
