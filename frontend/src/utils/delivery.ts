export const DELIVERY_TABS = [
  'hang_van_chuyen',
  'van_chuyen_ngoai',
  'nhan_tai_cua_hang',
  'giao_hang_sau',
] as const;

export const DELIVERY_STATUSES = [
  'pending_packing',
  'waiting_pick_up',
  'delivering',
  'delivered',
  'cancelled',
] as const;

export type DeliveryTab = (typeof DELIVERY_TABS)[number];
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

const DELIVERY_MODE_TOKEN = '__DELIVERY_MODE__';

export function isDeliveryTab(value?: string | null): value is DeliveryTab {
  return !!value && DELIVERY_TABS.includes(value as DeliveryTab);
}

export function getDeliveryLabel(tab: DeliveryTab) {
  if (tab === 'hang_van_chuyen') return 'Đẩy qua hãng vận chuyển';
  if (tab === 'van_chuyen_ngoai') return 'Đẩy vận chuyển ngoài';
  if (tab === 'nhan_tai_cua_hang') return 'Khách nhận tại cửa hàng';
  return 'Giao hàng sau';
}

export function getDeliveryStatusFromTab(tab: DeliveryTab): DeliveryStatus {
  if (tab === 'hang_van_chuyen') return 'waiting_pick_up';
  if (tab === 'van_chuyen_ngoai') return 'delivering';
  if (tab === 'giao_hang_sau') return 'pending_packing';
  return 'delivered';
}

export function parseLegacyDeliveryTab(note?: string | null, status?: string | null): DeliveryTab | null {
  if (note) {
    const tokenMatch = note.match(new RegExp(`${DELIVERY_MODE_TOKEN}:(\\w+)`));
    const token = tokenMatch?.[1];
    if (isDeliveryTab(token)) {
      return token;
    }

    if (note.includes('Hình thức giao hàng: Giao hàng sau')) {
      return 'giao_hang_sau';
    }
    if (note.includes('Hình thức giao hàng: Đẩy qua hãng vận chuyển')) {
      return 'hang_van_chuyen';
    }
    if (note.includes('Hình thức giao hàng: Đẩy vận chuyển ngoài')) {
      return 'van_chuyen_ngoai';
    }
    if (note.includes('Hình thức giao hàng: Khách nhận tại cửa hàng')) {
      return 'nhan_tai_cua_hang';
    }
  }

  if (status === 'completed') {
    return 'nhan_tai_cua_hang';
  }

  if (status === 'pending') {
    return 'giao_hang_sau';
  }

  return null;
}
