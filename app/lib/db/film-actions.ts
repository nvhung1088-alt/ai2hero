'use server';

import { db } from '@/lib/db/drizzle';
import { 
  filmSeries, 
  filmEpisodes, 
  filmWatchHistory, 
  filmBookmarks, 
  filmRatings, 
  filmTransactions,
  filmReports,
  feedPosts,
  feedLikes,
  feedComments,
  teams,
  users
} from '@/lib/db/schema';
import { eq, and, or, desc, sql, asc, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getUser } from '@/lib/db/queries';
import { dispatchMvpFeedPost } from '@/lib/db/feed-dispatcher';

// ═══════════════════════════════════════════════════════
// PUBLIC VIEWER ACTIONS (iSocial /film)
// ═══════════════════════════════════════════════════════

/**
 * Lấy số dư Token của User
 */
export async function getUserBalanceAction() {
  const user = await getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  try {
    const userData = await db.select({ balance: users.balance }).from(users).where(eq(users.id, user.id)).limit(1);
    return { success: true, balance: userData[0]?.balance || 0 };
  } catch (error) {
    console.error('Error in getUserBalanceAction:', error);
    return { success: false, error: 'Failed to fetch balance' };
  }
}

/**
 * Lấy danh sách phim cho người xem (Discover)
 */
export async function getViewerSeriesAction(genre?: string, search?: string) {
  try {
    let conditions = [];
    
    // Chỉ hiển thị phim đã xuất bản (publishing hoặc completed)
    conditions.push(sql`${filmSeries.status} IN ('publishing', 'completed')`);

    if (genre && genre !== 'all') {
      conditions.push(or(
        eq(filmSeries.genre, genre),
        sql`${filmSeries.tags}::jsonb ? ${genre}`
      ));
    }

    if (search) {
      conditions.push(sql`${filmSeries.title} ILIKE ${'%' + search + '%'}`);
    }

    const result = await db
      .select()
      .from(filmSeries)
      .where(and(...conditions))
      .orderBy(desc(filmSeries.isFeatured), desc(filmSeries.viewCount), desc(filmSeries.createdAt));

    if (result.length > 0) {
      const eps = await db.query.filmEpisodes.findMany({
        where: eq(filmEpisodes.episodeNumber, 1)
      });
      return result.map(s => {
        const ep = eps.find(e => e.seriesId === s.id);
        return { ...s, duration: ep?.duration || 0 };
      });
    }

    return result;
  } catch (error) {
    console.error('Error in getViewerSeriesAction:', error);
    return [];
  }
}

/**
 * Lấy chi tiết phim và danh sách các tập phim cho viewer
 */
export async function getViewerSeriesDetailAction(identifier: number | string, userId?: number) {
  try {
    const whereClause = typeof identifier === 'number'
      ? eq(filmSeries.id, identifier)
      : eq(filmSeries.slug, identifier);

    const series = await db.query.filmSeries.findFirst({
      where: whereClause,
    });

    if (!series) return null;
    
    const seriesId = series.id;

    const episodes = await db.query.filmEpisodes.findMany({
      where: and(eq(filmEpisodes.seriesId, seriesId), inArray(filmEpisodes.status, ['published', 'publishing'])),
      orderBy: [asc(filmEpisodes.episodeNumber)],
    });

    // Lấy thông tin bookmark, likes & transactions của user hiện tại
    let isBookmarked = false;
    let isLiked = false;
    let unlockedEpisodeIds: number[] = [];

    if (userId) {
      const bookmark = await db.query.filmBookmarks.findFirst({
        where: and(eq(filmBookmarks.userId, userId), eq(filmBookmarks.seriesId, seriesId)),
      });
      isBookmarked = !!bookmark;

      if (series.feedPostId) {
        const likeRecord = await db
          .select()
          .from(feedLikes)
          .where(and(eq(feedLikes.postId, series.feedPostId), eq(feedLikes.userId, userId)))
          .limit(1);
        isLiked = likeRecord.length > 0;
      }

      const transactions = await db.query.filmTransactions.findMany({
        where: and(eq(filmTransactions.userId, userId), eq(filmTransactions.seriesId, seriesId)),
        columns: { episodeId: true },
      });
      unlockedEpisodeIds = transactions.map(t => t.episodeId);
    }

    // Tính điểm đánh giá trung bình
    const ratingsResult = await db
      .select({
        avgRating: sql<number>`COALESCE(AVG(${filmRatings.rating}), 0)`,
        count: sql<number>`COUNT(${filmRatings.id})`
      })
      .from(filmRatings)
      .where(eq(filmRatings.seriesId, seriesId));
    
    const avgRating = ratingsResult[0]?.avgRating || 0;
    const ratingCount = ratingsResult[0]?.count || 0;

    return {
      series: {
        ...series,
        avgRating: Math.round(avgRating * 10) / 10,
        ratingCount,
      },
      episodes,
      isBookmarked,
      isLiked,
      unlockedEpisodeIds,
    };
  } catch (error) {
    console.error('Error in getViewerSeriesDetailAction:', error);
    return null;
  }
}

/**
 * Lưu/Hủy bookmark phim
 */
export async function toggleBookmarkAction(seriesId: number) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  try {
    const existing = await db.query.filmBookmarks.findFirst({
      where: and(eq(filmBookmarks.userId, user.id), eq(filmBookmarks.seriesId, seriesId)),
    });

    if (existing) {
      await db.delete(filmBookmarks).where(eq(filmBookmarks.id, existing.id));
      return { bookmarked: false };
    } else {
      await db.insert(filmBookmarks).values({
        userId: user.id,
        seriesId,
      });
      return { bookmarked: true };
    }
  } catch (error) {
    console.error('Error in toggleBookmarkAction:', error);
    throw error;
  }
}

