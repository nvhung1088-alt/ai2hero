'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { customerPortalAction } from '@/lib/payments/actions';
import { TeamDataWithMembers, User } from '@/lib/db/schema';
import { 
  updateWorkspaceAction, 
  deleteWorkspaceAction 
} from '@/app/(login)/actions';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Suspense } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, AlertTriangle, Users } from 'lucide-react';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

function GeneralSettings() {
  const { data: teamData, mutate } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('💼');
  const [isPending, setIsPending] = useState(false);

  // Đồng bộ state khi swr fetch xong
  useEffect(() => {
    if (teamData) {
      setName(teamData.name || '');
      setAvatar(teamData.avatar || '💼');
    }
  }, [teamData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamData) return;
    setIsPending(true);

    try {
      const res = await updateWorkspaceAction({
        teamId: teamData.id,
        name: name.trim(),
        avatar: avatar
      });

      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast('Cập nhật không gian làm việc thành công!', 'success');
        mutate(); // Cập nhật lại cache SWR và đồng bộ sidebar
      }
    } catch (err) {
      console.error(err);
      showToast('Đã xảy ra lỗi khi cập nhật!', 'error');
    } finally {
      setIsPending(false);
    }
  };

  if (!teamData) {
    return (
      <Card className="mb-8 h-[140px] bg-gray-900/50 border-white/10 text-white animate-pulse">
        <CardHeader>
          <CardTitle className="text-white">Cấu hình chung</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mb-8 bg-gray-900/50 border-white/10 text-white animate-fade-up">
      <CardHeader>
        <CardTitle className="text-white">Cấu hình chung</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            <div className="w-20">
              <Label htmlFor="avatar">Biểu tượng</Label>
              <Input
                id="avatar"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="💼"
                className="mt-2 text-center text-xl bg-gray-950 border-white/10 text-white h-10"
                maxLength={2}
              />
            </div>
            <div className="flex-grow">
              <Label htmlFor="name">Tên không gian làm việc</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tên nhóm của bạn"
                required
                className="mt-2 bg-gray-950 border-white/10 text-white h-10"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isPending ? 'Đang cập nhật...' : 'Cập nhật'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DangerZone() {
  const router = useRouter();
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const [isPending, setIsPending] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const currentMember = teamData?.teamMembers?.find((m) => m.user?.id === user?.id);
  const isOwner = currentMember?.role === 'owner';

  // Lắng nghe phím Escape để đóng modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDeleteModal(false);
      }
    };
    if (showDeleteModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDeleteModal]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowDeleteModal(false);
      }
    };
    if (showDeleteModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeleteModal]);

  const handleDeleteDirect = async () => {
    if (!teamData || !isOwner) return;
    setIsPending(true);

    try {
      const res = await deleteWorkspaceAction({ teamId: teamData.id });
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast('Đã xóa không gian làm việc thành công!', 'success');
        // Redirect về dashboard chính, trigger reload cookies
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      showToast('Đã xảy ra lỗi không mong muốn!', 'error');
    } finally {
      setIsPending(false);
      setShowDeleteModal(false);
    }
  };

  if (!teamData) return null;
  if (!isOwner) return null; // Chỉ Owner mới hiển thị danger zone xóa nhóm

  return (
    <>
      <Card className="mb-8 border-red-500/30 bg-red-950/10 text-white animate-fade-up">
        <CardHeader>
          <CardTitle className="text-red-500 font-extrabold">Vùng nguy hiểm (Danger Zone)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-400 font-medium">
              Hành động này là <strong>vĩnh viễn</strong> và <strong>không thể hoàn tác</strong>. Mọi ứng dụng và dữ liệu của không gian làm việc này sẽ bị mất hoàn toàn khỏi hệ thống.
            </p>
            <div className="pt-2">
              <Button
                onClick={() => setShowDeleteModal(true)}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white border-none font-extrabold cursor-pointer"
              >
                Xóa không gian làm việc
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal xác nhận xóa Workspace Premium Glassmorphism */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div
            ref={modalRef}
            className="relative bg-gray-950/90 backdrop-blur-2xl border border-red-500/20 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-scale-up text-white animate-fade-in"
          >
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500/10 rounded-xl text-red-500 border border-red-500/25 shrink-0">
                <AlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white">Xác nhận xóa Workspace</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Bạn có chắc chắn muốn xóa không gian làm việc <strong>{teamData.name}</strong> không?
                </p>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
                disabled={isPending}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Warning */}
            <div className="my-4 bg-red-950/20 border border-red-500/10 p-3 rounded-xl text-xs text-red-200/80 leading-relaxed">
              ⚠️ <strong>Cảnh báo quan trọng:</strong> Hành động này sẽ chuyển trạng thái Workspace sang Soft-Delete, loại bỏ toàn bộ thành viên và hủy tất cả lời mời. Dữ liệu sẽ bị cô lập ngay lập tức.
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isPending}
                className="px-4 py-2 border border-white/10 hover:border-white/20 rounded-xl text-xs font-bold text-gray-300 hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteDirect}
                disabled={isPending}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:opacity-95 text-white border-none rounded-xl text-xs font-extrabold shadow-md shadow-red-600/10 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isPending ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SubscriptionSkeleton() {
  return (
    <Card className="mb-8 h-[140px] bg-gray-900/50 border-white/10 text-white">
      <CardHeader>
        <CardTitle className="text-white">Gói đăng ký nhóm</CardTitle>
      </CardHeader>
    </Card>
  );
}

