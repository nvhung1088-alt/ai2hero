'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ROLES,
  PERMISSION_CATEGORIES,
  type RoleKey,
  getRoleByKey,
} from '@/lib/shared-constants';
import { RoleBadge } from '@/components/role-badge';
import {
  Users, Search, UserPlus, ShieldCheck, Crown, UserCog, User,
  Eye, Check, X, MoreVertical, Mail, Send, Trash2, RefreshCw, Info, AlertTriangle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { 
  removeTeamMemberAction, 
  changeMemberRoleAction, 
  cancelInvitationAction, 
  inviteTeamMemberAction 
} from '@/app/(login)/actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

const ROLE_ICON_MAP: Record<string, LucideIcon> = {
  Crown,
  ShieldCheck,
  UserCog,
  User,
  Eye,
};

interface MembersClientProps {
  currentUser: any;
  initialMembers: any[];
  initialInvitations: any[];
  team: any;
}

export function MembersClient({ currentUser, initialMembers, initialInvitations, team }: MembersClientProps) {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>(initialMembers);
  const [invitations, setInvitations] = useState<any[]>(initialInvitations);
  const [activeTab, setActiveTab] = useState<'members' | 'roles' | 'invites'>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedInviteRole, setSelectedInviteRole] = useState<RoleKey>('staff');
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // States cho modal xác nhận kính mờ
  const [memberToRemove, setMemberToRemove] = useState<{ id: number; name: string } | null>(null);
  const [inviteToCancel, setInviteToCancel] = useState<{ id: number; email: string } | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const removeModalRef = useRef<HTMLDivElement>(null);
  const cancelModalRef = useRef<HTMLDivElement>(null);

  // Sync with server state
  useEffect(() => {
    setMembers(initialMembers);
    setInvitations(initialInvitations);
  }, [initialMembers, initialInvitations]);

  // Trap Focus Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdownId(null);
        setShowInviteModal(false);
        setMemberToRemove(null);
        setInviteToCancel(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Click outside to close member actions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        // Không đóng ngay nếu click vào chính nút ba chấm của thành viên đó để tránh xung đột toggle
        const target = e.target as HTMLElement;
        const isTrigger = target.closest('.member-trigger-btn');
        if (!isTrigger) {
          setActiveDropdownId(null);
        }
      }
    };

    if (activeDropdownId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdownId]);

  // Click outside to close remove member modal
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (removeModalRef.current && !removeModalRef.current.contains(e.target as Node)) {
        setMemberToRemove(null);
      }
    };
    if (memberToRemove) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [memberToRemove]);

  // Click outside to close cancel invite modal
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cancelModalRef.current && !cancelModalRef.current.contains(e.target as Node)) {
        setInviteToCancel(null);
      }
    };
    if (inviteToCancel) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [inviteToCancel]);

  const triggerRemoveMember = (id: number, name: string) => {
    setMemberToRemove({ id, name });
    setActiveDropdownId(null);
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    setIsActionPending(true);
    const { id, name } = memberToRemove;

    try {
      const res = await removeTeamMemberAction({ memberId: id });
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(`Đã xóa thành viên ${name} khỏi nhóm thành công!`, 'success');
        setMembers(prev => prev.filter(m => m.id !== id));
        router.refresh();
      }
    } catch (err) {
      console.error('Error removing member:', err);
      showToast('Đã xảy ra lỗi khi xóa thành viên!', 'error');
    } finally {
      setIsActionPending(false);
      setMemberToRemove(null);
    }
  };

  const handleChangeRole = async (id: number, role: RoleKey, name: string) => {
    try {
      const res = await changeMemberRoleAction({ memberId: id, role });
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(`Đã thay đổi vai trò của ${name} thành ${getRoleByKey(role).label}`, 'success');
        setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m));
        router.refresh();
      }
    } catch (err) {
      console.error('Error changing role:', err);
      showToast('Đã xảy ra lỗi khi thay đổi vai trò!', 'error');
    }
    setActiveDropdownId(null);
  };

  const triggerCancelInvite = (id: number, email: string) => {
    setInviteToCancel({ id, email });
  };

  const confirmCancelInvite = async () => {
    if (!inviteToCancel) return;
    setIsActionPending(true);
    const { id, email } = inviteToCancel;

    try {
      const res = await cancelInvitationAction({ invitationId: id });
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(`Đã hủy lời mời tới ${email}`, 'info');
        setInvitations(prev => prev.filter(inv => inv.id !== id));
        router.refresh();
      }
    } catch (err) {
      console.error('Error cancelling invite:', err);
      showToast('Đã xảy ra lỗi khi hủy lời mời!', 'error');
    } finally {
      setIsActionPending(false);
      setInviteToCancel(null);
    }
  };

  const handleResendInvite = (email: string) => {
    showToast(`Đã gửi lại email mời tới ${email}`, 'success');
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      showToast('Vui lòng nhập email hợp lệ!', 'error');
      return;
    }

    setPending(true);

    try {
      const res = await inviteTeamMemberAction({
        email: inviteEmail.trim(),
        role: selectedInviteRole
      });

      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(`Đã gửi lời mời tới ${inviteEmail} với vai trò ${getRoleByKey(selectedInviteRole).label}!`, 'success');
        setInviteEmail('');
        setSelectedInviteRole('staff');
        setShowInviteModal(false);
        router.refresh();
      }
    } catch (err) {
      console.error('Error sending invite:', err);
      showToast('Đã xảy ra lỗi khi mời thành viên!', 'error');
    } finally {
      setPending(false);
    }
  };

  // Filter members
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.user?.name?.toLowerCase().includes(query) ||
        m.user?.email?.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  return (
    <section className="flex-1 p-6 lg:p-10 w-full">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-gray-900/50 p-6 rounded-2xl border border-white/10 shadow-xl shadow-black/20 animate-fade-up">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Thành viên nhóm</h1>
            <span className="bg-orange-500/10 text-orange-400 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-orange-500/20">
              {members.length} thành viên
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Quản lý thành viên, phân quyền truy cập và lời mời tham gia tổ chức của bạn.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm tên hoặc email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-white/5 text-white"
            />
          </div>
          {/* Invite Trigger Button */}
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-95 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-orange-500/10 active:scale-98 transition-all shrink-0 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Mời thành viên
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex mb-6 bg-gray-900/50 px-4 rounded-xl border border-white/10 shadow-xl shadow-black/20 animate-fade-up" style={{ animationDelay: '0.05s' }}>
        {[
          { key: 'members', label: 'Danh sách thành viên', count: members.length },
          { key: 'roles', label: 'Vai trò & Quyền hạn' },
          { key: 'invites', label: 'Lời mời đang chờ', count: invitations.length },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`relative py-4 px-4 text-sm font-semibold transition-all border-b-2 -mb-[2px] flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-gray-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <div className="space-y-6">
        {/* TAB 1: MEMBERS TABLE */}
        {activeTab === 'members' && (
          <div className="bg-gray-900/50 border border-white/10 rounded-2xl shadow-xl shadow-black/25 overflow-hidden animate-fade-up" style={{ animationDelay: '0.1s' }}>
            {filteredMembers.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Không tìm thấy thành viên nào</p>
                <p className="text-sm text-gray-400 mt-1">Thử tìm kiếm với từ khóa khác</p>
              </div>
            ) : (
              <>
                {/* Desktop Grid Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-white/5 border-b border-white/10 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <div className="col-span-5">Thành viên</div>
                  <div className="col-span-3">Vai trò</div>
                  <div className="col-span-3">Trạng thái</div>
                  <div className="col-span-1 text-right">Hành động</div>
                </div>

                {/* Member Rows */}
                <div className="divide-y divide-white/5">
                  {filteredMembers.map((member, index) => {
                    const isOwner = member.role === 'owner';
                    const userName = member.user?.name || 'Thành viên mới';
                    const userEmail = member.user?.email || '';
                    const avatarLetter = userName.charAt(0).toUpperCase();
                    
                    return (
                      <div
                        key={member.id}
                        className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center transition-all hover:bg-white/5 animate-fade-up"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        {/* Member Details */}
                        <div className="col-span-1 md:col-span-5 flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm shrink-0 select-none ${
                            isOwner 
                              ? 'bg-gradient-to-tr from-orange-500 to-pink-500' 
                              : 'bg-orange-500'
                          }`}>
                            {avatarLetter}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate flex items-center gap-1.5">
                              {userName}
                              {isOwner && (
                                <Crown className="h-3.5 w-3.5 text-orange-500" />
                              )}
                            </p>
                            <p className="text-sm text-gray-400 truncate">{userEmail}</p>
                          </div>
                        </div>

                        {/* Role */}
                        <div className="col-span-1 md:col-span-3 flex items-center">
                          <span className="md:hidden text-xs text-gray-400 font-semibold uppercase mr-2">Vai trò:</span>
                          <RoleBadge role={member.role} />
                        </div>

                        {/* Status */}
                        <div className="col-span-1 md:col-span-3 flex items-center">
                          <span className="md:hidden text-xs text-gray-400 font-semibold uppercase mr-2">Trạng thái:</span>
                          <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-green-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            Đang hoạt động
                          </span>
                        </div>

                        {/* Actions Menu */}
                        <div className="col-span-1 md:col-span-1 text-right flex justify-end relative">
                          {isOwner ? (
                            <span className="text-xs text-gray-400 italic">Không có</span>
                          ) : (
                            <div className="relative">
                              <button
                                onClick={() => setActiveDropdownId(activeDropdownId === member.id ? null : member.id)}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer member-trigger-btn"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              
                              {activeDropdownId === member.id && (
                                <div ref={dropdownRef} className={`absolute right-0 w-48 bg-gray-950 border border-white/10 rounded-xl shadow-2xl shadow-black z-20 py-1 text-left ${
                                  index === filteredMembers.length - 1 ? 'bottom-full mb-2 origin-bottom-right' : 'mt-2 origin-top-right'
                                }`}>
                                  <div className="px-3 py-1.5 border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase">
                                    Đổi vai trò
                                  </div>
                                  {(['admin', 'manager', 'staff', 'viewer'] as RoleKey[]).map((r) => (
                                    <button
                                      key={r}
                                      onClick={() => handleChangeRole(member.id, r, userName)}
                                      className={`w-full px-3 py-1.5 text-xs text-left hover:bg-white/5 flex items-center gap-1.5 cursor-pointer ${
                                        member.role === r ? 'font-bold text-orange-400 bg-orange-500/10' : 'text-gray-300'
                                      }`}
                                    >
                                      {getRoleByKey(r).label}
                                    </button>
                                  ))}
                                  
                                  <div className="border-t border-white/5 my-1" />
                                  
                                  <button
                                    onClick={() => triggerRemoveMember(member.id, userName)}
                                    className="w-full px-3 py-2 text-xs text-left hover:bg-red-500/10 text-red-400 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Xóa khỏi nhóm
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: ROLES MATRIX */}
        {activeTab === 'roles' && (
          <div className="space-y-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            {/* Intro Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {ROLES.map((role) => {
                const Icon = ROLE_ICON_MAP[role.icon] ?? User;
                return (
                  <div key={role.key} className="bg-gray-900/50 p-5 border border-white/10 rounded-2xl shadow-xl shadow-black/25 hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2 rounded-xl text-white ${role.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {role.permissions.length} quyền
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-base">{role.label}</h3>
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed h-12 overflow-hidden line-clamp-3">
                      {role.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Matrix Table */}
            <div className="bg-gray-900/50 border border-white/10 rounded-2xl shadow-xl shadow-black/25 overflow-hidden">
              <div className="p-5 border-b border-white/10 bg-white/5 flex items-center gap-2">
                <Info className="h-4 w-4 text-orange-500" />
                <h2 className="font-bold text-white text-sm">Ma trận chi tiết quyền hạn của hệ thống</h2>
              </div>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      <th className="p-4 pl-6 min-w-[200px]">Chức năng hệ thống</th>
                      {ROLES.map((role) => (
                        <th key={role.key} className="p-4 text-center min-w-[100px]">
                          {role.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {PERMISSION_CATEGORIES.map((cat, catIndex) => (
                      <React.Fragment key={catIndex}>
                        <tr className="bg-orange-500/10">
                          <td colSpan={6} className="p-3 pl-6 text-xs font-bold text-orange-400 uppercase tracking-wider">
                            {cat.name}
                          </td>
                        </tr>
                        {cat.permissions.map((p) => (
                          <tr key={p.key} className="hover:bg-white/5 text-sm">
                            <td className="p-4 pl-6 font-medium text-gray-300">{p.label}</td>
                            {ROLES.map((role) => {
                              const hasPerm = role.permissions.includes(p.key);
                              return (
                                <td key={role.key} className="p-4 text-center">
                                  <div className="flex justify-center">
                                    {hasPerm ? (
                                      <div className="h-5 w-5 bg-green-500/15 border border-green-500/20 text-green-400 rounded-full flex items-center justify-center">
                                        <Check className="h-3 w-3 stroke-[3]" />
                                      </div>
                                    ) : (
                                      <div className="h-5 w-5 bg-white/5 border border-white/10 text-gray-600 rounded-full flex items-center justify-center">
                                        <X className="h-3 w-3 stroke-[2]" />
                                      </div>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INVITATIONS LIST */}
        {activeTab === 'invites' && (
          <div className="bg-gray-900/50 border border-white/10 rounded-2xl shadow-xl shadow-black/25 overflow-hidden animate-fade-up" style={{ animationDelay: '0.1s' }}>
            {invitations.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Mail className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">Chưa có lời mời nào</p>
                <p className="text-sm text-gray-500 mt-1">Bấm nút "Mời thành viên" để mời người khác tham gia nhóm.</p>
              </div>
            ) : (
              <>
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-white/5 border-b border-white/10 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <div className="col-span-5">Email</div>
                  <div className="col-span-3">Vai trò chỉ định</div>
                  <div className="col-span-2">Ngày gửi</div>
                  <div className="col-span-2 text-right">Hành động</div>
                </div>

                <div className="divide-y divide-white/5">
                  {invitations.map((inv) => {
                    const isExpired = inv.status === 'expired';
                    return (
                      <div
                        key={inv.id}
                        className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/5 transition-colors"
                      >
                        {/* Email */}
                        <div className="col-span-1 md:col-span-5 flex items-center gap-3">
                          <div className="h-8 w-8 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center justify-center text-orange-400 shrink-0">
                            <Mail className="h-4 w-4" />
                          </div>
                          <span className="font-semibold text-white truncate">{inv.email}</span>
                        </div>

                        {/* Role Badge */}
                        <div className="col-span-1 md:col-span-3 flex items-center">
                          <span className="md:hidden text-xs text-gray-400 font-semibold uppercase mr-2">Vai trò:</span>
                          <RoleBadge role={inv.role} />
                        </div>

                        {/* Invited At & Status */}
                        <div className="col-span-1 md:col-span-2 flex items-center gap-2">
                          <span className="md:hidden text-xs text-gray-400 font-semibold uppercase mr-2">Thời gian:</span>
                          <span className="text-sm text-gray-400">
                            {new Date(inv.invitedAt).toLocaleDateString('vi-VN')}
                          </span>
                          {isExpired ? (
                            <span className="text-[10px] bg-white/5 text-gray-400 font-bold px-1.5 py-0.2 rounded border border-white/10">
                              Hết hạn
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-500/15 text-amber-400 font-bold px-1.5 py-0.2 rounded border border-amber-500/20 animate-pulse">
                              Chờ duyệt
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 md:col-span-2 flex items-center justify-end gap-2 text-right">
                          <button
                            onClick={() => handleResendInvite(inv.email)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-300 hover:text-white px-2 py-1 border border-white/10 hover:border-white/20 rounded-lg cursor-pointer bg-white/5 animate-fade-in"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Gửi lại
                          </button>
                          <button
                            onClick={() => triggerCancelInvite(inv.id, inv.email)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded-lg cursor-pointer border border-transparent animate-fade-in"
                          >
                            <X className="h-3.5 w-3.5" />
                            Hủy
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* INVITE MEMBER MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 -z-10" onClick={() => setShowInviteModal(false)} />
          
          <div className="bg-gray-950 rounded-2xl shadow-2xl shadow-black max-w-xl w-full my-8 p-6 border border-white/10 animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div>
                <h2 className="text-xl font-bold text-white">Mời thành viên mới</h2>
                <p className="text-xs text-gray-400 mt-1">Gửi email lời mời tham gia nhóm và gán vai trò truy cập tương ứng.</p>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSendInvite} className="mt-6 space-y-6">
              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-gray-400" />
                  Địa chỉ Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="nhanvien@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-white/5 text-white"
                />
              </div>

              {/* Role Picker */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-white block">
                  Chọn vai trò của thành viên
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {ROLES.map((role) => {
                    const Icon = ROLE_ICON_MAP[role.icon] ?? User;
                    const isSelected = selectedInviteRole === role.key;
                    
                    return (
                      <button
                        key={role.key}
                        type="button"
                        onClick={() => setSelectedInviteRole(role.key)}
                        className={`text-left p-4 rounded-2xl border transition-all relative flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-500/10'
                            : 'border-white/10 hover:border-white/20 hover:bg-white/5 bg-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 justify-between">
                          <span className={`p-1.5 rounded-lg text-white ${role.color}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          {isSelected && (
                            <span className="h-5 w-5 bg-orange-500 text-white rounded-full flex items-center justify-center">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <div className="mt-3">
                          <p className="font-bold text-white text-sm">{role.label}</p>
                          <p className="text-[11px] text-gray-400 mt-1 leading-snug line-clamp-2">
                            {role.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  disabled={pending}
                  className="px-4 py-2.5 border border-white/10 hover:border-white/20 rounded-xl text-sm font-semibold text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-95 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-orange-500/10 cursor-pointer disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {pending ? 'Đang gửi...' : 'Gửi lời mời'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REMOVE MEMBER CONFIRM MODAL (Premium Glassmorphism) */}
      {memberToRemove && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div
            ref={removeModalRef}
            className="relative bg-gray-950/90 backdrop-blur-2xl border border-red-500/20 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-scale-up text-white animate-fade-in"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500/10 rounded-xl text-red-500 border border-red-500/25 shrink-0">
                <Trash2 className="h-6 w-6 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white">Xóa thành viên khỏi nhóm</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Bạn có chắc chắn muốn xóa thành viên <strong>{memberToRemove.name}</strong> khỏi nhóm không?
                </p>
              </div>
              <button
                onClick={() => setMemberToRemove(null)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
                disabled={isActionPending}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-4 bg-red-950/20 border border-red-500/10 p-3 rounded-xl text-xs text-red-200/80 leading-relaxed">
              ⚠️ <strong>Cảnh báo:</strong> Người dùng này sẽ mất toàn bộ quyền truy cập vào Workspace hiện hành ngay lập tức. Hành động này không thể hoàn tác trực tiếp.
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
              <button
                onClick={() => setMemberToRemove(null)}
                disabled={isActionPending}
                className="px-4 py-2 border border-white/10 hover:border-white/20 rounded-xl text-xs font-bold text-gray-300 hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmRemoveMember}
                disabled={isActionPending}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:opacity-95 text-white border-none rounded-xl text-xs font-extrabold shadow-md shadow-red-600/10 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isActionPending ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL INVITATION CONFIRM MODAL (Premium Glassmorphism) */}
      {inviteToCancel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div
            ref={cancelModalRef}
            className="relative bg-gray-950/90 backdrop-blur-2xl border border-red-500/20 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-scale-up text-white animate-fade-in"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500/10 rounded-xl text-red-500 border border-red-500/25 shrink-0">
                <Mail className="h-6 w-6 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white">Hủy lời mời</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Bạn có chắc chắn muốn hủy lời mời gửi tới <strong>{inviteToCancel.email}</strong> không?
                </p>
              </div>
              <button
                onClick={() => setInviteToCancel(null)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
                disabled={isActionPending}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-4 bg-red-950/20 border border-red-500/10 p-3 rounded-xl text-xs text-red-200/80 leading-relaxed">
              ⚠️ Link lời mời trong email sẽ bị vô hiệu hóa ngay lập tức. Người nhận sẽ không thể sử dụng link đó để tham gia nhóm.
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
              <button
                onClick={() => setInviteToCancel(null)}
                disabled={isActionPending}
                className="px-4 py-2 border border-white/10 hover:border-white/20 rounded-xl text-xs font-bold text-gray-300 hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmCancelInvite}
                disabled={isActionPending}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:opacity-95 text-white border-none rounded-xl text-xs font-extrabold shadow-md shadow-red-600/10 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isActionPending ? 'Đang hủy...' : 'Hủy lời mời'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
