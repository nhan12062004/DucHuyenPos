-- Apply this migration to existing databases after enabling pg_cron.
-- The application-side cleanup is also updated, so both cleanup paths use 90 days.
select cron.unschedule(jobid)
from cron.job
where jobname in (
  'delete-sales-orders-older-than-30-days',
  'delete-sales-orders-older-than-90-days'
);

drop function if exists public.delete_sales_orders_older_than_30_days();

create or replace function public.delete_sales_orders_older_than_90_days()
returns bigint
language sql
security definer
set search_path = ''
as $$
  with deleted_orders as (
    delete from public.sales_orders
    where sold_at < now() - interval '90 days'
    returning id
  )
  select count(*)::bigint
  from deleted_orders;
$$;

revoke all on function public.delete_sales_orders_older_than_90_days()
from public, anon, authenticated;

-- pg_cron uses UTC: 17:05 UTC is 00:05 in Vietnam.
select cron.schedule(
  'delete-sales-orders-older-than-90-days',
  '5 17 * * *',
  $job$select public.delete_sales_orders_older_than_90_days();$job$
);
