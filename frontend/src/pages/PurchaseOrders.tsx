import React from 'react';
import { Search, Filter, ArrowDownToLine } from 'lucide-react';

const mockPOs = [
  { id: 'PO-001', supplier: 'Nhựa Tiền Phong', date: '2023-10-15', total: 15500000, status: 'Đã nhập kho', paymentStatus: 'Đã thanh toán' },
  { id: 'PO-002', supplier: 'Cadivi', date: '2023-11-02', total: 45000000, status: 'Đang giao', paymentStatus: 'Công nợ' },
];

export function PurchaseOrders() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-100 space-y-4 shrink-0 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm theo mã đơn nhập, nhà cung cấp..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
            <ArrowDownToLine size={16} /> Tạo đơn nhập
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white sticky top-0 z-10">
            <tr className="text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <th className="py-3 px-4 font-semibold">Mã đơn</th>
              <th className="py-3 px-4 font-semibold">Nhà cung cấp</th>
              <th className="py-3 px-4 font-semibold">Ngày tạo</th>
              <th className="py-3 px-4 text-right font-semibold">Tổng tiền</th>
              <th className="py-3 px-4 font-semibold">Trạng thái kho</th>
              <th className="py-3 px-4 font-semibold">Thanh toán</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {mockPOs.map(po => (
              <tr key={po.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                <td className="py-3 px-4 font-mono font-bold text-blue-600">{po.id}</td>
                <td className="py-3 px-4 font-medium">{po.supplier}</td>
                <td className="py-3 px-4 text-slate-500">{po.date}</td>
                <td className="py-3 px-4 text-right font-semibold text-slate-800">{po.total.toLocaleString()} đ</td>
                <td className="py-3 px-4">
                   <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold ${
                    po.status === 'Đã nhập kho' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {po.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold ${
                    po.paymentStatus === 'Đã thanh toán' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {po.paymentStatus}
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
