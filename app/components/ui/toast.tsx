'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after 3 seconds
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  }, [removeToast]);

  // Expose showToast globally to window for backward compatibility with older legacy code
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).showToast = showToast;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).showToast;
      }
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast Portal Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let Icon = Info;
          let iconColor = 'text-blue-400';
          let borderColor = 'border-blue-500/20';

          if (toast.type === 'success') {
            Icon = CheckCircle2;
            iconColor = 'text-emerald-400';
            borderColor = 'border-emerald-500/20';
          } else if (toast.type === 'error') {
            Icon = AlertCircle;
            iconColor = 'text-rose-400';
            borderColor = 'border-rose-500/20';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 bg-gray-950/95 backdrop-blur-md border ${borderColor} p-4 rounded-2xl shadow-2xl animate-slide-in-right transition-all duration-300 w-full`}
            >
              <div className="shrink-0 mt-0.5">
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-200 leading-snug">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors p-0.5 rounded-lg hover:bg-white/5"
                aria-label="Đóng thông báo"
              >
                <X className="h-4 w-4" />
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
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
