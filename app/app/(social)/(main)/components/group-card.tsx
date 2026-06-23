'use client';

import Link from 'next/link';
import { Users, Lock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { joinGroupAction } from '@/lib/db/social-group-actions';
import { useState } from 'react';

export function GroupCard({ group, role, onJoined }: { group: any, role?: string, onJoined?: () => void }) {
  const [loading, setLoading] = useState(false);
  const isMember = !!role || group.isMember;

  const handleJoin = async () => {
    setLoading(true);
    await joinGroupAction(group.id);
    setLoading(false);
    if (onJoined) onJoined();
  };

  return (
    <div className="bg-[#161618]/80 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-xl flex flex-col text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:bg-[#161618]">
      <div className="h-24 bg-white/5 w-full relative">
        {group.coverUrl && (
          <img src={group.coverUrl} className="w-full h-full object-cover" alt="cover" />
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <Link href={`/groups/${group.id}`} className="font-bold text-lg hover:underline line-clamp-1 text-white/90">
          {group.name}
        </Link>
        <p className="text-xs text-white/40 mt-1 flex items-center gap-2">
          {group.privacy === 'public' ? (
            <Globe className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-orange-500" />
          )}
          <span className="capitalize">{group.privacy === 'public' ? 'Công khai' : 'Riêng tư'}</span>
          <span>•</span>
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {group.memberCount} thành viên</span>
        </p>
        <p className="text-xs mt-3 line-clamp-2 text-white/60 flex-1">
          {group.description || 'Không có mô tả.'}
        </p>
        
        <div className="mt-4">
          {isMember ? (
            <Link href={`/groups/${group.id}`} className="w-full block">
              <Button variant="outline" className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white font-semibold">
                Xem nhóm
              </Button>
            </Link>
          ) : (
            <Button
              onClick={handleJoin}
              disabled={loading}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold"
            >
              {loading ? 'Đang tham gia...' : 'Tham gia nhóm'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}