/**
 * Đánh giá phim (Rating)
 */
export async function rateFilmAction(seriesId: number, rating: number, comment?: string) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  if (rating < 1 || rating > 5) throw new Error('Invalid rating');

  try {
    const existing = await db.query.filmRatings.findFirst({
      where: and(eq(filmRatings.userId, user.id), eq(filmRatings.seriesId, seriesId)),
    });

    if (existing) {
      await db
        .update(filmRatings)
        .set({ rating, comment, createdAt: new Date() })
        .where(eq(filmRatings.id, existing.id));
    } else {
      await db.insert(filmRatings).values({
        userId: user.id,
        seriesId,
        rating,
        comment,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error in rateFilmAction:', error);
    throw error;
  }
}

/**
 * Xem lịch sử bookmark của user
 */
export async function getBookmarkedSeriesAction() {
  const user = await getUser();
  if (!user) return [];

  try {
    const bookmarks = await db
      .select({
        series: filmSeries,
      })
      .from(filmBookmarks)
      .innerJoin(filmSeries, eq(filmBookmarks.seriesId, filmSeries.id))
      .where(eq(filmBookmarks.userId, user.id))
      .orderBy(desc(filmBookmarks.createdAt));

    return bookmarks.map(b => b.series);
  } catch (error) {
    console.error('Error in getBookmarkedSeriesAction:', error);
    return [];
  }
}

/**
 * Ghi nhận lịch sử xem phim
 */
export async function saveWatchHistoryAction(data: {
  seriesId: number;
  episodeId: number;
  teamId: number;
  watchedSeconds: number;
  isCompleted: boolean;
}) {
  const user = await getUser();
  if (!user) return { success: false };

  try {
    // Tăng lượt xem cho series & episode nếu là lượt xem mới hoặc hoàn thành
    if (data.isCompleted) {
      await db
        .update(filmSeries)
        .set({ viewCount: sql`${filmSeries.viewCount} + 1` })
        .where(eq(filmSeries.id, data.seriesId));

      await db
        .update(filmEpisodes)
        .set({ viewCount: sql`${filmEpisodes.viewCount} + 1` })
        .where(eq(filmEpisodes.id, data.episodeId));
    }

    const existing = await db.query.filmWatchHistory.findFirst({
      where: and(
        eq(filmWatchHistory.userId, user.id),
        eq(filmWatchHistory.episodeId, data.episodeId)
      ),
    });

    if (existing) {
      await db
        .update(filmWatchHistory)
        .set({
          watchedSeconds: Math.max(existing.watchedSeconds, data.watchedSeconds),
          isCompleted: existing.isCompleted || data.isCompleted,
          updatedAt: new Date(),
        })
        .where(eq(filmWatchHistory.id, existing.id));
    } else {
      await db.insert(filmWatchHistory).values({
        userId: user.id,
        seriesId: data.seriesId,
        episodeId: data.episodeId,
        teamId: data.teamId,
        watchedSeconds: data.watchedSeconds,
        isCompleted: data.isCompleted,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error in saveWatchHistoryAction:', error);
    return { success: false };
  }
}

/**
 * Mở khóa tập phim bằng Token
 */
export async function unlockEpisodeAction(seriesId: number, episodeId: number) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  try {
    return await db.transaction(async (tx) => {
      // 1. Kiểm tra xem tập phim này đã mở khóa chưa
      const existingTx = await tx.query.filmTransactions.findFirst({
        where: and(
          eq(filmTransactions.userId, user.id),
          eq(filmTransactions.episodeId, episodeId)
        ),
      });

      if (existingTx) {
        return { success: true, message: 'Đã mở khóa từ trước.' };
      }

      // 2. Lấy thông tin tập phim và team đăng phim
      const episode = await tx.query.filmEpisodes.findFirst({
        where: eq(filmEpisodes.id, episodeId),
      });

      if (!episode) throw new Error('Episode not found');

      const tokenPrice = episode.tokenPrice || 0;
      const creatorTeamId = episode.teamId;

      // 3. Xử lý trừ token nếu phim tính phí
      if (!episode.isFree && tokenPrice > 0) {
        const userData = await tx.select({ balance: users.balance }).from(users).where(eq(users.id, user.id)).limit(1);
        const currentBalance = userData[0]?.balance || 0;
        
        if (currentBalance < tokenPrice) {
          throw new Error('Số dư token không đủ. Vui lòng nạp thêm.');
        }

        await tx.update(users)
          .set({ balance: currentBalance - tokenPrice })
          .where(eq(users.id, user.id));
      }

      // 4. Thực hiện ghi log giao dịch chia sẻ doanh thu 70/30
      const creatorAmount = Math.floor(tokenPrice * 0.7);
      const platformAmount = tokenPrice - creatorAmount;

      await tx.insert(filmTransactions).values({
        userId: user.id,
        seriesId,
        episodeId,
        creatorTeamId,
        tokenAmount: tokenPrice,
        creatorAmount,
        platformAmount,
      });

      return { success: true, message: 'Mở khóa thành công tập phim!' };
    });
  } catch (error: any) {
    console.error('Error in unlockEpisodeAction:', error);
    return { success: false, error: error.message || 'Lỗi hệ thống' };
  }
}


// ═══════════════════════════════════════════════════════
// CREATOR CMS ACTIONS (Dashboard /hero-film/t/[teamId]/...)
// ═══════════════════════════════════════════════════════

/**
 * Lấy danh sách phim thuộc sở hữu của team
 */
export async function getCreatorSeriesAction(teamId: number, page: number = 1, limit: number = 12) {
  try {
    const offset = (page - 1) * limit;

    const countResult = await db.select({ count: sql`count(*)` }).from(filmSeries).where(eq(filmSeries.teamId, teamId));
    const totalItems = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(totalItems / limit);

    const seriesList = await db.query.filmSeries.findMany({
      where: eq(filmSeries.teamId, teamId),
      orderBy: [desc(filmSeries.createdAt)],
      limit: limit,
      offset: offset
    });
    
    // Nếu không có series nào, mảng rỗng thì eps cũng rỗng
    let data: any[] = [];
    if (seriesList.length > 0) {
      const eps = await db.query.filmEpisodes.findMany({
        where: eq(filmEpisodes.teamId, teamId)
      });
  
      data = seriesList.map(s => {
        const ep = eps.find(e => e.seriesId === s.id && e.episodeNumber === 1);
        return { ...s, duration: ep?.duration || 0 };
      });
    }

    return {
      data,
      totalPages,
      currentPage: page,
      totalItems
    };
  } catch (error) {
    console.error('Error in getCreatorSeriesAction:', error);
    return { data: [], totalPages: 1, currentPage: 1, totalItems: 0 };
  }
}

/**
 * Tạo phim mới
 */
export async function createSeriesAction(teamId: number, data: {
  title: string;
  description?: string;
  coverUrl?: string;
  bannerUrl?: string;
  genre?: string;
  tags?: string[];
  totalFreeEpisodes?: number;
}) {
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  try {
    const [newSeries] = await db.insert(filmSeries).values({
      teamId,
      creatorId: user.id,
      title: data.title,
      description: data.description,
      coverUrl: data.coverUrl,
      bannerUrl: data.bannerUrl,
      genre: data.genre || 'romance',
      tags: data.tags || [],
      totalFreeEpisodes: data.totalFreeEpisodes || 0,
      totalEpisodes: 0,
      status: 'draft',
    }).returning();

    revalidatePath(`/hero-film/t/${teamId}/series`);
    return { success: true, series: newSeries };
  } catch (error) {
    console.error('Error in createSeriesAction:', error);
    throw error;
  }
}

/**
 * Cập nhật phim
 */
export async function updateSeriesAction(seriesId: number, teamId: number, data: {
  title: string;
  description?: string;
  coverUrl?: string;
  bannerUrl?: string;
  genre?: string;
  tags?: string[];
  totalFreeEpisodes?: number;
  status?: 'draft' | 'publishing' | 'completed' | 'archived';
}) {
  try {
    await db
      .update(filmSeries)
      .set({
        title: data.title,
        description: data.description,
        coverUrl: data.coverUrl,
        bannerUrl: data.bannerUrl,
        genre: data.genre,
        tags: data.tags,
        totalFreeEpisodes: data.totalFreeEpisodes,
        status: data.status,
        updatedAt: new Date(),
      })
      .where(and(eq(filmSeries.id, seriesId), eq(filmSeries.teamId, teamId)));

    if (data.status === 'publishing') {
      try {
        await publishFilmToFeedAction(seriesId, teamId);
      } catch (feedErr) {
        console.error('Failed to auto-publish film to feed in updateSeriesAction:', feedErr);
      }
    }

    revalidatePath(`/hero-film/t/${teamId}/series`);
    revalidatePath(`/hero-film/t/${teamId}/series/${seriesId}`);
    revalidatePath('/film');
    return { success: true };
  } catch (error) {
    console.error('Error in updateSeriesAction:', error);
    throw error;
  }
}

/**
 * Xóa phim
 */
export async function deleteSeriesAction(seriesId: number, teamId: number) {
  try {
    await db
      .delete(filmSeries)
      .where(and(eq(filmSeries.id, seriesId), eq(filmSeries.teamId, teamId)));

    revalidatePath(`/hero-film/t/${teamId}/series`);
    return { success: true };
  } catch (error) {
    console.error('Error in deleteSeriesAction:', error);
    throw error;
  }
}

/**
 * Bật/tắt trạng thái phát sóng phim
 */
export async function toggleSeriesStatusAction(seriesId: number, teamId: number, currentStatus: string) {
  const newStatus = currentStatus === 'publishing' ? 'draft' : 'publishing';
  try {
    await db
      .update(filmSeries)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(and(eq(filmSeries.id, seriesId), eq(filmSeries.teamId, teamId)));

    // Tự động đẩy lên feed nếu đổi sang trạng thái phát sóng
    if (newStatus === 'publishing') {
      try {
        await publishFilmToFeedAction(seriesId, teamId);
      } catch (feedErr) {
        console.error('Failed to auto-publish film to feed:', feedErr);
      }
    }

    revalidatePath(`/hero-film/t/${teamId}/series`);
    revalidatePath('/film');
    return { success: true, newStatus };
  } catch (error) {
    console.error('Error in toggleSeriesStatusAction:', error);
    throw error;
  }
}

/**
 * Lấy danh sách các tập phim
 */
export async function getSeriesEpisodesAction(seriesId: number, teamId: number) {
  try {
    return await db.query.filmEpisodes.findMany({
      where: and(eq(filmEpisodes.seriesId, seriesId), eq(filmEpisodes.teamId, teamId)),
      orderBy: [asc(filmEpisodes.episodeNumber)],
    });
  } catch (error) {
    console.error('Error in getSeriesEpisodesAction:', error);
    return [];
  }
}

/**
 * Tạo/Thêm tập phim mới
 */
export async function createEpisodeAction(seriesId: number, teamId: number, data: {
  episodeNumber: number;
  title?: string;
  videoUrl: string;
  videoSource: 'direct' | 'youtube' | 'facebook';
  thumbnailUrl?: string;
  duration?: number;
  isFree?: boolean;
  tokenPrice?: number;
}) {
  try {
    // 1. Chèn tập mới
    const [newEpisode] = await db.insert(filmEpisodes).values({
      seriesId,
      teamId,
      episodeNumber: data.episodeNumber,
      title: data.title || `Tập ${data.episodeNumber}`,
      videoUrl: data.videoUrl,
      videoSource: data.videoSource,
      thumbnailUrl: data.thumbnailUrl,
      duration: data.duration || 0,
      isFree: data.isFree ?? true,
      tokenPrice: data.tokenPrice || 0,
      status: 'published', // Mặc định publish tập mới luôn
    }).returning();

    // 2. Cập nhật lại số tập của Series phim
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(filmEpisodes)
      .where(eq(filmEpisodes.seriesId, seriesId));

    const totalCount = countResult[0]?.count || 0;
    
    await db
      .update(filmSeries)
      .set({ totalEpisodes: Number(totalCount), updatedAt: new Date() })
      .where(eq(filmSeries.id, seriesId));

    revalidatePath(`/hero-film/t/${teamId}/series/${seriesId}/episodes`);
    return { success: true, episode: newEpisode };
  } catch (error) {
    console.error('Error in createEpisodeAction:', error);
    throw error;
  }
}

/**
 * Cập nhật tập phim
 */
export async function updateEpisodeAction(episodeId: number, teamId: number, data: {
  episodeNumber: number;
  title?: string;
  videoUrl: string;
  videoSource: 'direct' | 'youtube' | 'facebook';
  thumbnailUrl?: string;
  duration?: number;
  isFree?: boolean;
  tokenPrice?: number;
  status?: 'draft' | 'published' | 'hidden';
}) {
  try {
    const [updatedEpisode] = await db
      .update(filmEpisodes)
      .set({
        episodeNumber: data.episodeNumber,
        title: data.title,
        videoUrl: data.videoUrl,
        videoSource: data.videoSource,
        thumbnailUrl: data.thumbnailUrl,
        duration: data.duration,
        isFree: data.isFree,
        tokenPrice: data.tokenPrice,
        status: data.status,
        updatedAt: new Date(),
      })
      .where(and(eq(filmEpisodes.id, episodeId), eq(filmEpisodes.teamId, teamId)))
      .returning();

    revalidatePath(`/hero-film/t/${teamId}/series/${updatedEpisode.seriesId}/episodes`);
    return { success: true, episode: updatedEpisode };
  } catch (error) {
    console.error('Error in updateEpisodeAction:', error);
    throw error;
  }
}

/**
 * Xóa tập phim
 */
export async function deleteEpisodeAction(episodeId: number, teamId: number) {
  try {
    const episode = await db.query.filmEpisodes.findFirst({
      where: and(eq(filmEpisodes.id, episodeId), eq(filmEpisodes.teamId, teamId)),
    });

    if (!episode) throw new Error('Episode not found');

    const seriesId = episode.seriesId;

    await db
      .delete(filmEpisodes)
      .where(and(eq(filmEpisodes.id, episodeId), eq(filmEpisodes.teamId, teamId)));

    // Cập nhật lại số lượng tập
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(filmEpisodes)
      .where(eq(filmEpisodes.seriesId, seriesId));

    const totalCount = countResult[0]?.count || 0;
    
    await db
      .update(filmSeries)
      .set({ totalEpisodes: Number(totalCount), updatedAt: new Date() })
      .where(eq(filmSeries.id, seriesId));

    revalidatePath(`/hero-film/t/${teamId}/series/${seriesId}/episodes`);
    return { success: true };
  } catch (error) {
    console.error('Error in deleteEpisodeAction:', error);
    throw error;
  }
}

/**
 * Lấy báo cáo doanh thu của Team Creator
 */
export async function getRevenueReportAction(teamId: number) {
  try {
    // 1. Tổng doanh thu token tích lũy từ các giao dịch mua phim của team này
    const totalResult = await db
      .select({
        totalToken: sql<number>`COALESCE(SUM(${filmTransactions.tokenAmount}), 0)`,
        creatorToken: sql<number>`COALESCE(SUM(${filmTransactions.creatorAmount}), 0)`,
        platformToken: sql<number>`COALESCE(SUM(${filmTransactions.platformAmount}), 0)`,
        transactionCount: sql<number>`COUNT(${filmTransactions.id})`,
      })
      .from(filmTransactions)
      .where(eq(filmTransactions.creatorTeamId, teamId));

    // 2. Chi tiết doanh thu theo từng phim (series)
    const seriesRevenue = await db
      .select({
        seriesId: filmSeries.id,
        title: filmSeries.title,
        coverUrl: filmSeries.coverUrl,
        totalToken: sql<number>`COALESCE(SUM(${filmTransactions.tokenAmount}), 0)`,
        creatorToken: sql<number>`COALESCE(SUM(${filmTransactions.creatorAmount}), 0)`,
        purchasesCount: sql<number>`COUNT(${filmTransactions.id})`,
      })
      .from(filmSeries)
      .leftJoin(filmTransactions, eq(filmSeries.id, filmTransactions.seriesId))
      .where(eq(filmSeries.teamId, teamId))
      .groupBy(filmSeries.id)
      .orderBy(desc(sql`COALESCE(SUM(${filmTransactions.tokenAmount}), 0)`));

    // 3. 10 Giao dịch gần nhất
    const recentTransactions = await db
      .select({
        id: filmTransactions.id,
        episodeTitle: filmEpisodes.title,
        episodeNumber: filmEpisodes.episodeNumber,
        seriesTitle: filmSeries.title,
        tokenAmount: filmTransactions.tokenAmount,
        creatorAmount: filmTransactions.creatorAmount,
        createdAt: filmTransactions.createdAt,
        userEmail: users.email,
      })
      .from(filmTransactions)
      .innerJoin(filmEpisodes, eq(filmTransactions.episodeId, filmEpisodes.id))
      .innerJoin(filmSeries, eq(filmTransactions.seriesId, filmSeries.id))
      .innerJoin(users, eq(filmTransactions.userId, users.id))
      .where(eq(filmTransactions.creatorTeamId, teamId))
      .orderBy(desc(filmTransactions.createdAt))
      .limit(10);

    return {
      totals: totalResult[0] || { totalToken: 0, creatorToken: 0, platformToken: 0, transactionCount: 0 },
      seriesRevenue,
      recentTransactions,
    };
  } catch (error) {
    console.error('Error in getRevenueReportAction:', error);
    return {
      totals: { totalToken: 0, creatorToken: 0, platformToken: 0, transactionCount: 0 },
      seriesRevenue: [],
      recentTransactions: [],
    };
  }
}

/**
 * Seed phim mẫu ban đầu (Discover & Play)
 */
export async function seedInitialFilmsAction(teamId: number) {
  const user = await getUser();
  const creatorId = user ? user.id : null;

  try {
    // Kiểm tra xem đã có phim nào chưa
    const existing = await db.query.filmSeries.findFirst();
    if (existing) {
      return { success: true, message: 'Đã có phim trong hệ thống, không cần seed.' };
    }

    const mockFilms = [
      {
        title: 'Quyết Chiến Đường Phố',
        description: 'Câu chuyện về một võ sĩ đường phố đấu tranh cứu vớt phòng gym của gia đình và tìm thấy tình yêu đích thực.',
        coverUrl: 'https://images.unsplash.com/photo-1549576490-b0b4831da60a?w=500&auto=format&fit=crop&q=80',
        bannerUrl: 'https://images.unsplash.com/photo-1549576490-b0b4831da60a?w=1200&auto=format&fit=crop&q=80',
        genre: 'action',
        tags: ['Võ thuật', 'Hành động', 'Đường phố'],
        totalEpisodes: 3,
        totalFreeEpisodes: 2,
        episodes: [
          {
            episodeNumber: 1,
            title: 'Trận đấu định mệnh',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            videoSource: 'direct' as const,
            isFree: true,
            tokenPrice: 0,
            duration: 15,
            thumbnailUrl: 'https://images.unsplash.com/photo-1549576490-b0b4831da60a?w=500&auto=format&fit=crop&q=80',
          },
          {
            episodeNumber: 2,
            title: 'Sóng gió nổi lên',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            videoSource: 'direct' as const,
            isFree: true,
            tokenPrice: 0,
            duration: 15,
            thumbnailUrl: 'https://images.unsplash.com/photo-1549576490-b0b4831da60a?w=500&auto=format&fit=crop&q=80',
          },
          {
            episodeNumber: 3,
            title: 'Trận chung kết đỉnh cao (Premium)',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
            videoSource: 'direct' as const,
            isFree: false,
            tokenPrice: 10,
            duration: 15,
            thumbnailUrl: 'https://images.unsplash.com/photo-1549576490-b0b4831da60a?w=500&auto=format&fit=crop&q=80',
          }
        ]
      },
      {
        title: 'Tổng Tài Kiêu Ngạo Và Cô Nàng Nhí Nhảnh',
        description: 'Mối tình hài hước nhưng ngọt ngào giữa tổng tài tập đoàn đá quý nổi tiếng và cô phóng viên thực tập tài ba.',
        coverUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80',
        bannerUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&auto=format&fit=crop&q=80',
        genre: 'romance',
        tags: ['Ngôn tình', 'Tổng tài', 'Hài hước'],
        totalEpisodes: 3,
        totalFreeEpisodes: 1,
        episodes: [
          {
            episodeNumber: 1,
            title: 'Oan gia ngõ hẹp',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
            videoSource: 'direct' as const,
            isFree: true,
            tokenPrice: 0,
            duration: 15,
            thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80',
          },
          {
            episodeNumber: 2,
            title: 'Mượn danh bạn gái',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
            videoSource: 'direct' as const,
            isFree: false,
            tokenPrice: 5,
            duration: 15,
            thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80',
          },
          {
            episodeNumber: 3,
            title: 'Tỏ tình bất ngờ',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
            videoSource: 'direct' as const,
            isFree: false,
            tokenPrice: 5,
            duration: 15,
            thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80',
          }
        ]
      },
      {
        title: 'Lời Nguyền Lúc Nửa Đêm',
        description: 'Một bộ phim giật gân, bí ẩn xoay quanh lời nguyền của một ngôi biệt thự cổ hoang phế nằm sâu trong rừng thẳm.',
        coverUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=500&auto=format&fit=crop&q=80',
        bannerUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=1200&auto=format&fit=crop&q=80',
        genre: 'thriller',
        tags: ['Kinh dị', 'Bí ẩn', 'Giật gân'],
        totalEpisodes: 2,
        totalFreeEpisodes: 1,
        episodes: [
          {
            episodeNumber: 1,
            title: 'Ngôi nhà hoang dã',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
            videoSource: 'direct' as const,
            isFree: true,
            tokenPrice: 0,
            duration: 10,
            thumbnailUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=500&auto=format&fit=crop&q=80',
          },
          {
            episodeNumber: 2,
            title: 'Tiếng thét trong đêm (Premium)',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
            videoSource: 'direct' as const,
            isFree: false,
            tokenPrice: 8,
            duration: 10,
            thumbnailUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=500&auto=format&fit=crop&q=80',
          }
        ]
      },
      {
        title: 'Chủ Tịch Giả Danh (Test Dọc)',
        description: 'Bộ phim ngắn có khung hình dọc chuyên để test UI giao diện điện thoại.',
        coverUrl: 'https://images.unsplash.com/photo-1627854617488-8254b1f4fa01?w=500&auto=format&fit=crop&q=80',
        bannerUrl: 'https://images.unsplash.com/photo-1627854617488-8254b1f4fa01?w=1200&auto=format&fit=crop&q=80',
        genre: 'drama',
        tags: ['Drama', 'Chủ tịch', 'Short'],
        totalEpisodes: 3,
        totalFreeEpisodes: 1,
        episodes: [
          {
            episodeNumber: 1,
            title: 'Tập 1 - Bắt đầu',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            videoSource: 'direct' as const,
            isFree: true,
            tokenPrice: 0,
            duration: 12,
            thumbnailUrl: 'https://images.unsplash.com/photo-1627854617488-8254b1f4fa01?w=500&auto=format&fit=crop&q=80',
          },
          {
            episodeNumber: 2,
            title: 'Tập 2 - Gay cấn',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
            videoSource: 'direct' as const,
            isFree: false,
            tokenPrice: 5,
            duration: 10,
            thumbnailUrl: 'https://images.unsplash.com/photo-1627854617488-8254b1f4fa01?w=500&auto=format&fit=crop&q=80',
          },
          {
            episodeNumber: 3,
            title: 'Tập 3 - Kết thúc',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            videoSource: 'direct' as const,
            isFree: false,
            tokenPrice: 10,
            duration: 15,
            thumbnailUrl: 'https://images.unsplash.com/photo-1627854617488-8254b1f4fa01?w=500&auto=format&fit=crop&q=80',
          }
        ]
      }
    ];

    for (const film of mockFilms) {
      const [insertedSeries] = await db.insert(filmSeries).values({
        teamId,
        creatorId,
        title: film.title,
        description: film.description,
        coverUrl: film.coverUrl,
        bannerUrl: film.bannerUrl,
        genre: film.genre,
        tags: film.tags,
        totalEpisodes: film.totalEpisodes,
        totalFreeEpisodes: film.totalFreeEpisodes,
        status: 'publishing', // Bật phát sóng luôn cho phim mẫu
      }).returning();

      for (const ep of film.episodes) {
        await db.insert(filmEpisodes).values({
          seriesId: insertedSeries.id,
          teamId,
          episodeNumber: ep.episodeNumber,
          title: ep.title,
          videoUrl: ep.videoUrl,
          videoSource: ep.videoSource,
          duration: ep.duration,
          isFree: ep.isFree,
          tokenPrice: ep.tokenPrice,
          thumbnailUrl: ep.thumbnailUrl,
          status: 'published',
        });
      }
    }

    return { success: true, message: 'Đã seed phim mẫu thành công!' };
  } catch (error) {
    console.error('Error seeding mock films:', error);
    return { success: false, error: 'Lỗi seed dữ liệu' };
  }
}

// ═══════════════════════════════════════════════════════
// PHASE 2 ACTIONS: FEED INTEGRATION, LIKES, REPORTS
// ═══════════════════════════════════════════════════════

/**
 * Đẩy phim ngắn lên iSocial Feed bài đăng
 */
export async function publishFilmToFeedAction(seriesId: number, teamId: number) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    const [series] = await db
      .select()
      .from(filmSeries)
      .where(eq(filmSeries.id, seriesId))
      .limit(1);

    if (!series) {
      return { success: false, error: 'Không tìm thấy phim' };
    }

    // Nếu đã có bài feed liên kết thì không tạo mới
    if (series.feedPostId) {
      return { success: true, postId: series.feedPostId };
    }

    const preview = JSON.stringify({
      seriesId: series.id,
      slug: series.slug,
      title: series.title,
      coverUrl: series.coverUrl,
      genre: series.genre,
      totalEpisodes: series.totalEpisodes,
    });

    const attachments = [];
    if (series.coverUrl) {
      attachments.push({
        type: 'image' as const,
        url: series.coverUrl,
        fileName: 'cover.jpg'
      });
    }

    const result = await dispatchMvpFeedPost({
      teamId,
      userId: user.id,
      type: 'film_publish',
      appId: 'hero-film',
      message: `🎬 Tôi vừa xuất bản bộ phim ngắn mới: "${series.title}" (${series.genre ? series.genre.toUpperCase() : 'Phim Ngắn'}). Mời các bạn cùng đón xem và ủng hộ!`,
      resultPreview: preview,
      attachments
    });

    if (result.success && result.postId) {
      await db
        .update(filmSeries)
        .set({ feedPostId: result.postId, updatedAt: new Date() })
        .where(eq(filmSeries.id, seriesId));
      
      return { success: true, postId: result.postId };
    }

    return { success: false, error: result.error || 'Lỗi đẩy lên feed' };
  } catch (error: any) {
    console.error('Lỗi publish phim lên feed:', error);
    return { success: false, error: error.message || 'Lỗi hệ thống' };
  }
}

/**
 * Thả tim/Yêu thích phim (Tích hợp feedLikes để dùng chung với feed post)
 */
export async function toggleFilmLikeAction(seriesId: number) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    const [series] = await db
      .select()
      .from(filmSeries)
      .where(eq(filmSeries.id, seriesId))
      .limit(1);

    if (!series) {
      return { success: false, error: 'Không tìm thấy phim' };
    }

    // Auto publish to feed if missing to ensure we have a post for likes
    let postId = series.feedPostId;
    if (!postId) {
      const publishResult = await publishFilmToFeedAction(seriesId, series.teamId);
      if (publishResult.success && publishResult.postId) {
        postId = publishResult.postId;
      } else {
        return { success: false, error: 'Không thể tương tác phim này lúc này.' };
      }
    }

    // Check existing like on the feed post
    const [existingLike] = await db
      .select()
      .from(feedLikes)
      .where(and(eq(feedLikes.postId, postId), eq(feedLikes.userId, user.id)))
      .limit(1);

    let liked = false;
    let newLikeCount = series.likeCount;

    if (existingLike) {
      // Unlike
      await db
        .delete(feedLikes)
        .where(eq(feedLikes.id, existingLike.id));
      
      liked = false;
      newLikeCount = Math.max(0, newLikeCount - 1);
    } else {
      // Like
      await db
        .insert(feedLikes)
        .values({
          postId,
          userId: user.id,
          reactionType: 'like',
          createdAt: new Date()
        });
      
      liked = true;
      newLikeCount = newLikeCount + 1;
    }

    // Update film_series
    await db
      .update(filmSeries)
      .set({ likeCount: newLikeCount, updatedAt: new Date() })
      .where(eq(filmSeries.id, seriesId));

    // Update feed_posts count to sync
    await db
      .update(feedPosts)
      .set({ likes: newLikeCount })
      .where(eq(feedPosts.id, postId));

    return { success: true, liked, likeCount: newLikeCount };
  } catch (error: any) {
    console.error('Lỗi toggle like phim:', error);
    return { success: false, error: error.message || 'Lỗi hệ thống' };
  }
}

