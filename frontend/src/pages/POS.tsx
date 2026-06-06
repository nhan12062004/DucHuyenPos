import React, { useState } from 'react';
import {
  Search,
  Info,
  Settings,
  ImageIcon,
  X,
  PlusCircle,
  Gift,
  TruckIcon,
  Store,
  Box,
  Clock
} from 'lucide-react';
import { cn } from '../utils/cn';

type CartProduct = {
  id: number;
  name: string;
  subName: string;
  code: string;
  qty: number;
  price: number;
  discount: number;
};

export function POS() {
  const [activeDeliveryTab, setActiveDeliveryTab] = useState('hang_van_chuyen');
  const [hasCustomer, setHasCustomer] = useState(true);
  const [productQuery, setProductQuery] = useState('test');
  const [isDropdownOpen, setIsDropdownOpen] = useState(true);
  const [cartProducts, setCartProducts] = useState<CartProduct[]>([]);

  const handleProductSelect = () => {
    setCartProducts([
      { id: 1, name: 'test', subName: 'Mặc định', code: 'PVN2157', qty: 1, price: 0, discount: 0 }
    ]);
    setIsDropdownOpen(false);
    setProductQuery('');
  };

  const totalAmount = cartProducts.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <div className="min-h-full bg-[#F4F6F8] pb-20 font-sans text-sm">
      <div className="mx-auto max-w-[1400px] space-y-6 p-4 md:p-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <div className="ui-card flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                <div>
                  <h2 className="font-semibold text-slate-800">Thông tin khách hàng</h2>
                  {hasCustomer && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-medium text-blue-600">Test</span>
                      <button
                        onClick={() => setHasCustomer(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium uppercase text-slate-600">
                  <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  Phát hành hóa đơn điện tử
                  <Info size={14} className="text-slate-400" />
                </label>
              </div>

              {!hasCustomer ? (
                <div className="flex h-full flex-col p-5">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Tìm theo tên, SĐT, mã khách hàng ... (F4)"
                      className="w-full rounded border border-slate-300 py-2 pl-9 pr-4 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-1 flex-col items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50/50 py-8 text-slate-400">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded bg-slate-100">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-slate-300"
                      >
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <p>Chưa có thông tin khách hàng</p>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col justify-between p-5">
                  <div className="flex justify-between gap-6">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold uppercase text-slate-800">Địa chỉ giao hàng</span>
                        <button className="font-medium text-blue-600 hover:text-blue-700">Thay đổi</button>
                      </div>
                      <p className="text-slate-800">234234324</p>
                      <p className="text-slate-800">áda, Phường Lê Lợi, Thị xã Sơn Tây, Hà Nội</p>
                    </div>
                    <div className="w-[300px] space-y-3 rounded border border-dashed border-slate-300 bg-white p-4 text-[13px]">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Nợ phải thu</span>
                        <span className="font-medium text-red-500">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tổng chi tiêu (0 đơn)</span>
                        <span className="font-medium text-blue-600">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Trả hàng (0 sản phẩm)</span>
                        <span className="font-medium text-red-500">0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Giao hàng thất bại (0 đơn)</span>
                        <span className="font-medium text-red-500">0</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-center border-t border-slate-50 pt-4">
                    <button className="flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700">
                      Xem thêm
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="xl:col-span-1">
            <div className="ui-card h-full p-5">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Thông tin bổ sung</h2>
                <button className="text-slate-400 hover:text-slate-600">
                  <Settings size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="w-20 text-[13px] text-slate-600">Bán tại</label>
                  <select className="flex-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] focus:border-blue-500 focus:outline-none">
                    <option>Chi nhánh mặc định</option>
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-20 text-[13px] text-slate-600">Bán bởi</label>
                  <select className="flex-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] focus:border-blue-500 focus:outline-none">
                    <option>Lương Thị Hồng</option>
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-20 text-[13px] text-slate-600">Nguồn</label>
                  <select className="flex-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] focus:border-blue-500 focus:outline-none">
                    <option>Web</option>
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-20 text-[13px] text-slate-600">Hẹn giao</label>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      className="w-full rounded border border-slate-300 px-3 py-1.5 text-[13px] focus:border-blue-500 focus:outline-none"
                    />
                    <Clock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-20 text-[13px] text-slate-600">Mã đơn</label>
                  <input
                    type="text"
                    className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-[13px] focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ui-card relative">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="font-semibold text-slate-800">Thông tin sản phẩm</h2>
            <div className="flex items-center gap-4 text-[13px]">
              <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                Tách dòng
              </label>
              <button className="font-medium text-blue-600 hover:text-blue-700">Kiểm tra tồn kho</button>
              <button className="text-slate-400 hover:text-slate-600">
                <Settings size={16} />
              </button>
            </div>
          </div>

          <div className="relative z-20 flex items-center gap-2 border-b border-slate-100 bg-white p-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Tìm theo tên, mã SKU, hoặc quét mã Barcode...(F3)"
                className={cn(
                  'w-full rounded border py-2 pl-9 pr-8 text-[13px] transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                  isDropdownOpen && productQuery ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-300'
                )}
                value={productQuery}
                onChange={(e) => {
                  setProductQuery(e.target.value);
                  setIsDropdownOpen(!!e.target.value);
                }}
              />
              {productQuery && (
                <button
                  onClick={() => {
                    setProductQuery('');
                    setIsDropdownOpen(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-200 p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              )}

              {isDropdownOpen && productQuery && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded border border-slate-200 bg-white shadow-lg">
                  <button className="flex w-full items-center gap-2 border-b border-slate-100 px-4 py-3 text-left font-medium text-blue-600 hover:bg-blue-50">
                    <PlusCircle size={16} /> Thêm mới sản phẩm
                  </button>
                  <button
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                    onClick={handleProductSelect}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-300">
                        <ImageIcon size={20} />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-slate-800">test</p>
                        <p className="mt-0.5 text-[12px] text-blue-600">
                          PVN2157 <span className="ml-1 text-slate-500">Mặc định</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">0</p>
                      <p className="mt-0.5 text-[12px] text-slate-500">
                        Tồn: <span className="text-red-500">0</span> | Có thể bán:{' '}
                        <span className="text-red-500">-1</span>
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button className="shrink-0 rounded border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50">
              Chọn nhanh
            </button>
            <button className="flex shrink-0 items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
              </svg>
              (F10)
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-slate-400"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <select className="shrink-0 rounded border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-blue-500 focus:outline-none">
              <option>Giá bán lẻ</option>
              <option>Giá bán buôn</option>
            </select>
          </div>

          {cartProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center bg-white py-20 text-slate-400">
              <div className="mb-4">
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="#F1F5F9"
                  stroke="#CBD5E1"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                </svg>
              </div>
              <p className="mb-4 text-[13px] font-medium">Chưa có thông tin sản phẩm</p>
              <button
                onClick={() => setProductQuery('test')}
                className="rounded border border-blue-400 bg-white px-6 py-2 text-[13px] font-medium text-blue-600 transition-colors hover:bg-blue-50"
              >
                Thêm sản phẩm
              </button>
            </div>
          ) : (
            <div className="relative z-10 min-h-[150px] overflow-x-auto bg-white">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white text-[13px] font-semibold text-slate-700 border-b border-slate-100">
                    <th className="w-12 px-5 py-3 text-center">STT</th>
                    <th className="w-16 px-2 py-3">Ảnh</th>
                    <th className="min-w-[200px] px-2 py-3">Tên sản phẩm</th>
                    <th className="w-24 px-2 py-3 text-center">Số lượng</th>
                    <th className="w-28 px-2 py-3 text-right">Đơn giá</th>
                    <th className="w-24 px-2 py-3 text-right">Chiết khấu</th>
                    <th className="w-32 px-5 py-3 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {cartProducts.map((product, index) => (
                    <tr
                      key={product.id}
                      className="border border-blue-400 bg-blue-50/30 shadow-[inset_0_0_0_1px_#60A5FA]"
                    >
                      <td className="px-5 py-4 text-center font-medium text-slate-600">{index + 1}</td>
                      <td className="px-2 py-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded border border-slate-200 bg-white text-slate-300">
                          <ImageIcon size={20} />
                        </div>
                      </td>
                      <td className="px-2 py-4">
                        <div className="flex items-center gap-1 text-[13px] font-medium text-[#0A1629]">
                          {product.name}
                          <Info size={12} className="mt-0.5 text-yellow-500" />
                        </div>
                        <div className="mt-0.5 text-[12px] text-slate-500">{product.subName}</div>
                        <div className="text-[12px] text-blue-500">{product.code}</div>
                      </td>
                      <td className="flex justify-center px-2 py-4">
                        <input
                          type="text"
                          value={product.qty}
                          readOnly
                          className="w-10 border-b-[1.5px] border-blue-500 bg-transparent py-1 text-center font-semibold text-blue-600 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-4 text-right">
                        <input
                          type="text"
                          value={product.price}
                          readOnly
                          className="w-full border-b border-transparent bg-transparent py-1 text-right text-slate-800 hover:border-slate-300 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-4 text-right">
                        <input
                          type="text"
                          value={product.discount}
                          readOnly
                          className="w-full border-b border-transparent bg-transparent py-1 text-right text-slate-800 hover:border-slate-300 focus:outline-none"
                        />
                      </td>
                      <td className="flex h-full items-center justify-end gap-3 px-5 py-4 text-right font-medium text-slate-800">
                        {product.price * product.qty}
                        <button
                          onClick={() => setCartProducts([])}
                          className="ml-2 text-slate-400 transition-colors hover:text-red-500"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="relative z-10 flex items-center justify-between border-t border-slate-100 bg-white px-5 py-4">
            <button className="flex items-center gap-2 font-medium text-blue-600 transition-colors hover:text-blue-700">
              <PlusCircle size={16} /> Thêm dịch vụ khác (F9)
            </button>
            <button className="flex items-center gap-2 font-medium text-blue-600 transition-colors hover:text-blue-700">
              <Gift size={16} /> Áp dụng chương trình khuyến mại
            </button>
          </div>

          <div className="relative z-10 grid grid-cols-1 gap-8 border-t border-slate-100 bg-white p-5 md:grid-cols-2">
            <div className="space-y-5">
              <div>
                <label className="mb-1 flex items-center gap-1 text-[13px] font-medium text-slate-700">
                  Tags <Info size={12} className="text-blue-500" />
                </label>
                <textarea
                  rows={3}
                  placeholder="Nhập ký tự và ấn enter"
                  className="w-full rounded border border-slate-300 p-3 text-[13px] transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-700">Ghi chú đơn hàng</label>
                <textarea
                  rows={3}
                  placeholder="VD: Hàng tặng gói riêng"
                  className="w-full rounded border border-slate-300 p-3 text-[13px] transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-4 text-[13px]">
              <div className="flex items-center justify-between text-slate-700">
                <span>Tổng tiền ({cartProducts.length} sản phẩm)</span>
                <span className="font-semibold">{totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span>Chiết khấu (F6)</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex cursor-pointer items-center justify-between text-blue-600">
                <span>Phí giao hàng (F7)</span>
                <span className="font-semibold text-slate-700">0</span>
              </div>
              <div className="flex cursor-pointer items-center justify-between text-blue-600">
                <span className="flex items-center gap-1">
                  Mã giảm giá
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
                <span className="font-semibold text-slate-700">0</span>
              </div>

              <div className="flex items-center justify-between pt-2 text-base font-bold text-slate-800">
                <span>Khách phải trả</span>
                <span>{totalAmount.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-slate-700">
                <span>Khách đã trả</span>
                <span className="border-b border-dashed border-slate-300 font-semibold">0</span>
              </div>

              <button className="flex items-center gap-1 py-1 font-medium text-blue-600 hover:text-blue-700">
                <PlusCircle size={14} /> Thêm phương thức
              </button>

              <div className="flex items-center justify-between border-t border-slate-100 pt-2 font-bold text-slate-800">
                <span>Còn phải trả</span>
                <span>{totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="ui-card p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Đóng gói và giao hàng</h2>

          <div className="mb-6 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveDeliveryTab('hang_van_chuyen')}
              className={cn(
                'flex items-center gap-2 rounded border px-4 py-2 font-medium transition-colors',
                activeDeliveryTab === 'hang_van_chuyen'
                  ? 'border-blue-600 text-blue-600 shadow-[0_4px_0_-1px_#2563EB]'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              )}
            >
              <TruckIcon size={18} /> Đẩy qua hãng vận chuyển
            </button>
            <button
              onClick={() => setActiveDeliveryTab('van_chuyen_ngoai')}
              className={cn(
                'flex items-center gap-2 rounded border px-4 py-2 font-medium transition-colors',
                activeDeliveryTab === 'van_chuyen_ngoai'
                  ? 'border-blue-600 text-blue-600 shadow-[0_4px_0_-1px_#2563EB]'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              )}
            >
              <TruckIcon size={18} /> Đẩy vận chuyển ngoài
            </button>
            <button
              onClick={() => setActiveDeliveryTab('nhan_tai_cua_hang')}
              className={cn(
                'flex items-center gap-2 rounded border px-4 py-2 font-medium transition-colors',
                activeDeliveryTab === 'nhan_tai_cua_hang'
                  ? 'border-blue-600 text-blue-600 shadow-[0_4px_0_-1px_#2563EB]'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              )}
            >
              <Store size={18} /> Khách nhận tại cửa hàng
            </button>
            <button
              onClick={() => setActiveDeliveryTab('giao_hang_sau')}
              className={cn(
                'flex items-center gap-2 rounded border px-4 py-2 font-medium transition-colors',
                activeDeliveryTab === 'giao_hang_sau'
                  ? 'border-blue-600 text-blue-600 shadow-[0_4px_0_-1px_#2563EB]'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              )}
            >
              <Box size={18} /> Giao hàng sau
            </button>
          </div>

          <div className="ui-subtle-panel p-4 text-slate-600">
            Bạn hãy thêm thông tin khách hàng để sử dụng dịch vụ giao hàng.{' '}
            <button className="text-blue-600 hover:underline">Cập nhật tại đây</button>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button className="rounded border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50">
            Thoát
          </button>
          <div className="flex">
            <button className="rounded-l border border-blue-600 bg-blue-600 px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-blue-700">
              Tạo đơn hàng (F1)
            </button>
            <button className="flex items-center justify-center rounded-r border-l border-blue-700 bg-blue-600 px-2 py-2 text-white transition-colors hover:bg-blue-700">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
