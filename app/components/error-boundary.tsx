'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[300px] w-full p-6">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/5 bg-gray-900/50 p-6 backdrop-blur-xl shadow-2xl text-center space-y-4 animate-fade-in">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Lỗi Hiển Thị</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Đã xảy ra sự cố hiển thị ở giao diện này. Vui lòng thử tải lại trang.
              </p>
            </div>

            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 hover:border-white/15 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer select-none"
            >
              <RefreshCw className="h-4 w-4" /> Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
