import React from 'react';
import { Search, Filter, ArrowDownToLine } from 'lucide-react';

const mockPOs = [
  { id: 'PO-001', supplier: 'Nhựa Tiền Phong', date: '2023-10-15', total: 15500000, status: 'Đã nhập kho', paymentStatus: 'Đã thanh toán' },
  { id: 'PO-002', supplier: 'Cadivi', date: '2023-11-02', total: 45000000, status: 'Đang giao', paymentStatus: 'Công nợ' },
];

export function PurchaseOrders() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Đơn nhập hàng</h1>
        <button className="list-primary-button">
          <ArrowDownToLine size={16} /> Tạo đơn nhập
        </button>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 p-5 bg-white">
          <div className="relative w-96 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Tìm theo mã đơn nhập, nhà cung cấp..." 
              className="w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-4 text-[13px] transition-colors focus:border-[#0088FF] focus:outline-none"
            />
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] font-semibold text-[#182537]">
                <th className="py-3 px-5 font-semibold">Mã đơn</th>
                <th className="py-3 px-2 font-semibold">Nhà cung cấp</th>
                <th className="py-3 px-2 font-semibold">Ngày tạo</th>
                <th className="py-3 px-2 text-right font-semibold">Tổng tiền</th>
                <th className="py-3 px-2 font-semibold text-center">Trạng thái kho</th>
                <th className="py-3 px-5 font-semibold text-center">Thanh toán</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px] text-[#182537]">
              {mockPOs.map(po => (
                <tr key={po.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="py-4 px-5 font-mono font-medium text-[#0088FF] hover:underline">{po.id}</td>
                  <td className="py-4 px-2 font-medium">{po.supplier}</td>
                  <td className="py-4 px-2 text-slate-500">{po.date}</td>
                  <td className="py-4 px-2 text-right font-semibold text-slate-800">{po.total.toLocaleString()} đ</td>
                  <td className="py-4 px-2 text-center">
                     <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[12px] font-medium border ${
                      po.status === 'Đã nhập kho' ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-blue-300 bg-blue-50 text-[#0088FF]'
                    }`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[12px] font-medium border ${
                      po.paymentStatus === 'Đã thanh toán' ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-orange-300 bg-orange-50 text-orange-600'
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
    </div>
  );
}
