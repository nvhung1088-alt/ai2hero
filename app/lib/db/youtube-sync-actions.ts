'use server';

import { db } from './drizzle';
import { filmSeries, filmEpisodes, connectHubConnections, youtubeSyncChannels } from './schema';
import { eq, and, sql } from 'drizzle-orm';
import { slugify } from '../utils/film-url';
import { autoCategorizeFilm } from '../utils/film-tags';
import { getUser } from './queries';
import { getMyPages } from './social-page-actions';
import { getUserGroups } from './social-queries';
import { dispatchMvpFeedPost } from './feed-dispatcher';

const HeroAiText = {
  TitleOptimizeSystem: `Bạn là trợ lý AI biên tập phim ngắn dọc chuyên nghiệp. Tôi sẽ gửi cho bạn thông tin video gồm tiêu đề gốc và mô tả.
Hãy giúp tôi:
1. Tối ưu lại tiêu đề ngắn gọn, kịch tính, chuẩn phim ngắn dọc, bỏ các từ rác (như HD, Full, Vietsub).
2. Viết đoạn Tóm tắt nội dung kịch tính 2-3 câu lôi cuốn người xem.
3. Tạo mảng Timeline các mốc thời gian diễn biến chính trong video (VD: [{"time": "00:00", "label": "Mở đầu..."}, {"time": "01:30", "label": "Biến cố..."}]).

Trả về DUY NHẤT định dạng JSON:
{
  "title": "Tiêu đề kịch tính mới",
  "description": "Đoạn tóm tắt nội dung lôi cuốn 2-3 câu...",
  "timeline": [
    { "time": "00:00", "label": "Mô tả mốc 1" },
    { "time": "01:30", "label": "Mô tả mốc 2" }
  ]
}`
};

export async function getAiConnectionsAction(teamId: number) {
  try {
    const connections = await db.query.connectHubConnections.findMany({
      where: and(eq(connectHubConnections.teamId, teamId), eq(connectHubConnections.status, 'active'))
    });
    const mapped = connections.map(c => ({ id: c.id, name: c.connectionName, model: c.appSlug, provider: c.appName }));
    
    // Đảm bảo luôn có tùy chọn Gemini 2.5 Flash Miễn phí
    if (mapped.length === 0 || !mapped.some(c => c.name.includes('Gemini'))) {
      mapped.unshift({
        id: -1,
        name: 'Google Gemini 2.5 Flash (Mặc định Miễn phí)',
        model: 'gemini-2.5-flash',
        provider: 'Google AI Studio'
      });
    }
    return mapped;
  } catch (e) {
    return [{
      id: -1,
      name: 'Google Gemini 2.5 Flash (Mặc định Miễn phí)',
      model: 'gemini-2.5-flash',
      provider: 'Google AI Studio'
    }];
  }
}

