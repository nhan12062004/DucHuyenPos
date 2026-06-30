-- Permanently retain sales orders for only 30 days, based on sold_at.
-- pg_cron schedules are evaluated in UTC; 17:05 UTC is 00:05 in Vietnam.

create extension if not exists pg_cron;

create or replace function public.delete_sales_orders_older_than_30_days()
returns bigint
language sql
security definer
set search_path = ''
as $$
  with deleted_orders as (
    delete from public.sales_orders
    where sold_at < now() - interval '30 days'
    returning id
  )
  select count(*)::bigint
  from deleted_orders;
$$;

revoke all on function public.delete_sales_orders_older_than_30_days()
from public, anon, authenticated;

-- Applying this migration also removes orders that have already expired.
select public.delete_sales_orders_older_than_30_days();

-- Reusing this name updates the existing job if the migration is run again.
select cron.schedule(
  'delete-sales-orders-older-than-30-days',
  '5 17 * * *',
  $job$select public.delete_sales_orders_older_than_30_days();$job$
);
