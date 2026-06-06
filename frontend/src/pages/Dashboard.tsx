import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  DollarSign, ShoppingBag, RotateCcw, XCircle, 
  FileText, CreditCard, Package, Truck, XSquare, 
  ChevronDown, ChevronRight, Search, Inbox, AlertCircle
} from 'lucide-react';

const revenueData = [
  { name: '01/06', total: 12500000 },
  { name: '02/06', total: 18000000 },
  { name: '03/06', total: 15400000 },
  { name: '04/06', total: 22000000 },
  { name: '05/06', total: 19500000 },
  { name: '06/06', total: 0 },
  { name: '07/06', total: 0 },
];

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'DOANH_THU' | 'TY_TRONG'>('DOANH_THU');
  const selectClassName =
    'appearance-none bg-white border border-slate-200 text-slate-700 rounded-lg font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10';
  const compactSelectClassName =
    'appearance-none bg-white border border-slate-200 text-slate-700 rounded font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8';

  return (
    <div className="page-shell grid grid-cols-1 gap-6 text-sm xl:grid-cols-4">
      
      {/* Main Content (Left) */}
      <div className="xl:col-span-3 space-y-6">
        
        {/* Kết quả kinh doanh trong ngày */}
        <div className="ui-card">
          <div className="ui-card-header">
            <h2 className="font-bold text-slate-800 uppercase">Kết quả kinh doanh trong ngày</h2>
            <div className="relative">
              <select className={`${selectClassName} py-1.5 pl-4`}>
                <option>Tất cả chi nhánh</option>
                <option>Chi nhánh trung tâm</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <ResultItem icon={<div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><DollarSign size={20} /></div>} label="Doanh thu" value="0" />
            <ResultItem icon={<div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><ShoppingBag size={20} /></div>} label="Đơn hàng mới" value="1" />
            <ResultItem icon={<div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><RotateCcw size={20} /></div>} label="Đơn trả hàng" value="0" />
            <ResultItem icon={<div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600"><XCircle size={20} /></div>} label="Đơn hủy" value="0" />
          </div>
        </div>

        {/* Chart Section */}
        <div className="ui-card relative pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6">
            <div className="flex gap-6">
              <button 
                onClick={() => setActiveTab('DOANH_THU')}
                className={`pb-3 font-semibold text-[13px] uppercase tracking-wide border-b-2 transition-colors whitespace-nowrap ${activeTab === 'DOANH_THU' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Doanh thu bán hàng
              </button>
              <button 
                onClick={() => setActiveTab('TY_TRONG')}
                className={`pb-3 font-semibold text-[13px] uppercase tracking-wide border-b-2 transition-colors whitespace-nowrap ${activeTab === 'TY_TRONG' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Tỷ trọng bán hàng
              </button>
            </div>
            
            <div className="flex gap-2 pb-2">
              <div className="relative">
                <select className={`${selectClassName} py-1.5 pl-4`}>
                  <option>Tất cả chi nhánh</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              </div>
              <div className="relative xl:block hidden">
                <select className={`${selectClassName} py-1.5 pl-4`}>
                  <option>7 ngày qua</option>
                  <option>Tháng này</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              </div>
            </div>
          </div>
          
          <div className="p-6 h-[350px]">
             {activeTab === 'DOANH_THU' ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  {/* Empty state image placeholder based on specific screenshot */}
                  <div className="w-56 h-40 mb-4 opacity-70 flex justify-center items-center">
                    <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                      <rect x="50" y="40" width="100" height="70" rx="8" fill="#E2E8F0" opacity="0.5"/>
                      <circle cx="100" cy="75" r="24" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="4"/>
                      <path d="M90 65 L110 85 M110 65 L90 85" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round"/>
                      <path d="M115 90 L135 110" stroke="#F97316" strokeWidth="8" strokeLinecap="round"/>
                      <path d="M30 110 C40 90, 50 110, 60 90" stroke="#93C5FD" strokeWidth="10" strokeLinecap="round" opacity="0.6"/>
                      <path d="M140 70 C150 50, 160 80, 170 50" stroke="#93C5FD" strokeWidth="10" strokeLinecap="round" opacity="0.6"/>
                    </svg>
                  </div>
                  <p>Chưa có dữ liệu</p>
                </div>
             ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <div className="w-48 h-48 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-16 h-16 text-slate-200" />
                  </div>
                  <p>Chưa có dữ liệu</p>
                </div>
             )}
          </div>
        </div>

        {/* Đơn hàng chờ xử lý */}
        <div className="ui-card">
          <div className="ui-card-header">
            <h2 className="font-bold text-slate-800 uppercase">Đơn hàng chờ xử lý</h2>
            <div className="relative">
              <select className={`${selectClassName} py-1.5 pl-4`}>
                <option>7 ngày qua</option>
                <option>Tháng này</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-slate-100 text-center">
             <PendingItem icon={<FileText size={24} className="text-blue-500" />} label="Chờ duyệt" value="0" />
             <PendingItem icon={<CreditCard size={24} className="text-blue-500" />} label="Chờ thanh toán" value="0" />
             <PendingItem icon={<Package size={24} className="text-blue-500" />} label="Chờ đóng gói" value="0" />
             <PendingItem icon={<Truck size={24} className="text-blue-500" />} label="Chờ lấy hàng" value="0" />
             <PendingItem icon={<Truck size={24} className="text-blue-500" />} label="Đang giao hàng" value="0" />
             <PendingItem icon={<XSquare size={24} className="text-red-500" />} label="Hủy giao - chờ nhận" value="0" />
          </div>
        </div>

        {/* Top Sản phẩm & Thông tin kho */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Sản phẩm */}
          <div className="ui-card flex min-h-[300px] flex-col">
             <div className="ui-card-header">
                <h2 className="font-bold text-slate-800 uppercase">Top sản phẩm</h2>
                <div className="flex gap-2">
                  <div className="relative">
                    <select className={`${compactSelectClassName} py-1 pl-3 text-[13px] hidden sm:block`}>
                      <option>7 ngày qua</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hidden sm:block" size={14} />
                  </div>
                  <button className="px-2 py-1 border border-slate-200 rounded text-slate-500 hover:bg-slate-50 font-bold tracking-widest text-[13px]">
                    ...
                  </button>
                </div>
             </div>
             <div className="p-4 flex-1">
                <div className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors -mx-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[13px]">
                      01
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-slate-800 leading-tight">test12</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">PVN2156</p>
                    </div>
                  </div>
                  <div className="font-bold text-slate-800">
                    1
                  </div>
                </div>
             </div>
          </div>

          {/* Thông tin kho */}
          <div className="ui-card flex min-h-[300px] flex-col">
             <div className="ui-card-header">
                <h2 className="font-bold text-slate-800 uppercase">Thông tin kho</h2>
                <div className="relative">
                  <select className={`${compactSelectClassName} py-1 pl-3 text-[13px]`}>
                    <option>Tất cả chi nhánh</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                </div>
             </div>
             <div className="flex flex-col divide-y divide-slate-100 h-full">
                <div className="px-6 py-4 flex justify-between items-center hover:bg-slate-50 cursor-pointer transition-colors">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1 text-[13px] text-slate-600 font-medium">
                      Sản phẩm dưới định mức 
                      <span className="flex items-center justify-center w-[14px] h-[14px] rounded-full border border-red-500 text-red-500 text-[10px] font-bold">!</span>
                    </div>
                    <p className="text-[17px] font-bold text-slate-800">158</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </div>
                <div className="px-6 py-4 flex justify-between items-center hover:bg-slate-50 cursor-pointer transition-colors">
                  <div>
                    <p className="text-[13px] text-slate-600 mb-1 font-medium">Số tồn kho chi nhánh</p>
                    <p className="text-[17px] font-bold text-slate-800">1,980,197,746</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </div>
                <div className="px-6 py-4 flex justify-between items-center hover:bg-slate-50 cursor-pointer transition-colors flex-1">
                  <div>
                    <p className="text-[13px] text-slate-600 mb-1 font-medium">Giá trị tồn kho chi nhánh</p>
                    <p className="text-[17px] font-bold text-slate-800">88,026,990,912,834</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </div>
             </div>
          </div>
        </div>

      </div>

      {/* Right Column */}
      <div className="xl:col-span-1 space-y-6">
        
        {/* Hoạt động gần đây */}
        <div className="ui-card flex h-full min-h-[600px] flex-col">
          <div className="ui-card-header">
            <h2 className="font-bold text-slate-800 uppercase">Hoạt động gần đây</h2>
          </div>
          <div className="p-6 flex-1 relative">
            {/* Timeline track */}
            <div className="absolute left-[31px] top-8 bottom-6 w-px bg-[#E2E8F0] border-l border-dashed border-[#CBD5E1]"></div>
            
            <div className="space-y-6 relative ml-1">
              <ActivityItem 
                user="Lương Thị Hồng"
                action="vừa đăng nhập hệ thống"
                time="06/06/2026 18:44:54"
              />
              <ActivityItem 
                user="Lương Thị Hồng"
                action="vừa xóa sản phẩm test12"
                time="06/06/2026 17:18:17"
              />
              <ActivityItem 
                user="Lương Thị Hồng"
                action="vừa thêm mới đơn hàng SON15939"
                time="06/06/2026 17:07:49"
              />
              <ActivityItem 
                user="Lương Thị Hồng"
                action="vừa thêm mới sản phẩm test12"
                time="06/06/2026 17:07:43"
              />
              <ActivityItem 
                user="Lương Thị Hồng"
                action="vừa đăng nhập hệ thống"
                time="06/06/2026 17:01:53"
              />
              <ActivityItem 
                user="Lương Thị Hồng"
                action="vừa đăng nhập hệ thống"
                time="06/06/2026 14:36:33"
              />
              <ActivityItem 
                user="Lương Thị Hồng"
                action="vừa đăng nhập hệ thống"
                time="05/06/2026 06:52:32"
              />
              <ActivityItem 
                user="Lương Thị Hồng"
                action="vừa đăng nhập hệ thống"
                time="04/06/2026 06:16:57"
              />
            </div>
          </div>
        </div>

      </div>
      
    </div>
  );
}

function ResultItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-4 py-4 px-6 md:px-4 lg:px-6 hover:bg-slate-50/50 transition-colors cursor-pointer">
      {icon}
      <div>
        <p className="text-[13px] font-semibold text-slate-600 mb-0.5 whitespace-nowrap">{label}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function PendingItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="py-6 px-2 flex flex-col items-center gap-3 hover:bg-slate-50/50 transition-colors cursor-pointer group">
      <div className="opacity-80 group-hover:opacity-100 transition-opacity">
        {icon}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-slate-600 mb-1 leading-snug h-8 flex items-center justify-center">{label}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function ActivityItem({ user, action, time }: { user: string, action: string, time: string }) {
  return (
    <div className="flex gap-4 relative">
      <div className="w-[9px] h-[9px] rounded-full bg-blue-500 shadow-sm mt-1.5 shrink-0 relative z-10"></div>
      <div>
        <p className="text-[13px] text-slate-700 leading-relaxed max-w-[200px]">
          <span className="font-semibold">{user}</span> {action}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">{time}</p>
      </div>
    </div>
  );
}
