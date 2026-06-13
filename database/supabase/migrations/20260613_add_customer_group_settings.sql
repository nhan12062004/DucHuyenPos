alter table public.customer_groups
  add column if not exists condition_match_mode text,
  add column if not exists condition_group text,
  add column if not exists default_price_type text,
  add column if not exists discount_rate numeric(5,2) not null default 0,
  add column if not exists payment_method text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'customer_groups_condition_match_mode_check'
  ) then
    alter table public.customer_groups
      add constraint customer_groups_condition_match_mode_check
      check (condition_match_mode in ('any', 'all'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'customer_groups_condition_group_check'
  ) then
    alter table public.customer_groups
      add constraint customer_groups_condition_group_check
      check (condition_group in ('profile', 'purchase', 'points'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'customer_groups_default_price_type_check'
  ) then
    alter table public.customer_groups
      add constraint customer_groups_default_price_type_check
      check (default_price_type in ('retail', 'wholesale'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'customer_groups_discount_rate_check'
  ) then
    alter table public.customer_groups
      add constraint customer_groups_discount_rate_check
      check (discount_rate >= 0 and discount_rate <= 100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'customer_groups_payment_method_check'
  ) then
    alter table public.customer_groups
      add constraint customer_groups_payment_method_check
      check (payment_method in ('cash', 'bank_transfer', 'debt'));
  end if;
end $$;
