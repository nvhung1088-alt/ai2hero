import { db } from '@/lib/db/drizzle';
import { feedPosts, feedComments, users, socialPages, socialGroups } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import FeedPostCard from '@/components/feed-post/feed-post-card';
import { getUser } from '@/lib/db/queries';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

type Params = Promise<{ postId: string }>;

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const params = await props.params;
  const postId = parseInt(params.postId);
  if (isNaN(postId)) return { title: 'Bài viết không tồn tại' };

  const post = await db.query.feedPosts.findFirst({
    where: eq(feedPosts.id, postId),
    with: { user: true }
  });

  if (!post) return { title: 'Bài viết không tồn tại' };

  let title = post.message.substring(0, 60);
  if (post.message.length > 60) title += '...';
  
  const attachments = Array.isArray(post.attachments) ? post.attachments as any[] : [];
  const image = attachments.find(a => a.type === 'image')?.url;

  return {
    title: `${post.user?.name || 'User'}: ${title}`,
    description: post.message,
    openGraph: {
      title: `${post.user?.name || 'User'}: ${title}`,
      description: post.message,
      images: image ? [image] : undefined,
    }
  };
}

export default async function SinglePostPage(props: { params: Params }) {
  const params = await props.params;
  const postId = parseInt(params.postId);
  if (isNaN(postId)) return notFound();

  const user = await getUser();

  const postEntity = await db.query.feedPosts.findFirst({
    where: eq(feedPosts.id, postId),
    with: {
      user: {
        columns: { id: true, name: true, email: true, role: true }
      },
      page: true,
      group: true,
      comments: { orderBy: desc(feedComments.createdAt) },
      likesList: true
    }
  });

  if (!postEntity) return notFound();

  const likedByMe = user ? postEntity.likesList.some(like => like.userId === user?.id) : false;
  const myReactionType = user ? postEntity.likesList.find(like => like.userId === user?.id)?.reactionType : null;

  const formattedPost = {
    id: postEntity.id,
    type: postEntity.type as any,
    teamId: postEntity.teamId ? `team-${postEntity.teamId}` : 'team-1',
    teamIdNum: postEntity.teamId,
    userId: postEntity.userId,
    userName: postEntity.user?.name || 'Hệ thống',
    userAvatar: '👤',
    userRole: postEntity.user?.role || 'member',
    page: postEntity.page ? { id: postEntity.page.id, name: postEntity.page.name, avatar: postEntity.page.avatarUrl } : undefined,
    group: postEntity.group ? { id: postEntity.group.id, name: postEntity.group.name, coverUrl: postEntity.group.coverUrl } : undefined,
    timestamp: new Date(postEntity.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    date: new Date(postEntity.createdAt).toISOString().split('T')[0],
    createdAt: postEntity.createdAt,
    message: postEntity.message,
    likes: postEntity.likesList.length,
    likesCount: postEntity.likesList.length,
    likedByMe,
    myReactionType,
    comments: postEntity.comments.map(c => ({
      id: c.id,
      userId: c.userId,
      userName: c.userName,
      userAvatar: c.userAvatar,
      content: c.content,
      timestamp: new Date(c.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    })).reverse(),
    mentions: Array.isArray(postEntity.mentions) ? postEntity.mentions : [],
    attachments: Array.isArray(postEntity.attachments) ? postEntity.attachments as any[] : [],
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <FeedPostCard
        post={formattedPost}
        currentUserId={user?.id || 0}
        userRole={user?.role || 'member'}
      />
    </div>
  );
}