/**
 * Gửi báo cáo lỗi tập phim
 */
export async function reportFilmErrorAction(
  seriesId: number,
  episodeId: number | null,
  reason: string,
  description: string
) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    // Ghi nhận báo cáo lỗi
    const [report] = await db
      .insert(filmReports)
      .values({
        userId: user.id,
        seriesId,
        episodeId,
        reason,
        description,
        status: 'pending',
        createdAt: new Date()
      })
      .returning();

    // Tăng report_count của tập phim tương ứng
    if (episodeId) {
      const [episode] = await db
        .select()
        .from(filmEpisodes)
        .where(eq(filmEpisodes.id, episodeId))
        .limit(1);

      if (episode) {
        await db
          .update(filmEpisodes)
          .set({ reportCount: (episode.reportCount || 0) + 1 })
          .where(eq(filmEpisodes.id, episodeId));
      }
    }

    return { success: true, reportId: report.id };
  } catch (error: any) {
    console.error('Lỗi báo cáo hỏng phim:', error);
    return { success: false, error: error.message || 'Lỗi hệ thống' };
  }
}

/**
 * Lấy danh sách báo lỗi phim (Creator CMS)
 */
export async function getFilmReportsAction(teamId: number, status?: string) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    const conditions = [eq(filmSeries.teamId, teamId)];
    if (status && status !== 'all') {
      conditions.push(eq(filmReports.status, status));
    }

    const reports = await db
      .select({
        id: filmReports.id,
        reason: filmReports.reason,
        description: filmReports.description,
        status: filmReports.status,
        adminNote: filmReports.adminNote,
        resolvedAt: filmReports.resolvedAt,
        createdAt: filmReports.createdAt,
        seriesTitle: filmSeries.title,
        episodeNumber: filmEpisodes.episodeNumber,
        reporterName: users.name,
        reporterEmail: users.email
      })
      .from(filmReports)
      .innerJoin(filmSeries, eq(filmReports.seriesId, filmSeries.id))
      .leftJoin(filmEpisodes, eq(filmReports.episodeId, filmEpisodes.id))
      .innerJoin(users, eq(filmReports.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(filmReports.createdAt));

    return { success: true, reports };
  } catch (error: any) {
    console.error('Lỗi lấy danh sách báo lỗi:', error);
    return { success: false, reports: [] };
  }
}

