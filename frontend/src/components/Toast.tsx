import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

type ToastVariant = 'info' | 'success' | 'error' | 'warning';

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function toastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getToastMeta(variant: ToastVariant) {
  if (variant === 'error') {
    return {
      icon: AlertCircle,
      className: 'border-red-200 text-red-700',
      iconClassName: 'text-red-500',
    };
  }

  if (variant === 'warning') {
    return {
      icon: AlertCircle,
      className: 'border-amber-200 text-amber-800',
      iconClassName: 'text-amber-500',
    };
  }

  if (variant === 'success') {
    return {
      icon: CheckCircle,
      className: 'border-emerald-200 text-emerald-700',
      iconClassName: 'text-emerald-500',
    };
  }

  return {
    icon: Info,
    className: 'border-blue-200 text-blue-700',
    iconClassName: 'text-blue-500',
  };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }

    const id = toastId();
    setToasts((current) => [...current.slice(-3), { id, message: trimmedMessage, variant }]);
    window.setTimeout(() => dismissToast(id), variant === 'error' ? 6500 : 4500);
  }, [dismissToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-5 top-5 z-[100] flex w-[min(380px,calc(100vw-40px))] flex-col gap-3">
        {toasts.map((toast) => {
          const meta = getToastMeta(toast.variant);
          const Icon = meta.icon;

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 border bg-white px-4 py-3 text-sm shadow-xl shadow-slate-200/80 ${meta.className}`}
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${meta.iconClassName}`} />
              <div className="min-w-0 flex-1 font-medium leading-5">{toast.message}</div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Đóng thông báo"
                className="ml-1 shrink-0 text-slate-400 transition-colors hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}

export function ToastBridge({
  message,
  variant = 'info',
  onDone,
}: {
  message?: string | null;
  variant?: ToastVariant;
  onDone?: () => void;
}) {
  const { showToast } = useToast();
  const lastToastKeyRef = useRef('');

  useEffect(() => {
    if (!message) {
      return;
    }

    const toastKey = `${variant}:${message}`;
    if (lastToastKeyRef.current === toastKey) {
      return;
    }

    lastToastKeyRef.current = toastKey;
    showToast(message, variant);
    onDone?.();
  }, [message, onDone, showToast, variant]);

  return null;
}
