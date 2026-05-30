'use client';

import { useState, useTransition } from 'react';
import {
  Search,
  Building,
  Users,
  CreditCard,
  Crown,
  Lock,
  Unlock,
  AlertCircle,
  TrendingUp,
  Award,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatNumber } from '@/lib/shared-constants';
import { AdminTeamRecord } from '@/lib/db/admin-queries';
import { changeTeamPlanAction, toggleTeamStatusAction } from '../actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

type TeamSortField = 'name' | 'memberCount' | 'aiUsage';

interface TeamsClientProps {
  initialTeams: AdminTeamRecord[];
}

export default function TeamsClient({ initialTeams }: TeamsClientProps) {
  const [teams, setTeams] = useState<AdminTeamRecord[]>(initialTeams);
  const [searchQuery, setSearchQuery] = useState('');

  const [sortField, setSortField] = useState<TeamSortField | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const ITEMS_PER_PAGE = 5;

  const handleSort = (field: TeamSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Xử lý đổi Plan đăng ký qua Server Action
  const handleChangePlan = async (teamId: number, newPlan: 'free' | 'pro' | 'enterprise') => {
    startTransition(async () => {
      const res = await changeTeamPlanAction(teamId, newPlan);
      if (res.error) {
        showToast(res.error, 'error');
      } else if (res.success) {
        setTeams(prev =>
          prev.map(t => {
            if (t.id === teamId) {
              return { ...t, plan: newPlan };
            }
            return t;
          })
        );
        showToast(res.message || 'Đã thay đổi gói dịch vụ thành công', 'success');
      }
    });
  };

  // Xử lý khóa/mở khóa tổ chức qua Server Action
  const handleToggleTeamStatus = async (teamId: number) => {
    startTransition(async () => {
      const res = await toggleTeamStatusAction(teamId);
      if (res.error) {
        showToast(res.error, 'error');
      } else if (res.success) {
        setTeams(prev =>
          prev.map(t => {
            if (t.id === teamId) {
              const newStatus = t.status === 'active' ? 'suspended' : 'active';
              return { ...t, status: newStatus };
            }
            return t;
          })
        );
        showToast(res.message || 'Đã thay đổi trạng thái thành công', 'info');
      }
    });
  };

  // Lọc teams theo tìm kiếm
  const filteredTeams = teams.filter(team => {
    const nameStr = team.name || '';
    const ownerNameStr = team.ownerName || '';
    const ownerEmailStr = team.ownerEmail || '';
    return (
      nameStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ownerNameStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ownerEmailStr.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Sắp xếp
  const sortedTeams = [...filteredTeams].sort((a, b) => {
    if (!sortField) return 0;
    const dir = sortDirection === 'asc' ? 1 : -1;
    if (sortField === 'name') return a.name.localeCompare(b.name) * dir;
    if (sortField === 'memberCount') return (a.members - b.members) * dir;
    if (sortField === 'aiUsage') return (a.aiMessagesUsed - b.aiMessagesUsed) * dir;
    return 0;
  });

  // Phân trang
  const totalPages = Math.max(1, Math.ceil(sortedTeams.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTeams = sortedTeams.slice(startIndex, endIndex);

  // Tính toán chỉ số thống kê
  const totalTeams = teams.length;
  const paidTeams = teams.filter(t => t.plan !== 'free').length;
  const totalMembers = teams.reduce((acc, curr) => acc + curr.members, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5 animate-fade-up">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2.5">
            Quản lý tổ chức
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
              {sortedTeams.length} nhóm
            </span>
          </h1>
          <p className="text-xs text-gray-400 font-medium mt-1">Quản lý không gian làm việc, cấu hình gói dịch vụ và mức độ sử dụng tài nguyên của tổ chức</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-up animate-delay-1">
        {/* Total Teams Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-sm flex items-center justify-between backdrop-blur-md">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Tổng số nhóm</span>
            <h2 className="text-2xl font-extrabold text-white">{totalTeams}</h2>
            <span className="text-[10px] text-gray-400 font-medium block">Workspace toàn hệ thống</span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Building className="h-5 w-5" />
          </div>
        </div>

        {/* Paid Teams Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-sm flex items-center justify-between backdrop-blur-md">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Gói trả phí</span>
            <h2 className="text-2xl font-extrabold text-white">{paidTeams} <span className="text-xs font-normal text-gray-400">/ {totalTeams}</span></h2>
            <span className="text-[10px] text-gray-400 font-medium block">Tỉ lệ chuyển đổi Pro & Ent</span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-orange-500/20 to-pink-500/20 text-orange-400 border border-orange-500/20 flex items-center justify-center shrink-0">
            <Award className="h-5 w-5" />
          </div>
        </div>

        {/* Total Members Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-sm flex items-center justify-between backdrop-blur-md">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Tổng thành viên</span>
            <h2 className="text-2xl font-extrabold text-white">{totalMembers} <span className="text-xs font-normal text-gray-400">người</span></h2>
            <span className="text-[10px] text-gray-400 font-medium block">Trung bình {(totalMembers / (totalTeams || 1)).toFixed(1)} người / nhóm</span>
          </div>
          <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Quick Search */}
      <div className="bg-white/5 p-4 border border-white/10 rounded-2xl shadow-sm animate-fade-up animate-delay-2 backdrop-blur-md">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Tìm theo tên tổ chức, chủ sở hữu..."
            className="pl-9 rounded-xl border-white/10 bg-gray-900/50 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500 text-sm"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>
      </div>

      {/* Teams Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl shadow-sm overflow-hidden animate-fade-up animate-delay-3 backdrop-blur-md relative">
        {isPending && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        )}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="min-w-full divide-y divide-white/5">
            <thead className="bg-white/5">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:bg-white/5 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <span className="inline-flex items-center gap-1">
                    Tổ chức
                    {sortField === 'name' && (
                      sortDirection === 'asc' 
                        ? <ChevronUp className="h-3 w-3 text-orange-400" /> 
                        : <ChevronDown className="h-3 w-3 text-orange-400" />
                    )}
                  </span>
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Chủ sở hữu</th>
                <th 
                  scope="col" 
                  className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:bg-white/5 transition-colors"
                  onClick={() => handleSort('memberCount')}
                >
                  <span className="inline-flex items-center gap-1">
                    Thành viên
                    {sortField === 'memberCount' && (
                      sortDirection === 'asc' 
                        ? <ChevronUp className="h-3 w-3 text-orange-400" /> 
                        : <ChevronDown className="h-3 w-3 text-orange-400" />
                    )}
                  </span>
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Gói dịch vụ</th>
                <th 
                  scope="col" 
                  className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:bg-white/5 transition-colors"
                  onClick={() => handleSort('aiUsage')}
                >
                  <span className="inline-flex items-center gap-1">
                    Lượt dùng AI
                    {sortField === 'aiUsage' && (
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
              {paginatedTeams.length > 0 ? (
                paginatedTeams.map((team) => {
                  const isSuspended = team.status === 'suspended';
                  const usagePercentage = Math.min(100, (team.aiMessagesUsed / 20000) * 100);

                  return (
                    <tr
                      key={team.id}
                      className={`hover:bg-white/5 transition-colors ${
                        isSuspended ? 'bg-red-500/5' : ''
                      }`}
                    >
                      {/* Team Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{team.name}</p>
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Tạo: {team.createdAt}</p>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-200">{team.ownerName}</p>
                          <p className="text-[11px] text-gray-400 truncate">{team.ownerEmail}</p>
                        </div>
                      </td>

                      {/* Member Count */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-300 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1">
                          <Users className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          {team.members} thành viên
                        </span>
                      </td>

                      {/* Plan Subscription */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {team.plan === 'enterprise' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-sm shadow-orange-500/10">
                            <Crown className="h-3 w-3" />
                            Enterprise
                          </span>
                        ) : team.plan === 'pro' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Pro Plan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-gray-800 text-gray-400 border border-gray-700">
                            Free Gói
                          </span>
                        )}
                      </td>

                      {/* AI Usage */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1.5 max-w-[140px]">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-gray-200">{formatNumber(team.aiMessagesUsed)} tin</span>
                            <span className="text-gray-500">/ 20k</span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                usagePercentage > 85 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : usagePercentage > 60 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]'
                              }`}
                              style={{ width: `${usagePercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2 text-xs">
                          {/* Đổi Plan Button Group */}
                          <div className="inline-flex rounded-lg border border-white/10 bg-gray-900 p-0.5 shadow-sm">
                            <button
                              onClick={() => handleChangePlan(team.id, 'free')}
                              className={`px-2 py-1 rounded-md font-bold transition-all text-[10px] ${
                                team.plan === 'free'
                                  ? 'bg-gray-700 text-white'
                                  : 'text-gray-500 hover:text-gray-300'
                              }`}
                              title="Hạ về gói Free"
                            >
                              Free
                            </button>
                            <button
                              onClick={() => handleChangePlan(team.id, 'pro')}
                              className={`px-2 py-1 rounded-md font-bold transition-all text-[10px] ${
                                team.plan === 'pro'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'text-gray-500 hover:text-blue-400'
                              }`}
                              title="Nâng cấp gói Pro"
                            >
                              Pro
                            </button>
                            <button
                              onClick={() => handleChangePlan(team.id, 'enterprise')}
                              className={`px-2 py-1 rounded-md font-bold transition-all text-[10px] ${
                                team.plan === 'enterprise'
                                  ? 'bg-orange-500/20 text-orange-400'
                                  : 'text-gray-500 hover:text-orange-400'
                              }`}
                              title="Nâng cấp gói Enterprise"
                            >
                              Ent
                            </button>
                          </div>

                          {/* Khóa/Mở khóa Team */}
                          <button
                            onClick={() => handleToggleTeamStatus(team.id)}
                            className={`p-1.5 rounded-lg border font-bold transition-all duration-150 flex items-center gap-1 ${
                              isSuspended
                                ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                            }`}
                            title={isSuspended ? 'Mở khóa tổ chức' : 'Tạm khóa tổ chức'}
                          >
                            {isSuspended ? (
                              <>
                                <Unlock className="h-3.5 w-3.5 shrink-0" />
                                <span className="hidden lg:inline">Mở</span>
                              </>
                            ) : (
                              <>
                                <Lock className="h-3.5 w-3.5 shrink-0" />
                                <span className="hidden lg:inline">Khóa</span>
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
                      <p className="text-sm font-bold text-gray-300">Không tìm thấy tổ chức phù hợp</p>
                      <p className="text-xs text-gray-500 mt-1">Vui lòng kiểm tra lại từ khóa tìm kiếm</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        {sortedTeams.length > 0 && (
          <div className="border-t border-white/10 bg-white/5 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-gray-400">
              Hiển thị <span className="font-bold text-gray-200">{startIndex + 1}–{Math.min(endIndex, sortedTeams.length)}</span> trên <span className="font-bold text-gray-200">{sortedTeams.length}</span> kết quả
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