export async function getPublishTargetsAction(userId: number) {
  try {
    const pages = await getMyPages(userId);
    const groups = await getUserGroups(userId);
    
    return {
      success: true,
      pages,
      groups
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function extractYoutubeVideos(ytData: any) {
  let videos: any[] = [];
  const seenIds = new Set();
  
  function traverse(obj: any) {
      if (!obj || typeof obj !== 'object') return;
      
      if (Array.isArray(obj)) {
          obj.forEach(traverse);
          return;
      }

      const v = obj.videoRenderer || obj.reelItemRenderer || obj.gridVideoRenderer;
      if (v && v.videoId) {
          // Bỏ qua video Members Only
          if (JSON.stringify(v).includes('BADGE_STYLE_TYPE_MEMBERS_ONLY')) return;

          if(!seenIds.has(v.videoId)) {
              let descriptionSnippet = '';
              if (v.descriptionSnippet?.runs) {
                  descriptionSnippet = v.descriptionSnippet.runs.map((r: any) => r.text).join('');
              }
              videos.push({
                  videoId: v.videoId,
                  title: v.title?.runs?.[0]?.text || v.headline?.simpleText || 'Video',
                  thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
                  lengthText: v.lengthText?.simpleText,
                  viewCountText: v.viewCountText?.simpleText || v.viewCountText?.runs?.[0]?.text,
                  publishedTimeText: v.publishedTimeText?.simpleText,
                  descriptionSnippet
              });
              seenIds.add(v.videoId);
          }
      } 
      // Format mới (YouTube 2024 UI - lockupViewModel)
      else if (obj.lockupViewModel && obj.lockupViewModel.contentId) {
          // Bỏ qua video Members Only
          if (JSON.stringify(obj.lockupViewModel).includes('BADGE_STYLE_TYPE_MEMBERS_ONLY')) return;

          const lvm = obj.lockupViewModel;
          const videoId = lvm.contentId;
          if(!seenIds.has(videoId)) {
              const metadataRows = lvm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
              let viewCountText = "";
              let publishedTimeText = "";
              
              // Trong format mới, metadataRows chứa mảng metadataParts (VD: "141 views", "2 days ago")
              if (metadataRows.length > 0 && metadataRows[0].metadataParts) {
                 const parts = metadataRows[0].metadataParts;
                 if (parts.length > 0) viewCountText = parts[0].text?.content;
                 if (parts.length > 1) publishedTimeText = parts[1].text?.content;
              }

              // Lấy thumbnail chất lượng tốt nhất
              let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

              // Lấy thời lượng (Format mới nằm trong overlays)
              let lengthText = "";
              const overlays = lvm.contentImage?.thumbnailViewModel?.overlays || [];
              for (const overlay of overlays) {
                  // Fallback 1
                  if (overlay.thumbnailOverlayTimeStatusRenderer?.text?.simpleText) {
                      lengthText = overlay.thumbnailOverlayTimeStatusRenderer.text.simpleText;
                      break;
                  }
                  // Fallback 2 (Format UI mới nhất 2024 có Badges)
                  if (overlay.thumbnailBottomOverlayViewModel?.badges) {
                      for (const b of overlay.thumbnailBottomOverlayViewModel.badges) {
                          if (b.thumbnailBadgeViewModel?.text) {
                              lengthText = b.thumbnailBadgeViewModel.text;
                              break;
                          }
                      }
                      if (lengthText) break;
                  }
              }

              videos.push({
                  videoId: videoId,
                  title: lvm.metadata?.lockupMetadataViewModel?.title?.content || "Video",
                  thumbnail: thumbnail,
                  lengthText: lengthText,
                  viewCountText: viewCountText,
                  publishedTimeText: publishedTimeText
              });
              seenIds.add(videoId);
          }
      } else {
          for (const key in obj) {
              traverse(obj[key]);
          }
      }
  }
  
  traverse(ytData);
  return videos;
}

function parseDuration(text: string | undefined): number {
  if (!text) return 0; // Thường Short là 0
  const parts = text.split(':').reverse();
  let seconds = 0;
  for (let i = 0; i < parts.length; i++) {
      seconds += parseInt(parts[i]) * Math.pow(60, i);
  }
  return seconds;
}

function parseViews(text: string | undefined): number {
  if (!text) return 0;
  const t = text.replace(/,/g, '').replace(/\./g, 'dot'); // xử lý 1.2M -> 1dot2M
  let multiplier = 1;
  const tLower = t.toLowerCase();
  
  if(tLower.includes('k') || tLower.includes('nghìn')) multiplier = 1000;
  if(tLower.includes('m') || tLower.includes('tr')) multiplier = 1000000;
  if(tLower.includes('b') || tLower.includes('tỉ')) multiplier = 1000000000;
  
  const numMatch = t.match(/[\ddot]+/);
  if (numMatch) {
      const valStr = numMatch[0].replace('dot', '.');
      return parseFloat(valStr) * multiplier;
  }
  return 0;
}

function groupYoutubeVideos(videos: any[]) {
   const groups = new Map();
   for (const v of videos) {
       let clean = v.title.replace(/(?:\[|\()?(?:Full|Vietsub|Thuyết Minh|HD|4K|1080p)(?:\]|\))?/gi, '').trim();
       
       // Cắt bỏ phần từ dấu "|" trở đi và xoá chữ "Kết)"
       clean = clean.split('|')[0].trim();
       clean = clean.replace(/Kết\)/gi, '').replace(/\(Kết\)/gi, '').trim();

       let epNum = 1;
       const epRegex = /(?:Phần|Tập|Part|P)\s*\.?\s*([0-9]+)(?:\s*[-|:|\|]\s*|\s+|$)/i;
       const match = clean.match(epRegex);
       let baseTitle = clean;
       if (match) {
           epNum = parseInt(match[1]);
           baseTitle = clean.replace(match[0], '').trim();
       } else {
           const endRegex = /(?:-|\s|\|)\s*([0-9]+)$/;
           const endMatch = clean.match(endRegex);
           if (endMatch) {
               epNum = parseInt(endMatch[1]);
               baseTitle = clean.replace(endMatch[0], '').trim();
           }
       }
       baseTitle = baseTitle.replace(/^[-|:|\|]\s*/, '').replace(/\s*[-|:|\|]$/, '').trim();
       if(!baseTitle) baseTitle = v.title;
       
       let foundKey = null;
       const normalizedBase = baseTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
       for (const key of groups.keys()) {
            const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalizedKey.length > 5 && normalizedBase.length > 5) {
                if (normalizedKey.includes(normalizedBase) || normalizedBase.includes(normalizedKey)) {
                    foundKey = key;
                    break;
                }
            } else {
                if (normalizedKey === normalizedBase) {
                    foundKey = key; break;
                }
            }
       }
       
       const finalKey = foundKey || baseTitle;
       if(!groups.has(finalKey)) {
           groups.set(finalKey, []);
       }
       groups.get(finalKey).push({ ...v, epNum, baseTitle: finalKey });
   }
   return groups;
}

function checkTimeRange(text: string | undefined, timeRange: string): boolean {
  if(timeRange === 'all' || !text) return true;
  const t = text.toLowerCase();
  
  // Logic lọc sơ bộ dựa trên chữ (trường hợp hiển thị relative time của YT: "2 days ago", "1 tháng trước")
  if (timeRange === 'day') {
      return t.includes('hour') || t.includes('minute') || t.includes('second') || t.includes('day') || t.includes('giờ') || t.includes('phút') || t.includes('ngày') || t.includes('giây');
  }
  if (timeRange === 'week') {
      return checkTimeRange(text, 'day') || t.includes('week') || t.includes('tuần');
  }
  if (timeRange === 'month') {
      return checkTimeRange(text, 'week') || t.includes('month') || t.includes('tháng');
  }
  if (timeRange === 'year') {
      return checkTimeRange(text, 'month') || t.includes('year') || t.includes('năm');
  }
  return true;
}

export async function syncYoutubeChannelAction(
  channelUrl: string,
  filters: {
    limit: number | 'all',
    minViews: number,
    timeRange: 'all' | 'day' | 'week' | 'month' | 'year',
    durationFilter: 'all' | 'short' | 'medium' | 'long',
    status: 'publishing' | 'draft',
    category: string,
    rewriteTitle: boolean,
    useAiTitle: boolean,
    aiConnectionId: number | null,
    publishTargets?: any[]
  },
  teamId: number,
  creatorId: string
) {
  try {
    // 1. Tải HTML trang web
    // Ensure URL goes to videos tab if it is a channel root
    let fetchUrl = channelUrl;
    if (!fetchUrl.includes('/videos') && !fetchUrl.includes('/shorts')) {
        fetchUrl = fetchUrl.replace(/\/$/, '') + '/videos';
    }

    const res = await fetch(fetchUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }});
    const html = await res.text();

    // 2. Trích xuất ytInitialData
    let ytData = null;
    try {
        const marker = 'var ytInitialData = ';
        const start = html.indexOf(marker);
        if (start !== -1) {
            const jsonStart = start + marker.length;
            let end = html.indexOf(';</script>', jsonStart);
            if (end === -1) end = html.indexOf('</script>', jsonStart);
            
            const jsonStr = html.substring(jsonStart, end).trim().replace(/;$/, '');
            ytData = JSON.parse(jsonStr);
        } else {
            const marker2 = 'window["ytInitialData"] = ';
            const start2 = html.indexOf(marker2);
            if (start2 !== -1) {
                const jsonStart2 = start2 + marker2.length;
                let end2 = html.indexOf(';', jsonStart2);
                const jsonStr2 = html.substring(jsonStart2, end2).trim();
                ytData = JSON.parse(jsonStr2);
            }
        }
    } catch (e) {
        console.error("JSON parse fail", e);
    }

    if (!ytData) {
      return { success: false, error: 'Không thể phân tích dữ liệu kênh. Vui lòng kiểm tra lại URL.' };
    }

    // 3. Phân tích Videos
    const allVideosRaw = extractYoutubeVideos(ytData);

    // 4. Lọc Videos
    let qualifiedVideos = [];
    for (const v of allVideosRaw) {
        // Áp dụng bộ lọc
        const durationSec = parseDuration(v.lengthText);
        const views = parseViews(v.viewCountText);

        if (views < filters.minViews) continue;
        if (!checkTimeRange(v.publishedTimeText, filters.timeRange)) continue;

        if (filters.durationFilter === 'short' && durationSec > 60 && v.lengthText) continue;
        if (filters.durationFilter === 'medium' && (durationSec < 60 || durationSec > 1800)) continue;
        if (filters.durationFilter === 'long' && durationSec <= 1800) continue;

        qualifiedVideos.push(v);
        if (filters.limit !== 'all' && qualifiedVideos.length >= filters.limit) break;
    }

    // ---- BẮT ĐẦU PAGINATION LOOP ----
    if (filters.limit === 'all' || qualifiedVideos.length < filters.limit) {
        const keyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
        const clientMatch = html.match(/"clientVersion":"([^"]+)"/);
        const apiKey = keyMatch ? keyMatch[1] : '';
        const clientVersion = clientMatch ? clientMatch[1] : '2.20231017.00.00';
        
        let tokenMatch = JSON.stringify(ytData).match(/"continuationCommand":\{"token":"([^"]+)"/);
        let continuationToken = tokenMatch ? tokenMatch[1] : null;

        let loopCount = 0;
        // Giới hạn max 100 vòng lặp (khoảng 3000 video) để chống tràn bộ nhớ / Timeout
        while (continuationToken && (filters.limit === 'all' || qualifiedVideos.length < filters.limit) && loopCount < 100) {
            loopCount++;
            try {
                const apiRes = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                    },
                    body: JSON.stringify({
                        context: { client: { clientName: 'WEB', clientVersion: clientVersion } },
                        continuation: continuationToken
                    })
                });
                
                if (!apiRes.ok) break;
                const data = await apiRes.json();
                
                // Trích xuất video từ dữ liệu trang mới
                const newVideosRaw = extractYoutubeVideos(data);
                if (newVideosRaw.length === 0) break;
                
                for (const v of newVideosRaw) {
                    const durationSec = parseDuration(v.lengthText);
                    const views = parseViews(v.viewCountText);

                    if (views < filters.minViews) continue;
                    if (!checkTimeRange(v.publishedTimeText, filters.timeRange)) continue;

                    if (filters.durationFilter === 'short' && durationSec > 60 && v.lengthText) continue;
                    if (filters.durationFilter === 'medium' && (durationSec < 60 || durationSec > 1800)) continue;
                    if (filters.durationFilter === 'long' && durationSec <= 1800) continue;

                    qualifiedVideos.push(v);
                    if (filters.limit !== 'all' && qualifiedVideos.length >= filters.limit) break;
                }
                
                // Cập nhật token cho vòng lặp kế tiếp
                const nextTokenMatch = JSON.stringify(data).match(/"continuationCommand":\{"token":"([^"]+)"/);
                continuationToken = nextTokenMatch ? nextTokenMatch[1] : null;

            } catch (err) {
                console.error("Pagination error:", err);
                break;
            }
        }
    }
    // ---- KẾT THÚC PAGINATION LOOP ----

    if (qualifiedVideos.length === 0) {
      return { success: false, error: `Không tìm thấy video nào khớp với điều kiện lọc (Quét ${allVideosRaw.length} video).`, count: 0, data: [], alreadyExists: 0 };
    }

    // 5. Khởi tạo AI Model nếu người dùng yêu cầu
    let ai: any = null;
    if (filters.rewriteTitle && filters.aiConnectionId) {
      try {
        const conn = await db.query.connectHubConnections.findFirst({
            where: and(eq(connectHubConnections.id, filters.aiConnectionId), eq(connectHubConnections.teamId, teamId))
        });
        if (conn) {
           ai = `${conn.id}:${conn.appSlug}`;
        } else {
           ai = 'mock:mock-model';
        }
      } catch (e) {
        ai = 'mock:mock-model';
      }
    }

    const results = [];
    let alreadyExistsCount = 0;
    const groupedSeries = groupYoutubeVideos(qualifiedVideos);

    // 6. Xử lý qua AI và lưu vào DB (Gộp Series & Episodes)
    for (const [baseTitle, videosInSeries] of groupedSeries.entries()) {
      let seriesId: number | null = null;
      let optimizedTitle = baseTitle;
      let optimizedDesc = '';

      // Tìm xem có Series nào trong DB có tên gốc giống baseTitle chưa
      const baseSlug = slugify(baseTitle);
      const possibleExisting = await db.query.filmSeries.findFirst({
          where: and(
             eq(filmSeries.teamId, teamId),
             sql`${filmSeries.slug} LIKE ${'%' + baseSlug + '%'}`
          )
      });

      let optimizedTimeline: any[] = [];

      if (possibleExisting) {
          seriesId = possibleExisting.id;
          optimizedTitle = possibleExisting.title;
          optimizedDesc = possibleExisting.description || '';
      } else {
          // Chưa có series này, gọi AI để optimize nếu cần
          const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
          if (filters.useAiTitle && apiKey) {
              try {
                const prompt = `${HeroAiText.TitleOptimizeSystem}\n\nTiêu đề gốc: ${baseTitle}`;
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({
                     contents: [{ parts: [{ text: prompt }] }],
                     generationConfig: { response_mime_type: 'application/json' }
                   })
                });
                const aiData = await res.json();
                const text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const rawText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(rawText);
                if (parsed.title) optimizedTitle = parsed.title;
                if (parsed.description) optimizedDesc = parsed.description;
                if (parsed.timeline && Array.isArray(parsed.timeline)) optimizedTimeline = parsed.timeline;
              } catch (err) {
                console.error('AI Error for series', baseTitle, err);
              }
          }
          
          // Nếu sau khi gọi AI (hoặc không dùng AI) mà description vẫn rỗng, lấy snippet từ Youtube
          if (!optimizedDesc) {
              const videoWithDesc = videosInSeries.find((v: any) => v.descriptionSnippet && v.descriptionSnippet.trim().length > 0);
              if (videoWithDesc) {
                  optimizedDesc = videoWithDesc.descriptionSnippet;
              } else {
                  // Fallback: Lấy chính baseTitle
                  optimizedDesc = `Bộ phim hấp dẫn: ${baseTitle}. Cùng xem ngay!`;
              }
          }
      }

      videosInSeries.sort((a: any,b: any) => a.epNum - b.epNum);
      const newEpisodesToInsert = [];

      for (const v of videosInSeries) {
          const videoUrl = `https://www.youtube.com/watch?v=${v.videoId}`;
          const existingEpisode = await db.query.filmEpisodes.findFirst({
             where: and(eq(filmEpisodes.videoUrl, videoUrl), eq(filmEpisodes.teamId, teamId))
          });
          if (existingEpisode) {
             alreadyExistsCount++;
             // Nếu tập cũ chưa có timeline hoặc summary mà lần này có AI, cập nhật thêm cho tập cũ
             if ((!existingEpisode.timeline || !existingEpisode.summary) && (optimizedDesc || optimizedTimeline.length > 0)) {
                await db.update(filmEpisodes)
                  .set({
                    summary: existingEpisode.summary || optimizedDesc,
                    timeline: existingEpisode.timeline || (optimizedTimeline.length > 0 ? optimizedTimeline : null)
                  })
                  .where(eq(filmEpisodes.id, existingEpisode.id));
             }
          } else {
             newEpisodesToInsert.push({ ...v, videoUrl });
          }
      }

      if (newEpisodesToInsert.length === 0) continue;

      if (!seriesId) {
          const coverVideo = newEpisodesToInsert[0];
          const generatedTags = await autoCategorizeFilm(teamId, optimizedTitle, optimizedDesc);

          const insertedSeries = await db.insert(filmSeries).values({
            teamId,
            creatorId: parseInt(creatorId),
            title: optimizedTitle,
            slug: slugify(optimizedTitle),
            description: optimizedDesc,
            coverUrl: coverVideo.thumbnail || `https://i.ytimg.com/vi/${coverVideo.videoId}/hqdefault.jpg`,
            genre: generatedTags.length > 0 ? generatedTags[0] : (filters.category || 'other'),
            tags: generatedTags,
            status: filters.status,
            totalEpisodes: newEpisodesToInsert.length,
            totalFreeEpisodes: newEpisodesToInsert.length,
          }).returning({ id: filmSeries.id });

          seriesId = insertedSeries[0].id;
      } else {
          // Nếu đã có series, cập nhật lại số tập
          await db.update(filmSeries)
            .set({ 
               totalEpisodes: possibleExisting!.totalEpisodes + newEpisodesToInsert.length,
               totalFreeEpisodes: possibleExisting!.totalFreeEpisodes + newEpisodesToInsert.length,
            })
            .where(eq(filmSeries.id, seriesId));
      }

      for (const v of newEpisodesToInsert) {
        await db.insert(filmEpisodes).values({
          teamId,
          seriesId,
          episodeNumber: v.epNum,
          title: `Tập ${v.epNum}`,
          videoSource: 'youtube',
          videoUrl: v.videoUrl,
          duration: parseDuration(v.lengthText),
          summary: optimizedDesc,
          timeline: optimizedTimeline.length > 0 ? optimizedTimeline : null,
          status: filters.status
        });

        results.push({
          videoId: v.videoId,
          originalTitle: v.title,
          optimizedTitle: optimizedTitle + (videosInSeries.length > 1 ? ` (Tập ${v.epNum})` : ''),
          coverUrl: v.thumbnail
        });
      }

      if (newEpisodesToInsert.length > 0 && filters.status === 'publishing' && filters.publishTargets && Array.isArray(filters.publishTargets)) {
         const totalEps = (possibleExisting?.totalEpisodes || 0) + newEpisodesToInsert.length;
         const coverVideo = newEpisodesToInsert[0] || {};
         const coverUrl = coverVideo.thumbnail || possibleExisting?.coverUrl || '';
         const previewJSON = JSON.stringify({
            seriesId: seriesId,
            slug: slugify(optimizedTitle),
            title: optimizedTitle,
            coverUrl: coverUrl,
            genre: filters.category || 'other',
            totalEpisodes: totalEps,
         });
         const attachments = coverUrl ? [{ type: 'image' as const, url: coverUrl, fileName: 'cover.jpg' }] : [];
         const message = possibleExisting 
            ? `🎬 Vừa cập nhật thêm tập mới cho series phim: "${optimizedTitle}"\nXem ngay những tập phim hấp dẫn nhất!`
            : `🎬 Vừa ra mắt series phim ngắn mới: "${optimizedTitle}"\nXem ngay để không bỏ lỡ những tập phim hấp dẫn nhất!`;
         
         for (const target of filters.publishTargets) {
            await dispatchMvpFeedPost({
               teamId: teamId,
               userId: parseInt(creatorId),
               pageId: target.type === 'page' ? target.id : null,
               groupId: target.type === 'group' ? target.id : null,
               type: 'film_publish',
               appId: 'hero-film',
               message,
               resultPreview: previewJSON,
               attachments
            });
         }
      }
    }

    return { success: true, count: results.length, data: results, alreadyExists: alreadyExistsCount };
  } catch (error: any) {
    console.error('syncYoutubeChannelAction error:', error);
    return { success: false, error: error.message || 'Lỗi hệ thống' };
  }
}

