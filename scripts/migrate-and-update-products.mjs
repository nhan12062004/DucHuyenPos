/**
 * migrate-and-update-products.mjs
 *
 * Bước 1: Thêm các cột còn thiếu vào bảng products & branch_stocks (via Supabase SQL API)
 * Bước 2: Đọc file Excel và cập nhật dữ liệu còn thiếu cho các sản phẩm đã import
 *
 * Usage:
 *   node scripts/migrate-and-update-products.mjs --dry-run
 *   node scripts/migrate-and-update-products.mjs
 *   node scripts/migrate-and-update-products.mjs --product-file=C:/path/to/file.xlsx
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, 'backend/.env'), quiet: true });

const dryRun = process.argv.includes('--dry-run');
const skipMigration = process.argv.includes('--skip-migration');
const productFileArg = process.argv.find((a) => a.startsWith('--product-file='));
const DEFAULT_PRODUCT_FILE = path.join(rootDir, 'file/danh_sach_san_pham_16.06.2026_b384c7819a059a5b0b9cfada2c3ebc65.xlsx');
const PRODUCT_FILE = productFileArg
  ? productFileArg.slice('--product-file='.length)
  : DEFAULT_PRODUCT_FILE;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function text(value) {
  const v = String(value ?? '').trim();
  return v || null;
}

function get(row, aliases) {
  for (const alias of aliases) {
    const v = text(row[alias]);
    if (v) return v;
  }
  return null;
}

function numberValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/,/g, '').trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function boolValue(value) {
  const v = text(value);
  if (!v) return false;
  return ['có', 'co', 'yes', 'true', '1'].includes(v.toLowerCase());
}

function productCode(index) {
  return `SP${String(index + 1).padStart(7, '0')}`;
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const k = keyFn(item);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function productName(row, currentBaseName) {
  const variantName = get(row, ['Tên phiên bản sản phẩm', 'Ten phien ban san pham']);
  if (variantName) return variantName;
  const baseName = get(row, ['Tên sản phẩm*', 'Tên sản phẩm', 'Ten san pham']);
  if (baseName) return baseName;
  const attrs = [
    get(row, ['Giá trị thuộc tính 1']),
    get(row, ['Giá trị thuộc tính 2']),
    get(row, ['Giá trị thuộc tính 3']),
  ]
    .filter((v) => v && !['Mặc định', 'Mac dinh', 'Default'].includes(v))
    .join(' ');
  return currentBaseName && attrs ? `${currentBaseName} - ${attrs}` : null;
}

function rowsFromXlsx(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
}

// ─── Migration SQL ────────────────────────────────────────────────────────────

const MIGRATION_SQL = `
-- Thêm các cột còn thiếu vào bảng products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS source_sku       text,
  ADD COLUMN IF NOT EXISTS wholesale_price  numeric(14,2) NOT NULL DEFAULT 0 CHECK (wholesale_price >= 0),
  ADD COLUMN IF NOT EXISTS weight           numeric(10,3),
  ADD COLUMN IF NOT EXISTS weight_unit      text,
  ADD COLUMN IF NOT EXISTS tags             text[],
  ADD COLUMN IF NOT EXISTS tax_applicable   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_price_type   text,
  ADD COLUMN IF NOT EXISTS input_tax_rate   numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS output_tax_rate  numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warranty_applicable  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS warranty_policy  text,
  ADD COLUMN IF NOT EXISTS expiry_warning_days  integer,
  ADD COLUMN IF NOT EXISTS attributes       jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Thêm các cột còn thiếu vào bảng branch_stocks
ALTER TABLE public.branch_stocks
  ADD COLUMN IF NOT EXISTS max_stock      numeric(14,2),
  ADD COLUMN IF NOT EXISTS reorder_point  numeric(14,2);

-- Index hữu ích
CREATE INDEX IF NOT EXISTS idx_products_source_sku ON public.products(source_sku);
`;

async function applyMigration() {
  console.log('🔧 Áp dụng migration SQL...');

  // Supabase hỗ trợ thực thi raw SQL qua endpoint /rest/v1/rpc nếu có function,
  // hoặc qua Management API. Ta dùng Management API (v1).
  const projectRef = new URL(process.env.SUPABASE_URL).hostname.split('.')[0];
  const mgmtUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  const res = await fetch(mgmtUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: MIGRATION_SQL }),
  });

  if (!res.ok) {
    // Thử cách 2: dùng postgres connection qua supabase-js rpc nếu có exec_sql
    console.warn(`  Management API không khả dụng (${res.status}). Thử cách khác...`);
    return false;
  }

  console.log('  ✅ Migration áp dụng thành công qua Management API.');
  return true;
}

async function applyMigrationViaRpc() {
  // Tạo function tạm để chạy SQL, sau đó drop
  const createFnSql = `
    CREATE OR REPLACE FUNCTION _tmp_exec_migration(sql text)
    RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
    BEGIN EXECUTE sql; END; $$;
  `;

  // Gọi qua supabase REST (service role có thể tạo function)
  const url = `${process.env.SUPABASE_URL}/rest/v1/rpc/_tmp_exec_migration`;
  const headers = {
    'Content-Type': 'application/json',
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
  };

  // Tạo function
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql: createFnSql }),
  });

  // Chạy migration
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql: MIGRATION_SQL }),
  });

  return res.ok;
}

// ─── Build products từ Excel (giống import script) ────────────────────────────

function buildProductsFromExcel() {
  const rows = rowsFromXlsx(PRODUCT_FILE);
  const products = [];
  let currentBaseName = null;
  let currentBaseRow = null;

  for (const [index, row] of rows.entries()) {
    const baseName = get(row, ['Tên sản phẩm*', 'Tên sản phẩm', 'Ten san pham']);
    if (baseName) {
      currentBaseName = baseName;
      currentBaseRow = row;
    }

    const sku = get(row, ['Mã SKU*', 'Mã SKU', 'Ma SKU', 'SKU']);
    const name = productName(row, currentBaseName);
    if (!sku || !name) continue;

    // Attributes
    const attrs = [];
    for (let i = 1; i <= 3; i++) {
      const attrName = get(row, [`Thuộc tính ${i}`]);
      const attrValue = get(row, [`Giá trị thuộc tính ${i}`]);
      if (attrName && attrValue && !['Mặc định', 'Mac dinh', 'Default'].includes(attrValue)) {
        attrs.push({ name: attrName, value: attrValue });
      }
    }

    // Tags
    const tagsRaw = get(row, ['Tags', 'Tag']);
    const tags = tagsRaw ? tagsRaw.split(/[,;|]/).map((t) => t.trim()).filter(Boolean) : [];

    // Số ngày cảnh báo
    const expiryRaw = get(row, ['Số ngày cảnh báo hết hạn', 'So ngay canh bao het han']);
    const expiryDays = expiryRaw ? parseInt(expiryRaw, 10) : null;

    // Thuế
    const taxApplicable = boolValue(get(row, ['Áp dụng thuế', 'Ap dung thue']));
    const taxPriceType = get(row, ['Giá áp dụng thuế', 'Gia ap dung thue']);
    const inputTaxRaw = numberValue(get(row, ['Thuế đầu vào (%)', 'Thue dau vao (%)']));
    const outputTaxRaw = numberValue(get(row, ['Thuế đầu ra (%)', 'Thue dau ra (%)']));

    // Bảo hành
    const warrantyApplicable = boolValue(get(row, ['Áp dụng bảo hành', 'Ap dung bao hanh']));
    const warrantyPolicy = get(row, ['Chính sách bảo hành', 'Chinh sach bao hanh']);

    // Khối lượng
    const weight = numberValue(get(row, ['Khối lượng', 'Khoi luong']));
    const weightUnit = get(row, ['Đơn vị khối lượng', 'Don vi khoi luong']);

    // Giá bán buôn
    const wholesalePrice = numberValue(get(row, ['PL_Giá bán buôn', 'PL_Gia ban buon']));

    // Tồn kho
    const maxStock = numberValue(
      get(row, ['LC_CN1_Tồn tối đa', 'LC_CN1_Ton toi da']) ??
        (currentBaseRow ? get(currentBaseRow, ['LC_CN1_Tồn tối đa', 'LC_CN1_Ton toi da']) : null)
    );
    const reorderPoint = numberValue(
      get(row, ['LC_CN1_Điểm lưu kho', 'LC_CN1_Diem luu kho']) ??
        (currentBaseRow ? get(currentBaseRow, ['LC_CN1_Điểm lưu kho', 'LC_CN1_Diem luu kho']) : null)
    );

    // Barcode
    const barcode = get(row, ['Barcode', 'Mã vạch', 'Ma vach']);

    products.push({
      source_sku: sku,
      name,
      barcode,
      wholesale_price: wholesalePrice ?? 0,
      weight,
      weight_unit: weightUnit,
      tags: tags.length > 0 ? tags : null,
      tax_applicable: taxApplicable,
      tax_price_type: taxPriceType,
      input_tax_rate: inputTaxRaw ?? 0,
      output_tax_rate: outputTaxRaw ?? 0,
      warranty_applicable: warrantyApplicable,
      warranty_policy: warrantyPolicy,
      expiry_warning_days: Number.isFinite(expiryDays) ? expiryDays : null,
      attributes: attrs,
      max_stock: maxStock,
      reorder_point: reorderPoint,
    });
  }

  return uniqueBy(products, (p) => p.source_sku).map((p, i) => ({
    ...p,
    sku: productCode(i),   // SP0000001, SP0000002, ...
  }));
}

// ─── Cập nhật products trong DB ───────────────────────────────────────────────

async function updateProducts(products) {
  console.log(`\n📝 Cập nhật ${products.length} sản phẩm...`);
  let updated = 0;
  let errors = 0;
  const CONCURRENCY = 8;
  let cursor = 0;

  async function worker() {
    while (cursor < products.length) {
      const idx = cursor++;
      const p = products[idx];

      const { error } = await supabase
        .from('products')
        .update({
          source_sku: p.source_sku,
          barcode: p.barcode,
          wholesale_price: p.wholesale_price,
          weight: p.weight,
          weight_unit: p.weight_unit,
          tags: p.tags,
          tax_applicable: p.tax_applicable,
          tax_price_type: p.tax_price_type,
          input_tax_rate: p.input_tax_rate,
          output_tax_rate: p.output_tax_rate,
          warranty_applicable: p.warranty_applicable,
          warranty_policy: p.warranty_policy,
          expiry_warning_days: p.expiry_warning_days,
          attributes: p.attributes,
        })
        .eq('sku', p.sku);

      if (error) {
        console.warn(`  ⚠️  ${p.sku} (${p.name}): ${error.message}`);
        errors++;
      } else {
        updated++;
        if (updated % 200 === 0 || updated === products.length) {
          console.log(`  updated=${updated}/${products.length}`);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return { updated, errors };
}

async function updateBranchStocks(products, branchId) {
  // Chỉ update những sản phẩm có max_stock hoặc reorder_point
  const toUpdate = products.filter((p) => p.max_stock !== null || p.reorder_point !== null);
  if (toUpdate.length === 0) {
    console.log('\n📦 Không có dữ liệu tồn tối đa / điểm lưu kho cần cập nhật.');
    return;
  }

  console.log(`\n📦 Cập nhật branch_stocks cho ${toUpdate.length} sản phẩm...`);

  // Lấy product_id từ sku
  const skus = toUpdate.map((p) => p.sku);
  const { data: dbProducts, error } = await supabase
    .from('products')
    .select('id, sku')
    .in('sku', skus);
  if (error) throw new Error(`fetch products: ${error.message}`);

  const idBySku = new Map((dbProducts ?? []).map((p) => [p.sku, p.id]));

  let updated = 0;
  for (const p of toUpdate) {
    const productId = idBySku.get(p.sku);
    if (!productId) continue;

    const patch = {};
    if (p.max_stock !== null) patch.max_stock = p.max_stock;
    if (p.reorder_point !== null) patch.reorder_point = p.reorder_point;

    const { error: err } = await supabase
      .from('branch_stocks')
      .update(patch)
      .eq('product_id', productId)
      .eq('branch_id', branchId);

    if (err) console.warn(`  ⚠️  stock ${p.sku}: ${err.message}`);
    else updated++;
  }

  console.log(`  updated=${updated}/${toUpdate.length}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📊 Đọc file Excel...');
  const products = buildProductsFromExcel();
  console.log(`  Tổng sản phẩm từ Excel: ${products.length}`);

  // Thống kê dữ liệu mới
  const withWholesale = products.filter((p) => p.wholesale_price > 0).length;
  const withWeight    = products.filter((p) => p.weight != null).length;
  const withTax       = products.filter((p) => p.tax_applicable).length;
  const withAttrs     = products.filter((p) => p.attributes.length > 0).length;
  const withTags      = products.filter((p) => p.tags?.length > 0).length;
  const withWarranty  = products.filter((p) => p.warranty_applicable).length;
  const withMaxStock  = products.filter((p) => p.max_stock != null).length;

  console.log(`\n📊 Dữ liệu mới sẽ được cập nhật:`);
  console.log(`  Có giá bán buôn:      ${withWholesale}`);
  console.log(`  Có khối lượng:        ${withWeight}`);
  console.log(`  Áp dụng thuế:         ${withTax}`);
  console.log(`  Có thuộc tính:        ${withAttrs}`);
  console.log(`  Có tags:              ${withTags}`);
  console.log(`  Có bảo hành:          ${withWarranty}`);
  console.log(`  Có tồn tối đa:        ${withMaxStock}`);

  console.log(`\n🔍 Mẫu 3 sản phẩm đầu:`);
  products.slice(0, 3).forEach((p) => {
    console.log(`  ${p.sku} | ${p.source_sku} | ${p.name}`);
    console.log(`         buôn=${p.wholesale_price} | kg=${p.weight}${p.weight_unit ?? ''} | thuế_ra=${p.output_tax_rate}%`);
    console.log(`         attrs=${JSON.stringify(p.attributes)}`);
  });

  if (dryRun) {
    console.log('\n[DRY-RUN] Không thực hiện thay đổi.');
    return;
  }

  // Bước 1: Apply migration
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('BƯỚC 1: Thêm cột vào database');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (skipMigration) {
    console.log('  ⏭️  Bỏ qua migration (--skip-migration).');
  } else {
    const migrated = await applyMigration();
    if (!migrated) {
      console.log('\n⚠️  Không thể tự động thêm cột qua Management API.');
      console.log('   Vui lòng chạy SQL sau trong Supabase Dashboard > SQL Editor:');
      console.log('   (https://supabase.com/dashboard/project/_/sql/new)\n');
      console.log('─'.repeat(60));
      console.log(MIGRATION_SQL);
      console.log('─'.repeat(60));
      console.log('\n📌 Sau khi chạy SQL xong trong Dashboard, chạy lại lệnh:');
      console.log('   node scripts/migrate-and-update-products.mjs --skip-migration');
      process.exit(1);
    }
  }

  // Bước 2: Cập nhật dữ liệu sản phẩm
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('BƯỚC 2: Cập nhật dữ liệu sản phẩm');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const { updated, errors } = await updateProducts(products);

  // Bước 3: Cập nhật branch_stocks
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('BƯỚC 3: Cập nhật tồn kho (max_stock, reorder_point)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Lấy default branch
  const { data: branch } = await supabase
    .from('branches')
    .select('id')
    .eq('is_default', true)
    .maybeSingle();
  const branchId = branch?.id;

  if (branchId) {
    await updateBranchStocks(products, branchId);
  } else {
    console.log('  ⚠️  Không tìm thấy branch mặc định, bỏ qua cập nhật tồn kho.');
  }

  console.log(`\n✅ Hoàn tất!`);
  console.log(`   Sản phẩm đã cập nhật: ${updated}`);
  if (errors > 0) console.log(`   Lỗi: ${errors}`);
}

main().catch((err) => {
  console.error('\n❌ Lỗi:', err.message);
  process.exit(1);
});
