import React, { useState } from 'react';
import { Search, ChevronDown, Filter, Settings, Download, Upload, Plus, ChevronLeft } from 'lucide-react';

const customersData = [
  { id: '1', code: 'CUZN01506', name: 'Test', phone: '', group: 'Bán lẻ', debt: 0, totalSpent: 0, ordersCount: 0 },
  { id: '2', code: 'CUZN01505', name: 'ỦY BAN AN SƠN', phone: '', group: 'Bán lẻ', debt: 0, totalSpent: 32400000, ordersCount: 1 },
  { id: '3', code: 'CUZN01504', name: 'E THẮM', phone: '', group: 'Bán lẻ', debt: 0, totalSpent: 23348044, ordersCount: 1 },
  { id: '4', code: 'CUZN01503', name: 'CÔ HÁT 5/59 Q THẮNG', phone: '0979319662', group: 'Bán lẻ', debt: 0, totalSpent: 19670000, ordersCount: 1 },
  { id: '5', code: 'CUZN01409', name: 'A TÙNG 315 AN ĐỊNH', phone: '0978291079', group: 'Bán lẻ', debt: 0, totalSpent: 35463714, ordersCount: 7, totalProducts: 1778, totalReturned: 0, lastOrderDate: '01/04/2026' },
  { id: '6', code: 'CUZN01408', name: 'Bà Muộn( A Thảo)', phone: '', group: 'Bán lẻ', debt: 0, totalSpent: 124835464, ordersCount: 10 },
  { id: '7', code: 'CUZN01407', name: 'E Luật', phone: '', group: 'Bán lẻ', debt: 0, totalSpent: 2622500, ordersCount: 1 },
];

const customerHistory = [
  { id: '1', code: 'SON15857', status: 'Hoàn thành', payment: true, export: true, total: 2453300, branch: 'Chi nhánh mặc định', source: 'Pos', staff: 'Lương Thị Hồng', date: '01/04/2026' },
  { id: '2', code: 'SON15830', status: 'Hoàn thành', payment: true, export: true, total: 1538728, branch: 'Chi nhánh mặc định', source: 'Pos', staff: 'Lương Thị Hồng', date: '27/03/2026' },
  { id: '3', code: 'SON15776', status: 'Hoàn thành', payment: true, export: true, total: 1769328, branch: 'Chi nhánh mặc định', source: 'Pos', staff: 'Lương Thị Hồng', date: '19/03/2026' },
  { id: '4', code: 'SON15775', status: 'Đã hủy', payment: false, export: false, total: 1629328, branch: 'Chi nhánh mặc định', source: 'Pos', staff: 'Lương Thị Hồng', date: '19/03/2026' },
  { id: '5', code: 'SON15772', status: 'Hoàn thành', payment: true, export: true, total: 16808382, branch: 'Chi nhánh mặc định', source: 'Pos', staff: 'Lương Thị Hồng', date: '18/03/2026' },
];

