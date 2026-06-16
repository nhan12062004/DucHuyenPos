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
  const isInvoiceRoute = window.location.pathname === '/invoice';
  const sidebarOffset = isInvoiceRoute ? 0 : 236;
  const wrapperClassName = fullScreen
    ? `flex w-full items-center justify-center text-slate-500 ${className}`
    : `flex w-full items-center justify-center text-slate-500 ${className}`;

  const style: React.CSSProperties = fullScreen
    ? {
        alignItems: 'center',
        background: '#F8FAFC',
        bottom: 0,
        color: '#64748b',
        display: 'flex',
        justifyContent: 'center',
        left: sidebarOffset,
        minHeight: '100vh',
        position: 'fixed',
        right: 0,
        top: 0,
        width: 'auto',
        zIndex: 20,
      }
    : {
        alignItems: 'center',
        color: '#64748b',
        display: 'flex',
        justifyContent: 'center',
        minHeight,
        width: '100%',
      };

  return (
    <div className={wrapperClassName} style={style}>
      <div
        className="flex flex-col items-center gap-3"
        style={{ alignItems: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-[#0088FF]" />
        <p className="text-[13px] font-medium">{text}</p>
      </div>
    </div>
  );
}
