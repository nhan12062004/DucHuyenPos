import React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';

const mockReturns = [
  { id: 'RT001', orderCode: 'HD001020', customer: 'Anh Tuấn', date: '2023-11-20', totalValue: 450000, reason: 'Hàng lỗi kỹ thuật', status: 'Đã hoàn tiền' },
  { id: 'RT002', orderCode: 'HD000985', customer: 'Chị Mai', date: '2023-11-18', totalValue: 125000, reason: 'Mua dư dùng', status: 'Chờ xử lý' },
];

export function Returns() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Đổi trả hàng</h1>
        <button className="flex items-center gap-2 rounded bg-[#0088FF] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-blue-700">
          <RotateCcw size={16} /> Tạo phiếu trả hàng
        </button>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 p-5 bg-white">
          <div className="relative w-96 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Tìm theo mã phiếu trả, mã đơn..." 
              className="w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-4 text-[13px] transition-colors focus:border-[#0088FF] focus:outline-none"
            />
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] font-semibold text-[#182537]">
                <th className="py-3 px-5 font-semibold">Mã phiếu</th>
                <th className="py-3 px-2 font-semibold">Mã đơn gốc</th>
                <th className="py-3 px-2 font-semibold">Khách hàng</th>
                <th className="py-3 px-2 font-semibold">Ngày trả</th>
                <th className="py-3 px-2 text-right font-semibold">Giá trị trả</th>
                <th className="py-3 px-2 font-semibold">Lý do</th>
                <th className="py-3 px-5 font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px] text-[#182537]">
              {mockReturns.map(rt => (
                <tr key={rt.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="py-4 px-5 font-mono font-medium text-[#0088FF] hover:underline">{rt.id}</td>
                  <td className="py-4 px-2 font-mono text-slate-500">{rt.orderCode}</td>
                  <td className="py-4 px-2 font-medium">{rt.customer}</td>
                  <td className="py-4 px-2 text-slate-500">{rt.date}</td>
                  <td className="py-4 px-2 text-right font-semibold text-orange-600">{rt.totalValue.toLocaleString()} đ</td>
                  <td className="py-4 px-2 text-slate-600">{rt.reason}</td>
                  <td className="py-4 px-5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[12px] font-medium border ${
                      rt.status === 'Đã hoàn tiền' ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-orange-300 bg-orange-50 text-orange-600'
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
    </div>
  );
}
