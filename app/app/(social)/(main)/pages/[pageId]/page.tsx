import { notFound } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { PageDetailClient } from './page-detail-client';
import { getPageById, checkPageFollowStatus } from '@/lib/db/social-page-actions';
import { db } from '@/lib/db/drizzle';
import { feedPosts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const revalidate = 0;

interface PageDetailProps {
  params: Promise<{
    pageId: string;
  }>;
}

export default async function PageDetailPage({ params }: PageDetailProps) {
  const resolvedParams = await params;
  const targetPageId = parseInt(resolvedParams.pageId, 10);
  if (isNaN(targetPageId)) {
    notFound();
  }

  const currentUser = await getUser();
  const viewerId = currentUser?.id || 0;

  const pageData = await getPageById(targetPageId);
  if (!pageData) {
    notFound();
  }

  const isAdmin = pageData.ownerId === viewerId;
  const isFollowing = viewerId ? await checkPageFollowStatus(targetPageId, viewerId) : false;

  const rawPosts = await db.query.feedPosts.findMany({
    where: eq(feedPosts.pageId, targetPageId),
    orderBy: [desc(feedPosts.createdAt)],
    with: {
      user: {
        columns: { id: true, name: true, email: true, avatarUrl: true, role: true }
      },
      page: true,
      media: true,
      comments: {
        with: {
          user: { columns: { id: true, name: true, avatarUrl: true } },
          likesList: true
        },
        orderBy: (comments, { asc }) => [asc(comments.createdAt)]
      },
      likesList: true,
      bookmarks: true
    }
  });

  const mappedPosts = rawPosts.map((post) => {
    let likedByMe = false;
    let myReactionType = null;
    const summary: Record<string, number> = {};

    post.likesList.forEach(l => {
      if (viewerId && l.userId === viewerId) {
        likedByMe = true;
        myReactionType = l.reactionType;
      }
      const t = l.reactionType || 'like';
      summary[t] = (summary[t] || 0) + 1;
    });

    let bookmarkedByMe = false;
    if (viewerId) {
      bookmarkedByMe = post.bookmarks.some(b => b.userId === viewerId);
    }

    const mappedComments = post.comments.map(c => {
      let cliked = false;
      let crType = null;
      if (viewerId) {
        const myLike = c.likesList.find(l => l.userId === viewerId);
        if (myLike) {
          cliked = true;
          crType = myLike.reactionType;
        }
      }
      return {
        ...c,
        likedByMe: cliked,
        myReactionType: crType,
        likesCount: c.likesList.length
      };
    });

    return {
      id: post.id,
      type: post.type as any,
      teamId: post.teamId ? `team-${post.teamId}` : 'team-1',
      teamIdNum: post.teamId,
      userId: post.userId,
      userName: post.user?.name || 'Unknown',
      userAvatar: post.user?.avatarUrl || '👤',
      userRole: post.user?.role || 'member',
      page: post.page ? { id: post.page.id, name: post.page.name, avatar: post.page.avatarUrl } : { id: pageData.id, name: pageData.name, avatar: pageData.avatarUrl },
      group: null,
      timestamp: new Date(post.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(post.createdAt).toISOString().split('T')[0],
      createdAt: post.createdAt,
      message: post.message,
      likedByMe,
      myReactionType,
      likesCount: post.likesList.length,
      reactionsSummary: summary,
      commentsCount: mappedComments.length,
      comments: mappedComments,
      bookmarkedByMe,
      media: post.media || [],
      mentions: Array.isArray(post.mentions) ? post.mentions : [],
      attachments: Array.isArray(post.attachments) ? post.attachments as any[] : [],
    };
  });

  return (
    <PageDetailClient 
      currentUser={currentUser}
      pageData={pageData}
      isAdmin={isAdmin}
      isFollowing={isFollowing}
      initialPosts={mappedPosts}
    />
  );
}