/**
 * Xử lý báo cáo lỗi (Creator CMS)
 */
export async function resolveFilmReportAction(
  reportId: number,
  teamId: number,
  adminNote: string,
  newStatus: string
) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    const [report] = await db
      .select({
        id: filmReports.id,
        episodeId: filmReports.episodeId,
        status: filmReports.status
      })
      .from(filmReports)
      .innerJoin(filmSeries, eq(filmReports.seriesId, filmSeries.id))
      .where(and(eq(filmReports.id, reportId), eq(filmSeries.teamId, teamId)))
      .limit(1);

    if (!report) {
      return { success: false, error: 'Không tìm thấy báo cáo lỗi hoặc không có quyền.' };
    }

    const oldStatus = report.status;

    await db
      .update(filmReports)
      .set({
        status: newStatus,
        adminNote,
        resolvedAt: newStatus === 'pending' ? null : new Date()
      })
      .where(eq(filmReports.id, reportId));

    // Cập nhật count lỗi trên episode nếu status thay đổi
    if (report.episodeId) {
      const [episode] = await db
        .select()
        .from(filmEpisodes)
        .where(eq(filmEpisodes.id, report.episodeId))
        .limit(1);

      if (episode) {
        let diff = 0;
        if (oldStatus === 'pending' && newStatus !== 'pending') {
          diff = -1;
        } else if (oldStatus !== 'pending' && newStatus === 'pending') {
          diff = 1;
        }

        if (diff !== 0) {
          const newCount = Math.max(0, (episode.reportCount || 0) + diff);
          await db
            .update(filmEpisodes)
            .set({ reportCount: newCount })
            .where(eq(filmEpisodes.id, report.episodeId));
        }
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Lỗi xử lý báo lỗi:', error);
    return { success: false, error: error.message || 'Lỗi hệ thống' };
  }
}

