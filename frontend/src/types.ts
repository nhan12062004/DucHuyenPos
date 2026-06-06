export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  costPrice: number;
  stock: number;
  category: string;
  supplier: string;
  image: string;
  status: 'active' | 'inactive';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  group: 'Khách lẻ' | 'Thợ điện' | 'Thợ nước' | 'Công trình' | 'Đại lý';
  totalSpent: number;
  currentDebt: number;
  totalOrders: number;
}

export interface OrderItem {
  id: string; // matches product id
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  status: 'Hoàn thành' | 'Chờ xử lý' | 'Đã hủy' | 'Khách nợ';
  createdAt: string;
  items: OrderItem[];
}
