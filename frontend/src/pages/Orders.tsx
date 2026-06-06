import React, { useState } from 'react';
import { Search, ChevronDown, Filter, Settings, Download, Upload, Plus, ChevronLeft, Printer, Copy, Check, Receipt, CheckCircle, Package, Info, ImageIcon } from 'lucide-react';

const ordersData = [
  { id: '1', code: 'SON15940', date: '06/06/2026 18:56', customer: 'Test', status: 'Đang giao dịch', paymentStatus: 'paid', total: 0 },
  { id: '2', code: 'SON15939', date: '06/06/2026 17:07', customer: 'Khách lẻ', status: 'Đã hủy', paymentStatus: 'unpaid', total: 0 },
  { id: '3', code: 'SON15938', date: '30/05/2026 10:05', customer: 'E THẮM', status: 'Hoàn thành', paymentStatus: 'paid', total: 23348044 },
  { id: '4', code: 'SON15937', date: '29/05/2026 15:13', customer: 'ỦY BAN AN SƠN', status: 'Hoàn thành', paymentStatus: 'paid', total: 32400000 },
  { id: '5', code: 'SON15936', date: '29/05/2026 11:45', customer: 'E THẮM', status: 'Đã hủy', paymentStatus: 'unpaid', total: 23834044 },
  { id: '6', code: 'SON15935', date: '28/05/2026 09:53', customer: 'CÔ HÁP 5/59 Q THẮNG', status: 'Hoàn thành', paymentStatus: 'paid', total: 19670000 },
  { id: '7', code: 'SON15934', date: '26/05/2026 07:12', customer: 'E MẠNH ĐOÀN ĐÌNH DUYỆT', status: 'Hoàn thành', paymentStatus: 'paid', total: 1663400 },
  { id: '8', code: 'SON15933', date: '21/05/2026 10:16', customer: 'CTY HOA HẢI', status: 'Đã hủy', paymentStatus: 'unpaid', total: 8325800 },
];

const orderDetailProducts = [
  { id: 1, no: 64, name: 'BĂNG DÍNH NANO TO XỊN', sub: 'Mặc định', sku: 'PVN1160', qty: 5, price: 10000, discount: 0, total: 50000 },
  { id: 2, no: 63, name: 'NỐI 11/11', sub: '', sku: '', qty: 2, price: 15000, discount: 0, total: 30000 },
  { id: 3, no: 62, name: 'ĐẾ ÂM ĐƠN VUÔNG', sub: '', sku: '', qty: 80, price: 5000, discount: 0, total: 400000 },
  { id: 4, no: 61, name: 'HỘP NỔI 20/20', sub: '', sku: '', qty: 3, price: 50000, discount: 0, total: 150000 },
];

