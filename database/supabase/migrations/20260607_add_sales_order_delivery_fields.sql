alter table public.sales_orders
  add column if not exists delivery_method text,
  add column if not exists delivery_status text;

update public.sales_orders
set
  delivery_method = case
    when status = 'cancelled' and delivery_method is not null then delivery_method
    when note like '%__DELIVERY_MODE__:hang_van_chuyen%' then 'hang_van_chuyen'
    when note like '%__DELIVERY_MODE__:van_chuyen_ngoai%' then 'van_chuyen_ngoai'
    when note like '%__DELIVERY_MODE__:nhan_tai_cua_hang%' then 'nhan_tai_cua_hang'
    when note like '%__DELIVERY_MODE__:giao_hang_sau%' then 'giao_hang_sau'
    when note like '%Hình thức giao hàng: Đẩy qua hãng vận chuyển%' then 'hang_van_chuyen'
    when note like '%Hình thức giao hàng: Đẩy vận chuyển ngoài%' then 'van_chuyen_ngoai'
    when note like '%Hình thức giao hàng: Giao hàng sau%' then 'giao_hang_sau'
    when note like '%Hình thức giao hàng: Khách nhận tại cửa hàng%' then 'nhan_tai_cua_hang'
    when status = 'pending' then 'giao_hang_sau'
    else 'nhan_tai_cua_hang'
  end,
  delivery_status = case
    when status = 'cancelled' then 'cancelled'
    when note like '%__DELIVERY_MODE__:hang_van_chuyen%' then 'waiting_pick_up'
    when note like '%__DELIVERY_MODE__:van_chuyen_ngoai%' then 'delivering'
    when note like '%__DELIVERY_MODE__:giao_hang_sau%' then 'pending_packing'
    when note like '%Hình thức giao hàng: Đẩy qua hãng vận chuyển%' then 'waiting_pick_up'
    when note like '%Hình thức giao hàng: Đẩy vận chuyển ngoài%' then 'delivering'
    when note like '%Hình thức giao hàng: Giao hàng sau%' then 'pending_packing'
    when status = 'pending' then 'pending_packing'
    else 'delivered'
  end
where delivery_method is null or delivery_status is null;

update public.sales_orders
set delivery_method = 'nhan_tai_cua_hang'
where delivery_method is null;

update public.sales_orders
set delivery_status = case
  when status = 'cancelled' then 'cancelled'
  when status = 'pending' then 'pending_packing'
  else 'delivered'
end
where delivery_status is null;

alter table public.sales_orders
  alter column delivery_method set default 'nhan_tai_cua_hang',
  alter column delivery_method set not null,
  alter column delivery_status set default 'delivered',
  alter column delivery_status set not null;

alter table public.sales_orders
  drop constraint if exists sales_orders_delivery_method_check,
  drop constraint if exists sales_orders_delivery_status_check;

alter table public.sales_orders
  add constraint sales_orders_delivery_method_check
    check (delivery_method in ('hang_van_chuyen', 'van_chuyen_ngoai', 'nhan_tai_cua_hang', 'giao_hang_sau')),
  add constraint sales_orders_delivery_status_check
    check (delivery_status in ('pending_packing', 'waiting_pick_up', 'delivering', 'delivered', 'cancelled'));

create index if not exists idx_sales_orders_delivery_status
  on public.sales_orders(delivery_status);
