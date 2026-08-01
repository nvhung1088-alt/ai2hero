'use client';

import { useState } from 'react';
import {
  HardDrive,
  Plus,
  ExternalLink,
  ShieldCheck,
  Terminal,
  AlertCircle,
  Mail,
} from 'lucide-react';
import Link from 'next/link';

export default function DriveSettingsClient({
  teamId,
  googleDriveConnections,
}: {
  teamId: number;
  googleDriveConnections: any[];
}) {
  const getAccountEmail = (conn: any) => {
    const creds = conn.credentials || {};
    return creds.accountEmail || creds.email || creds.userEmail || null;
  };

  const getAccountDisplayName = (conn: any) => {
    const email = getAccountEmail(conn);
    const connName = conn.name || conn.connectionName || `Tài khoản Drive #${conn.id}`;
    if (email) return email;
    return connName;
  };

  return (
    <div className="flex-1 p-6 space-y-6 bg-slate-950/60 min-h-screen text-slate-100">
      {/* Header Settings */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-400" />
            Cài Đặt & Quản Lý Tài Khoản Google Drive (Gmail)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Quản lý các tài khoản Gmail / Google Drive đã kết nối để chọn đúng tài khoản khi gán thư mục upload.
          </p>
        </div>

        <Link
          href={`/connect-hub/t/${teamId}/dashboard`}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          Thêm tài khoản Gmail / Drive mới qua Connect Hub
        </Link>
      </div>

      {/* Grid Google Drive Accounts */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Danh sách Tài khoản Gmail / Google Drive ({googleDriveConnections.length})
        </h2>

        {googleDriveConnections.length === 0 ? (
          <div className="p-8 border border-slate-800 rounded-xl bg-slate-900/30 text-center">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-300">Chưa có kết nối Google Drive nào</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Vui lòng kết nối tài khoản Gmail / Google Drive trong Connect Hub để bắt đầu phân bổ thư mục quét.
            </p>
            <Link
              href={`/connect-hub/t/${teamId}/dashboard`}
              className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium hover:bg-blue-600/30 transition-colors inline-flex items-center gap-1.5"
            >
              + Kết nối Gmail / Drive ngay
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {googleDriveConnections.map((conn) => {
              const email = getAccountEmail(conn);
              const displayName = getAccountDisplayName(conn);

              return (
                <div
                  key={conn.id}
                  className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3 relative group hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <HardDrive className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-amber-400" />
                          {displayName}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {conn.name && conn.name !== displayName ? conn.name : `Tài khoản ID: #${conn.id}`}
                        </p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-medium">
                      Sẵn sàng
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-slate-400 pt-2 border-t border-slate-800/80">
                    <p className="flex items-center gap-1 text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                      Xác thực: OAuth 2.0 Token
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <Link
                      href={`/connect-hub/t/${teamId}/dashboard`}
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                    >
                      Đổi tên / Sửa Email trong Connect Hub
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Python Worker Helper */}
      <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3 text-xs">
        <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-400" />
          Hướng dẫn nâng cấp Python Worker cho Đa Dự Án
        </h3>
        <p className="text-slate-300">
          Khi bạn tạo nhiều Dự án và chọn đúng tài khoản Gmail/Drive cho từng thư mục quét, bạn khởi chạy Python Worker bằng lệnh:
        </p>
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-blue-400">
          python scripts/herodrive_worker.py --project &lt;ID_DU_AN&gt;
        </div>
      </div>
    </div>
  );
}
