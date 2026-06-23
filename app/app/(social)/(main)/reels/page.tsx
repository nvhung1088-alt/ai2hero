import { notFound, redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { ReelsClient } from './reels-client';
import { getSuggestedReelsAction } from '@/lib/db/social-reels-actions';

export const revalidate = 0;

export default async function ReelsPage() {
  const currentUser = await getUser();

  // Mock data cho danh sách Reels
  const mockReels = [
    {
      id: 'r1',
      videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop',
      caption: 'Testing the new Facebook Reels clone feature on Ai2Hero platform! 🚀 #ai2hero #reels #coding',
      musicInfo: 'Original Audio - Ai2Hero Official',
      likesCount: 15400,
      commentsCount: 234,
      sharesCount: 105,
      creator: {
        id: 1,
        name: 'Hưng Nguyễn',
        username: 'hungnguyen',
        avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop',
      },
      isLiked: false,
      isSaved: false
    },
    {
      id: 'r2',
      videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1620165362092-d044df3e5341?q=80&w=1000&auto=format&fit=crop',
      caption: 'Look at this amazing scenery! Pure beauty. 🌲🏔️ #nature #travel',
      musicInfo: 'Trending Song - Epic Music',
      likesCount: 8900,
      commentsCount: 412,
      sharesCount: 88,
      creator: {
        id: 2,
        name: 'Elena Smith',
        username: 'elena_s',
        avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop',
      },
      isLiked: true,
      isSaved: false
    },
    {
      id: 'r3',
      videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?q=80&w=1000&auto=format&fit=crop',
      caption: 'Funny moments compiled. Wait for the end 😂 #funny #lol',
      musicInfo: 'Comedy Mix - DJ Laugh',
      likesCount: 45200,
      commentsCount: 1205,
      sharesCount: 4500,
      creator: {
        id: 3,
        name: 'Comedy Central',
        username: 'comedy_c',
        avatarUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop',
      },
      isLiked: false,
      isSaved: true
    }
  ];

  const { data: realReels } = await getSuggestedReelsAction(10);

  const formattedRealReels = (realReels || []).map(r => ({
    id: r.id.toString(),
    videoUrl: r.url,
    thumbnailUrl: r.image,
    caption: r.title,
    musicInfo: 'Original Audio',
    likesCount: Math.floor(Math.random() * 100), // Tạm mock
    commentsCount: Math.floor(Math.random() * 50),
    sharesCount: 0,
    creator: {
      id: 0,
      name: r.userName || 'Anonymous',
      username: (r.userName || 'user').toLowerCase().replace(' ', ''),
      avatarUrl: r.userAvatar || '/placeholder-user.jpg',
    },
    isLiked: false,
    isSaved: false
  }));

  // Gộp real reels và mock reels
  const combinedReels = formattedRealReels.length > 0 ? formattedRealReels : mockReels;

  return <ReelsClient currentUser={currentUser} initialReels={combinedReels} />;
}
