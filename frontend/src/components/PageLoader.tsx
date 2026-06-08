import React from 'react';
import { Loader2 } from 'lucide-react';

interface PageLoaderProps {
  text?: string;
  minHeight?: string;
  className?: string;
  fullScreen?: boolean;
}

export function PageLoader({
  text = 'Đang tải dữ liệu...',
  minHeight = '300px',
  className = '',
  fullScreen = false,
}: PageLoaderProps) {
  const wrapperClassName = fullScreen
    ? `flex w-full items-center justify-center text-slate-500 -mx-6 -my-6 lg:-mx-7 lg:-my-6 xl:-mx-8 xl:-my-6 ${className}`
    : `flex w-full items-center justify-center text-slate-500 ${className}`;

  const style = fullScreen
    ? { minHeight: 'calc(100vh - 4rem)' }
    : { minHeight };

  return (
    <div className={wrapperClassName} style={style}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#0088FF]" />
        <p className="text-[13px] font-medium">{text}</p>
      </div>
    </div>
  );
}
