import React from 'react';
import { Search, Save } from 'lucide-react';
import { mockProducts } from '../services/mockData';

export function CostPrice() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Giá vốn</h1>
        <button className="list-primary-button">
          <Save size={16} /> Lưu thay đổi
        </button>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 p-5 bg-white">
          <div className="relative w-96 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Tìm sản phẩm cập nhật giá vốn..." 
              className="w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-4 text-[13px] transition-colors focus:border-[#0088FF] focus:outline-none"
            />
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] font-semibold text-[#182537]">
                <th className="px-5 py-3">Mã SKU</th>
                <th className="px-2 py-3">Tên sản phẩm</th>
                <th className="px-2 py-3">Nhà cung cấp</th>
                <th className="px-2 py-3 text-right">Giá vốn hiện tại (đ)</th>
                <th className="px-2 py-3 text-right">Giá vốn mới (đ)</th>
                <th className="px-5 py-3 text-right">Biên độ LN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockProducts.map(p => (
                <tr key={p.id} className="text-[13px] transition-colors hover:bg-slate-50">
                  <td className="px-5 py-4 font-mono text-slate-500">{p.sku}</td>
                  <td className="px-2 py-4 font-medium text-[#182537] hover:text-[#0088FF] cursor-pointer">{p.name}</td>
                  <td className="px-2 py-4 text-slate-600">{p.supplier}</td>
                  <td className="px-2 py-4 text-right text-[#182537]">{p.costPrice.toLocaleString()}</td>
                  <td className="px-2 py-4 text-right">
                    <input 
                      type="number" 
                      defaultValue={p.costPrice} 
                      className="w-28 text-right px-2 py-1.5 bg-white border border-slate-300 rounded focus:border-[#0088FF] focus:outline-none focus:ring-1 focus:ring-[#0088FF] text-[13px] font-medium"
                    />
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-emerald-600">
                    {Math.round(((p.price - p.costPrice) / p.price) * 100)}%
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
