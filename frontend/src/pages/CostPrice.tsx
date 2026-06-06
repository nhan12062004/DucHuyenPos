import React from 'react';
import { Search, Save } from 'lucide-react';
import { mockProducts } from '../services/mockData';

export function CostPrice() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-100 space-y-4 shrink-0 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm sản phẩm cập nhật giá vốn..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
            <Save size={16} /> Lưu thay đổi
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white sticky top-0 z-10">
            <tr className="text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <th className="py-3 px-4 font-semibold">Mã SKU</th>
              <th className="py-3 px-4 font-semibold">Tên sản phẩm</th>
              <th className="py-3 px-4 font-semibold">Nhà cung cấp</th>
              <th className="py-3 px-4 text-right font-semibold">Giá vốn hiện tại (đ)</th>
              <th className="py-3 px-4 text-right font-semibold">Giá vốn mới (đ)</th>
              <th className="py-3 px-4 text-right font-semibold">Biên độ LN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {mockProducts.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-mono text-slate-500">{p.sku}</td>
                <td className="py-3 px-4 font-medium text-slate-900">{p.name}</td>
                <td className="py-3 px-4 text-slate-600">{p.supplier}</td>
                <td className="py-3 px-4 text-right text-slate-600">{p.costPrice.toLocaleString()}</td>
                <td className="py-3 px-4 text-right">
                  <input 
                    type="number" 
                    defaultValue={p.costPrice} 
                    className="w-28 text-right px-2 py-1 bg-white border border-slate-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm font-medium"
                  />
                </td>
                <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                  {Math.round(((p.price - p.costPrice) / p.price) * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
