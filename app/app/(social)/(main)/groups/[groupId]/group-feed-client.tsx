'use client';

import { useState } from 'react';
import { Users, Lock, Globe, Settings, ArrowLeft, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FeedPostCreator from '@/components/feed-post-creator';
import FeedPostCard from '@/components/feed-post/feed-post-card';
import { joinGroupAction, leaveGroupAction, updateGroup } from '@/lib/db/social-group-actions';
import Link from 'next/link';
import { 
  toggleFeedLikeAction, 
  toggleFeedPinAction, 
  changeTaskStatusAction 
} from '@/app/(login)/actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

export function GroupFeedClient({ user, group, isMember, role, membershipStatus, initialPosts, initialMembers = [] }: { user: any, group: any, isMember: boolean, role: string | null, membershipStatus: string | null, initialPosts: any[], initialMembers?: any[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [members] = useState(initialMembers);
  const [loading, setLoading] = useState(false);
  const [memberStatus, setMemberStatus] = useState(isMember);
  const [activeTab, setActiveTab] = useState<'feed' | 'members' | 'media'>('feed');

  const allMedia = posts.flatMap(p => p.media || []);
  const recentMedia = allMedia.slice(0, 6);

  const handleJoin = async () => {
    if (!user) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    setLoading(true);
    await joinGroupAction(group.id);
    // Reload ngay lập tức để nhận lại status từ server thay vì tự set local
    window.location.reload(); 
  };

  const handleLeave = async () => {
    if (confirm('Bạn có chắc muốn rời nhóm này không?')) {
      setLoading(true);
      await leaveGroupAction(group.id);
      setMemberStatus(false);
      setLoading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }

    if (role !== 'admin') {
      showToast('Chỉ Admin mới có thể đổi ảnh bìa', 'error');
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      try {
        await updateGroup(group.id, { coverUrl: base64 });
        window.location.reload();
      } catch (err: any) {
        showToast(err.message || 'Lỗi tải ảnh', 'error');
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLike = async (postId: number, reactionType?: string) => {
    if (!user) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    try {
      const res = await toggleFeedLikeAction({ postId, reactionType });
      if (res.error) showToast(res.error, 'error');
      else {
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            const liked = res.liked;
            const rType = res.reactionType;
            let nextLikesCount = p.likesCount;
            if (p.likedByMe !== liked) {
              nextLikesCount = liked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1);
            }
            const nextSummary = { ...(p.reactionsSummary || {}) };
            if (p.likedByMe && p.myReactionType) {
              nextSummary[p.myReactionType] = Math.max(0, (nextSummary[p.myReactionType] || 0) - 1);
              if (nextSummary[p.myReactionType] === 0) delete nextSummary[p.myReactionType];
            }
            if (liked && rType) {
              nextSummary[rType] = (nextSummary[rType] || 0) + 1;
            }
            return {
              ...p,
              likedByMe: liked,
              myReactionType: rType,
              likesCount: nextLikesCount,
              reactionsSummary: nextSummary
            };
          }
          return p;
        }));
      }
    } catch (e) {
      showToast('Lỗi thích bài viết', 'error');
    }
  };

  const handleCommentAdded = async (postId: number, comment: any) => {
    if (!user) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          commentsCount: p.commentsCount + 1,
          comments: [comment, ...(p.comments || [])]
        };
      }
      return p;
    }));
  };

  const handlePinToggle = async (postId: number) => {
    if (!user) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    try {
      const res = await toggleFeedPinAction({ postId });
      if (res.error) showToast(res.error, 'error');
      else {
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return { ...p, pinned: p.pinned === 1 ? 0 : 1 };
          }
          return p;
        }));
      }
    } catch (e) {
      showToast('Lỗi ghim bài viết', 'error');
    }
  };

  const handleTaskStatusChange = async (postId: number, status: any) => {
    if (!user) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    try {
      const res = await changeTaskStatusAction({ postId, status });
      if (res.error) showToast(res.error, 'error');
      else {
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return { ...p, taskStatus: status };
          }
          return p;
        }));
      }
    } catch (e) {
      showToast('Lỗi thay đổi trạng thái công việc', 'error');
    }
  };

  return (
    <div className="w-full space-y-6 text-white px-4 md:px-6 pt-6 pb-20">
      <div className="bg-[#161618] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        <div className="h-64 sm:h-[350px] bg-white/5 w-full relative group/cover">
          {group.coverUrl && (
            <img src={group.coverUrl} className="w-full h-full object-cover" alt="cover" />
          )}
          <Link href="/groups" className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 z-10 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {role === 'admin' && (
            <div className="absolute bottom-4 right-4 z-10 opacity-0 group-hover/cover:opacity-100 transition-opacity duration-200">
              <label className="flex items-center gap-2 bg-black/60 hover:bg-black/80 text-white px-4 py-2 rounded-lg backdrop-blur-md cursor-pointer transition-colors text-sm font-medium">
                <Camera className="w-4 h-4" />
                Thay đổi ảnh bìa
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleCoverUpload}
                  disabled={loading}
                />
              </label>
            </div>
          )}
        </div>
        <div className="px-6 pb-6 relative flex flex-col justify-end pt-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
            <div>
              <h1 className="text-[28px] font-bold text-white tracking-tight">{group.name}</h1>
              <div className="flex items-center gap-2 mt-2 text-[15px] text-white/60 font-medium">
                {group.privacy === 'private' ? (
                  <span className="flex items-center gap-1"><Lock className="w-4 h-4 text-orange-500" /> Nhóm riêng tư</span>
                ) : (
                  <span className="flex items-center gap-1"><Globe className="w-4 h-4 text-green-500" /> Nhóm công khai</span>
                )}
                <span>•</span>
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {group.memberCount} thành viên</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {role === 'admin' && (
                <Link href={`/groups/${group.id}/admin`}>
                  <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                    <Settings className="w-4 h-4 mr-2" /> Quản trị
                  </Button>
                </Link>
              )}

              {memberStatus ? (
                membershipStatus === 'pending' ? (
                  <Button disabled variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                    Đang chờ duyệt
                  </Button>
                ) : (
                  <Button onClick={handleLeave} disabled={loading} variant="destructive">
                    Rời nhóm
                  </Button>
                )
              ) : (
                <Button onClick={handleJoin} disabled={loading} className="bg-pink-500 hover:bg-pink-600 text-white font-semibold">
                  Tham gia nhóm
                </Button>
              )}
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <div className="flex items-center gap-2 pt-2">
            <button 
              onClick={() => setActiveTab('feed')}
              className={`px-4 py-3.5 text-[15px] font-semibold transition-colors border-b-4 ${activeTab === 'feed' ? 'text-pink-500 border-pink-500 cursor-default' : 'text-white/60 border-transparent hover:bg-white/5 hover:text-white rounded-lg'}`}>Thảo luận</button>
            <button 
              onClick={() => setActiveTab('members')}
              className={`px-4 py-3.5 text-[15px] font-semibold transition-colors border-b-4 ${activeTab === 'members' ? 'text-pink-500 border-pink-500 cursor-default' : 'text-white/60 border-transparent hover:bg-white/5 hover:text-white rounded-lg'}`}>Mọi người</button>
            <button 
              onClick={() => setActiveTab('media')}
              className={`px-4 py-3.5 text-[15px] font-semibold transition-colors border-b-4 ${activeTab === 'media' ? 'text-pink-500 border-pink-500 cursor-default' : 'text-white/60 border-transparent hover:bg-white/5 hover:text-white rounded-lg'}`}>File phương tiện</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Posts Area */}
        <div className="lg:col-span-8 space-y-6">
          {memberStatus || group.privacy === 'public' ? (
            <>
              {activeTab === 'feed' && (
                <>
                  {memberStatus && membershipStatus === 'approved' && (
                    <FeedPostCreator
                      user={user}
                      teams={[{ id: group.id, name: group.name, avatar: group.coverUrl }]}
                      userRole={(role || 'viewer') as any}
                      initialPublishTeamId={group.id}
                      onPostCreated={() => {
                        if (group.requirePostApproval && role !== 'admin' && role !== 'moderator') {
                          showToast('Bài đăng của bạn đã được gửi và đang chờ Admin phê duyệt', 'success');
                        } else {
                          window.location.reload();
                        }
                      }}
                    />
                  )}
                  {memberStatus && membershipStatus === 'pending' && (
                    <div className="p-4 mb-4 text-orange-400 bg-orange-400/10 border border-orange-400/20 rounded-xl text-center">
                      Bạn đang chờ Admin phê duyệt để có thể đăng bài và tương tác.
                    </div>
                  )}
                  <div className="space-y-4">
                    {posts.length === 0 ? (
                      <div className="text-center py-12 bg-[#161618] border border-white/5 rounded-2xl text-white/40">
                        Chưa có bài viết nào trong nhóm này.
                      </div>
                    ) : (
                      posts.map((post) => (
                        <FeedPostCard 
                          key={post.id} 
                          post={post} 
                          currentUserId={user?.id || 0} 
                          userRole={(role || 'viewer') as any}
                          onLike={(reactionType) => handleLike(post.id, reactionType)}
                          onCommentAdded={(comment: any) => handleCommentAdded(post.id, comment)}
                          onPinToggle={() => handlePinToggle(post.id)}
                          onTaskStatusChange={(status) => handleTaskStatusChange(post.id, status)}
                        />
                      ))
                    )}
                  </div>
                </>
              )}

              {activeTab === 'members' && (
                <div className="bg-[#161618] border border-white/5 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Thành viên ({members.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {members.map(member => (
                      <div key={member.id} className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                        <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden shrink-0 flex items-center justify-center font-bold text-white/60">
                           {member.avatarUrl ? <img src={member.avatarUrl} className="w-full h-full object-cover" /> : member.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{member.name}</p>
                          <p className="text-xs text-white/50">
                            {member.role === 'admin' ? 'Quản trị viên' : member.role === 'moderator' ? 'Người kiểm duyệt' : 'Thành viên'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'media' && (
                <div className="bg-[#161618] border border-white/5 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">File phương tiện</h3>
                  {allMedia.length === 0 ? (
                    <div className="text-center py-12 text-white/40 text-sm">Chưa có file phương tiện nào.</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {allMedia.map((m: any, i: number) => (
                        <div key={i} className="aspect-square bg-black rounded-lg overflow-hidden group relative">
                          {m.type === 'video' ? (
                            <video src={m.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          ) : (
                            <img src={m.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-[#161618] border border-white/5 rounded-2xl p-6">
              <Lock className="w-12 h-12 text-orange-500 mx-auto mb-4 animate-bounce" />
              <h3 className="text-lg font-semibold text-white">Đây là nhóm riêng tư</h3>
              <p className="text-sm text-white/40 mt-2">
                Hãy tham gia nhóm để xem các bài viết và thảo luận của thành viên.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Info Area */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#161618] border border-white/5 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="font-semibold text-white/90">Giới thiệu</h3>
            {group.privacy === 'private' ? (
              <div className="flex gap-3 items-start">
                <Lock className="w-5 h-5 text-white/80 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white/90">Riêng tư</p>
                  <p className="text-xs text-white/60 mt-0.5">Chỉ thành viên mới nhìn thấy mọi người trong nhóm và những gì họ đăng.</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 items-start">
                <Globe className="w-5 h-5 text-white/80 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white/90">Công khai</p>
                  <p className="text-xs text-white/60 mt-0.5">Bất kỳ ai cũng có thể nhìn thấy mọi người trong nhóm và những gì họ đăng.</p>
                </div>
              </div>
            )}
            
            <div className="pt-2">
              <p className="text-sm text-white/80 leading-relaxed">{group.description || 'Không có mô tả chi tiết.'}</p>
            </div>
          </div>

          {/* Box File phương tiện mới đây */}
          <div className="bg-[#161618] border border-white/5 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white/90">File phương tiện mới đây</h3>
              <button onClick={() => setActiveTab('media')} className="text-sm text-pink-500 hover:underline">Xem tất cả</button>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
              {recentMedia.map((m: any, i: number) => (
                <div key={i} className="aspect-square bg-white/10 overflow-hidden cursor-pointer" onClick={() => setActiveTab('media')}>
                  {m.type === 'video' ? (
                    <video src={m.url} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  ) : (
                    <img src={m.url} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  )}
                </div>
              ))}
            </div>
            {recentMedia.length === 0 && (
              <div className="text-xs text-white/40 text-center py-4 bg-white/5 rounded-lg border border-white/5">Chưa có file phương tiện</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}