function ManageSubscription() {
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);

  return (
    <Card className="mb-8 bg-gray-900/50 border-white/10 text-white animate-fade-up">
      <CardHeader>
        <CardTitle className="text-white">Gói đăng ký nhóm</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="mb-4 sm:mb-0">
              <p className="font-medium">
                Gói hiện tại: {teamData?.planName || 'Free'}
              </p>
              <p className="text-sm text-muted-foreground">
                {teamData?.subscriptionStatus === 'active'
                  ? 'Thanh toán hàng tháng'
                  : teamData?.subscriptionStatus === 'trialing'
                  ? 'Thời gian dùng thử'
                  : 'Chưa kích hoạt gói dịch vụ'}
              </p>
            </div>
            <form action={customerPortalAction}>
              <Button type="submit" variant="outline">
                Quản lý gói đăng ký
              </Button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MembersNavigationCard() {
  return (
    <Card className="mb-8 bg-gray-900/50 border border-white/10 text-white animate-fade-up shadow-xl shadow-black/20">
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="p-2.5 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20 shrink-0">
          <Users className="h-5 w-5" />
        </div>
        <CardTitle className="text-white text-lg">Thành viên & Phân quyền</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-400 leading-relaxed">
          Chúng tôi đã chuyển toàn bộ chức năng quản lý thành viên, phân quyền vai trò (Owner, Admin, Manager, Staff, Viewer), xem ma trận quyền hạn chi tiết và quản lý lời mời sang một trang chuyên biệt.
        </p>
        <div className="pt-2">
          <Button asChild className="bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-95 text-white border-none font-bold rounded-xl cursor-pointer">
            <Link href="/dashboard/members">
              Quản lý Thành viên & Lời mời
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <section className="flex-grow p-6 lg:p-10 space-y-6">
      <h1 className="text-xl lg:text-3xl font-extrabold text-white mb-6">Cài đặt nhóm</h1>
      
      {/* Cấu hình chung của Workspace */}
      <GeneralSettings />

      <Suspense fallback={<SubscriptionSkeleton />}>
        <ManageSubscription />
      </Suspense>

      {/* Thẻ dẫn hướng sang trang quản lý Thành viên */}
      <MembersNavigationCard />

      {/* Vùng nguy hiểm dành riêng cho Chủ sở hữu */}
      <DangerZone />
    </section>
  );
}
