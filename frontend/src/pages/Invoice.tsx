import React from 'react';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';

export function Invoice() {
  return (
    <div className="flex flex-col items-center h-full overflow-y-auto pb-10">
      <div className="w-full flex justify-end mb-4 gap-4 sticky top-0 bg-slate-50/80 backdrop-blur pb-2 z-10 p-4">
        <select className="bg-white border border-slate-300 text-sm rounded shadow-sm px-3 py-2 outline-none">
          <option>Khổ A4 (mặc định)</option>
          <option>Khổ A5 (mini)</option>
          <option>Máy in nhiệt 80mm</option>
        </select>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-colors font-medium text-sm"
        >
          <Printer size={18} /> In hóa đơn
        </button>
      </div>

      <div className="bg-white w-[794px] min-h-[1123px] shadow p-12 text-slate-800 print-wrapper border border-slate-200">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
          <div className="flex gap-4 items-center">
            <div className="w-16 h-16 bg-blue-600 text-white flex items-center justify-center font-bold text-2xl rounded">ĐH</div>
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-tight text-blue-900">Đức Huyền</h1>
              <p className="text-sm text-slate-600 font-medium">Vật rự điện nước & Gia dụng</p>
            </div>
          </div>
          <div className="text-right text-sm text-slate-600 space-y-1">
            <p><span className="font-medium text-slate-700">Đ/c:</span> 123 Đường Điện Nước, TP HCM</p>
            <p><span className="font-medium text-slate-700">SĐT:</span> 0912 345 678</p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold uppercase tracking-widest text-slate-900">Hóa Đơn Bán Hàng</h2>
          <p className="text-sm mt-1 text-slate-500">Mã HĐ: HD001026 - Ngày: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>

        {/* Customer Info */}
        <div className="mb-6 grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded border border-slate-100">
          <p><span className="w-24 inline-block font-semibold">Khách hàng:</span> Công ty Xây Dựng ABC</p>
          <p><span className="w-24 inline-block font-semibold">Thu ngân:</span> Quản lý</p>
          <p><span className="w-24 inline-block font-semibold">SĐT:</span> 0283456789</p>
          <p><span className="w-24 inline-block font-semibold">In lúc:</span> {format(new Date(), 'HH:mm dd/MM/yyyy')}</p>
        </div>

        {/* Items */}
        <table className="w-full text-left border-collapse mb-6">
          <thead>
            <tr className="border-b-2 border-slate-800 text-slate-800 text-sm">
              <th className="py-2.5 px-2 font-bold w-12 text-center">STT</th>
              <th className="py-2.5 px-2 font-bold">Tên hàng hóa</th>
              <th className="py-2.5 px-2 font-bold w-16 text-right">SL</th>
              <th className="py-2.5 px-2 font-bold w-28 text-right">Đơn giá</th>
              <th className="py-2.5 px-2 font-bold w-32 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            <tr className="border-b border-slate-200">
              <td className="py-3 px-2 text-center text-slate-500">1</td>
              <td className="py-3 px-2 font-medium">Dây điện Cadivi ruột đồng 2.5</td>
              <td className="py-3 px-2 text-right">1000</td>
              <td className="py-3 px-2 text-right">12,000</td>
              <td className="py-3 px-2 text-right font-semibold">12,000,000</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-3 px-2 text-center text-slate-500">2</td>
              <td className="py-3 px-2 font-medium">Công tắc 1 chiều Panasonic</td>
              <td className="py-3 px-2 text-right">50</td>
              <td className="py-3 px-2 text-right">35,000</td>
              <td className="py-3 px-2 text-right font-semibold">1,750,000</td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mt-4">
          <div className="w-80 space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span className="font-semibold text-slate-600">Tổng cộng:</span>
              <span className="font-bold text-base text-slate-900">13,750,000 đ</span>
            </div>
            <div className="flex justify-between py-1 border-dotted border-b border-slate-300 pb-2">
              <span className="font-semibold text-slate-600">Khách đã trả:</span>
              <span className="font-medium text-slate-800">5,000,000 đ</span>
            </div>
            <div className="flex justify-between py-2 items-center">
              <span className="font-bold text-slate-800 uppercase">Còn Nợ:</span>
              <span className="font-bold text-lg text-slate-900">8,750,000 đ</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200 grid grid-cols-2 text-center">
          <div>
            <p className="font-bold mb-16">Khách Mua Hàng</p>
            <p className="text-sm italic text-slate-500">(Ký & ghi rõ họ tên)</p>
          </div>
          <div>
            <p className="font-bold mb-16">Người Lập Phiếu</p>
            <p className="text-sm italic text-slate-500">(Ký & ghi rõ họ tên)</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body {
            background-color: white !important;
          }
          .print-wrapper {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            width: 100% !important;
          }
          /* Hide unnecessary layout wrapper elements during print */
          header, aside, .sticky {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
