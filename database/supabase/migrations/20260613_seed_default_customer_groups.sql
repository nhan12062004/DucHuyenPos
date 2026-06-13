insert into public.customer_groups (
  code,
  name,
  group_type,
  description,
  discount_rate,
  created_at,
  updated_at
)
values
  ('VIP', 'Vip', 'fixed', null, 0, '2020-05-05 00:00:00+07', '2020-05-05 00:00:00+07'),
  ('BANBUON', 'Bán buôn', 'fixed', null, 0, '2020-05-05 00:00:00+07', '2020-05-05 00:00:00+07'),
  ('BANLE', 'Bán lẻ', 'fixed', null, 0, '2020-05-05 00:00:00+07', '2020-05-05 00:00:00+07')
on conflict (code) do update
set
  name = excluded.name,
  group_type = excluded.group_type,
  description = excluded.description,
  discount_rate = excluded.discount_rate,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;
