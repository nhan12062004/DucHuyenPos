-- Keep sales orders and their related invoices indefinitely.
-- Stop the previously installed database cleanup job before removing its functions.
select cron.unschedule(jobid)
from cron.job
where jobname in (
  'delete-sales-orders-older-than-30-days',
  'delete-sales-orders-older-than-90-days'
);

drop function if exists public.delete_sales_orders_older_than_30_days();
drop function if exists public.delete_sales_orders_older_than_90_days();