/**
 * Lấy danh sách comment của phim qua feedPostId
 */
export async function getFilmCommentsAction(postId: number) {
  try {
    const commentsList = await db.query.feedComments.findMany({
      where: eq(feedComments.postId, postId),
      orderBy: [desc(feedComments.createdAt)],
    });
    return { success: true, comments: commentsList };
  } catch (error: any) {
    console.error('Lỗi lấy comments phim:', error);
    return { success: false, error: error.message || 'Lỗi hệ thống' };
  }
}

/**
 * Gửi comment mới cho phim
 */
export async function addFilmCommentAction(postId: number, content: string, parentId?: number | null) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    const [comment] = await db
      .insert(feedComments)
      .values({
        postId,
        userId: user.id,
        userName: user.name || user.email || 'Người dùng',
        userAvatar: user.avatarUrl || '/avatars/default.png',
        content,
        parentId: parentId || null,
        createdAt: new Date()
      })
      .returning();

    return { success: true, comment };
  } catch (error: any) {
    console.error('Lỗi thêm comment phim:', error);
    return { success: false, error: error.message || 'Lỗi hệ thống' };
  }
}

// ═══════════════════════════════════════════════════════
// REPORT FILM ACTION
// ═══════════════════════════════════════════════════════

export async function reportFilmAction(seriesId: number, reason: string) {
  try {
    const user = await getUser();
    if (!user) {
      return { error: 'Bạn cần đăng nhập để báo cáo phim' };
    }

    await db.insert(filmReports).values({
      seriesId,
      userId: user.id,
      reason: reason.substring(0, 50), // Map to the 50 char limit of reason field
      description: reason,             // Put full reason in description
      status: 'pending',
    });

    return { success: true, message: 'Đã gửi báo cáo thành công. Cảm ơn bạn!' };
  } catch (error: any) {
    console.error('reportFilmAction error:', error);
    return { error: error.message || 'Lỗi hệ thống' };
  }
}



