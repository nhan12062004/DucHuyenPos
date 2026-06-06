import React from 'react';
import { Search, AlertTriangle, ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { mockProducts } from '../services/mockData';

export function Inventory() {
  const lowStock = mockProducts.filter(p => p.stock < 100);

  return (
    <div className="space-y-6 flex flex-col h-full">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Tổng sản phẩm trong kho</p>
            <h4 className="text-2xl font-bold text-slate-800">{mockProducts.length} <span className="text-sm font-normal text-slate-500">mã hàng</span></h4>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <ArrowRightLeft size={24} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
           <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Sắp hết hàng</p>
            <h4 className="text-2xl font-bold text-red-600">{lowStock.length} <span className="text-sm font-normal text-slate-500">mặt hàng cần nhập</span></h4>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <AlertTriangle size={24} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
           <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Tổng giá trị tồn kho</p>
            <h4 className="text-2xl font-bold text-slate-800">
               {(mockProducts.reduce((sum, p) => sum + (p.stock * p.costPrice), 0)).toLocaleString()} <span className="text-sm font-normal text-slate-500">đ</span>
            </h4>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <ArrowDownToLine size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-slate-100 shrink-0 flex items-center justify-between bg-slate-50/50">
          <div className="relative w-96">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
                type="text" 
                placeholder="Tìm mặt hàng kiểm kho..." 
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow shadow-sm"
             />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              Kiểm kho
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white sticky top-0 z-10 backdrop-blur-sm">
              <tr className="text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="py-3 px-4 font-semibold">Tên sản phẩm</th>
                <th className="py-3 px-4 font-semibold">Mã SKU</th>
                <th className="py-3 px-4 font-semibold">Danh mục</th>
                <th className="py-3 px-4 font-semibold">Nhà cung cấp</th>
                <th className="py-3 px-4 text-right font-semibold">Tồn kho hiện tại</th>
                <th className="py-3 px-4 text-center font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {mockProducts.map(product => (
                <tr key={product.id} className={`hover:bg-slate-50/80 transition-colors ${product.stock < 100 ? 'bg-red-50/30 border-red-100' : ''}`}>
                   <td className="py-3 px-4 font-medium text-slate-900">{product.name}</td>
                   <td className="py-3 px-4 text-sm text-slate-500 font-mono">{product.sku}</td>
                   <td className="py-3 px-4 text-sm text-slate-600">{product.category}</td>
                   <td className="py-3 px-4 text-sm text-slate-600">{product.supplier}</td>
                   <td className={`py-3 px-4 text-right font-semibold ${product.stock < 100 ? 'text-red-600' : 'text-slate-800'}`}>
                     {product.stock}
                   </td>
                   <td className="py-3 px-4 text-center">
                     {product.stock < 100 ? (
                       <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-red-100 text-red-700 w-fit">
                         <AlertTriangle size={12} /> Cần nhập
                       </span>
                     ) : (
                       <span className="inline-flex px-2.5 py-1 rounded text-xs font-medium bg-green-100 text-green-700 w-fit">
                         Đủ hàng
                       </span>
                     )}
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
