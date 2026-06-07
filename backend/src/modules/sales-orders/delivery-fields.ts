export const DELIVERY_METHODS = [
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

export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

const DELIVERY_MODE_TOKEN = '__DELIVERY_MODE__';

function isDeliveryMethod(value?: string | null): value is DeliveryMethod {
  return !!value && DELIVERY_METHODS.includes(value as DeliveryMethod);
}

function isDeliveryStatus(value?: string | null): value is DeliveryStatus {
  return !!value && DELIVERY_STATUSES.includes(value as DeliveryStatus);
}

export function getDeliveryStatusFromMethod(method: DeliveryMethod): DeliveryStatus {
  if (method === 'hang_van_chuyen') return 'waiting_pick_up';
  if (method === 'van_chuyen_ngoai') return 'delivering';
  if (method === 'giao_hang_sau') return 'pending_packing';
  return 'delivered';
}

export function parseLegacyDeliveryMethod(note?: string | null, status?: string | null): DeliveryMethod | null {
  if (note) {
    const tokenMatch = note.match(new RegExp(`${DELIVERY_MODE_TOKEN}:(\\w+)`));
    const token = tokenMatch?.[1];
    if (isDeliveryMethod(token)) {
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

export function resolveDeliveryFields(input: {
  status?: string | null;
  delivery_method?: string | null;
  delivery_status?: string | null;
  note?: string | null;
}) {
  const method =
    (isDeliveryMethod(input.delivery_method) && input.delivery_method) ||
    parseLegacyDeliveryMethod(input.note, input.status) ||
    'nhan_tai_cua_hang';

  if (input.status === 'cancelled') {
    return {
      delivery_method: method,
      delivery_status: 'cancelled' as DeliveryStatus,
    };
  }

  const deliveryStatus =
    (isDeliveryStatus(input.delivery_status) && input.delivery_status) ||
    getDeliveryStatusFromMethod(method);

  return {
    delivery_method: method,
    delivery_status: deliveryStatus,
  };
}
