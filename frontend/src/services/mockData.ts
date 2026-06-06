import { Product, Customer, Order } from '../types';

export const mockProducts: Product[] = [
  { id: 'p1', name: 'Ống nhựa PVC Bình Minh D21', sku: 'PVC-BM-D21', price: 15000, costPrice: 12000, stock: 450, category: 'Ống nước', supplier: 'Nhựa Bình Minh', image: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=150&h=150&q=80', status: 'active' },
  { id: 'p2', name: 'Dây điện Cadivi ruột đồng 2.5', sku: 'CV-2.5-CADIVI', price: 12000, costPrice: 10000, stock: 1200, category: 'Dây điện', supplier: 'Cadivi', image: 'https://images.unsplash.com/photo-1621905252507-b35492d90cb0?auto=format&fit=crop&w=150&h=150&q=80', status: 'active' },
  { id: 'p3', name: 'Công tắc 1 chiều Panasonic', sku: 'PANA-SW1', price: 35000, costPrice: 28000, stock: 150, category: 'Công tắc', supplier: 'Panasonic Việt Nam', image: 'https://images.unsplash.com/photo-1621905252445-5655a6d3f23a?auto=format&fit=crop&w=150&h=150&q=80', status: 'active' },
  { id: 'p4', name: 'Ổ cắm đôi 3 chấu Sino', sku: 'SINO-SOCK-2', price: 45000, costPrice: 35000, stock: 200, category: 'Ổ cắm', supplier: 'Sino', image: 'https://images.unsplash.com/photo-1558222218-b7b54eede3f3?auto=format&fit=crop&w=150&h=150&q=80', status: 'active' },
  { id: 'p5', name: 'Vòi xịt vệ sinh Inax', sku: 'INAX-XIT-1', price: 250000, costPrice: 210000, stock: 45, category: 'Thiết bị vệ sinh', supplier: 'Inax', image: 'https://images.unsplash.com/photo-1585058178125-ed237270d4fc?auto=format&fit=crop&w=150&h=150&q=80', status: 'active' },
  { id: 'p6', name: 'Ống nhựa Tiền Phong D27', sku: 'PVC-TP-D27', price: 18000, costPrice: 15000, stock: 320, category: 'Ống nước', supplier: 'Nhựa Tiền Phong', image: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=150&h=150&q=80', status: 'active' },
  { id: 'p7', name: 'Keo dán ống Tiền Phong 500g', sku: 'KEO-TP-500', price: 55000, costPrice: 45000, stock: 80, category: 'Phụ kiện điện nước', supplier: 'Nhựa Tiền Phong', image: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=150&h=150&q=80', status: 'active' },
  { id: 'p8', name: 'Bóng đèn LED Rạng Đông 9W', sku: 'RD-LED-9W', price: 42000, costPrice: 32000, stock: 500, category: 'Đồ gia dụng', supplier: 'Rạng Đông', image: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=150&h=150&q=80', status: 'active' },
];

export const mockCustomers: Customer[] = [
  { id: 'c1', name: 'Anh Tuấn', phone: '0901234567', address: '123 Nguyễn Văn Cừ, Q5', group: 'Thợ điện', totalSpent: 15600000, currentDebt: 2500000, totalOrders: 15 },
  { id: 'c2', name: 'Chị Mai', phone: '0987654321', address: '45 Lê Lợi, Q1', group: 'Khách lẻ', totalSpent: 2450000, currentDebt: 0, totalOrders: 3 },
  { id: 'c3', name: 'Công ty Xây Dựng ABC', phone: '0283456789', address: '88 Xa Lộ Hà Nội, TP Thủ Đức', group: 'Công trình', totalSpent: 125000000, currentDebt: 45000000, totalOrders: 42 },
  { id: 'c4', name: 'Chú Tư (Thợ Nước)', phone: '0912345678', address: 'Trần Hưng Đạo, Q1', group: 'Thợ nước', totalSpent: 28000000, currentDebt: 500000, totalOrders: 28 },
];

export const mockOrders: Order[] = [
  { id: 'o1', code: 'HD001025', customerId: 'c1', customerName: 'Anh Tuấn', totalAmount: 450000, paidAmount: 450000, paymentStatus: 'paid', status: 'Hoàn thành', createdAt: new Date(Date.now() - 3600000).toISOString(), items: [ { id: 'p1', productId: 'p1', name: 'Ống nhựa PVC Bình Minh D21', price: 15000, quantity: 10 }, { id: 'p7', productId: 'p7', name: 'Keo dán ống Tiền Phong 500g', price: 55000, quantity: 2 } ] },
  { id: 'o2', code: 'HD001026', customerId: 'c3', customerName: 'Công ty Xây Dựng ABC', totalAmount: 12500000, paidAmount: 0, paymentStatus: 'unpaid', status: 'Khách nợ', createdAt: new Date(Date.now() - 86400000).toISOString(), items: [ { id: 'p2', productId: 'p2', name: 'Dây điện Cadivi ruột đồng 2.5', price: 12000, quantity: 1000 }, { id: 'p3', productId: 'p3', name: 'Công tắc 1 chiều Panasonic', price: 35000, quantity: 50 } ] },
  { id: 'o3', code: 'HD001027', customerId: 'c2', customerName: 'Chị Mai', totalAmount: 84000, paidAmount: 84000, paymentStatus: 'paid', status: 'Hoàn thành', createdAt: new Date(Date.now() - 172800000).toISOString(), items: [ { id: 'p8', productId: 'p8', name: 'Bóng đèn LED Rạng Đông 9W', price: 42000, quantity: 2 } ] },
];
