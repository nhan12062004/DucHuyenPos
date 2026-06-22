-- DucHuyenPos schema v1
-- Target stack: React + TypeScript + Vite / NestJS + TypeScript / Supabase
-- Database: PostgreSQL (Supabase)
--
-- Scope of this schema:
-- - Products, suppliers, customers, customer groups
-- - Sales orders and order items
-- - Customer payments and debts
-- - Purchase orders and supplier payments
-- - Sales returns
-- - Inventory by branch and inventory movements
-- - Invoice issuance/printing metadata

create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  phone text,
  address text,
  is_default boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  full_name text not null,
  phone text,
  role text not null default 'staff' check (role in ('owner', 'manager', 'cashier', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  group_type text not null default 'fixed' check (group_type in ('fixed', 'dynamic')),
  description text,
  condition_match_mode text check (condition_match_mode in ('any', 'all')),
  condition_group text check (condition_group in ('profile', 'purchase', 'points')),
  default_price_type text check (default_price_type in ('retail', 'wholesale')),
  discount_rate numeric(5,2) not null default 0 check (discount_rate >= 0 and discount_rate <= 100),
  payment_method text check (payment_method in ('cash', 'bank_transfer', 'debt')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_group_id uuid references public.customer_groups(id) on delete set null,
  full_name text not null,
  phone text,
  email citext,
  birthdate date,
  company_name text,
  tax_code text,
  address text,
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  contact_name text,
  contact_phone text,
  address_line text not null,
  ward text,
  district text,
  province text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  phone text,
  email citext,
  address text,
  tax_code text,
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null unique,
  parent_id uuid references public.product_categories(id) on delete set null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  barcode text unique,
  name text not null,
  product_category_id uuid references public.product_categories(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  default_supplier_id uuid references public.suppliers(id) on delete set null,
  default_branch_id uuid references public.branches(id) on delete set null,
  unit_name text not null default 'cai',
  image_url text,
  description text,
  source_sku text,
  wholesale_price numeric(14,2) not null default 0 check (wholesale_price >= 0),
  weight numeric(10,3),
  weight_unit text,
  tags text[],
  tax_applicable boolean not null default false,
  tax_price_type text,
  input_tax_rate numeric(5,2) not null default 0,
  output_tax_rate numeric(5,2) not null default 0,
  warranty_applicable boolean not null default false,
  warranty_policy text,
  expiry_warning_days integer,
  attributes jsonb not null default '[]'::jsonb,
  unit_conversions jsonb not null default '[]'::jsonb,
  sale_price numeric(14,2) not null default 0 check (sale_price >= 0),
  cost_price numeric(14,2) not null default 0 check (cost_price >= 0),
  reorder_level numeric(14,2) not null default 0 check (reorder_level >= 0),
  track_inventory boolean not null default true,
  allow_negative_stock boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.branch_stocks (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  on_hand_qty numeric(14,2) not null default 0,
  reserved_qty numeric(14,2) not null default 0,
  available_qty numeric(14,2) generated always as (on_hand_qty - reserved_qty) stored,
  average_cost numeric(14,2) not null default 0,
  max_stock numeric(14,2),
  reorder_point numeric(14,2),
  updated_at timestamptz not null default now(),
  unique (branch_id, product_id)
);

create table if not exists public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  order_no text not null unique,
  invoice_no text unique,
  customer_id uuid references public.customers(id) on delete set null,
  cashier_id uuid references public.profiles(id) on delete set null,
  sold_at timestamptz not null default now(),
  source text not null default 'pos' check (source in ('pos', 'web', 'phone', 'manual')),
  status text not null default 'completed' check (status in ('draft', 'pending', 'completed', 'cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'partial', 'paid', 'refunded')),
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  shipping_fee numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  note text,
  delivery_address text,
  delivery_method text not null default 'nhan_tai_cua_hang' check (
    delivery_method in ('hang_van_chuyen', 'van_chuyen_ngoai', 'nhan_tai_cua_hang', 'giao_hang_sau')
  ),
  delivery_status text not null default 'delivered' check (
    delivery_status in ('pending_packing', 'waiting_pick_up', 'delivering', 'delivered', 'cancelled')
  ),
  delivery_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references public.sales_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete restrict,
  product_name text not null,
  sku text,
  unit_name text not null default 'cai',
  quantity numeric(14,2) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  discount_amount numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_payments (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references public.sales_orders(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  payment_no text not null unique,
  payment_method text not null default 'cash' check (payment_method in ('cash', 'bank_transfer', 'card', 'ewallet', 'other')),
  amount numeric(14,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_returns (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  sales_order_id uuid references public.sales_orders(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  return_no text not null unique,
  returned_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'refunded', 'completed', 'cancelled')),
  reason text,
  subtotal numeric(14,2) not null default 0,
  refund_amount numeric(14,2) not null default 0,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_return_items (
  id uuid primary key default gen_random_uuid(),
  sales_return_id uuid not null references public.sales_returns(id) on delete cascade,
  sales_order_item_id uuid references public.sales_order_items(id) on delete set null,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  quantity numeric(14,2) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  line_total numeric(14,2) not null default 0,
  reason text
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  order_no text not null unique,
  ordered_at timestamptz not null default now(),
  status text not null default 'draft' check (status in ('draft', 'ordered', 'receiving', 'received', 'cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'partial', 'paid')),
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  note text,
  expected_delivery_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  quantity numeric(14,2) not null check (quantity > 0),
  received_qty numeric(14,2) not null default 0 check (received_qty >= 0),
  unit_cost numeric(14,2) not null check (unit_cost >= 0),
  line_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  payment_no text not null unique,
  payment_method text not null default 'cash' check (payment_method in ('cash', 'bank_transfer', 'card', 'ewallet', 'other')),
  amount numeric(14,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  transaction_type text not null check (
    transaction_type in (
      'opening',
      'purchase_in',
      'sale_out',
      'sale_return_in',
      'purchase_return_out',
      'adjustment_in',
      'adjustment_out',
      'transfer_in',
      'transfer_out'
    )
  ),
  reference_type text,
  reference_id uuid,
  quantity numeric(14,2) not null check (quantity > 0),
  unit_cost numeric(14,2),
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null unique references public.sales_orders(id) on delete cascade,
  invoice_no text not null unique,
  invoice_type text not null default 'retail' check (invoice_type in ('retail', 'vat', 'proforma')),
  status text not null default 'issued' check (status in ('draft', 'issued', 'printed', 'cancelled')),
  issued_at timestamptz not null default now(),
  printed_at timestamptz,
  printed_count integer not null default 0 check (printed_count >= 0),
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_group_id on public.customers(customer_group_id);
create index if not exists idx_products_category_id on public.products(product_category_id);
create index if not exists idx_products_supplier_id on public.products(default_supplier_id);
create index if not exists idx_products_default_branch_id on public.products(default_branch_id);
create index if not exists idx_branch_stocks_branch_product on public.branch_stocks(branch_id, product_id);
create index if not exists idx_sales_orders_customer_id on public.sales_orders(customer_id);
create index if not exists idx_sales_orders_branch_id on public.sales_orders(branch_id);
create index if not exists idx_sales_orders_sold_at on public.sales_orders(sold_at desc);
create index if not exists idx_sales_orders_delivery_status on public.sales_orders(delivery_status);
create index if not exists idx_sales_order_items_order_id on public.sales_order_items(sales_order_id);
create index if not exists idx_sales_payments_order_id on public.sales_payments(sales_order_id);
create index if not exists idx_sales_returns_order_id on public.sales_returns(sales_order_id);
create index if not exists idx_purchase_orders_supplier_id on public.purchase_orders(supplier_id);
create index if not exists idx_purchase_order_items_order_id on public.purchase_order_items(purchase_order_id);
create index if not exists idx_inventory_transactions_product_id on public.inventory_transactions(product_id);
create index if not exists idx_inventory_transactions_created_at on public.inventory_transactions(created_at desc);
create index if not exists idx_activity_logs_actor_id on public.activity_logs(actor_id);
create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at desc);

create or replace view public.customer_debt_summary
with (security_invoker = true) as
select
  c.id as customer_id,
  c.code as customer_code,
  c.full_name,
  coalesce(sum(so.total_amount), 0) as total_sales,
  coalesce(sum(so.paid_amount), 0) as total_paid,
  coalesce(sum(so.total_amount - so.paid_amount), 0) as current_debt
from public.customers c
left join public.sales_orders so
  on so.customer_id = c.id
 and so.status <> 'cancelled'
group by c.id, c.code, c.full_name;

create or replace view public.supplier_debt_summary
with (security_invoker = true) as
select
  s.id as supplier_id,
  s.code as supplier_code,
  s.name as supplier_name,
  coalesce(sum(po.total_amount), 0) as total_purchase,
  coalesce(sum(po.paid_amount), 0) as total_paid,
  coalesce(sum(po.total_amount - po.paid_amount), 0) as current_debt
from public.suppliers s
left join public.purchase_orders po
  on po.supplier_id = s.id
 and po.status <> 'cancelled'
group by s.id, s.code, s.name;

create or replace view public.product_stock_summary
with (security_invoker = true) as
select
  p.id as product_id,
  p.sku,
  p.name,
  p.sale_price,
  p.cost_price,
  p.reorder_level,
  coalesce(sum(bs.on_hand_qty), 0) as total_on_hand_qty,
  coalesce(sum(bs.available_qty), 0) as total_available_qty
from public.products p
left join public.branch_stocks bs on bs.product_id = p.id
group by p.id, p.sku, p.name, p.sale_price, p.cost_price, p.reorder_level;

drop trigger if exists trg_branches_updated_at on public.branches;
create trigger trg_branches_updated_at before update on public.branches
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_customer_groups_updated_at on public.customer_groups;
create trigger trg_customer_groups_updated_at before update on public.customer_groups
for each row execute function public.set_updated_at();

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists trg_customer_addresses_updated_at on public.customer_addresses;
create trigger trg_customer_addresses_updated_at before update on public.customer_addresses
for each row execute function public.set_updated_at();

drop trigger if exists trg_suppliers_updated_at on public.suppliers;
create trigger trg_suppliers_updated_at before update on public.suppliers
for each row execute function public.set_updated_at();

drop trigger if exists trg_product_categories_updated_at on public.product_categories;
create trigger trg_product_categories_updated_at before update on public.product_categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_brands_updated_at on public.brands;
create trigger trg_brands_updated_at before update on public.brands
for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_branch_stocks_updated_at on public.branch_stocks;
create trigger trg_branch_stocks_updated_at before update on public.branch_stocks
for each row execute function public.set_updated_at();

drop trigger if exists trg_sales_orders_updated_at on public.sales_orders;
create trigger trg_sales_orders_updated_at before update on public.sales_orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_sales_returns_updated_at on public.sales_returns;
create trigger trg_sales_returns_updated_at before update on public.sales_returns
for each row execute function public.set_updated_at();

drop trigger if exists trg_purchase_orders_updated_at on public.purchase_orders;
create trigger trg_purchase_orders_updated_at before update on public.purchase_orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at before update on public.invoices
for each row execute function public.set_updated_at();

-- Automatically create profile on new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Người dùng mới'),
    'staff'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
