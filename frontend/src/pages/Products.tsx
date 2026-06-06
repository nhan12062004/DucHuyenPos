import React, { useState } from 'react';
import { Search, ChevronDown, Filter, Settings, Download, Upload, Plus, ChevronLeft, Copy, ImageIcon } from 'lucide-react';

const productsData = [
  { id: '1', sku: '---', name: 'test', type: '---', brand: '---', instock: -1, available: 0, createdAt: '06/06/2026' },
  { id: '2', sku: 'PVN2155', name: 'Y THU 110/90 PVC', type: '---', brand: '---', instock: 92, available: 92, createdAt: '20/10/2025' },
  { id: '3', sku: '---', name: 'ĐẾ ÂM ĐƠN MPE', type: '---', brand: '---', instock: 650, available: 650, createdAt: '04/06/2025' },
  { id: '4', sku: '---', name: 'BIT 27', type: '---', brand: '---', instock: -21, available: -21, createdAt: '26/04/2025' },
  { id: '5', sku: '---', name: 'QUẠT TRẦN KHIỂN 3C ASA GHI XÁM X', type: '---', brand: '---', instock: 2, available: 2, createdAt: '05/03/2025' },
  { id: '6', sku: '---', name: 'QUẠT TRẦN KHIỂN 3C ASA NÂU CF X', type: '---', brand: '---', instock: 2, available: 2, createdAt: '05/03/2025' },
  { id: '7', sku: '---', name: 'QUẠT TRẦN 3C KHIỂN ASA TRẮNG X', type: '---', brand: '---', instock: 2, available: 2, createdAt: '05/03/2025' },
  { id: '8', sku: '---', name: 'BÌNH SIÊU TỐC KÍNH ASA X', type: '---', brand: '---', instock: 12, available: 12, createdAt: '05/03/2025' },
  { id: '9', sku: '---', name: 'TỦ TRANH DLE', type: '---', brand: '---', instock: -3, available: -3, createdAt: '30/07/2024' },
];

