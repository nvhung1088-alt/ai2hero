import { redirect, notFound } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { socialGroups, socialGroupMembers, feedPosts, feedComments, postMedia } from '@/lib/db/schema';
import { eq, and, desc, or } from 'drizzle-orm';
import { GroupFeedClient } from './group-feed-client';

export const revalidate = 0;

export default async function GroupPage(props: { params: Promise<{ groupId: string }> }) {
  const params = await props.params;
  const groupId = parseInt(params.groupId);
  if (isNaN(groupId)) notFound();

  const user = await getUser();
  const viewerId = user ? user.id : 0;

  const group = await db.query.socialGroups.findFirst({
    where: eq(socialGroups.id, groupId)
  });
  if (!group) notFound();

  const membership = await db.query.socialGroupMembers.findFirst({
    where: and(eq(socialGroupMembers.groupId, groupId), eq(socialGroupMembers.userId, viewerId))
  });

  const isMember = viewerId !== 0 && !!membership;
  const role = membership?.role || null;
  const membershipStatus = membership?.status || null;

  // Fetch members
  const membersRaw = await db.query.socialGroupMembers.findMany({
    where: eq(socialGroupMembers.groupId, groupId),
    with: {
      user: {
        columns: { id: true, name: true, email: true, avatarUrl: true }
      }
    }
  });

  const initialMembers = membersRaw.map((m: any) => ({
    id: m.userId,
    name: m.user?.name || 'Người dùng Hero',
    email: m.user?.email || '',
    avatarUrl: m.user?.avatarUrl || null,
    role: m.role,
    status: m.status,
    joinedAt: m.createdAt
  }));

  if (group.privacy === 'private' && !isMember) {
    return (
      <GroupFeedClient 
        user={user} 
        group={group} 
        isMember={isMember} 
        role={role} 
        membershipStatus={membershipStatus}
        initialPosts={[]} 
        initialMembers={[]}
      />
    );
  }

  let postCondition;
  if (role === 'admin' || role === 'moderator') {
    postCondition = eq(feedPosts.groupId, groupId);
  } else {
    postCondition = and(
      eq(feedPosts.groupId, groupId),
      or(eq(feedPosts.status, 'approved'), eq(feedPosts.userId, viewerId))
    );
  }

  // Load posts
  const postsRaw = await db.query.feedPosts.findMany({
    where: postCondition,
    limit: 20,
    orderBy: desc(feedPosts.createdAt),
    with: {
      user: {
        columns: { id: true, name: true, email: true, avatarUrl: true, role: true }
      },
      comments: { orderBy: desc(feedComments.createdAt) },
      likesList: true,
      media: { orderBy: postMedia.sortOrder },
      group: true,
      page: true,
      sharedPost: {
        with: {
          user: { columns: { id: true, name: true, email: true, avatarUrl: true } },
          media: { orderBy: postMedia.sortOrder }
        }
      }
    }
  });

  const mappedPosts = postsRaw.map(post => {
    const likedByMe = viewerId !== 0 && post.likesList.some((like: any) => like.userId === viewerId);
    return {
      id: post.id,
      type: post.type as any,
      teamId: post.teamId ? `team-${post.teamId}` : 'team-1',
      teamIdNum: post.teamId,
      userId: post.userId,
      userName: post.user?.name || 'Hệ thống',
      userAvatar: post.user?.avatarUrl || '👤',
      userRole: post.user?.role || 'member',
      page: post.page ? { id: post.page.id, name: post.page.name, avatar: post.page.avatarUrl } : null,
      group: post.group ? { id: post.group.id, name: post.group.name, coverUrl: post.group.coverUrl } : null,
      timestamp: new Date(post.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(post.createdAt).toISOString().split('T')[0],
      createdAt: post.createdAt,
      message: post.message,
      likesCount: post.likesList.length,
      commentsCount: post.comments.length,
      likedByMe,
      mentions: Array.isArray(post.mentions) ? post.mentions : [],
      attachments: Array.isArray(post.attachments) ? post.attachments as any[] : [],
      comments: post.comments.map(c => ({
        id: c.id,
        userId: c.userId,
        userName: c.userName,
        userAvatar: c.userAvatar,
        content: c.content,
        timestamp: new Date(c.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      })).reverse(),
    };
  });

  return (
    <GroupFeedClient 
      user={user} 
      group={group} 
      isMember={isMember} 
      role={role} 
      membershipStatus={membershipStatus}
      initialPosts={mappedPosts} 
      initialMembers={initialMembers}
    />
  );
}