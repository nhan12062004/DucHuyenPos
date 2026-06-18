import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, 'backend/.env'), quiet: true });

const DEFAULT_PRODUCT_FILE =
  'c:/Users/NHAN/Downloads/danh_sach_san_pham_16.06.2026_b384c7819a059a5b0b9cfada2c3ebc65.xlsx';
const CUSTOMER_FILE =
  'c:/Users/NHAN/Downloads/danh_sach_khach_hang_16.06.2026_7da10a5f1d207ad34c9e0fc00e62221f.xlsx';
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

const dryRun = process.argv.includes('--dry-run');
const productsOnly = process.argv.includes('--products-only');
const productFileArg = process.argv.find((arg) => arg.startsWith('--product-file='));
const PRODUCT_FILE = productFileArg ? productFileArg.slice('--product-file='.length) : DEFAULT_PRODUCT_FILE;

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

function productCode(index) {
  return `SP${String(index + 1).padStart(7, '0')}`;
}

function get(row, aliases) {
  for (const alias of aliases) {
    const value = text(row[alias]);
    if (value) return value;
  }

  return null;
}

function numberValue(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/,/g, '').trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateValue(value) {
  const raw = text(value);
  if (!raw) return null;

  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function rowsFromXlsx(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
}

function productAttributeSuffix(row) {
  return [
    get(row, ['Giá trị thuộc tính 1', 'Gia tri thuoc tinh 1']),
    get(row, ['Giá trị thuộc tính 2', 'Gia tri thuoc tinh 2']),
    get(row, ['Giá trị thuộc tính 3', 'Gia tri thuoc tinh 3']),
  ]
    .filter((value) => value && !['Mặc định', 'Mac dinh', 'Default'].includes(value))
    .join(' ');
}

function productName(row, currentBaseName) {
  const variantName = get(row, ['Tên phiên bản sản phẩm', 'Ten phien ban san pham']);
  if (variantName) return variantName;

  const baseName = get(row, ['Tên sản phẩm*', 'Tên sản phẩm', 'Ten san pham']);
  if (baseName) return baseName;

  const suffix = productAttributeSuffix(row);
  return currentBaseName && suffix ? `${currentBaseName} - ${suffix}` : null;
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const output = [];

  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
}

function buildProducts() {
  const rows = rowsFromXlsx(PRODUCT_FILE);
  const skipped = [];
  const products = [];
  let currentBaseName = null;
  let currentBaseRow = null;

  for (const [index, row] of rows.entries()) {
    const baseName = get(row, ['Tên sản phẩm*', 'Tên sản phẩm', 'Ten san pham']);
    if (baseName) {
      currentBaseName = baseName;
      currentBaseRow = row;
    }

    const inheritedRow = baseName ? null : currentBaseRow;
    const sku = get(row, ['Mã SKU*', 'Mã SKU', 'Ma SKU', 'SKU']);
    const name = productName(row, currentBaseName);

    if (!sku || !name) {
      skipped.push({ row: index + 2, sku, name });
      continue;
    }

    const inputCost = numberValue(get(row, ['PL_Giá nhập', 'PL_Gia nhap']));
    const openingCost = numberValue(get(row, ['LC_CN1_Giá vốn khởi tạo*', 'LC_CN1_Gia von khoi tao*']));
    const costPrice = inputCost > 0 ? inputCost : openingCost;

    products.push({
      sourceRow: index + 2,
      sku,
      barcode: get(row, ['Barcode', 'Mã vạch', 'Ma vach']),
      name,
      unit_name: get(row, ['Đơn vị', 'Don vi']) ?? (inheritedRow ? get(inheritedRow, ['Đơn vị', 'Don vi']) : null) ?? 'CÁI',
      image_url: get(row, ['Ảnh đại diện', 'Anh dai dien']),
      description: get(row, ['Mô tả sản phẩm', 'Mo ta san pham']) ?? (inheritedRow ? get(inheritedRow, ['Mô tả sản phẩm', 'Mo ta san pham']) : null),
      sale_price: numberValue(get(row, ['PL_Giá bán lẻ', 'PL_Gia ban le'])),
      cost_price: costPrice,
      reorder_level: numberValue(get(row, ['LC_CN1_Tồn tối thiểu', 'LC_CN1_Ton toi thieu']) ?? (inheritedRow ? get(inheritedRow, ['LC_CN1_Tồn tối thiểu', 'LC_CN1_Ton toi thieu']) : null)),
      track_inventory: true,
      allow_negative_stock: true,
      status: 'active',
      opening_stock: numberValue(get(row, ['LC_CN1_Tồn kho ban đầu*', 'LC_CN1_Ton kho ban dau*'])),
      opening_cost: openingCost > 0 ? openingCost : costPrice,
    });
  }

  const uniqueProducts = uniqueBy(products, (item) => item.sku);
  return {
    products: uniqueProducts.map((product, index) => ({
      ...product,
      source_sku: product.sku,
      sku: productCode(index),
    })),
    skipped,
  };
}

function buildCustomers(groupIdByCode) {
  const rows = rowsFromXlsx(CUSTOMER_FILE);
  const skipped = [];
  const customers = [];

  for (const [index, row] of rows.entries()) {
    const code = text(row['Mã khách hàng']);
    const fullName = text(row['Tên khách hàng *']);

    if (!code || !fullName) {
      skipped.push({ row: index + 2, code, fullName });
      continue;
    }

    const province = text(row['Tỉnh thành']);
    const district = text(row['Quận huyện']);
    const ward = text(row['Phường xã']);
    const street = text(row['Địa chỉ']);
    const address = [street, ward, district, province].filter(Boolean).join(', ') || null;
    const groupCode = text(row['Mã nhóm khách hàng']);

    customers.push({
      sourceRow: index + 2,
      code,
      customer_group_id: groupCode ? (groupIdByCode.get(groupCode) ?? null) : null,
      full_name: fullName,
      phone: text(row['Điện thoại']),
      email: text(row.Email),
      birthdate: dateValue(row['Ngày sinh']),
      tax_code: text(row['Mã số thuế']),
      address,
      notes: text(row['Mô tả']),
      status: 'active',
    });
  }

  return { customers: uniqueBy(customers, (item) => item.code), skipped };
}

async function assertNoError(result, action) {
  if (result.error) {
    throw new Error(`${action}: ${result.error.message}`);
  }
  return result;
}

async function countTable(table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) throw new Error(`count ${table}: ${error.message}`);
  return count ?? 0;
}

