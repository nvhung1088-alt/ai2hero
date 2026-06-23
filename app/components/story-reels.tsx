'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import Image from 'next/image';
import { StoryCreatorModal } from './story-creator-modal';
import { StoryViewerModal } from './story-viewer-modal';
import { createFeedStoryAction } from '@/app/(login)/actions';
import { showToast } from '@/app/(dashboard)/sim/sim-ui-helpers';

interface StoryReelsProps {
  user: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  initialStories?: any[];
  activeTeamId?: number;
}

export function StoryReels({ user, initialStories = [], activeTeamId }: StoryReelsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewerStoryIndex, setViewerStoryIndex] = useState<number | null>(null);
  const [stories, setStories] = useState<any[]>(initialStories);

  React.useEffect(() => {
    setStories(initialStories);
  }, [initialStories]);
  const handlePostStory = async (data: { type: 'text' | 'photo'; content: string; background?: string }) => {
    try {
      const payload = {
        teamIdString: activeTeamId ? `team-${activeTeamId}` : undefined,
        imageUrl: data.type === 'photo' ? data.content : '',
        textContent: data.type === 'text' ? data.content : '',
        bgClass: data.background,
      };
      
      const res = await createFeedStoryAction(payload);
      if (res.error) {
        showToast(res.error, 'error');
        return;
      }
      
      if (res.story) {
        const newStory = {
          ...res.story,
          user: { name: user.name, avatar: user.avatar }
        };
        setStories([newStory, ...stories]);
        showToast('Đã đăng tin mới thành công!', 'success');
      }
    } catch (err) {
      showToast('Có lỗi xảy ra khi đăng tin.', 'error');
    }
  };

  return (
    <div className="mb-6">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 snap-x">
        {/* Thẻ Tạo Tin */}
        <div 
          onClick={() => setIsModalOpen(true)}
          className="relative w-[112px] h-[200px] shrink-0 rounded-xl overflow-hidden bg-[#242526] border border-white/10 cursor-pointer group snap-start"
        >
          <div className="h-[130px] w-full bg-gray-700 relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt={user.name} className="object-cover w-full h-full opacity-90" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white bg-gradient-to-br from-indigo-500 to-purple-600 opacity-90">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="h-[70px] w-full flex flex-col items-center justify-end pb-3 relative">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center border-4 border-[#242526]">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-semibold text-white">Tạo tin</span>
          </div>
        </div>

        {/* Thẻ Tin của bạn bè */}
        {stories.map((story, index) => (
          <div 
            key={story.id} 
            onClick={() => setViewerStoryIndex(index)}
            className="relative w-[112px] h-[200px] shrink-0 rounded-xl overflow-hidden bg-gray-800 border border-white/10 cursor-pointer group snap-start"
          >
            {story.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={story.imageUrl} alt="Story" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <div className={`w-full h-full ${story.bgClass || 'bg-gray-800'} flex items-center justify-center p-3`}>
                <span className="text-white font-bold text-xs text-center line-clamp-4 break-words">
                  {story.textContent}
                </span>
              </div>
            )}
            
            {/* Overlay gradient tối đáy */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 z-0" />

            {/* Avatar góc trái */}
            <div className="absolute top-3 left-3 w-10 h-10 rounded-full border-4 border-blue-500 overflow-hidden bg-gray-700 z-10">
              {story.user?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={story.user.avatar} alt={story.user.name} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white bg-indigo-500">
                  {story.user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            
            <div className="absolute bottom-3 left-3 right-3 z-10">
              <span className="text-xs font-semibold text-white drop-shadow-md line-clamp-1">
                {story.user?.name || 'User'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <StoryCreatorModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        user={user}
        onPostStory={handlePostStory}
      />

      <StoryViewerModal
        isOpen={viewerStoryIndex !== null}
        onClose={() => setViewerStoryIndex(null)}
        stories={stories}
        initialStoryIndex={viewerStoryIndex ?? 0}
        currentUser={user}
      />
    </div>
  );
}