export function Orders() {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const selectedOrder = ordersData.find(o => o.id === selectedOrderId);

  if (selectedOrder) {
    return (
      <div className="flex flex-col h-full bg-[#f3f4f6]">
        {/* Details Header */}
        <div className="bg-white p-3 px-6 border-b flex justify-between items-center z-10 shrink-0">
           <button onClick={() => setSelectedOrderId(null)} className="flex items-center gap-2 text-slate-600 hover:text-[#0088FF] font-medium text-[14px] transition-colors">
             <ChevronLeft size={16} /> Quay lại danh sách đơn hàng
           </button>
           <div className="flex gap-3">
              <button className="px-4 py-1.5 border border-red-500 text-red-500 rounded hover:bg-red-50 transition-colors text-[13px] font-medium bg-white">Hủy đơn hàng</button>
              <button className="px-4 py-1.5 border border-[#0088FF] text-[#0088FF] rounded hover:bg-blue-50 transition-colors text-[13px] font-medium bg-white">Sửa đơn hàng</button>
              <button className="px-4 py-1.5 bg-[#0088FF] text-white rounded hover:bg-blue-700 transition-colors text-[13px] font-medium">Đổi trả hàng</button>
           </div>
        </div>

        {/* Details Body */}
        <div className="flex-1 overflow-auto p-4 md:p-6 custom-scrollbar pb-20">
            {/* Header info */}
            <div className="mb-6 flex items-start justify-between">
               <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <h1 className="text-[22px] font-semibold text-[#182537]">{selectedOrder.code}</h1>
                    <span className="px-2.5 py-0.5 rounded-full text-[12px] font-medium border border-emerald-300 text-emerald-600 bg-emerald-50">
                      {selectedOrder.status}
                    </span>
                 </div>
                 <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded bg-white text-slate-700 font-medium text-[13px] hover:bg-slate-50 shadow-sm transition-colors">
                      <Printer size={14} className="text-slate-500" /> In đơn hàng <ChevronDown size={14} className="text-slate-400" />
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded bg-white text-slate-700 font-medium text-[13px] hover:bg-slate-50 shadow-sm transition-colors">
                      <Copy size={14} className="text-slate-500" /> Sao chép
                    </button>
                 </div>
               </div>
               
               <div className="w-[500px] mt-2">
                 <div className="flex justify-between items-start text-[12px] font-medium text-slate-500 relative">
                   {/* Line behind */}
                   <div className="absolute top-[10px] left-[5%] right-[5%] h-[2px] bg-slate-200 z-0"></div>
                   <div className="absolute top-[10px] left-[5%] w-[90%] h-[2px] bg-[#0088FF] z-0"></div>
                   
                   {['Đặt hàng', 'Duyệt', 'Đóng gói', 'Xuất kho', 'Hoàn thành'].map((step, idx) => (
                     <div key={idx} className="flex flex-col items-center gap-2 w-20 z-10">
                       <div className="w-[22px] h-[22px] rounded-full bg-[#0088FF] text-white flex items-center justify-center relative z-10 ring-[6px] ring-[#f3f4f6]">
                         <Check size={14} strokeWidth={3} />
                       </div>
                       <div className="text-[#182537] font-medium whitespace-nowrap">{step}</div>
                       {idx === 4 && <div className="text-[11px] text-slate-400 font-normal whitespace-nowrap">30/05/2026 10:05</div>}
                     </div>
                   ))}
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                 {/* Thông tin khách hàng */}
                 <div className="ui-card">
                    <div className="p-5 flex gap-8">
                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold text-[#182537] mb-4 text-[15px]">Thông tin khách hàng</h3>
                        <a href="#" className="flex text-[#0088FF] font-medium text-[14px] hover:underline">{selectedOrder.customer}</a>
                        <div className="mt-5 space-y-1">
                          <div className="flex items-center gap-2 text-[12px] uppercase font-semibold text-[#182537] mb-1">ĐỊA CHỈ GIAO HÀNG</div>
                          <p className="text-slate-500 text-[13px]">Chưa có thông tin giao hàng</p>
                          <a href="#" className="text-[#0088FF] text-[13px] hover:underline inline-block mt-1">Thêm địa chỉ</a>
                        </div>
                      </div>
                      <div className="w-[280px] bg-white border border-dashed border-slate-300 rounded p-4 text-[13px] space-y-3 shrink-0 self-start">
                         <div className="flex justify-between">
                             <span className="text-slate-600">Nợ phải thu</span>
                             <span className="text-red-500 font-medium">0</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-slate-600">Tổng chi tiêu (1 đơn)</span>
                             <span className="text-[#0088FF] font-medium">{selectedOrder.total.toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-slate-600">Trả hàng (0 sản phẩm)</span>
                             <span className="text-red-500 font-medium">0</span>
                         </div>
                         <div className="flex justify-between">
                             <span className="text-slate-600">Giao hàng thất bại (1 đơn)</span>
                             <span className="text-red-500 font-medium">{selectedOrder.total.toLocaleString()}</span>
                         </div>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 p-3 text-center">
                       <button className="text-[#0088FF] text-[13px] flex items-center gap-1 mx-auto hover:text-blue-700 font-medium">
                         Xem thêm <ChevronDown size={14} />
                       </button>
                    </div>
                 </div>

                 {/* Hóa đơn điện tử */}
                 <div className="ui-card ui-card-body-compact flex justify-between items-center">
                     <div>
                         <h3 className="font-semibold text-[#182537] flex items-center gap-2 mb-2 text-[15px]">
                           <Receipt size={18} className="text-slate-400" /> Hóa đơn điện tử
                         </h3>
                         <p className="text-slate-500 text-[13px] leading-relaxed">
                           Đơn hàng chưa được tạo Hóa đơn điện tử.<br/>
                           Bạn có thể chỉnh sửa (nếu cần) và phát hành Hóa đơn điện tử sau khi tạo Hóa đơn điện tử.
                         </p>
                     </div>
                     <button className="bg-[#0088FF] text-white px-4 py-2 rounded font-medium text-[13px] hover:bg-blue-700 transition-colors shrink-0">
                       Tạo hóa đơn điện tử
                     </button>
                 </div>

                 {/* Thanh toán */}
                 <div className="ui-card ui-card-body-compact">
                     <h3 className="font-semibold text-emerald-600 flex items-center gap-2 mb-4 text-[15px]">
                       <CheckCircle size={18} /> Đã thanh toán toàn bộ
                     </h3>
                     <div className="flex justify-between text-[13px] mb-4 lg:w-3/4">
                         <div className="text-slate-600 w-1/3">Khách phải trả: <span className="text-[#182537] font-semibold">{selectedOrder.total.toLocaleString()}</span></div>
                         <div className="text-slate-600 w-1/3">Đã thanh toán: <span className="text-[#182537] font-semibold">{selectedOrder.total.toLocaleString()}</span></div>
                         <div className="text-slate-600 w-1/3 text-right">Còn phải trả: <span className="text-[#182537] font-semibold">0</span></div>
                     </div>
                     <div className="flex justify-between items-center text-[13px] bg-slate-50 p-3 rounded">
                         <div className="flex items-center gap-2 text-[#0088FF] font-medium">
                           <div className="w-1.5 h-1.5 rounded-full bg-[#0088FF]"></div> Tiền mặt {selectedOrder.total.toLocaleString()}
                         </div>
                         <div className="text-slate-500">30/05/2026 10:05:57</div>
                     </div>
                 </div>

                 {/* Đóng gói và giao hàng */}
                 <div className="ui-card ui-card-body-compact">
                     <h3 className="font-semibold text-[#182537] flex items-center gap-2 mb-4 text-[15px]">
                       <Package size={18} className="text-slate-400" /> Đóng gói và giao hàng
                     </h3>
                     <div className="flex flex-wrap gap-4 items-center mb-6 bg-slate-50 border border-slate-100 p-3 rounded">
                         <div className="flex items-center gap-2 text-[#0088FF] font-medium">
                           <div className="w-1.5 h-1.5 rounded-full bg-[#0088FF]"></div> FUN15966 <Copy size={12} className="text-slate-400 cursor-pointer" />
                         </div>
                         <div className="px-2 py-0.5 rounded text-[11px] font-medium text-emerald-600 bg-emerald-50">Đã giao hàng</div>
                         <div className="text-slate-500 text-[13px]">30/05/2026 10:05:57</div>
                         <Printer size={16} className="text-slate-400 ml-auto cursor-pointer hover:text-slate-700" />
                     </div>
                     <div className="space-y-3 text-[13px]">
                         <div className="flex"><div className="w-40 text-slate-600">Mã đóng gói</div><div className="text-[#0088FF] flex items-center gap-1">: FUN15966 <Info size={14} className="text-blue-500"/></div></div>
                         <div className="flex"><div className="w-40 text-slate-600">Hình thức giao hàng</div><div className="text-[#182537]">: Nhận tại cửa hàng</div></div>
                     </div>
                 </div>

              </div>
              
              {/* Cột phải */}
              <div className="xl:col-span-1 space-y-6">
                 {/* Thông tin đơn hàng */}
                 <div className="ui-card ui-card-body-compact">
                    <h3 className="font-semibold text-[#182537] mb-5 text-[15px]">Thông tin đơn hàng</h3>
                    <div className="space-y-3 text-[13px]">
                        <div className="flex"><div className="w-32 text-slate-600">Chính sách giá</div><div className="text-[#182537]">: Giá bán lẻ</div></div>
                        <div className="flex"><div className="w-32 text-slate-600">Bán tại</div><div className="text-[#182537]">: Chi nhánh mặc định</div></div>
                        <div className="flex"><div className="w-32 text-slate-600">Bán bởi</div><div className="text-[#182537]">: Lương Thị Hồng</div></div>
                        <div className="flex"><div className="w-32 text-slate-600">Hẹn giao hàng</div><div className="text-[#182537]">: ---</div></div>
                        <div className="flex"><div className="w-32 text-slate-600">Nguồn</div><div className="text-[#182537]">: POS</div></div>
                        <div className="flex"><div className="w-32 text-slate-600">Kênh bán hàng</div><div className="text-[#182537]">: POS</div></div>
                        <div className="flex"><div className="w-32 text-slate-600">Ngày bán</div><div className="text-[#182537]">: {selectedOrder.date}</div></div>
                        <div className="flex"><div className="w-32 text-slate-600">Đường dẫn</div><div className="text-[#182537]">: ---</div></div>
                        <div className="flex"><div className="w-32 text-slate-600">Tham chiếu</div><div className="text-[#182537]">: ---</div></div>
                    </div>
                    <div className="mt-5 text-center border-t border-slate-100 pt-3">
                       <button className="text-[#0088FF] font-medium text-[13px] hover:underline">Xem lịch sử đơn hàng</button>
                    </div>
                 </div>

                 <div className="ui-card ui-card-body-compact">
                    <h3 className="font-semibold text-[#182537] mb-2 text-[14px]">Ghi chú</h3>
                    <p className="text-slate-500 text-[13px]">Chưa có ghi chú</p>
                    
                    <h3 className="font-semibold text-[#182537] mt-6 mb-2 text-[14px] flex items-center gap-1">
                      Tags <Info size={14} className="text-slate-400" />
                    </h3>
                    <p className="text-slate-500 text-[13px]">Chưa có tag</p>
                 </div>
              </div>

            </div>

            {/* list product */}
            <div className="ui-card mt-6">
                <div className="p-0 border-b border-slate-200 flex justify-between items-end px-5">
                    <h3 className="font-semibold text-[#0088FF] border-b-2 border-[#0088FF] pb-3 pt-4 text-[14px]">Thông tin sản phẩm</h3>
                    <div className="flex items-center gap-4 text-[13px] pb-3">
                        <button className="text-[#0088FF] hover:underline font-medium">Kiểm tra tồn kho</button>
                        <Settings size={16} className="text-slate-400 cursor-pointer hover:text-slate-600"/>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] text-slate-700 font-semibold">
                        <th className="py-3 px-4 w-12 text-center">STT</th>
                        <th className="py-3 px-2 w-16">Ảnh</th>
                        <th className="py-3 px-2 min-w-[200px]">Tên sản phẩm</th>
                        <th className="py-3 px-2 w-24 text-center">Số lượng</th>
                        <th className="py-3 px-2 w-28 text-right">Đơn giá</th>
                        <th className="py-3 px-2 w-24 text-right">Chiết khấu</th>
                        <th className="py-3 px-5 w-32 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orderDetailProducts.map((p, index) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4 text-center text-slate-500 font-medium text-[13px]">{index + 1}</td>
                          <td className="py-4 px-2">
                            <div className="w-10 h-10 border border-slate-200 rounded flex items-center justify-center bg-white text-slate-300">
                              <ImageIcon size={20} />
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            <div className="font-medium text-[#182537] text-[13px] hover:text-[#0088FF] cursor-pointer inline-block">{p.name}</div>
                            {p.sub && <div className="text-[12px] text-slate-500 mt-0.5">{p.sub}</div>}
                            {p.sku && <div className="text-[12px] text-[#0088FF] cursor-pointer hover:underline">{p.sku}</div>}
                          </td>
                          <td className="py-4 px-2 text-center text-[#182537] text-[13px]">{p.qty}</td>
                          <td className="py-4 px-2 text-right text-[#182537] text-[13px]">{p.price.toLocaleString()}</td>
                          <td className="py-4 px-2 text-right text-[#182537] text-[13px]">{p.discount}</td>
                          <td className="py-4 px-5 text-right text-[#182537] font-medium text-[13px]">{p.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-5 flex justify-end">
                    <div className="w-[320px] space-y-3 text-[13px]">
                        <div className="flex justify-between">
                            <span className="text-slate-600">Tổng tiền ({orderDetailProducts.reduce((s, x) => s + x.qty, 0)} sản phẩm)</span>
                            <span className="text-[#182537] font-medium">{orderDetailProducts.reduce((s, x) => s + x.total, 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-600 flex items-center gap-1">Chiết khấu <Info size={14} className="text-[#0088FF]"/></span>
                            <span className="text-[#182537] font-medium">0</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-600">Phí giao hàng</span>
                            <span className="text-[#182537] font-medium">0</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#0088FF] cursor-pointer hover:underline flex items-center gap-1">Mã giảm giá <ChevronDown size={14} /></span>
                            <span className="text-[#182537] font-medium">0</span>
                        </div>
                        <div className="flex justify-between font-bold text-[#182537] pt-3 border-t border-slate-200 text-[14px]">
                            <span>Khách phải trả</span>
                            <span>{selectedOrder.total.toLocaleString()}</span>
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
          <Plus size={16} /> Tạo đơn hàng
        </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-0">
         <div className="bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] mb-4">
           {/* Section 1: Stats */}
           <div className="p-4 border-b border-slate-100">
             <div className="flex items-center justify-between mb-3 text-sm">
                <div className="font-semibold text-[#182537] uppercase tracking-tight flex items-center gap-2 text-[15px]">
                  ĐƠN HÀNG CẦN XỬ LÝ <span className="text-[#0088FF] cursor-pointer font-normal normal-case text-[14px]">90 ngày gần nhất <ChevronDown size={14} className="inline ml-1" /></span>
                </div>
                <button className="text-[#0088FF] hover:text-blue-800 font-medium">Ẩn đơn hàng cần xử lý</button>
             </div>
             
             <div className="grid grid-cols-6 gap-0 border-l border-t border-b border-slate-200 bg-white">
                <div className="p-3 border-r border-slate-200">
                   <div className="text-slate-500 text-[13px] mb-1 flex items-center gap-1">Chờ duyệt <span className="text-[#0088FF] font-semibold">0</span></div>
                   <div className="font-semibold text-[#182537]">0</div>
                </div>
                <div className="p-3 border-r border-slate-200">
                   <div className="text-slate-500 text-[13px] mb-1 flex items-center gap-1">Chờ thanh toán <span className="text-[#0088FF] font-semibold">10</span></div>
                   <div className="font-semibold text-[#182537]">89,069,176</div>
                </div>
                <div className="p-3 border-r border-slate-200">
                   <div className="text-slate-500 text-[13px] mb-1 flex items-center gap-1">Chờ đóng gói <span className="text-[#0088FF] font-semibold">1</span></div>
                   <div className="font-semibold text-[#182537]">0</div>
                </div>
                <div className="p-3 border-r border-slate-200">
                   <div className="text-slate-500 text-[13px] mb-1 flex items-center gap-1">Chờ lấy hàng <span className="text-[#0088FF] font-semibold">0</span></div>
                   <div className="font-semibold text-[#182537]">0</div>
                </div>
                <div className="p-3 border-r border-slate-200">
                   <div className="text-slate-500 text-[13px] mb-1 flex items-center gap-1">Đang giao hàng <span className="text-[#0088FF] font-semibold">0</span></div>
                   <div className="font-semibold text-[#182537]">0</div>
                </div>
                <div className="p-3 border-r border-slate-200 flex flex-col justify-between relative group">
                   <div className="text-slate-500 text-[13px] mb-1 flex items-center gap-1">Chờ giao lại <span className="text-red-500 bg-red-100 px-1 rounded-full text-[10px]">!</span> <span className="text-[#0088FF] font-semibold">0</span></div>
                   <div className="font-semibold text-[#182537] flex justify-between items-end">
                     <span>0</span>
                     <ChevronDown size={14} className="text-slate-400 group-hover:text-[#0088FF] cursor-pointer" />
                   </div>
                </div>
             </div>
           </div>

           {/* Tabs */}
           <div className="flex border-b border-slate-200 px-4 pt-1">
             <button 
               className={`px-4 py-3 text-[14px] font-medium border-b-2 mr-4 transition-colors ${activeTab === 'all' ? 'border-[#0088FF] text-[#0088FF]' : 'border-transparent text-slate-600 hover:text-[#0088FF]'}`}
               onClick={() => setActiveTab('all')}
             >
               Tất cả đơn hàng
             </button>
             <button 
               className={`px-4 py-3 text-[14px] font-medium border-b-2 transition-colors ${activeTab === 'trading' ? 'border-[#0088FF] text-[#0088FF]' : 'border-transparent text-slate-600 hover:text-[#0088FF]'}`}
               onClick={() => setActiveTab('trading')}
             >
               Đang giao dịch
             </button>
           </div>

           {/* Filter & Search */}
           <div className="p-4 flex items-center gap-3 bg-white">
             <div className="relative flex-1 max-w-lg">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
               <input 
                 type="text" 
                 placeholder="Tìm kiếm theo mã đơn hàng, vận đơn, tên, SĐT khách hàng / người nhận hàng" 
                 className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded text-[13px] focus:outline-none focus:border-[#0088FF] focus:ring-1 focus:ring-[#0088FF] transition-colors"
               />
             </div>
             
             <div className="flex items-center gap-2">
               <button className="flex items-center justify-between w-32 px-3 py-2 text-[13px] text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                 <span>Ngày tạo</span>
                 <ChevronDown size={14} className="text-slate-400" />
               </button>
               <button className="flex items-center justify-between w-32 px-3 py-2 text-[13px] text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                 <span>Trạng thái</span>
                 <ChevronDown size={14} className="text-slate-400" />
               </button>
               <button className="flex items-center justify-between w-[160px] px-3 py-2 text-[13px] text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                 <span className="truncate">Nhân viên phụ trách</span>
                 <ChevronDown size={14} className="text-slate-400 shrink-0" />
               </button>
               <button className="flex items-center justify-between w-32 px-3 py-2 text-[13px] text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                 <span>Bộ lọc khác</span>
                 <Filter size={14} className="text-slate-400" />
               </button>
               <button className="px-5 py-2 text-[13px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors ml-2">
                 Lưu bộ lọc
               </button>
             </div>
           </div>

           {/* Table Component integrated */}
           <div className="w-full overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="border-y border-slate-200 bg-slate-50/50 text-[13px] text-slate-700 font-semibold">
                   <th className="py-3 px-4 w-12 text-center border-r border-slate-100">
                     <Settings size={16} className="text-slate-400 mx-auto cursor-pointer hover:text-slate-600" />
                   </th>
                   <th className="py-3 px-2 w-10 text-center"><input type="checkbox" className="rounded border-slate-300 text-[#0088FF]" /></th>
                   <th className="py-3 px-4 font-semibold">Mã đơn hàng</th>
                   <th className="py-3 px-4 font-semibold flex items-center gap-1 cursor-pointer hover:text-[#0088FF] mb-0.5 mt-0.5">Ngày tạo đơn <div className="flex flex-col"><ChevronDown size={10} className="rotate-180 -mb-1" /><ChevronDown size={10} /></div></th>
                   <th className="py-3 px-4 font-semibold">Tên khách hàng</th>
                   <th className="py-3 px-4 font-semibold">Trạng thái đơn hàng</th>
                   <th className="py-3 px-4 font-semibold text-center mt-1 block">Trạng thái Thanh toán</th>
                   <th className="py-3 px-4 font-semibold text-right">Khách phải trả</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-[13.5px] text-[#182537]">
                 {ordersData.map((order, index) => (
                   <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                     <td className="py-3.5 px-4 text-center border-r border-slate-100 text-slate-400">
                       <ChevronDown size={16} className="mx-auto rotate-[-90deg]" />
                     </td>
                     <td className="py-3.5 px-2 text-center"><input type="checkbox" className="rounded border-slate-300 text-[#0088FF]" /></td>
                     <td className="py-3.5 px-4 text-[#0088FF] cursor-pointer hover:underline" onClick={() => setSelectedOrderId(order.id)}>{order.code}</td>
                     <td className="py-3.5 px-4 text-slate-600">{order.date}</td>
                     <td className="py-3.5 px-4">{order.customer}</td>
                     <td className="py-3.5 px-4">
                       <span className={`inline-flex px-3 py-0.5 rounded-full text-[12px] border ${
                         order.status === 'Đang giao dịch' ? 'border-orange-300 text-orange-600 bg-orange-50' :
                         order.status === 'Đã hủy' ? 'border-red-300 text-red-500 bg-red-50' :
                         order.status === 'Hoàn thành' ? 'border-emerald-300 text-emerald-600 bg-emerald-50' :
                         'border-slate-300 text-slate-600 bg-slate-50'
                       }`}>
                         {order.status}
                       </span>
                     </td>
                     <td className="py-3.5 px-4 text-center">
                        {order.paymentStatus === 'paid' 
                          ? <div className="w-2.5 h-2.5 bg-[#182537] rounded-full mx-auto" />
                          : <div className="w-2.5 h-2.5 border-2 border-slate-400 rounded-full mx-auto" />
                        }
                     </td>
                     <td className="py-3.5 px-4 text-right">
                       {order.total.toLocaleString()}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>

         </div>
      </div>
    </div>
  );
}
