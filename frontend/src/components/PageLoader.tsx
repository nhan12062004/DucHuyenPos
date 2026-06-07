import React from 'react';
import { Loader2 } from 'lucide-react';

interface PageLoaderProps {
  text?: string;
  minHeight?: string;
  className?: string;
}

export function PageLoader({ text = 'Đang tải dữ liệu...', minHeight = '300px', className = '' }: PageLoaderProps) {
  return (
    <div className={`flex items-center justify-center text-slate-500 w-full ${className}`} style={{ minHeight }}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#0088FF]" />
        <p className="text-[13px] font-medium">{text}</p>
      </div>
    </div>
  );
}
