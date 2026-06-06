import React from 'react';
import { Search, Calculator, CheckCircle } from 'lucide-react';
import { mockProducts } from '../services/mockData';

export function PurchaseImport() {
  const [selectedSupplier, setSelectedSupplier] = React.useState('Nhựa Tiền Phong');

  // Simple hardcoded UI logic for mockup
  return (
    <div className="flex h-full gap-6 text-slate-800">
      {/* MAIN IMPORT AREA */}
      <div className="flex-1 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <h2 className="text-lg font-semibold tracking-tight text-slate-800">Chi tiết phiếu nhập</h2>
          <div className="mt-4 relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
                type="text" 
                placeholder="Tìm sản phẩm để nhập kho..." 
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
             />
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-white custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white sticky top-0 z-10">
              <tr className="text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="py-3 px-4 w-12 text-center font-semibold">STT</th>
                <th className="py-3 px-4 font-semibold">Tên hàng</th>
                <th className="py-3 px-4 w-32 text-right font-semibold">Số lượng nhập</th>
                <th className="py-3 px-4 w-36 text-right font-semibold">Đơn giá nhập</th>
                <th className="py-3 px-4 w-40 text-right font-semibold">Thành tiền</th>
                <th className="py-3 px-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Mock items added to PO */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-4 text-center text-sm font-medium text-slate-500">1</td>
                <td className="py-4 px-4 font-medium text-slate-800">Ống nhựa Tiền Phong D27</td>
                <td className="py-4 px-4">
                  <input type="number" defaultValue={200} className="w-full text-right p-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500" />
                </td>
                <td className="py-4 px-4">
                   <input type="number" defaultValue={15000} className="w-full text-right p-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500" />
                </td>
                <td className="py-4 px-4 text-right font-semibold text-slate-800">
                  3,000,000
                </td>
                <td className="py-4 px-4 text-center">
                  <button className="text-slate-400 hover:text-red-500 transition-colors">✕</button>
                </td>
              </tr>
              <tr className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-4 px-4 text-center text-sm font-medium text-slate-500">2</td>
                <td className="py-4 px-4 font-medium text-slate-800">Keo dán ống Tiền Phong 500g</td>
                <td className="py-4 px-4">
                  <input type="number" defaultValue={50} className="w-full text-right p-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500" />
                </td>
                <td className="py-4 px-4">
                   <input type="number" defaultValue={45000} className="w-full text-right p-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500" />
                </td>
                <td className="py-4 px-4 text-right font-semibold text-slate-800">
                  2,250,000
                </td>
                <td className="py-4 px-4 text-center">
                  <button className="text-slate-400 hover:text-red-500 transition-colors">✕</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT PANEL - SUPPLIER INFO & SUMMARY */}
      <div className="w-80 shrink-0 flex flex-col gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
           <h3 className="text-[13px] font-bold text-slate-800 mb-4 tracking-wider uppercase">Thông tin nhà cung cấp</h3>
           
           <div className="space-y-4">
             <div>
               <label className="block text-xs font-medium text-slate-500 mb-1">Nhà cung cấp (*)</label>
               <select 
                 className="w-full bg-white border border-slate-300 rounded-md text-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                 value={selectedSupplier}
                 onChange={e => setSelectedSupplier(e.target.value)}
               >
                 <option>Nhựa Tiền Phong</option>
                 <option>Nhựa Bình Minh</option>
                 <option>Cadivi</option>
                 <option>Panasonic Việt Nam</option>
               </select>
             </div>
             
             <div>
               <label className="block text-xs font-medium text-slate-500 mb-1">Mã phiếu nhập</label>
               <input type="text" placeholder="Hệ thống tự tạo" disabled className="w-full bg-slate-50 border border-slate-200 rounded-md text-sm p-2 text-slate-500" />
             </div>
           </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col h-full">
           <h3 className="text-[13px] font-bold text-slate-800 mb-4 tracking-wider uppercase">Thanh toán</h3>
           <div className="space-y-3 text-sm flex-1">
             <div className="flex justify-between text-slate-600">
               <span>Số mã hàng</span>
               <span>2 mã</span>
             </div>
             <div className="flex justify-between text-slate-600">
               <span>Tổng SL nhập</span>
               <span>250</span>
             </div>
             <div className="pt-3 border-t border-slate-100 flex justify-between font-semibold text-slate-800 text-base">
               <span>Tiền hàng</span>
               <span>5,250,000</span>
             </div>
             <div className="py-3 flex justify-between items-center text-slate-800 font-medium border-b border-slate-100">
               <span>Đã trả NCC</span>
               <input type="text" className="w-28 text-right border-b border-slate-300 focus:border-blue-500 focus:outline-none" placeholder="0" />
             </div>
             <div className="flex justify-between items-center text-slate-600">
               <span>Tính vào công nợ</span>
               <span className="font-semibold text-orange-600">5,250,000</span>
             </div>
           </div>

           <button className="mt-6 w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex justify-center items-center gap-2 shadow-sm">
             <CheckCircle size={18} /> Hoàn tất nhập hàng
           </button>
        </div>
      </div>
    </div>
  );
}
