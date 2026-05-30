'use client';

import { useState, useTransition } from 'react';
import {
  Search,
  ShieldAlert,
  ShieldCheck,
  Crown,
  Lock,
  Unlock,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatNumber } from '@/lib/shared-constants';
import { AdminUserRecord } from '@/lib/db/admin-queries';
import { toggleUserRoleAction, toggleUserStatusAction } from '../actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

type UserSortField = 'name' | 'role' | 'aiMessagesUsed';

interface UsersClientProps {
  initialUsers: AdminUserRecord[];
}

export default function UsersClient({ initialUsers }: UsersClientProps) {
  const [users, setUsers] = useState<AdminUserRecord[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'member'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  const [sortField, setSortField] = useState<UserSortField | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const ITEMS_PER_PAGE = 5;

  const handleSort = (field: UserSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Xử lý đổi vai trò qua Server Action
  const handleToggleRole = async (userId: number) => {
    startTransition(async () => {
      const res = await toggleUserRoleAction(userId);
      if (res.error) {
        showToast(res.error, 'error');
      } else if (res.success) {
        // Cập nhật local state tức thì để phản ứng nhanh
        setUsers(prev =>
          prev.map(u => {
            if (u.id === userId) {
              const newRole = u.role === 'super_admin' ? 'member' : 'super_admin';
              return { ...u, role: newRole };
            }
            return u;
          })
        );
        showToast(res.message || 'Đã cập nhật vai trò thành công', 'success');
      }
    });
  };

  // Xử lý khóa/mở khóa tài khoản qua Server Action
  const handleToggleStatus = async (userId: number) => {
    startTransition(async () => {
      const res = await toggleUserStatusAction(userId);
      if (res.error) {
        showToast(res.error, 'error');
      } else if (res.success) {
        // Cập nhật local state tức thì để phản ứng nhanh
        setUsers(prev =>
          prev.map(u => {
            if (u.id === userId) {
              const newStatus = u.status === 'active' ? 'suspended' : 'active';
              return { ...u, status: newStatus };
            }
            return u;
          })
        );
        showToast(res.message || 'Đã cập nhật trạng thái thành công', 'info');
      }
    });
  };

  // Logic filter danh sách users
  const filteredUsers = users.filter(user => {
    const nameStr = user.name || '';
    const emailStr = user.email || '';
    const matchesSearch =
      nameStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emailStr.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Sắp xếp
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortField) return 0;
    const dir = sortDirection === 'asc' ? 1 : -1;
    if (sortField === 'name') {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB) * dir;
    }
    if (sortField === 'role') return a.role.localeCompare(b.role) * dir;
    if (sortField === 'aiMessagesUsed') return (a.aiMessagesUsed - b.aiMessagesUsed) * dir;
    return 0;
  });

  // Phân trang
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5 animate-fade-up">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2.5">
            Quản lý người dùng
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
              {sortedUsers.length} tài khoản
            </span>
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-1">Quản trị và phân cấp quyền người dùng trên toàn bộ hệ thống</p>
        </div>
      </div>

      {/* Filters Area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white/5 p-4 border border-white/10 rounded-2xl shadow-sm animate-fade-up animate-delay-1 backdrop-blur-md">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Tìm theo tên, email..."
            className="pl-9 rounded-xl border-white/10 bg-gray-900/50 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500 text-sm"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>

        {/* Filter Role */}
        <div>
          <select
            className="w-full h-9 rounded-xl border border-white/10 bg-gray-900/50 px-3 py-1 text-sm text-gray-300 focus:border-orange-500 focus:outline-none"
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value as 'all' | 'super_admin' | 'member'); setCurrentPage(1); }}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="super_admin">Super Admin</option>
            <option value="member">Thành viên</option>
          </select>
        </div>

        {/* Filter Status */}
        <div>
          <select
            className="w-full h-9 rounded-xl border border-white/10 bg-gray-900/50 px-3 py-1 text-sm text-gray-300 focus:border-orange-500 focus:outline-none"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as 'all' | 'active' | 'suspended'); setCurrentPage(1); }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="suspended">Đã tạm khóa</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl shadow-sm overflow-hidden animate-fade-up animate-delay-2 backdrop-blur-md relative">
        {isPending && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        )}
        <div className="overflow-x-auto animate-fade-in">
          <table className="min-w-full divide-y divide-white/5">
            <thead className="bg-white/5">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:bg-white/5 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <span className="inline-flex items-center gap-1">
                    Người dùng
                    {sortField === 'name' && (
                      sortDirection === 'asc' 
                        ? <ChevronUp className="h-3 w-3 text-orange-400" /> 
                        : <ChevronDown className="h-3 w-3 text-orange-400" />
                    )}
                  </span>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:bg-white/5 transition-colors"
                  onClick={() => handleSort('role')}
                >
                  <span className="inline-flex items-center gap-1">
                    Vai trò
                    {sortField === 'role' && (
                      sortDirection === 'asc' 
                        ? <ChevronUp className="h-3 w-3 text-orange-400" /> 
                        : <ChevronDown className="h-3 w-3 text-orange-400" />
                    )}
                  </span>
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Tổ chức</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Trạng thái</th>
                <th 
                  scope="col" 
                  className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:bg-white/5 transition-colors"
                  onClick={() => handleSort('aiMessagesUsed')}
                >
                  <span className="inline-flex items-center gap-1">
                    Lượt dùng AI
                    {sortField === 'aiMessagesUsed' && (
                      sortDirection === 'asc' 
                        ? <ChevronUp className="h-3 w-3 text-orange-400" /> 
                        : <ChevronDown className="h-3 w-3 text-orange-400" />
                    )}
                  </span>
                </th>
                <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-white/5">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => {
                  const initial = (user.name || user.email || '?').charAt(0).toUpperCase();
                  const isSuspended = user.status === 'suspended';

                  // Gradient color based on ID to make Avatars colorful
                  const avatarGradients = [
                    'from-orange-500 to-pink-500',
                    'from-blue-500 to-indigo-500',
                    'from-emerald-500 to-teal-500',
                    'from-purple-500 to-pink-500',
                    'from-cyan-500 to-blue-500'
                  ];
                  const gradient = avatarGradients[user.id % avatarGradients.length];

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-white/5 transition-colors ${
                        isSuspended ? 'bg-red-500/5' : ''
                      }`}
                    >
                      {/* User Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{user.name || 'Chưa đặt tên'}</p>
                            <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                            <p className="text-[10px] text-gray-500 font-medium">Tạo: {user.createdAt}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.role === 'super_admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-sm shadow-orange-500/10">
                            <Crown className="h-3 w-3" />
                            Super Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-800 text-gray-300 border border-gray-700">
                            Thành viên
                          </span>
                        )}
                      </td>

                      {/* Team Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs text-gray-300 font-semibold bg-gray-800 border border-gray-700 rounded-lg px-2 py-1">
                          {user.teamName}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                            Đã khóa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                            Hoạt động
                          </span>
                        )}
                      </td>

                      {/* AI Usage */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-gray-200">
                            {formatNumber(user.aiMessagesUsed)} tin
                          </span>
                          {/* Progress bar mini */}
                          <div className="w-24 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-orange-500 h-1.5 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                              style={{ width: `${Math.min(100, (user.aiMessagesUsed / 15000) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2.5">
                          {/* Gán Admin Button */}
                          <button
                            onClick={() => handleToggleRole(user.id)}
                            className={`p-1.5 rounded-lg border text-xs font-bold transition-all duration-150 flex items-center gap-1 ${
                              user.role === 'super_admin'
                                ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20'
                                : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white'
                            }`}
                            title={user.role === 'super_admin' ? 'Hạ cấp xuống Member' : 'Thăng cấp lên Super Admin'}
                          >
                            {user.role === 'super_admin' ? (
                              <>
                                <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                                <span className="hidden sm:inline">Hạ quyền</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                                <span className="hidden sm:inline">Gán Admin</span>
                              </>
                            )}
                          </button>

                          {/* Khóa/Mở khóa Button */}
                          <button
                            onClick={() => handleToggleStatus(user.id)}
                            className={`p-1.5 rounded-lg border text-xs font-bold transition-all duration-150 flex items-center gap-1 ${
                              isSuspended
                                ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                            }`}
                            title={isSuspended ? 'Mở khóa tài khoản' : 'Tạm khóa tài khoản'}
                          >
                            {isSuspended ? (
                              <>
                                <Unlock className="h-3.5 w-3.5 shrink-0" />
                                <span className="hidden sm:inline">Mở khóa</span>
                              </>
                            ) : (
                              <>
                                <Lock className="h-3.5 w-3.5 shrink-0" />
                                <span className="hidden sm:inline">Khóa</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <AlertCircle className="h-10 w-10 text-orange-500 mb-3" />
                      <p className="text-sm font-bold text-gray-300">Không tìm thấy người dùng phù hợp</p>
                      <p className="text-xs text-gray-500 mt-1">Vui lòng kiểm tra lại từ khóa hoặc cấu hình bộ lọc</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        {sortedUsers.length > 0 && (
          <div className="border-t border-white/10 bg-white/5 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-gray-400">
              Hiển thị <span className="font-bold text-gray-200">{startIndex + 1}–{Math.min(endIndex, sortedUsers.length)}</span> trên <span className="font-bold text-gray-200">{sortedUsers.length}</span> kết quả
            </span>
            <div className="flex items-center gap-1.5">
              <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-1.5 rounded-lg border border-white/10 bg-gray-900/50 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button 
                  key={page} 
                  onClick={() => setCurrentPage(page)}
                  className={`h-7 w-7 rounded-lg text-xs font-bold transition-all duration-150 ${
                    page === currentPage 
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-sm shadow-orange-500/10' 
                      : 'border border-white/10 bg-gray-900/50 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-1.5 rounded-lg border border-white/10 bg-gray-900/50 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
