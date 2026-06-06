import React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';

const mockReturns = [
  { id: 'RT001', orderCode: 'HD001020', customer: 'Anh Tuấn', date: '2023-11-20', totalValue: 450000, reason: 'Hàng lỗi kỹ thuật', status: 'Đã hoàn tiền' },
  { id: 'RT002', orderCode: 'HD000985', customer: 'Chị Mai', date: '2023-11-18', totalValue: 125000, reason: 'Mua dư dùng', status: 'Chờ xử lý' },
];

export function Returns() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-100 space-y-4 shrink-0 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm theo mã phiếu trả, mã đơn..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
            <RotateCcw size={16} /> Tạo phiếu trả hàng
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white sticky top-0 z-10">
            <tr className="text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <th className="py-3 px-4 font-semibold">Mã phiếu</th>
              <th className="py-3 px-4 font-semibold">Mã đơn gốc</th>
              <th className="py-3 px-4 font-semibold">Khách hàng</th>
              <th className="py-3 px-4 font-semibold">Ngày trả</th>
              <th className="py-3 px-4 text-right font-semibold">Giá trị trả</th>
              <th className="py-3 px-4 font-semibold">Lý do</th>
              <th className="py-3 px-4 font-semibold">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {mockReturns.map(rt => (
              <tr key={rt.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                <td className="py-3 px-4 font-mono font-bold text-blue-600">{rt.id}</td>
                <td className="py-3 px-4 font-mono text-slate-500">{rt.orderCode}</td>
                <td className="py-3 px-4 font-medium">{rt.customer}</td>
                <td className="py-3 px-4 text-slate-500">{rt.date}</td>
                <td className="py-3 px-4 text-right font-semibold text-orange-600">{rt.totalValue.toLocaleString()} đ</td>
                <td className="py-3 px-4 text-slate-600">{rt.reason}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold ${
                    rt.status === 'Đã hoàn tiền' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {rt.status}
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
