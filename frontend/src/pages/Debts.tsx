import React from 'react';
import { mockCustomers } from '../services/mockData';
import { Search, Info, HandCoins } from 'lucide-react';

export function Debts() {
  const debtors = mockCustomers.filter(c => c.currentDebt > 0);
  const totalDebt = debtors.reduce((sum, c) => sum + c.currentDebt, 0);

  return (
    <div className="flex h-full gap-6">
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold tracking-tight text-slate-800">Danh sách khách nợ</h2>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Tìm tên, SĐT..." className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded text-sm focus:ring-blue-500 shadow-sm" />
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white sticky top-0">
              <tr className="text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="py-3 px-4 font-semibold">Khách hàng</th>
                <th className="py-3 px-4 font-semibold">SĐT</th>
                <th className="py-3 px-4 text-right font-semibold">Tổng nợ</th>
                <th className="py-3 px-4 text-center font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {debtors.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-800">{c.name}</td>
                  <td className="py-3 px-4 text-slate-600 font-mono text-sm">{c.phone}</td>
                  <td className="py-3 px-4 text-right font-bold text-orange-600">{c.currentDebt.toLocaleString()} đ</td>
                  <td className="py-3 px-4 text-center">
                    <button className="text-blue-600 text-sm font-medium hover:underline">Thu nợ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="w-80 shrink-0 flex flex-col gap-6">
        <div className="bg-orange-50 rounded-xl p-5 border border-orange-200">
          <div className="flex items-center gap-3 text-orange-800 mb-2">
            <HandCoins size={24} />
            <h3 className="font-semibold text-sm uppercase">Tổng khách nợ</h3>
          </div>
          <p className="text-3xl font-bold text-orange-700">{totalDebt.toLocaleString()} đ</p>
          <p className="text-sm mt-1 text-orange-600 font-medium">Từ {debtors.length} khách hàng</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex-1">
           <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
             <Info size={18} className="text-blue-600" /> Hướng dẫn thu nợ
           </h3>
           <ol className="text-sm text-slate-600 space-y-3 list-decimal list-inside">
             <li>Chọn khách hàng trong danh sách bên trái.</li>
             <li>Bấm <strong>Thu nợ</strong>.</li>
             <li>Nhập số tiền khách trả (trả 1 phần hoặc toàn bộ).</li>
             <li>Hệ thống tự trừ số tiền vào công nợ tổng.</li>
             <li>Quản lý có thể xem lại lịch sử thu nợ trong chi tiết khách.</li>
           </ol>
        </div>
      </div>
    </div>
  );
}