export function Products() {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const selectedProduct = productsData.find(p => p.id === selectedProductId);

  if (selectedProduct) {
    return (
      <div className="flex flex-col h-full bg-[#f3f4f6]">
        {/* Details Header */}
        <div className="bg-white p-3 px-6 border-b flex justify-between items-center z-10 shrink-0">
           <button onClick={() => setSelectedProductId(null)} className="flex items-center gap-2 text-slate-600 hover:text-[#0088FF] font-medium text-[14px] transition-colors">
             <ChevronLeft size={16} /> Quay lại danh sách sản phẩm
           </button>
           <div className="flex gap-3">
              <button className="px-4 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors text-[13px] font-medium bg-white">Thoát</button>
              <button className="px-4 py-1.5 border border-red-500 text-red-500 rounded hover:bg-red-50 transition-colors text-[13px] font-medium bg-white">Xóa</button>
              <button className="px-4 py-1.5 bg-[#0088FF] text-white rounded hover:bg-blue-700 transition-colors text-[13px] font-medium">Sửa sản phẩm</button>
           </div>
        </div>

        {/* Details Body */}
        <div className="flex-1 overflow-auto p-4 md:p-6 custom-scrollbar pb-20">
            <div className="mb-4">
              <h1 className="text-[22px] font-semibold text-[#182537] mb-3">{selectedProduct.name}</h1>
              <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 rounded bg-white text-slate-700 font-medium text-[13px] hover:bg-slate-50 shadow-sm transition-colors">
                <Copy size={14} className="text-slate-500" /> Sao chép
              </button>
            </div>

            <div className="space-y-6">
                 {/* Thông tin sản phẩm */}
                 <div className="ui-card">
                    <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                      <h3 className="font-semibold text-[#182537] text-[15px]">Thông tin sản phẩm</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[12px] font-medium border border-orange-300 text-orange-600 bg-orange-50">
                        Đang giao dịch
                      </span>
                    </div>
                    <div className="p-5 flex gap-8">
                       <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-4 text-[13px]">
                          <div className="flex"><div className="w-40 text-slate-600">Mã SKU</div><div className="text-[#182537]">: {selectedProduct.sku}</div></div>
                          <div className="flex"><div className="w-40 text-slate-600">Loại sản phẩm</div><div className="text-[#182537]">: {selectedProduct.type}</div></div>
                          <div className="flex"><div className="w-40 text-slate-600">Mã barcode</div><div className="text-[#182537]">: {selectedProduct.sku}</div></div>
                          <div className="flex"><div className="w-40 text-slate-600">Nhãn hiệu</div><div className="text-[#182537]">: {selectedProduct.brand}</div></div>
                          <div className="flex"><div className="w-40 text-slate-600">Khối lượng</div><div className="text-[#182537]">: 500g</div></div>
                          <div className="flex"><div className="w-40 text-slate-600">Nhóm ngành nghề tính thuế GTGT, TNCN</div><div className="text-[#182537]">: ---</div></div>
                          <div className="flex"><div className="w-40 text-slate-600">Đơn vị tính</div><div className="text-[#182537]">: CÁI</div></div>
                          <div className="flex"><div className="w-40 text-slate-600">Tags</div><div className="text-[#182537]">: ---</div></div>
                          <div className="flex"><div className="w-40 text-slate-600">Phân loại</div><div className="text-[#182537]">: Sản phẩm thường</div></div>
                          <div className="flex"><div className="w-40 text-slate-600">Ngày tạo</div><div className="text-[#182537]">: {selectedProduct.createdAt} 15:31</div></div>
                          <div className="flex"><div className="w-40 text-[#0088FF] hover:underline cursor-pointer">Xem mô tả</div></div>
                          <div className="flex"><div className="w-40 text-slate-600">Ngày cập nhật cuối</div><div className="text-[#182537]">: {selectedProduct.createdAt} 15:31</div></div>
                       </div>
                       
                       <div className="w-[300px] shrink-0 flex flex-col items-center justify-center border border-dashed border-slate-300 rounded p-4 bg-slate-50 min-h-[160px]">
                         <ImageIcon size={48} className="text-slate-300 mb-2" />
                         <p className="text-slate-500 text-[13px]">Sản phẩm chưa có ảnh tải lên</p>
                       </div>
                    </div>
                 </div>

                 <div className="flex gap-6 items-start">
                   {/* Giá sản phẩm */}
                   <div className="ui-card flex-1">
                      <div className="p-4 border-b border-slate-100">
                        <h3 className="font-semibold text-[#182537] text-[15px]">Giá sản phẩm</h3>
                      </div>
                      <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-4 text-[13px]">
                        <div className="flex"><div className="w-32 text-slate-600">Giá bán lẻ</div><div className="text-[#182537]">: 70,848</div></div>
                        <div className="flex"><div className="w-32 text-slate-600">Giá bán buôn</div><div className="text-[#182537]">: 0</div></div>
                        <div className="flex"><div className="w-32 text-slate-600">Giá nhập</div><div className="text-[#182537]">: 70,848</div></div>
                      </div>
                   </div>

                   {/* Thông tin thêm */}
                   <div className="ui-card w-[300px] shrink-0">
                      <div className="p-4 border-b border-slate-100">
                        <h3 className="font-semibold text-[#182537] text-[15px]">Thông tin thêm</h3>
                      </div>
                      <div className="p-5 space-y-4 text-[13px] text-slate-700">
                         <label className="flex items-center gap-2 cursor-pointer">
                           <input type="checkbox" defaultChecked className="rounded border-slate-300 text-[#0088FF]" disabled />
                           <span>Cho phép bán</span>
                         </label>
                         <label className="flex items-center gap-2 cursor-pointer">
                           <input type="checkbox" className="rounded border-slate-300 text-[#0088FF]" disabled />
                           <span>Áp dụng thuế</span>
                         </label>
                         <label className="flex items-center gap-2 cursor-pointer">
                           <input type="checkbox" className="rounded border-slate-300 text-[#0088FF]" disabled />
                           <span>Áp dụng bảo hành</span>
                         </label>
                      </div>
                   </div>
                 </div>

                 {/* Tồn kho */}
                 <div className="ui-card">
                    <div className="flex border-b border-slate-200 px-4 pt-1">
                       <button className="px-4 py-3 text-[14px] font-medium border-b-2 mr-4 transition-colors border-[#0088FF] text-[#0088FF]">
                         Tồn kho
                       </button>
                       <button className="px-4 py-3 text-[14px] font-medium border-b-2 transition-colors border-transparent text-slate-600 hover:text-[#0088FF]">
                         Lịch sử kho
                       </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] text-[#182537] font-semibold">
                            <th className="py-3 px-5">Chi nhánh</th>
                            <th className="py-3 px-2 text-right">Tồn kho</th>
                            <th className="py-3 px-2 text-right">Giá vốn</th>
                            <th className="py-3 px-2 text-right">Có thể bán</th>
                            <th className="py-3 px-2 text-right">Đang giao dịch</th>
                            <th className="py-3 px-2 text-right">Hàng đang về</th>
                            <th className="py-3 px-2 text-right">Hàng đang giao</th>
                            <th className="py-3 px-2 text-right">Tồn tối thiểu</th>
                            <th className="py-3 px-2 text-right">Tồn tối đa</th>
                            <th className="py-3 px-5 text-right">Điểm lưu kho</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr className="hover:bg-slate-50 transition-colors text-[13px]">
                            <td className="py-4 px-5 text-[#182537]">Chi nhánh mặc định</td>
                            <td className="py-4 px-2 text-right font-medium text-[#182537]">{selectedProduct.instock}</td>
                            <td className="py-4 px-2 text-right text-[#182537]">70,848</td>
                            <td className="py-4 px-2 text-right font-medium text-[#182537]">{selectedProduct.available}</td>
                            <td className="py-4 px-2 text-right text-[#182537]">0</td>
                            <td className="py-4 px-2 text-right text-[#182537]">0</td>
                            <td className="py-4 px-2 text-right text-[#182537]">0</td>
                            <td className="py-4 px-2 text-right text-[#182537]">---</td>
                            <td className="py-4 px-2 text-right text-[#182537]">---</td>
                            <td className="py-4 px-5 text-right text-[#182537]">---</td>
                          </tr>
                        </tbody>
                      </table>
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
           <div className="h-4 w-px bg-slate-300 mx-1"></div>
           <button className="text-slate-600 hover:text-[#0088FF] transition-colors">Loại sản phẩm</button>
           <button className="text-slate-600 hover:text-[#0088FF] transition-colors">Combo</button>
           <button className="text-slate-600 hover:text-[#0088FF] transition-colors">Sản phẩm quy đổi</button>
        </div>
        <div className="flex border border-blue-600 rounded">
          <button className="flex items-center gap-2 bg-[#0088FF] hover:bg-blue-700 text-white px-4 py-1.5 text-sm font-medium transition-colors border-r border-blue-700">
            <Plus size={16} /> Thêm sản phẩm
          </button>
          <button className="bg-[#0088FF] hover:bg-blue-700 text-white px-2 flex items-center transition-colors">
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-0">
         <div className="bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] mb-4">
           {/* Tabs */}
           <div className="flex border-b border-slate-200 px-4 pt-1">
             <button 
               className={`px-4 py-3 text-[14px] font-medium border-b-2 mr-4 transition-colors ${activeTab === 'all' ? 'border-[#0088FF] text-[#0088FF]' : 'border-transparent text-slate-600 hover:text-[#0088FF]'}`}
               onClick={() => setActiveTab('all')}
             >
               Tất cả sản phẩm
             </button>
           </div>

           {/* Filter & Search */}
           <div className="p-4 flex items-center gap-3 border-b border-slate-100">
             <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
               <input 
                 type="text" 
                 placeholder="Tìm kiếm theo mã sản phẩm, tên sản phẩm, barcode" 
                 className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded text-[13px] focus:outline-none focus:border-[#0088FF] focus:ring-1 focus:ring-[#0088FF] transition-colors"
               />
             </div>
             
             <div className="flex items-center gap-2 shrink-0">
               <button className="flex items-center justify-between w-32 px-3 py-2 text-[13px] text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                 <span>Loại sản phẩm</span>
                 <ChevronDown size={14} className="text-slate-400" />
               </button>
               <button className="flex items-center justify-between w-32 px-3 py-2 text-[13px] text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                 <span>Ngày tạo</span>
                 <ChevronDown size={14} className="text-slate-400" />
               </button>
               <button className="flex items-center justify-between w-32 px-3 py-2 text-[13px] text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                 <span>Nhãn hiệu</span>
                 <ChevronDown size={14} className="text-slate-400" />
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

           {/* Table */}
           <div className="w-full overflow-x-auto min-h-[500px]">
             <table className="w-full text-left">
               <thead>
                 <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] text-[#182537] font-semibold">
                   <th className="py-3 px-4 w-12 text-center border-r border-slate-100">
                     <Settings size={16} className="text-slate-400 mx-auto cursor-pointer hover:text-slate-600" />
                   </th>
                   <th className="py-3 px-2 w-10 text-center"><input type="checkbox" className="rounded border-slate-300 text-[#0088FF]" /></th>
                   <th className="py-3 px-4 w-16">Ảnh</th>
                   <th className="py-3 px-4 font-semibold">Sản phẩm</th>
                   <th className="py-3 px-4 font-semibold text-center">Loại</th>
                   <th className="py-3 px-4 font-semibold text-center mt-1 block">Nhãn hiệu</th>
                   <th className="py-3 px-4 font-semibold text-center">Có thể bán</th>
                   <th className="py-3 px-4 font-semibold text-center">Tồn kho</th>
                   <th className="py-3 px-4 font-semibold flex items-center justify-end gap-1 cursor-pointer hover:text-[#0088FF]">Ngày khởi tạo <div className="flex flex-col"><ChevronDown size={10} className="rotate-180 -mb-1" /><ChevronDown size={10} /></div></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-[13.5px] text-[#182537]">
                 {productsData.map((product) => (
                   <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                     <td className="py-3 px-4 text-center border-r border-slate-100 text-slate-400">
                     </td>
                     <td className="py-3 px-2 text-center"><input type="checkbox" className="rounded border-slate-300 text-[#0088FF]" /></td>
                     <td className="py-3 px-4">
                       <div className="w-10 h-10 border border-slate-200 rounded flex items-center justify-center bg-white text-slate-200">
                         <ImageIcon size={20} />
                       </div>
                     </td>
                     <td className="py-3 px-4 text-[#0088FF] cursor-pointer hover:underline font-medium" onClick={() => setSelectedProductId(product.id)}>
                       {product.name}
                     </td>
                     <td className="py-3 px-4 text-center">{product.type !== '---' ? product.type : ''}</td>
                     <td className="py-3 px-4 text-center text-slate-500">
                       {product.brand !== '---' ? product.brand : ''}
                     </td>
                     <td className="py-3 px-4 text-center">
                       <div className="font-semibold text-[#182537]">{product.available}</div>
                       <div className="text-[12px] text-slate-500 mt-0.5">(1 phiên bản)</div>
                     </td>
                     <td className="py-3 px-4 text-center">
                       <div className="font-semibold text-[#182537]">{product.instock}</div>
                       <div className="text-[12px] text-slate-500 mt-0.5">(1 phiên bản)</div>
                     </td>
                     <td className="py-3 px-4 text-right">
                       {product.createdAt}
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