// P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%P%

export async function deleteFilmSeriesAction(seriesId: number) {
  try {
    const user = await getUser();
    if (!user || !['admin', 'owner'].includes(user.role)) {
      return { success: false, error: 'Kh�ng c� quy�n th�c hi�n' };
    }

    // X�a reports
    await db.delete(filmReports).where(eq(filmReports.seriesId, seriesId));
    // X�a bookmarks
    await db.delete(filmBookmarks).where(eq(filmBookmarks.seriesId, seriesId));
    // X�a unlocked episodes (n�u c�, nh�ng kh�ng c� table n�y, b� qua)
    // X�a episodes
    await db.delete(filmEpisodes).where(eq(filmEpisodes.seriesId, seriesId));
    // X�a series
    await db.delete(filmSeries).where(eq(filmSeries.id, seriesId));

    // Th� x�a feed posts n�u li�n k�t (n�u ��c)
    // Thêm xóa feed posts nếu liên kết (nếu có)
    // await db.delete(feedPosts).where(and(eq(feedPosts.targetId, seriesId), eq(feedPosts.type, 'film_publish')));

    return { success: true };
  } catch (error) {
    console.error('Delete film error:', error);
    return { success: false, error: 'Có lỗi xảy ra khi xóa phim' };
  }
}

/**
 * Gọi AI Gemini 2.5 Flash biên dịch & sinh Timeline cho 1 tập phim cụ thể theo yêu cầu (1-Click)
 */
