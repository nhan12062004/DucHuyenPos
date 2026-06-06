import React from 'react';
import { Plus, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const customerGroupsData = [
  { id: '1', name: 'Vip', code: 'VIP', type: 'Cố định', description: '', count: 0, createdAt: '05/05/2020' },
  { id: '2', name: 'Bán buôn', code: 'BANBUON', type: 'Cố định', description: '', count: 0, createdAt: '05/05/2020' },
  { id: '3', name: 'Bán lẻ', code: 'BANLE', type: 'Cố định', description: '', count: 1494, createdAt: '05/05/2020' },
];

export function CustomerGroups() {
  return (
    <div className="flex flex-col h-full bg-[#f3f4f6]">
      {/* Header */}
      <div className="bg-white p-3 px-6 border-b flex justify-between items-center z-10 shrink-0">
        <h1 className="text-[20px] font-semibold text-[#182537] mb-0">Nhóm khách hàng</h1>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-6">
         <div className="bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] mb-4">
           {/* Top Actions in Card */}
           <div className="p-4 flex justify-end border-b border-slate-100">
             <button className="flex items-center gap-2 bg-[#0088FF] hover:bg-blue-700 text-white px-4 py-2 rounded text-[14px] font-medium transition-colors">
               <Plus size={16} /> Thêm nhóm khách hàng
             </button>
           </div>

           {/* Table */}
           <div className="w-full overflow-x-auto min-h-[500px]">
             <table className="w-full text-left">
               <thead>
                 <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] text-[#182537] font-semibold">
                   <th className="py-3.5 px-6 font-semibold flex items-center gap-1 cursor-pointer hover:text-[#0088FF] w-1/5">Tên nhóm <div className="flex flex-col"><ChevronDown size={10} className="rotate-180 -mb-1" /><ChevronDown size={10} /></div></th>
                   <th className="py-3.5 px-6 font-semibold w-1/6">Mã nhóm</th>
                   <th className="py-3.5 px-6 font-semibold w-1/6">Loại nhóm</th>
                   <th className="py-3.5 px-6 font-semibold">Mô tả</th>
                   <th className="py-3.5 px-6 font-semibold text-right w-[150px]">Số lượng khách hàng</th>
                   <th className="py-3.5 px-6 font-semibold text-right w-[150px]">Ngày tạo</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-[13.5px] text-[#182537]">
                 {customerGroupsData.map((group) => (
                   <tr key={group.id} className="hover:bg-slate-50 transition-colors group">
                     <td className="py-4 px-6 text-[#0088FF] cursor-pointer hover:underline">
                       {group.name}
                     </td>
                     <td className="py-4 px-6 uppercase">{group.code}</td>
                     <td className="py-4 px-6">{group.type}</td>
                     <td className="py-4 px-6 text-slate-500">{group.description}</td>
                     <td className="py-4 px-6 text-right">{group.count}</td>
                     <td className="py-4 px-6 text-right">{group.createdAt}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>

           {/* Pagination */}
           <div className="flex items-center justify-end px-5 py-4 border-t border-slate-200 text-[13px] text-[#182537]">
              <div className="flex items-center gap-2 mr-6">
                <span className="text-slate-600">Hiển thị</span>
                <div className="relative">
                  <select defaultValue="20" className="appearance-none border border-slate-300 rounded px-3 py-1 pr-8 focus:outline-none focus:border-[#0088FF] bg-white text-[#182537] min-w-[60px]">
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
                <span className="text-slate-600">kết quả</span>
              </div>
              <div className="mr-6 text-slate-600">
                Từ 1 đến 3 trên tổng 3
              </div>
              <div className="flex items-center gap-1">
                <button className="w-7 h-7 flex items-center justify-center rounded text-slate-400 opacity-50 cursor-not-allowed">
                  <ChevronLeft size={16} />
                </button>
                <button className="w-7 h-7 flex items-center justify-center rounded bg-[#0088FF] text-white font-medium">
                  1
                </button>
                <button className="w-7 h-7 flex items-center justify-center rounded text-slate-400 opacity-50 cursor-not-allowed">
                  <ChevronRight size={16} />
                </button>
              </div>
           </div>
         </div>
      </div>
    </div>
  );
}
