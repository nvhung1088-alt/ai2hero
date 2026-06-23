"use client";

import { useState, useEffect, useMemo } from 'react';
import { Plus, Compass, Search, Newspaper, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GroupCard } from '../components/group-card';
import FeedPostCard from '@/components/feed-post/feed-post-card';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';
import { 
  toggleFeedLikeAction, 
  addFeedCommentAction, 
  toggleFeedPinAction, 
  changeTaskStatusAction 
} from '@/app/(login)/actions';
import Link from 'next/link';

export function GroupsClient({ 
  user, 
  initialGroups,
  initialFeedPosts = []
}: { 
  user: any;
  initialGroups: any[];
  initialFeedPosts?: any[];
}) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'feed' | 'my_groups'>('feed');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [feedPosts, setFeedPosts] = useState<any[]>(initialFeedPosts);

  useEffect(() => {
    setFeedPosts(initialFeedPosts);
  }, [initialFeedPosts]);

  const filtered = initialGroups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  // Determine user role (default editor)
  const userRole = useMemo<any>(() => {
    return 'editor';
  }, []);

  const handleLike = async (postId: number, reactionType?: string) => {
    if (!user) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    try {
      const res = await toggleFeedLikeAction({ postId, reactionType });
      if (res.error) showToast(res.error, 'error');
      else {
        setFeedPosts(prev => prev.map(p => {
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
      showToast('Lỗi khi thích bài viết', 'error');
    }
  };

  const handleCommentAdded = async (postId: number, comment: any) => {
    if (!user) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
      return;
    }
    setFeedPosts(prev => prev.map(p => {
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
        setFeedPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return { ...p, pinned: p.pinned === 1 ? 0 : 1 };
          }
          return p;
        }));
      }
    } catch (e) {
      showToast('Lỗi khi ghim bài viết', 'error');
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
        setFeedPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return { ...p, taskStatus: status };
          }
          return p;
        }));
      }
    } catch (e) {
      showToast('Lỗi khi thay đổi trạng thái công việc', 'error');
    }
  };

  return (
    <div className="w-full flex flex-col md:flex-row text-white min-h-[calc(100vh-3.5rem)]">
      {/* Sidebar - w-full on mobile, w-[360px] sticky on desktop (No border radius, full height) */}
      <div className="w-full md:w-[360px] bg-[#161618] border-r border-white/5 p-4 md:shrink-0 md:h-[calc(100vh-3.5rem)] overflow-y-auto md:sticky md:top-[3.5rem] space-y-4">
        <div>
          <h1 className="text-xl font-black text-white px-2 py-1">Nhóm</h1>
          <p className="text-white/40 text-xs px-2 mt-0.5">Tham gia cộng đồng thảo luận</p>
        </div>

        {/* Nút Tạo nhóm mới to bự ở sidebar */}
        <div className="px-2 space-y-2">
          <Button onClick={() => {
            if (!user) {
              if (typeof window !== 'undefined') window.dispatchEvent(new Event('open-auth-modal'));
              return;
            }
            setIsCreateOpen(true);
          }} className="w-full flex items-center justify-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-semibold text-xs rounded-xl py-2.5">
            <Plus className="w-4 h-4" />
            Tạo nhóm mới
          </Button>
          <Link href="/groups/discover" className="block w-full">
            <Button variant="outline" className="w-full flex items-center justify-center gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-xs rounded-xl py-2.5">
              <Compass className="w-4 h-4" />
              Khám phá nhóm mới
            </Button>
          </Link>
        </div>

        {/* Search input nhóm */}
        <div className="relative px-2">
          <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-white/40" />
          <Input 
            placeholder="Tìm kiếm nhóm của bạn..." 
            className="pl-9 bg-white/5 border-white/10 text-xs text-white placeholder-white/40 rounded-xl py-2 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Menu điều hướng dọc */}
        <div className="space-y-1.5 pt-2">
          <button
            onClick={() => setActiveTab('feed')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'feed' 
                ? 'bg-pink-500 text-white font-bold shadow-lg shadow-pink-500/20' 
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Newspaper className="w-4 h-4 shrink-0" />
            <span>Bảng tin của bạn</span>
          </button>

          <button
            onClick={() => setActiveTab('my_groups')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'my_groups' 
                ? 'bg-pink-500 text-white font-bold shadow-lg shadow-pink-500/20' 
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 shrink-0" />
              <span>Nhóm của bạn</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === 'my_groups' ? 'bg-white/20' : 'bg-white/5 text-white/40'}`}>
              {initialGroups.length}
            </span>
          </button>
        </div>

        {/* Danh sách Nhóm đã tham gia */}
        {initialGroups.length > 0 && (
          <div className="pt-4 border-t border-white/5 space-y-1">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider px-2 mb-2">Nhóm bạn đã tham gia</h3>
            {initialGroups.map((g) => (
              <Link key={g.id} href={`/groups/${g.id}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-white/10 overflow-hidden shrink-0">
                  {g.coverUrl ? (
                    <img src={g.coverUrl} className="w-full h-full object-cover" alt={g.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/40">{g.name.charAt(0)}</div>
                  )}
                </div>
                <div className="flex-1 truncate">
                  <p className="text-xs font-semibold text-white/80 group-hover:text-white truncate">{g.name}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Main content right side */}
      <div className="flex-1 flex justify-center py-8 px-4 bg-transparent">
        <div className="w-full max-w-[680px] space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-sm font-bold text-white/40 uppercase tracking-wider">
              {activeTab === 'feed' && 'Hoạt động mới đây'}
              {activeTab === 'my_groups' && 'Nhóm bạn đã tham gia'}
            </h2>
          </div>

          {/* Tab Bảng tin nhóm */}
          {activeTab === 'feed' && (
            <div className="space-y-4">
            {feedPosts.length === 0 ? (
              <div className="text-center py-20 bg-[#161618]/40 border border-white/5 rounded-2xl text-white/40 text-sm">
                Chưa có hoạt động nào trong nhóm của bạn. Hãy tạo nhóm hoặc đăng bài để bắt đầu!
              </div>
            ) : (
              feedPosts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  currentUserId={user?.id || 0}
                  userRole={userRole}
                  onLike={(reactionType) => handleLike(post.id, reactionType)}
                  onCommentAdded={(comment: any) => handleCommentAdded(post.id, comment)}
                  onPinToggle={() => handlePinToggle(post.id)}
                  onTaskStatusChange={(status) => handleTaskStatusChange(post.id, status)}
                />
              ))
            )}
          </div>
        )}

          {/* Tab Danh sách nhóm của bạn */}
          {activeTab === 'my_groups' && (
            <div>
              {filtered.length === 0 ? (
                <div className="text-center py-20 bg-[#161618]/40 border border-white/5 rounded-2xl text-white/40 text-sm">
                  Bạn chưa tham gia nhóm nào hoặc không tìm thấy nhóm phù hợp.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filtered.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Create Group */}
      {isCreateOpen && (
        <CreateGroupModal
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </div>
  );
}

// Subcomponent CreateGroupModal
import { createGroup } from '@/lib/db/social-group-actions';
import { useRouter } from 'next/navigation';

function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const group = await createGroup({
        name: name.trim(),
        description: description.trim(),
        privacy
      });
      if (group) {
        showToast('Tạo nhóm thành công', 'success');
        onClose();
        router.push(`/groups/${group.id}`);
      }
    } catch (err) {
      showToast('Lỗi khi tạo nhóm', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#161618] border border-white/10 w-full max-w-md rounded-2xl p-6 space-y-4 text-white shadow-2xl">
        <h3 className="text-lg font-bold">Tạo nhóm mới</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-white/60 font-medium">Tên nhóm</label>
            <Input
              required
              placeholder="Nhập tên nhóm..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder-white/40"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-white/60 font-medium">Mô tả</label>
            <Input
              placeholder="Mô tả nhóm ngắn gọn..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder-white/40"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-white/60 font-medium">Quyền riêng tư</label>
            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-lg p-2.5 focus:outline-none"
            >
              <option value="public" className="bg-[#161618]">Công khai (Public)</option>
              <option value="private" className="bg-[#161618]">Riêng tư (Private)</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-white/5 text-white/60 hover:text-white">
              Hủy
            </Button>
            <Button type="submit" disabled={loading || !name.trim()} className="bg-pink-500 hover:bg-pink-600 text-white font-semibold">
              {loading ? 'Đang tạo...' : 'Tạo nhóm'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}