export async function translateSingleEpisodeAiAction(episodeId: number, teamId: number) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'Chưa cấu hình GEMINI_API_KEY trong file environment' };
    }

    const ep = await db.query.filmEpisodes.findFirst({
      where: and(eq(filmEpisodes.id, episodeId), eq(filmEpisodes.teamId, teamId))
    });

    if (!ep) {
      return { success: false, error: 'Không tìm thấy tập phim' };
    }

    const series = await db.query.filmSeries.findFirst({
      where: eq(filmSeries.id, ep.seriesId)
    });

    const titleToUse = series?.title || ep.title || 'Phim ngắn';

    const promptSystem = `Bạn là trợ lý AI biên tập phim ngắn dọc chuyên nghiệp.
Hãy giúp tôi:
1. Viết đoạn Tóm tắt nội dung kịch tính 2-3 câu lôi cuốn người xem.
2. Tạo mảng Timeline các mốc thời gian diễn biến chính trong video (VD: [{"time": "00:00", "label": "Mở đầu..."}, {"time": "01:30", "label": "Biến cố..."}]).

Trả về DUY NHẤT định dạng JSON:
{
  "description": "Đoạn tóm tắt nội dung...",
  "timeline": [
    { "time": "00:00", "label": "Mô tả mốc 1" },
    { "time": "01:30", "label": "Mô tả mốc 2" }
  ]
}`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${promptSystem}\n\nTiêu đề phim: ${titleToUse}` }] }],
        generationConfig: { response_mime_type: 'application/json' }
      })
    });

    const aiData = await res.json();
    const text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const rawText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(rawText);

    const summary = parsed.description || `Bộ phim kịch tính: ${titleToUse}`;
    const timeline = Array.isArray(parsed.timeline) && parsed.timeline.length > 0
      ? parsed.timeline
      : [{ time: '00:00', label: 'Bắt đầu phim' }];

    await db.update(filmEpisodes)
      .set({ summary, timeline })
      .where(eq(filmEpisodes.id, episodeId));

    revalidatePath(`/hero-film/t/${teamId}/series/${ep.seriesId}/episodes`);

    return {
      success: true,
      summary,
      timeline
    };
  } catch (error: any) {
    console.error('translateSingleEpisodeAiAction error:', error);
    return { success: false, error: error.message || 'Lỗi xử lý AI' };
  }
}
