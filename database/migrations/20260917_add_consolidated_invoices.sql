-- Print-only invoices that combine multiple completed sales orders.
-- This is separate from the electronic-invoice table.

create table if not exists public.consolidated_invoices (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  invoice_no text not null unique,
  status text not null default 'issued' check (status in ('draft', 'issued', 'printed', 'cancelled')),
  issued_at timestamptz not null default now(),
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  shipping_fee numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consolidated_invoice_items (
  id uuid primary key default gen_random_uuid(),
  consolidated_invoice_id uuid not null references public.consolidated_invoices(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  sku text,
  unit_name text not null default 'cai',
  quantity numeric(14,2) not null check (quantity > 0),
  unit_price numeric(14,4) not null check (unit_price >= 0),
  discount_amount numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.consolidated_invoice_orders (
  id uuid primary key default gen_random_uuid(),
  consolidated_invoice_id uuid not null references public.consolidated_invoices(id) on delete cascade,
  sales_order_id uuid unique references public.sales_orders(id) on delete set null,
  source_order_no text not null,
  source_sold_at timestamptz,
  source_total_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (consolidated_invoice_id, source_order_no)
);

create index if not exists idx_consolidated_invoices_customer_id
  on public.consolidated_invoices(customer_id);
create index if not exists idx_consolidated_invoices_issued_at
  on public.consolidated_invoices(issued_at desc);
create index if not exists idx_consolidated_invoice_items_invoice_id
  on public.consolidated_invoice_items(consolidated_invoice_id, sort_order);
create index if not exists idx_consolidated_invoice_orders_invoice_id
  on public.consolidated_invoice_orders(consolidated_invoice_id);

drop trigger if exists trg_consolidated_invoices_updated_at on public.consolidated_invoices;
create trigger trg_consolidated_invoices_updated_at
before update on public.consolidated_invoices
for each row execute function public.set_updated_at();
