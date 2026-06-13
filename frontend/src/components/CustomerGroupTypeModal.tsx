import React, { useEffect } from 'react';
import { Sparkles, UsersRound, X } from 'lucide-react';

interface CustomerGroupTypeModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: 'fixed' | 'dynamic') => void;
}

function OptionCard({
  title,
  description,
  icon,
  accentClass,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  accentClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full flex-col items-center justify-start rounded-lg px-5 py-6 text-center transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0088FF]/30"
    >
      <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${accentClass}`}>
        {icon}
      </div>
      <div className="text-[15px] font-semibold text-[#182537]">{title}</div>
      <div className="mt-2 max-w-[190px] text-[12.5px] leading-5 text-slate-500">
        {description}
      </div>
    </button>
  );
}

export function CustomerGroupTypeModal({ open, onClose, onSelect }: CustomerGroupTypeModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Thêm nhóm khách hàng"
        className="relative w-full max-w-[620px] overflow-hidden rounded-lg bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-[18px] font-semibold text-[#182537]">Thêm nhóm khách hàng</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-2 px-4 py-5 sm:grid-cols-2 sm:gap-0">
          <OptionCard
            title="Nhóm khách hàng cố định"
            description="Dùng cho các nhóm được gán trực tiếp và không thay đổi theo điều kiện."
            accentClass="bg-[#1890FF]"
            icon={<UsersRound size={30} className="text-white" />}
            onClick={() => onSelect('fixed')}
          />
          <OptionCard
            title="Nhóm khách hàng tự động"
            description="Dùng để gom khách hàng theo điều kiện và tự cập nhật theo dữ liệu."
            accentClass="bg-[#19C37D]"
            icon={<Sparkles size={30} className="text-white" />}
            onClick={() => onSelect('dynamic')}
          />
        </div>
      </div>
    </div>
  );
}
