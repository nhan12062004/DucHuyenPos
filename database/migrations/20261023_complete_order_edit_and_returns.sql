-- Complete order editing and sales return workflow.
-- These timestamps make inventory/refund application idempotent.

alter table public.sales_return_items
  alter column product_id drop not null;

alter table public.sales_returns
  add column if not exists stock_applied_at timestamptz,
  add column if not exists refund_applied_at timestamptz;
