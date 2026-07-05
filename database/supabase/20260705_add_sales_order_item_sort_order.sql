alter table public.sales_order_items
add column if not exists sort_order integer;

with ranked_items as (
  select
    id,
    row_number() over (
      partition by sales_order_id
      order by created_at, ctid
    ) - 1 as position
  from public.sales_order_items
)
update public.sales_order_items as item
set sort_order = ranked_items.position
from ranked_items
where item.id = ranked_items.id
  and item.sort_order is null;

alter table public.sales_order_items
alter column sort_order set default 0,
alter column sort_order set not null;

alter table public.sales_order_items
drop constraint if exists sales_order_items_sort_order_check;

alter table public.sales_order_items
add constraint sales_order_items_sort_order_check check (sort_order >= 0);

create index if not exists idx_sales_order_items_order_sort
on public.sales_order_items(sales_order_id, sort_order);
