alter table public.products
  add column if not exists default_branch_id uuid references public.branches(id) on delete set null;

create index if not exists idx_products_default_branch_id
  on public.products(default_branch_id);

with default_branch as (
  select id
  from public.branches
  where is_default = true
    and status = 'active'
  order by created_at
  limit 1
)
update public.products
set default_branch_id = default_branch.id
from default_branch
where public.products.default_branch_id is null;
