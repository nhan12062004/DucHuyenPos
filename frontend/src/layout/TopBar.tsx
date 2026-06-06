import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const routeNames: Record<string, string> = {
  '/': 'Tổng quan',
  '/pos': 'Bán hàng (POS)',
  '/orders': 'Danh sách đơn hàng',
  '/returns': 'Khách trả hàng',
  '/products': 'Danh sách sản phẩm quản lý kho',
  '/purchase-orders': 'Đơn hàng nhập',
  '/purchase': 'Nhập hàng',
  '/inventory': 'Kiểm hàng',
  '/suppliers': 'Nhà cung cấp',
  '/cost-price': 'Giá vốn',
  '/customers': 'Danh sách khách hàng',
  '/customer-groups': 'Nhóm khách hàng',
  '/debts': 'Công nợ',
  '/invoice': 'In hóa đơn',
  '/settings': 'Cài đặt hệ thống'
};

export function TopBar() {
  const location = useLocation();
  const title = routeNames[location.pathname] || 'Điện máy Đức Huyền';

  const { user, signOut } = useAuth();
  const displayName: string = user?.user_metadata?.full_name || user?.email || 'Người dùng';
  const initials = displayName.split(' ').map((w: string) => w[0]).slice(-2).join('').toUpperCase() || 'ND';
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-8">
      <h1 className="text-xl font-bold text-slate-800">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="relative">
          <div
            className="flex cursor-pointer items-center gap-3 pl-4 transition-opacity hover:opacity-80"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{displayName}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Quản lý cửa hàng</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-blue-100 font-bold uppercase text-blue-600 shadow-sm">
              {initials}
            </div>
            <ChevronDown size={16} className="text-slate-400" />
          </div>

          {showDropdown && (
            <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-slate-100 bg-white py-1 shadow-lg shadow-slate-200/50">
              <button
                onClick={() => {
                  setShowDropdown(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <User size={16} /> Thông tin cá nhân
              </button>
              <div className="my-1 h-px bg-slate-100"></div>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  signOut();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut size={16} /> Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