export function Customers() {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const selectedCustomer = customersData.find(c => c.id === selectedCustomerId);

  if (selectedCustomer) {
    return (
      <div className="flex flex-col h-full bg-[#f3f4f6]">
        {/* Details Header */}
        <div className="bg-white p-3 px-6 border-b flex justify-between items-center z-10 shrink-0">
           <button onClick={() => setSelectedCustomerId(null)} className="flex items-center gap-2 text-slate-600 hover:text-[#0088FF] font-medium text-[14px] transition-colors">
             <ChevronLeft size={16} /> Quay lại danh sách khách hàng
           </button>
           <div className="flex gap-3">
              <button className="px-4 py-1.5 border border-red-500 text-red-500 rounded hover:bg-red-50 transition-colors text-[13px] font-medium bg-white">Xóa khách hàng</button>
              <div className="flex border border-blue-600 rounded">
                <button className="flex items-center gap-2 bg-[#0088FF] hover:bg-blue-700 text-white px-4 py-1.5 text-[13px] font-medium transition-colors border-r border-blue-700">
                  Tạo phiếu thu/chi
                </button>
                <button className="bg-[#0088FF] hover:bg-blue-700 text-white px-2 flex items-center transition-colors">
                  <ChevronDown size={14} />
                </button>
              </div>
           </div>
        </div>

        {/* Details Body */}
        <div className="flex-1 overflow-auto p-4 md:p-6 custom-scrollbar pb-20">
            <div className="mb-4">
              <h1 className="text-[22px] font-semibold text-[#182537] mb-0">{selectedCustomer.name}</h1>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                 {/* Thông tin cá nhân */}
                 <div className="ui-card ui-card-body-compact">
                    <div className="flex justify-between items-center mb-5">
                       <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-[#182537] text-[15px]">Thông tin cá nhân</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[12px] font-medium border border-orange-300 text-orange-600 bg-orange-50">Đang giao dịch</span>
                       </div>
                       <button className="text-[#0088FF] hover:underline text-[13px] font-medium">Cập nhật</button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-[13px]">
                        <div className="flex"><div className="w-40 text-slate-600">Ngày sinh</div><div className="text-[#182537]">: ---</div></div>
                        <div className="flex"><div className="w-40 text-slate-600">Nhóm khách hàng</div><div className="text-[#0088FF] hover:underline cursor-pointer">: {selectedCustomer.group}</div></div>
                        <div className="flex"><div className="w-40 text-slate-600">Giới tính</div><div className="text-[#182537]">: Khác</div></div>
                        <div className="flex"><div className="w-40 text-slate-600">Mã khách hàng</div><div className="text-[#182537]">: {selectedCustomer.code}</div></div>
                        <div className="flex"><div className="w-40 text-slate-600">Số điện thoại</div><div className="text-[#182537]">: {selectedCustomer.phone || '---'}</div></div>
                        <div className="flex"><div className="w-40 text-slate-600">Mã số thuế</div><div className="text-[#182537]">: ---</div></div>
                        <div className="flex"><div className="w-40 text-slate-600">Email</div><div className="text-[#182537]">: ---</div></div>
                        <div className="flex"><div className="w-40 text-slate-600">Website</div><div className="text-[#182537]">: ---</div></div>
                        <div className="flex"><div className="w-40 text-slate-600">Nhân viên phụ trách</div><div className="text-[#182537]">: Lương Thị Hồng</div></div>
                        <div className="flex"><div className="w-40 text-slate-600">Mô tả</div><div className="text-[#182537]">: ---</div></div>
                        <div className="flex"><div className="w-40 text-slate-600">Tags</div><div className="text-[#182537]">: ---</div></div>
                    </div>
                 </div>

                 {/* Thông tin mua hàng */}
                 <div className="ui-card">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                       <h3 className="font-semibold text-[#182537] text-[15px]">Thông tin mua hàng</h3>
                       <button className="text-[#0088FF] hover:underline text-[13px] font-medium">Chi tiết</button>
                    </div>
                    <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-4 text-[13px]">
                        <div className="flex"><div className="w-48 text-slate-600">Tổng chi tiêu</div><div className="text-[#182537]">: {selectedCustomer.totalSpent.toLocaleString()}</div></div>
                        <div className="flex"><div className="w-48 text-slate-600">Tổng SL sản phẩm đã mua</div><div className="text-[#182537]">: {selectedCustomer.totalProducts || 0}</div></div>
                        <div className="flex"><div className="w-48 text-slate-600">Tổng SL đơn hàng</div><div className="text-[#182537]">: {selectedCustomer.ordersCount}</div></div>
                        <div className="flex"><div className="w-48 text-slate-600">Tổng SL sản phẩm hoàn trả</div><div className="text-[#182537]">: {selectedCustomer.totalReturned || 0}</div></div>
                        <div className="flex"><div className="w-48 text-slate-600">Ngày cuối cùng mua hàng</div><div className="text-[#182537]">: {selectedCustomer.lastOrderDate || '---'}</div></div>
                        <div className="flex"><div className="w-48 text-slate-600">Công nợ hiện tại</div><div className="text-[#182537]">: {selectedCustomer.debt}</div></div>
                    </div>
                 </div>

                 {/* Lịch sử */}
                 <div className="ui-card">
                    <div className="flex border-b border-slate-200 px-4 pt-1">
                       <button className="px-4 py-3 text-[14px] font-medium border-b-2 mr-4 transition-colors border-[#0088FF] text-[#0088FF]">
                         Lịch sử mua hàng
                       </button>
                       <button className="px-4 py-3 text-[14px] font-medium border-b-2 mr-4 transition-colors border-transparent text-slate-600 hover:text-[#0088FF]">Công nợ</button>
                       <button className="px-4 py-3 text-[14px] font-medium border-b-2 mr-4 transition-colors border-transparent text-slate-600 hover:text-[#0088FF]">Liên hệ</button>
                       <button className="px-4 py-3 text-[14px] font-medium border-b-2 mr-4 transition-colors border-transparent text-slate-600 hover:text-[#0088FF]">Địa chỉ</button>
                       <button className="px-4 py-3 text-[14px] font-medium border-b-2 mr-4 transition-colors border-transparent text-slate-600 hover:text-[#0088FF]">Ghi chú</button>
                       <button className="px-4 py-3 text-[14px] font-medium border-b-2 transition-colors border-transparent text-slate-600 hover:text-[#0088FF]">Nhóm khách hàng</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] text-[#182537] font-semibold">
                            <th className="py-3 px-5">Mã đơn hàng</th>
                            <th className="py-3 px-2 text-center">Trạng thái</th>
                            <th className="py-3 px-2 text-center">Thanh toán</th>
                            <th className="py-3 px-2 text-center">Xuất kho</th>
                            <th className="py-3 px-4 text-right">Giá trị</th>
                            <th className="py-3 px-4">Chi nhánh</th>
                            <th className="py-3 px-2">Nguồn đơn</th>
                            <th className="py-3 px-4">Nhân viên xử lý đơn</th>
                            <th className="py-3 px-5 text-right">Ngày ghi nhận</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[13.5px]">
                          {customerHistory.map((h) => (
                            <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-4 px-5 text-[#0088FF] hover:underline cursor-pointer">{h.code}</td>
                              <td className="py-4 px-2 text-center">
                                <span className={`inline-flex px-3 py-0.5 rounded-full text-[12px] border ${
                                  h.status === 'Hoàn thành' ? 'border-emerald-300 text-emerald-600 bg-emerald-50' : 'border-red-300 text-red-500 bg-red-50'
                                }`}>
                                  {h.status}
                                </span>
                              </td>
                              <td className="py-4 px-2 text-center">
                                {h.payment 
                                  ? <div className="w-2.5 h-2.5 bg-[#182537] rounded-full mx-auto" />
                                  : <div className="w-2.5 h-2.5 border-2 border-slate-400 rounded-full mx-auto" />
                                }
                              </td>
                              <td className="py-4 px-2 text-center">
                                {h.export 
                                  ? <div className="w-2.5 h-2.5 bg-[#182537] rounded-full mx-auto" />
                                  : <div className="w-2.5 h-2.5 border-2 border-slate-400 rounded-full mx-auto" />
                                }
                              </td>
                              <td className="py-4 px-4 text-right text-[#182537]">{h.total.toLocaleString()}</td>
                              <td className="py-4 px-4 text-[#182537]">{h.branch}</td>
                              <td className="py-4 px-2 text-[#182537]">{h.source}</td>
                              <td className="py-4 px-4 text-[#182537]">{h.staff}</td>
                              <td className="py-4 px-5 text-right text-[#182537]">{h.date}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center justify-end px-5 py-4 border-t border-slate-200 text-[13px] text-slate-600">
                       <div className="flex items-center gap-2 mr-6">
                         <span>Hiển thị</span>
                         <div className="relative">
                           <select className="appearance-none border border-slate-300 rounded px-3 py-1 pr-8 focus:outline-none focus:border-[#0088FF] bg-white text-[#182537]">
                             <option>20</option>
                             <option>50</option>
                             <option>100</option>
                           </select>
                           <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                         </div>
                         <span>kết quả</span>
                       </div>
                       <div className="mr-6">
                         Từ 1 đến 9 trên tổng 9
                       </div>
                       <div className="flex items-center gap-1">
                         <button className="w-7 h-7 flex items-center justify-center rounded text-slate-400 opacity-50 cursor-not-allowed">
                           <ChevronLeft size={16} />
                         </button>
                         <button className="w-7 h-7 flex items-center justify-center rounded bg-[#0088FF] text-white font-medium">
                           1
                         </button>
                         <button className="w-7 h-7 flex items-center justify-center rounded text-slate-400 opacity-50 cursor-not-allowed rotate-180">
                           <ChevronLeft size={16} />
                         </button>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Cột phải */}
              <div className="xl:col-span-1 space-y-6">
                 {/* Thông tin gợi ý mua hàng */}
                 <div className="ui-card ui-card-body-compact">
                    <div className="flex justify-between items-center mb-5">
                      <h3 className="font-semibold text-[#182537] text-[15px]">Thông tin gợi ý khi bán hàng</h3>
                      <button className="text-[#0088FF] hover:underline text-[13px] font-medium">Cập nhật</button>
                    </div>
                    <div className="space-y-3 text-[13px]">
                        <div className="flex"><div className="w-48 text-slate-600">Chính sách giá mặc định</div><div className="text-[#182537]">: ---</div></div>
                        <div className="flex"><div className="w-48 text-slate-600">Chiết khấu khách hàng</div><div className="text-[#182537]">: ---</div></div>
                        <div className="flex"><div className="w-48 text-slate-600">Hình thức thanh toán mặc định</div><div className="text-[#182537]">: ---</div></div>
                    </div>
                 </div>

                 <div className="ui-card ui-card-body-compact">
                    <h3 className="font-semibold text-[#182537] mb-5 text-[15px]">Thông tin tích điểm</h3>
                    <div className="space-y-3 text-[13px]">
                        <div className="flex"><div className="w-48 text-slate-600">Điểm hiện tại</div><div className="text-[#182537]">: 0</div></div>
                        <div className="flex"><div className="w-48 text-slate-600">Hạng thẻ hiện tại</div><div className="text-[#182537]">: ---</div></div>
                        <div className="flex"><div className="w-48 text-slate-600">Ngày hết hạn thẻ</div><div className="text-[#182537]">: ---</div></div>
                        <div className="flex"><div className="w-48 text-slate-600">Giá trị còn lại để lên hạng</div><div className="text-[#182537]">: 0</div></div>
                    </div>
                 </div>
              </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f3f4f6]">
      <div className="bg-white p-3 border-b flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-4 text-sm font-medium">
           <button className="flex items-center gap-1.5 text-slate-600 hover:text-[#0088FF] transition-colors">
              <Download size={16} /> Xuất file <ChevronDown size={14} />
           </button>
           <button className="flex items-center gap-1.5 text-slate-600 hover:text-[#0088FF] transition-colors">
              <Upload size={16} /> Nhập file
           </button>
        </div>
        <button className="flex items-center gap-2 bg-[#0088FF] hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
          <Plus size={16} /> Thêm khách hàng
        </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-0">
         <div className="bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] mb-4">
           {/* Tabs */}
           <div className="flex border-b border-slate-200 px-4 pt-1">
             <button 
               className={`px-4 py-3 text-[14px] font-medium border-b-2 mr-4 transition-colors ${activeTab === 'all' ? 'border-[#0088FF] text-[#0088FF]' : 'border-transparent text-slate-600 hover:text-[#0088FF]'}`}
               onClick={() => setActiveTab('all')}
             >
               Tất cả khách hàng
             </button>
             <button 
               className={`px-4 py-3 text-[14px] font-medium border-b-2 transition-colors ${activeTab === 'trading' ? 'border-[#0088FF] text-[#0088FF]' : 'border-transparent text-slate-600 hover:text-[#0088FF]'}`}
               onClick={() => setActiveTab('trading')}
             >
               Đang giao dịch
             </button>
           </div>

           {/* Filter & Search */}
           <div className="p-4 flex items-center gap-3 border-b border-slate-100">
             <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
               <input 
                 type="text" 
                 placeholder="Tìm kiếm theo mã khách hàng, tên, SĐT khách hàng" 
                 className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded text-[13px] focus:outline-none focus:border-[#0088FF] focus:ring-1 focus:ring-[#0088FF] transition-colors"
               />
             </div>
             
             <div className="flex items-center gap-2 shrink-0">
               <button className="flex items-center justify-between w-32 px-3 py-2 text-[13px] text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                 <span>Bộ lọc</span>
                 <Filter size={14} className="text-slate-400" />
               </button>
               <button className="px-5 py-2 text-[13px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors ml-2">
                 Lưu bộ lọc
               </button>
             </div>
           </div>

           {/* Table */}
           <div className="w-full overflow-x-auto min-h-[500px]">
             <table className="w-full text-left">
               <thead>
                 <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] text-[#182537] font-semibold">
                   <th className="py-3 px-4 w-12 text-center border-r border-slate-100">
                     <Settings size={16} className="text-slate-400 mx-auto cursor-pointer hover:text-slate-600" />
                   </th>
                   <th className="py-3 px-2 w-10 text-center"><input type="checkbox" className="rounded border-slate-300 text-[#0088FF]" /></th>
                   <th className="py-3 px-4 font-semibold">Mã khách hàng</th>
                   <th className="py-3 px-4 font-semibold flex items-center gap-1 cursor-pointer hover:text-[#0088FF]">Tên khách hàng <div className="flex flex-col"><ChevronDown size={10} className="rotate-180 -mb-1" /><ChevronDown size={10} /></div></th>
                   <th className="py-3 px-4 font-semibold">Số điện thoại</th>
                   <th className="py-3 px-4 font-semibold">Nhóm khách hàng</th>
                   <th className="py-3 px-4 font-semibold text-right flex items-center justify-end gap-1 cursor-pointer hover:text-[#0088FF]">Công nợ hiện tại <div className="flex flex-col"><ChevronDown size={10} className="rotate-180 -mb-1" /><ChevronDown size={10} /></div></th>
                   <th className="py-3 px-4 font-semibold text-right">Tổng chi tiêu <ChevronDown size={10} className="inline ml-1" /></th>
                   <th className="py-3 px-5 font-semibold text-center">Tổng SL đơn hàng</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-[13.5px] text-[#182537]">
                 {customersData.map((customer) => (
                   <tr key={customer.id} className="hover:bg-slate-50 transition-colors group">
                     <td className="py-3.5 px-4 text-center border-r border-slate-100 text-slate-400">
                     </td>
                     <td className="py-3.5 px-2 text-center"><input type="checkbox" className="rounded border-slate-300 text-[#0088FF]" /></td>
                     <td className="py-3.5 px-4 text-[#0088FF] cursor-pointer hover:underline" onClick={() => setSelectedCustomerId(customer.id)}>
                       {customer.code}
                     </td>
                     <td className="py-3.5 px-4">{customer.name}</td>
                     <td className="py-3.5 px-4">{customer.phone}</td>
                     <td className="py-3.5 px-4">{customer.group}</td>
                     <td className="py-3.5 px-4 text-right">{customer.debt}</td>
                     <td className="py-3.5 px-4 text-right">
                       {customer.totalSpent > 0 ? customer.totalSpent.toLocaleString() : '0'}
                     </td>
                     <td className="py-3.5 px-5 text-center">{customer.ordersCount}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>

           {/* Pagination */}
           <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-[13px] text-[#182537]">
              <div className="flex items-center gap-2">
                <span>Hiển thị</span>
                <select defaultValue="100" className="border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#0088FF] bg-white">
                  <option>20</option>
                  <option>50</option>
                  <option value="100">100</option>
                </select>
                <span>kết quả</span>
                <span className="ml-2 text-slate-500">Từ 1 đến 100 trên tổng 1494</span>
              </div>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center rounded text-slate-400 opacity-50"><ChevronLeft size={16} /></button>
                <button className="w-8 h-8 flex items-center justify-center rounded bg-[#0088FF] text-white font-medium">1</button>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 transition-colors">2</button>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 transition-colors">3</button>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 transition-colors">4</button>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 transition-colors">5</button>
                <span className="mx-1 text-slate-400">...</span>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 transition-colors">15</button>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 rotate-180 transition-colors"><ChevronLeft size={16} /></button>
              </div>
           </div>
         </div>
      </div>
    </div>
  );
}
