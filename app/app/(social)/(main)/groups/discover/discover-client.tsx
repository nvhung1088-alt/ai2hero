'use client';

import { useState } from 'react';
import { Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GroupCard } from '../../components/group-card';
import Link from 'next/link';

export function DiscoverGroupsClient({ user, initialGroups }: { user: any, initialGroups: any[] }) {
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState(initialGroups);

  const filtered = groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  const handleGroupJoined = (groupId: number) => {
    setGroups(groups.filter(g => g.id !== groupId));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-white">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-[#161618] p-6 rounded-2xl border border-white/5 shadow-xl">
        <div className="flex items-center gap-4">
          <Link href="/groups">
            <Button variant="ghost" size="icon" className="hover:bg-white/5">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent">
              Khám phá nhóm
            </h1>
            <p className="text-white/40 text-sm">Tìm kiếm những cộng đồng mới phù hợp với bạn</p>
          </div>
        </div>
      </div>

      <div className="bg-[#161618] p-6 rounded-2xl border border-white/5 shadow-xl space-y-6">
        <div className="flex items-center gap-2 border-b border-white/5 pb-4">
          <div className="relative flex-1">
            <Search className="w-4.5 h-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <Input 
              placeholder="Tìm kiếm nhóm..." 
              className="pl-10 bg-white/5 border-white/10 text-white placeholder-white/40"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <h2 className="text-lg font-semibold text-white/90">Nhóm đề xuất</h2>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            Không tìm thấy nhóm nào phù hợp.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onJoined={() => handleGroupJoined(group.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}