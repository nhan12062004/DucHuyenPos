import React from 'react';
import { Search, Plus } from 'lucide-react';

const mockSuppliers = [
  { id: 'SUP01', name: 'Nhựa Tiền Phong', phone: '028 1111 2222', address: 'KCN Tân Tạo, TP.HCM', debt: 15000000, status: 'Đang giao dịch' },
  { id: 'SUP02', name: 'Cadivi', phone: '028 3333 4444', address: 'Quận 1, TP.HCM', debt: 0, status: 'Đang giao dịch' },
  { id: 'SUP03', name: 'Panasonic Việt Nam', phone: '028 5555 6666', address: 'KCN Thăng Long', debt: 5000000, status: 'Đang giao dịch' },
];

export function Suppliers() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Nhà cung cấp</h1>
        <button className="list-primary-button">
          <Plus size={16} /> Thêm nhà cung cấp
        </button>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 p-5 bg-white">
          <div className="relative w-96 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Tìm theo tên nhà cung cấp, SĐT..." 
              className="w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-4 text-[13px] transition-colors focus:border-[#0088FF] focus:outline-none"
            />
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] font-semibold text-[#182537]">
                <th className="px-5 py-3">Tên NCC</th>
                <th className="px-2 py-3">Số điện thoại</th>
                <th className="px-2 py-3">Địa chỉ</th>
                <th className="px-2 py-3 text-right">Công nợ hiện tại</th>
                <th className="px-5 py-3 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockSuppliers.map(sup => (
                <tr key={sup.id} className="text-[13px] transition-colors hover:bg-slate-50 cursor-pointer">
                  <td className="px-5 py-4 font-medium text-[#182537] hover:text-[#0088FF]">{sup.name}</td>
                  <td className="px-2 py-4 font-mono text-slate-600">{sup.phone}</td>
                  <td className="px-2 py-4 text-slate-600">{sup.address}</td>
                  <td className={`px-2 py-4 text-right font-semibold ${sup.debt > 0 ? 'text-red-500' : 'text-[#182537]'}`}>
                    {sup.debt > 0 ? sup.debt.toLocaleString() + ' đ' : 'Không nợ'}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full border border-emerald-300 bg-emerald-50 text-[12px] font-medium text-emerald-600">
                      {sup.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