export async function getSyncChannelsAction(teamId: number) {
  try {
    const channels = await db.query.youtubeSyncChannels.findMany({
      where: eq(youtubeSyncChannels.teamId, teamId),
      orderBy: (channels, { desc }) => [desc(channels.createdAt)]
    });

    return { success: true, channels };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function batchTranslateChannelAiAction(channelId: number, teamId: number) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'Chưa cấu hình GEMINI_API_KEY trong hệ thống' };
    }

    const channel = await db.query.youtubeSyncChannels.findFirst({
      where: eq(youtubeSyncChannels.id, channelId)
    });
    if (!channel) return { success: false, error: 'Không tìm thấy kênh' };

    // Dùng teamId từ channel record trong DB, không phải từ URL param
    // (URL param teamId có thể không khớp với teamId lưu trong DB)
    const effectiveTeamId = channel.teamId;

    const missingCondition = sql`(
      ${filmEpisodes.timeline} IS NULL 
      OR jsonb_typeof(${filmEpisodes.timeline}) != 'array' 
      OR (jsonb_typeof(${filmEpisodes.timeline}) = 'array' AND jsonb_array_length(${filmEpisodes.timeline}) = 0)
    )`;

    // Đếm tổng số tập còn chưa dịch trong team (dùng effectiveTeamId từ DB)
    const totalRemainingRes = await db.select({ count: sql<number>`count(*)` })
      .from(filmEpisodes)
      .where(and(eq(filmEpisodes.teamId, effectiveTeamId), missingCondition));

    const totalRemainingBefore = Number(totalRemainingRes[0]?.count || 0);

    // Lấy tối đa 3 tập chưa có Timeline (giảm từ 15 → 3 để tránh Vercel 10s timeout)
    // Modal có while loop → sẽ gọi lại liên tục cho đến khi hết
    const eps = await db.select({
      id: filmEpisodes.id,
      title: filmEpisodes.title,
      seriesId: filmEpisodes.seriesId,
      videoUrl: filmEpisodes.videoUrl
    })
    .from(filmEpisodes)
    .where(and(eq(filmEpisodes.teamId, effectiveTeamId), missingCondition))
    .limit(3);

    if (eps.length === 0) {
      return { success: true, count: 0, remaining: 0, message: '🎉 Tất cả video trong kênh đã được biên dịch AI hoàn tất trước đó!' };
    }

    let successCount = 0;
    const translatedTitles: { epId: number; seriesTitle: string; summary: string }[] = [];
    const promptSystem = `Bạn là trợ lý AI biên tập phim ngắn dọc. Tôi gửi cho bạn tiêu đề video.
Hãy tạo:
1. Tóm tắt 2-3 câu kịch tính.
2. Timeline mốc thời gian diễn biến (VD: [{"time": "00:00", "label": "Mở đầu..."}, {"time": "01:30", "label": "Biến cố..."}]).

Trả về DUY NHẤT định dạng JSON: {"description": "...", "timeline": [{"time": "00:00", "label": "..."}]}`;

    for (const ep of eps) {
      try {
        const series = await db.query.filmSeries.findFirst({
          where: eq(filmSeries.id, ep.seriesId)
        });
        const titleToUse = series?.title || ep.title || 'Phim ngắn';

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${promptSystem}\n\nTiêu đề: ${titleToUse}` }] }],
            generationConfig: { response_mime_type: 'application/json' }
          })
        });

        const aiData = await res.json();
        const text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const rawText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(rawText);

        const summary = parsed.description || `Phim hấp dẫn: ${titleToUse}`;
        const timeline = Array.isArray(parsed.timeline) && parsed.timeline.length > 0
          ? parsed.timeline
          : [{ time: '00:00', label: 'Bắt đầu phim' }];

        await db.update(filmEpisodes)
          .set({ summary, timeline })
          .where(eq(filmEpisodes.id, ep.id));

        successCount++;
        translatedTitles.push({ epId: ep.id, seriesTitle: titleToUse, summary: summary.substring(0, 80) });
      } catch (err) {
        console.error('Error batch AI for episode:', ep.id, err);
      }
    }

    if (successCount > 0) {
      await db.update(youtubeSyncChannels)
        .set({
          totalAiProcessed: (channel.totalAiProcessed || 0) + successCount,
          updatedAt: new Date()
        })
        .where(eq(youtubeSyncChannels.id, channelId));
    }

    const remainingLeft = Math.max(0, totalRemainingBefore - successCount);

    return { 
      success: true, 
      count: successCount, 
      remaining: remainingLeft,
      translatedTitles,
      message: `Đã dịch & tạo Timeline cho ${successCount} video (Còn lại ${remainingLeft} tập chưa dịch).`
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveSyncChannelAction(teamId: number, data: { channelUrl: string; filters: any; }) {
  const user = await getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  try {
    let channelName = data.channelUrl.split('/').pop() || 'Unknown Channel';

    const existing = await db.query.youtubeSyncChannels.findFirst({
        where: and(eq(youtubeSyncChannels.teamId, teamId), eq(youtubeSyncChannels.channelUrl, data.channelUrl))
    });

    if (existing) {
       await db.update(youtubeSyncChannels).set({
           filters: data.filters,
           isActive: true,
           updatedAt: new Date()
       }).where(eq(youtubeSyncChannels.id, existing.id));
       return { success: true };
    }

    await db.insert(youtubeSyncChannels).values({
      teamId,
      creatorId: user.id,
      channelUrl: data.channelUrl,
      channelName: channelName,
      filters: data.filters,
      isActive: true,
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleSyncChannelAction(id: number, isActive: boolean) {
   try {
     await db.update(youtubeSyncChannels).set({ isActive }).where(eq(youtubeSyncChannels.id, id));
     return { success: true };
   } catch (e: any) { return { success: false, error: e.message }; }
}

export async function deleteSyncChannelAction(id: number) {
   try {
     await db.delete(youtubeSyncChannels).where(eq(youtubeSyncChannels.id, id));
     return { success: true };
   } catch (e: any) { return { success: false, error: e.message }; }
}

export async function manualTriggerSyncChannelAction(channelId: number, teamId: number, creatorId: string) {
   try {
     const channel = await db.query.youtubeSyncChannels.findFirst({ where: eq(youtubeSyncChannels.id, channelId) });
     if (!channel) return { success: false, error: 'Không tìm thấy kênh' };
  
     const res = await syncYoutubeChannelAction(channel.channelUrl, channel.filters as any, teamId, creatorId);
     
     if (res.success) {
        await db.update(youtubeSyncChannels).set({
           lastSyncedAt: new Date(),
           totalSynced: (channel.totalSynced || 0) + (res.count || 0),
           updatedAt: new Date()
        }).where(eq(youtubeSyncChannels.id, channelId));
     }
     return res;
   } catch (e: any) {
     return { success: false, error: e.message };
   }
}

/**
 * Lấy tổng số video và số video đã dịch AI của Team để hiển thị trên Sidebar góc trái
 */
export async function getAiTranslationProgressAction(teamId: number) {
  try {
    const totalEpsRes = await db.select({ count: sql<number>`count(*)` })
      .from(filmEpisodes)
      .where(eq(filmEpisodes.teamId, teamId));

    const processedRes = await db.select({ count: sql<number>`count(*)` })
      .from(filmEpisodes)
      .where(and(
        eq(filmEpisodes.teamId, teamId),
        sql`${filmEpisodes.timeline} IS NOT NULL AND jsonb_typeof(${filmEpisodes.timeline}) = 'array' AND jsonb_array_length(${filmEpisodes.timeline}) > 0`
      ));

    const total = Number(totalEpsRes[0]?.count || 0);
    const processed = Number(processedRes[0]?.count || 0);

    return {
      success: true,
      total,
      processed,
      remaining: Math.max(0, total - processed)
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