async function selectAll(table) {
  const { data, error } = await supabase.from(table).select('*');
  if (error) throw new Error(`backup ${table}: ${error.message}`);
  return data ?? [];
}

async function deleteAll(table) {
  await assertNoError(await supabase.from(table).delete().neq('id', NIL_UUID), `delete ${table}`);
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

async function upsertChunks(table, rows, options, chunkSize = 500, selectColumns = '') {
  const upserted = [];

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    let query = supabase.from(table).upsert(chunk, options);
    if (selectColumns) query = query.select(selectColumns);
    const { data, error } = await query;
    if (error) throw new Error(`upsert ${table}: ${error.message}`);
    if (data) upserted.push(...data);
  }

  return upserted;
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

async function getCustomerGroupIdByCode() {
  const { data, error } = await supabase.from('customer_groups').select('id, code');
  if (error) throw new Error(`load customer groups: ${error.message}`);
  return new Map((data ?? []).map((group) => [group.code, group.id]));
}

async function backupExistingData(tables) {
  const backup = {};
  for (const table of tables) {
    backup[table] = await selectAll(table);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(rootDir, 'database/backups');
  await fs.mkdir(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `before-import-products-customers-${stamp}.json`);
  await fs.writeFile(backupPath, JSON.stringify(backup, null, 2), 'utf8');
  return backupPath;
}

async function main() {
  const tablesToBackup = [
    'products',
    'branch_stocks',
    'inventory_transactions',
    'customers',
    'customer_addresses',
    'sales_orders',
    'sales_order_items',
    'sales_payments',
    'sales_returns',
    'sales_return_items',
    'invoices',
    'purchase_orders',
    'purchase_order_items',
  ];

  const tablesToClear = [
    'sales_return_items',
    'sales_returns',
    'invoices',
    'sales_payments',
    'sales_order_items',
    'sales_orders',
    'purchase_order_items',
    'purchase_orders',
    'inventory_transactions',
    'branch_stocks',
    'customer_addresses',
    'customers',
    'products',
  ];

  const beforeCounts = Object.fromEntries(
    await Promise.all([...new Set([...tablesToBackup, 'branches', 'customer_groups'])].map(async (table) => [table, await countTable(table)])),
  );

  const branchId = await getDefaultBranchId();
  const groupIdByCode = await getCustomerGroupIdByCode();
  const { products, skipped: skippedProducts } = buildProducts();

  if (productsOnly) {
    console.log(
      JSON.stringify(
        {
          mode: dryRun ? 'products-only dry-run' : 'products-only execute',
          productFile: PRODUCT_FILE,
          beforeCounts,
          defaultBranchId: branchId,
          importCounts: {
            products: products.length,
            skippedProducts,
          },
          sampleProducts: products.slice(0, 8).map((product) => ({
            sku: product.sku,
            name: product.name,
            stock: product.opening_stock,
            sale_price: product.sale_price,
            cost_price: product.cost_price,
          })),
        },
        null,
        2,
      ),
    );

    if (dryRun) return;

    const backupPath = await backupExistingData(['products', 'branch_stocks']);
    console.log(`backup=${backupPath}`);

    const productRows = products.map(({ sourceRow, source_sku, opening_stock, opening_cost, barcode, ...product }) => ({
      ...product,
      default_branch_id: branchId,
    }));
    const upsertedProducts = await upsertChunks(
      'products',
      productRows,
      { onConflict: 'sku' },
      400,
      'id, sku, cost_price',
    );
    const productBySku = new Map(upsertedProducts.map((product) => [product.sku, product]));

    const stockRows = products.map((product) => {
      const upserted = productBySku.get(product.sku);
      if (!upserted) throw new Error(`Missing upserted product for sku ${product.sku}`);

      return {
        branch_id: branchId,
        product_id: upserted.id,
        on_hand_qty: product.opening_stock,
        reserved_qty: 0,
        average_cost: product.opening_cost,
      };
    });
    await upsertChunks('branch_stocks', stockRows, { onConflict: 'branch_id,product_id' }, 400);

    const afterCounts = Object.fromEntries(
      await Promise.all(['products', 'branch_stocks', 'customers', 'sales_orders', 'sales_order_items'].map(async (table) => [table, await countTable(table)])),
    );

    console.log(JSON.stringify({ upsertedProducts: upsertedProducts.length, upsertedStocks: stockRows.length, afterCounts }, null, 2));
    return;
  }

  const { customers, skipped: skippedCustomers } = buildCustomers(groupIdByCode);

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? 'dry-run' : 'execute',
        beforeCounts,
        defaultBranchId: branchId,
        importCounts: {
          products: products.length,
          customers: customers.length,
          skippedProducts,
          skippedCustomers,
        },
      },
      null,
      2,
    ),
  );

  if (dryRun) return;

  const backupPath = await backupExistingData(tablesToBackup);
  console.log(`backup=${backupPath}`);

  for (const table of tablesToClear) {
    await deleteAll(table);
    console.log(`cleared=${table}`);
  }

  const productRows = products.map(({ sourceRow, source_sku, opening_stock, opening_cost, ...product }) => ({
    ...product,
    default_branch_id: branchId,
  }));
  const insertedProducts = await insertChunks('products', productRows, 400, 'id, sku, cost_price');
  const productBySku = new Map(insertedProducts.map((product) => [product.sku, product]));

  const stockRows = products.map((product) => {
    const inserted = productBySku.get(product.sku);
    if (!inserted) throw new Error(`Missing inserted product for sku ${product.sku}`);

    return {
      branch_id: branchId,
      product_id: inserted.id,
      on_hand_qty: product.opening_stock,
      reserved_qty: 0,
      average_cost: product.opening_cost,
    };
  });
  await insertChunks('branch_stocks', stockRows, 400);

  const customerRows = customers.map(({ sourceRow, ...customer }) => customer);
  await insertChunks('customers', customerRows, 400);

  const afterCounts = Object.fromEntries(
    await Promise.all(['products', 'branch_stocks', 'customers', 'sales_orders', 'sales_order_items'].map(async (table) => [table, await countTable(table)])),
  );

  console.log(JSON.stringify({ afterCounts }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
