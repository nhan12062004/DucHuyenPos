import React from 'react';
import { Search, Calculator, CheckCircle } from 'lucide-react';
import { mockProducts } from '../services/mockData';

export function PurchaseImport() {
  const [selectedSupplier, setSelectedSupplier] = React.useState('Nhựa Tiền Phong');

  // Simple hardcoded UI logic for mockup
  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* MAIN IMPORT AREA */}
      <div className="flex-1 ui-card overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 bg-white">
          <h2 className="text-lg font-bold text-slate-800">Chi tiết phiếu nhập</h2>
          <div className="mt-4 relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <input 
                type="text" 
                placeholder="Tìm sản phẩm để nhập kho..." 
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded text-[13px] focus:outline-none focus:border-[#0088FF] transition-colors"
             />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto w-full">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] font-semibold text-[#182537]">
                <th className="py-3 px-5 w-12 text-center font-semibold">STT</th>
                <th className="py-3 px-2 font-semibold">Tên hàng</th>
                <th className="py-3 px-2 w-32 text-right font-semibold">Số lượng nhập</th>
                <th className="py-3 px-2 w-36 text-right font-semibold">Đơn giá nhập</th>
                <th className="py-3 px-5 w-40 text-right font-semibold">Thành tiền</th>
                <th className="py-3 px-5 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px] text-[#182537]">
              {/* Mock items added to PO */}
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-4 px-5 text-center font-medium text-slate-500">1</td>
                <td className="py-4 px-2 font-medium text-[#182537] hover:text-[#0088FF]">Ống nhựa Tiền Phong D27</td>
                <td className="py-4 px-2">
                  <input type="number" defaultValue={200} className="w-full text-right p-1.5 border border-slate-300 rounded text-[13px] focus:outline-none focus:ring-1 focus:ring-[#0088FF] focus:border-[#0088FF]" />
                </td>
                <td className="py-4 px-2">
                   <input type="number" defaultValue={15000} className="w-full text-right p-1.5 border border-slate-300 rounded text-[13px] focus:outline-none focus:ring-1 focus:ring-[#0088FF] focus:border-[#0088FF]" />
                </td>
                <td className="py-4 px-5 text-right font-semibold text-slate-800">
                  3,000,000
                </td>
                <td className="py-4 px-5 text-center">
                  <button className="text-slate-400 hover:text-red-500 transition-colors">✕</button>
                </td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-4 px-5 text-center font-medium text-slate-500">2</td>
                <td className="py-4 px-2 font-medium text-[#182537] hover:text-[#0088FF]">Keo dán ống Tiền Phong 500g</td>
                <td className="py-4 px-2">
                  <input type="number" defaultValue={50} className="w-full text-right p-1.5 border border-slate-300 rounded text-[13px] focus:outline-none focus:ring-1 focus:ring-[#0088FF] focus:border-[#0088FF]" />
                </td>
                <td className="py-4 px-2">
                   <input type="number" defaultValue={45000} className="w-full text-right p-1.5 border border-slate-300 rounded text-[13px] focus:outline-none focus:ring-1 focus:ring-[#0088FF] focus:border-[#0088FF]" />
                </td>
                <td className="py-4 px-5 text-right font-semibold text-slate-800">
                  2,250,000
                </td>
                <td className="py-4 px-5 text-center">
                  <button className="text-slate-400 hover:text-red-500 transition-colors">✕</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT PANEL - SUPPLIER INFO & SUMMARY */}
      <div className="w-full md:w-80 shrink-0 flex flex-col gap-6">
        <div className="ui-card p-5">
           <h3 className="text-[14px] font-bold text-[#182537] mb-4 tracking-wider uppercase">Thông tin nhà cung cấp</h3>
           
           <div className="space-y-4">
             <div>
               <label className="block text-[13px] font-medium text-[#182537] mb-1">Nhà cung cấp (*)</label>
               <select 
                 className="w-full bg-white border border-slate-300 rounded text-[13px] p-2 focus:ring-[#0088FF] focus:border-[#0088FF] focus:outline-none"
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
               <label className="block text-[13px] font-medium text-[#182537] mb-1">Mã phiếu nhập</label>
               <input type="text" placeholder="Hệ thống tự tạo" disabled className="w-full bg-slate-50 border border-slate-200 rounded text-[13px] p-2 text-slate-500" />
             </div>
           </div>
        </div>

        <div className="ui-card p-5 flex flex-col">
           <h3 className="text-[14px] font-bold text-[#182537] mb-4 tracking-wider uppercase">Thanh toán</h3>
           <div className="space-y-3 text-[13px] flex-1">
             <div className="flex justify-between text-[#182537]">
               <span>Số mã hàng</span>
               <span>2 mã</span>
             </div>
             <div className="flex justify-between text-[#182537]">
               <span>Tổng SL nhập</span>
               <span>250</span>
             </div>
             <div className="pt-3 border-t border-slate-100 flex justify-between font-semibold text-[#182537] text-[14px]">
               <span>Tiền hàng</span>
               <span>5,250,000</span>
             </div>
             <div className="py-3 flex justify-between items-center text-[#182537] font-medium border-b border-slate-100">
               <span>Đã trả NCC</span>
               <input type="text" className="w-28 text-right border border-slate-300 rounded p-1.5 focus:border-[#0088FF] focus:outline-none focus:ring-1 focus:ring-[#0088FF]" placeholder="0" />
             </div>
             <div className="flex justify-between items-center text-[#182537]">
               <span>Tính vào công nợ</span>
               <span className="font-semibold text-orange-600 text-[14px]">5,250,000</span>
             </div>
           </div>

           <button className="mt-6 w-full py-2.5 bg-[#0088FF] text-white rounded font-medium hover:bg-blue-700 transition-colors flex justify-center items-center gap-2">
             <CheckCircle size={16} /> Hoàn tất nhập hàng
           </button>
        </div>
      </div>
    </div>
  );
}
