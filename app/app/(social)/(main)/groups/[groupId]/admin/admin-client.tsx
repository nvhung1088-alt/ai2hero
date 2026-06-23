'use client';

import { useState } from 'react';
import { ArrowLeft, Save, Trash, UserCheck, UserX, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { updateGroup, deleteGroup, setGroupMemberRole, approveGroupMemberAction, approveGroupPostAction } from '@/lib/db/social-group-actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

export function GroupAdminClient({ group, members, pendingMembers, pendingPosts, myRole }: { group: any, members: any[], pendingMembers: any[], pendingPosts: any[], myRole: string }) {
  const [activeTab, setActiveTab] = useState<'settings' | 'members' | 'pending_members' | 'pending_posts'>('settings');
  
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [privacy, setPrivacy] = useState(group.privacy);
  const [coverUrl, setCoverUrl] = useState(group.coverUrl || '');
  const [requireJoinApproval, setRequireJoinApproval] = useState(group.requireJoinApproval);
  const [requirePostApproval, setRequirePostApproval] = useState(group.requirePostApproval);
  
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await updateGroup(group.id, { name, description, privacy, coverUrl, requireJoinApproval, requirePostApproval });
      showToast('Cập nhật nhóm thành công', 'success');
      router.refresh();
    } catch (e) {
      showToast('Lỗi cập nhật nhóm', 'error');
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (myRole !== 'admin') {
      showToast('Chỉ trưởng nhóm mới có thể giải tán nhóm', 'error');
      return;
    }
    if (confirm('Bạn có chắc chắn muốn giải tán nhóm này không? Mọi dữ liệu sẽ bị xóa vĩnh viễn.')) {
      setLoading(true);
      try {
        await deleteGroup(group.id);
        showToast('Đã giải tán nhóm', 'success');
        router.push('/groups');
      } catch (e) {
        showToast('Lỗi giải tán nhóm', 'error');
        setLoading(false);
      }
    }
  };

  const handleRoleChange = async (userId: number, role: 'admin' | 'moderator' | 'member') => {
    if (myRole !== 'admin') {
      showToast('Chỉ trưởng nhóm mới có thể thay đổi quyền', 'error');
      return;
    }
    try {
      await setGroupMemberRole(group.id, userId, role);
      showToast('Thay đổi quyền thành công', 'success');
      router.refresh();
    } catch (e) {
      showToast('Lỗi thay đổi quyền thành công', 'error');
    }
  };

  const handleApproveMember = async (userId: number, status: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      await approveGroupMemberAction(group.id, userId, status);
      showToast(`Đã ${status === 'approved' ? 'duyệt' : 'từ chối'} thành viên`, 'success');
      router.refresh();
    } catch (e) {
      showToast('Lỗi xử lý yêu cầu', 'error');
    }
    setLoading(false);
  };

  const handleApprovePost = async (postId: number, status: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      await approveGroupPostAction(postId, status);
      showToast(`Đã ${status === 'approved' ? 'duyệt' : 'từ chối'} bài viết`, 'success');
      router.refresh();
    } catch (e) {
      showToast('Lỗi xử lý yêu cầu', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <Link href={`/groups/${group.id}`} className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Quản trị nhóm: {group.name}</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-white/5">
        <Button 
          variant={activeTab === 'settings' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('settings')}
          className={activeTab === 'settings' ? 'bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'}
        >
          Cài đặt chung
        </Button>
        <Button 
          variant={activeTab === 'members' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('members')}
          className={activeTab === 'members' ? 'bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'}
        >
          Thành viên ({members.length})
        </Button>
        <Button 
          variant={activeTab === 'pending_members' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('pending_members')}
          className={activeTab === 'pending_members' ? 'bg-orange-500/20 text-orange-500' : 'text-white/60 hover:text-orange-400 hover:bg-white/5'}
        >
          Duyệt thành viên {pendingMembers.length > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs">{pendingMembers.length}</span>}
        </Button>
        <Button 
          variant={activeTab === 'pending_posts' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('pending_posts')}
          className={activeTab === 'pending_posts' ? 'bg-blue-500/20 text-blue-500' : 'text-white/60 hover:text-blue-400 hover:bg-white/5'}
        >
          Duyệt bài đăng {pendingPosts.length > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs">{pendingPosts.length}</span>}
        </Button>
      </div>

      <div className="mt-6">
        {activeTab === 'settings' && (
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4 max-w-2xl">
            <h2 className="text-lg font-semibold text-white/90">Thông tin cơ bản</h2>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60">Tên nhóm</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60">Mô tả</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="bg-white/5 border-white/10 text-white" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60">Ảnh bìa URL</label>
              <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60">Chế độ riêng tư</label>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-lg p-2.5 text-sm focus:outline-none"
              >
                <option value="public" className="bg-[#161618]">Công khai (Public)</option>
                <option value="private" className="bg-[#161618]">Riêng tư (Private)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60">Yêu cầu duyệt thành viên</label>
                <select
                  value={requireJoinApproval ? "true" : "false"}
                  onChange={(e) => setRequireJoinApproval(e.target.value === "true")}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg p-2.5 text-sm focus:outline-none"
                >
                  <option value="true" className="bg-[#161618]">Bật</option>
                  <option value="false" className="bg-[#161618]">Tắt</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60">Yêu cầu duyệt bài đăng</label>
                <select
                  value={requirePostApproval ? "true" : "false"}
                  onChange={(e) => setRequirePostApproval(e.target.value === "true")}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg p-2.5 text-sm focus:outline-none"
                >
                  <option value="true" className="bg-[#161618]">Bật</option>
                  <option value="false" className="bg-[#161618]">Tắt</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10">
              <Button onClick={handleUpdate} disabled={loading} className="bg-pink-500 hover:bg-pink-600 text-white font-semibold">
                <Save className="h-4 w-4 mr-2" /> Lưu thay đổi
              </Button>
              {myRole === 'admin' && (
                <Button onClick={handleDelete} variant="destructive" disabled={loading} className="font-semibold ml-auto">
                  <Trash className="h-4 w-4 mr-2" /> Giải tán nhóm
                </Button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white/90">Danh sách thành viên chính thức</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {members.map((member) => (
                <div key={member.userId} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-black/20">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-sm overflow-hidden">
                      {member.user?.avatarUrl && member.user.avatarUrl !== '👤' ? (
                        <img src={member.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (member.user?.name || member.user?.email || '?').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{member.user?.name || 'Thành viên'}</div>
                      <div className="text-xs text-white/40">{member.role}</div>
                    </div>
                  </div>
                  {myRole === 'admin' && member.userId !== group.createdBy && (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.userId, e.target.value as any)}
                      className="bg-white/10 border border-white/10 text-white text-xs rounded-lg p-2 focus:outline-none"
                    >
                      <option value="member" className="bg-[#161618]">Thành viên</option>
                      <option value="moderator" className="bg-[#161618]">Phó nhóm</option>
                      <option value="admin" className="bg-[#161618]">Trưởng nhóm</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'pending_members' && (
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white/90">Yêu cầu tham gia nhóm</h2>
            {pendingMembers.length === 0 ? (
              <div className="text-center py-10 text-white/40">Không có yêu cầu tham gia nào.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingMembers.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between p-4 rounded-xl border border-orange-500/20 bg-orange-500/5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-sm overflow-hidden">
                        {member.user?.avatarUrl && member.user.avatarUrl !== '👤' ? (
                          <img src={member.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (member.user?.name || member.user?.email || '?').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{member.user?.name || 'User'}</div>
                        <div className="text-xs text-white/40">Đang chờ duyệt</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleApproveMember(member.userId, 'approved')} className="text-green-500 hover:text-green-400 hover:bg-green-500/10">
                        <UserCheck className="h-5 w-5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleApproveMember(member.userId, 'rejected')} className="text-red-500 hover:text-red-400 hover:bg-red-500/10">
                        <UserX className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pending_posts' && (
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white/90">Bài viết chờ duyệt</h2>
            {pendingPosts.length === 0 ? (
              <div className="text-center py-10 text-white/40">Không có bài viết nào đang chờ duyệt.</div>
            ) : (
              <div className="space-y-4">
                {pendingPosts.map((post) => (
                  <div key={post.id} className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-sm overflow-hidden">
                          {post.user?.avatarUrl && post.user.avatarUrl !== '👤' ? (
                            <img src={post.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (post.user?.name || post.user?.email || '?').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{post.user?.name || 'User'}</div>
                          <div className="text-xs text-white/40">{new Date(post.createdAt).toLocaleString('vi-VN')}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApprovePost(post.id, 'approved')} className="bg-blue-600 hover:bg-blue-700 text-white h-8">
                          <CheckCircle className="h-4 w-4 mr-1" /> Duyệt
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleApprovePost(post.id, 'rejected')} className="h-8">
                          <XCircle className="h-4 w-4 mr-1" /> Xóa
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-white/80 whitespace-pre-wrap">{post.message}</div>
                    {post.media && post.media.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {post.media.map((m: any, idx: number) => (
                          <div key={idx} className="h-32 rounded-lg bg-black/40 overflow-hidden">
                            {m.type.startsWith('video') ? (
                              <video src={m.url} className="w-full h-full object-cover" />
                            ) : (
                              <img src={m.url} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}