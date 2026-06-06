import React from 'react';
import { Search, Plus } from 'lucide-react';

const mockSuppliers = [
  { id: 'SUP01', name: 'Nhựa Tiền Phong', phone: '028 1111 2222', address: 'KCN Tân Tạo, TP.HCM', debt: 15000000, status: 'Đang giao dịch' },
  { id: 'SUP02', name: 'Cadivi', phone: '028 3333 4444', address: 'Quận 1, TP.HCM', debt: 0, status: 'Đang giao dịch' },
  { id: 'SUP03', name: 'Panasonic Việt Nam', phone: '028 5555 6666', address: 'KCN Thăng Long', debt: 5000000, status: 'Đang giao dịch' },
];

export function Suppliers() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-100 space-y-4 shrink-0 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm theo tên nhà cung cấp, SĐT..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
            <Plus size={16} /> Thêm NCC
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white sticky top-0 z-10">
            <tr className="text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <th className="py-3 px-4 font-semibold">Tên NCC</th>
              <th className="py-3 px-4 font-semibold">Số điện thoại</th>
              <th className="py-3 px-4 font-semibold">Địa chỉ</th>
              <th className="py-3 px-4 text-right font-semibold">Công nợ hiện tại</th>
              <th className="py-3 px-4 font-semibold text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {mockSuppliers.map(sup => (
              <tr key={sup.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                <td className="py-3 px-4 font-medium text-slate-900">{sup.name}</td>
                <td className="py-3 px-4 font-mono text-slate-600">{sup.phone}</td>
                <td className="py-3 px-4 text-slate-500">{sup.address}</td>
                <td className={`py-3 px-4 text-right font-semibold ${sup.debt > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                  {sup.debt > 0 ? sup.debt.toLocaleString() + ' đ' : 'Không nợ'}
                </td>
                <td className="py-3 px-4 text-center">
                   <span className="inline-flex px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                    {sup.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
