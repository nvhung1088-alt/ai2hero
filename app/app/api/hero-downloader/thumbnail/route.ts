import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { downloaderVideos, downloaderProjects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { uploadFile } from '@/lib/storage/r2';
import { runConnectorAction } from '@/lib/connect-hub/connector-service';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user from session
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }
    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam || !userWithTeam.teamId) {
      return NextResponse.json({ error: 'Không tìm thấy workspace' }, { status: 403 });
    }
    const teamId = userWithTeam.teamId;

    // 2. Parse request body
    const { videoId, connectionId, model, targetLang = 'Tiếng Việt' } = await req.json();
    if (!videoId || !connectionId || !model) {
      return NextResponse.json(
        { error: 'Thiếu tham số videoId, connectionId hoặc model' },
        { status: 400 }
      );
    }

    // 3. Fetch video and verify ownership
    const [video] = await db
      .select({
        id: downloaderVideos.id,
        thumbnailUrl: downloaderVideos.thumbnailUrl,
      })
      .from(downloaderVideos)
      .innerJoin(downloaderProjects, eq(downloaderVideos.projectId, downloaderProjects.id))
      .where(and(eq(downloaderVideos.id, videoId), eq(downloaderProjects.teamId, teamId)))
      .limit(1);

    if (!video || !video.thumbnailUrl) {
      return NextResponse.json(
        { error: 'Video không tồn tại hoặc chưa có ảnh bìa gốc' },
        { status: 400 }
      );
    }

    // 4. Step 1: Vision AI via Connect Hub (extract text, translate, describe layout)
    const visionResult = await runConnectorAction({
      teamId,
      connectionId,
      actionSlug: 'chat_completion',
      input: {
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: video.thumbnailUrl } },
              {
                type: 'text',
                text: `Phân tích ảnh thumbnail này. Trả về đúng 1 JSON Object duy nhất (tuyệt đối không dùng markdown code block, không giải thích thêm):
{
  "originalText": "toàn bộ chữ trên ảnh gốc",
  "translatedText": "dịch toàn bộ chữ trên ảnh sang ${targetLang} tự nhiên",
  "layout": "mô tả ngắn gọn bố cục bằng tiếng Anh: vị trí text, font style, màu sắc chủ đạo, nhân vật/vật thể trên ảnh"
}`,
              },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      },
      callerModule: 'hero-downloader',
    });

    if (!visionResult.success) {
      return NextResponse.json(
        { error: 'Lỗi Vision AI: ' + (visionResult.error || 'Không thể đọc ảnh') },
        { status: 500 }
      );
    }

    // Extract content from result
    let rawContent =
      visionResult.data?.choices?.[0]?.message?.content ||
      visionResult.data?.data?.choices?.[0]?.message?.content ||
      '';

    if (typeof rawContent !== 'string') {
      rawContent = JSON.stringify(rawContent);
    }

    let cleanJson = rawContent
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanJson = jsonMatch[0];
    }

    let analysis: { originalText: string; translatedText: string; layout: string };
    try {
      analysis = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error('[hero-downloader-thumbnail] Failed to parse AI Vision JSON:', rawContent);
      return NextResponse.json(
        { error: 'AI Vision trả về định dạng không đúng JSON', raw: rawContent },
        { status: 500 }
      );
    }

    // 5. Step 2: Image Generation AI via Connect Hub
    const imgPrompt = `Create a YouTube/TikTok video thumbnail: ${analysis.layout || 'Eye-catching design'}. 
All text must be written in ${targetLang}: "${analysis.translatedText || ''}". 
Style: Bold high-contrast text, professional social media cover image, HD quality.`;

    const imgResult = await runConnectorAction({
      teamId,
      connectionId,
      actionSlug: 'generate_image',
      input: {
        model: 'dall-e-3',
        prompt: imgPrompt,
        size: '1792x1024',
      },
      callerModule: 'hero-downloader',
    });

    if (!imgResult.success) {
      return NextResponse.json(
        { error: 'Lỗi Tạo ảnh AI: ' + (imgResult.error || 'Không thể thiết kế ảnh mới') },
        { status: 500 }
      );
    }

    const generatedUrl = imgResult.data?.data?.[0]?.url || imgResult.data?.url;
    if (!generatedUrl) {
      return NextResponse.json(
        { error: 'AI không trả về liên kết ảnh hợp lệ' },
        { status: 500 }
      );
    }

    // 6. Download image buffer and upload to R2 cloud storage
    const imgRes = await fetch(generatedUrl);
    if (!imgRes.ok) {
      throw new Error(`Không thể tải ảnh thành phẩm từ AI: ${imgRes.statusText}`);
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const filename = `hero-downloader/thumbnails/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
    const cloudUrl = await uploadFile(buffer, filename, 'image/png');

    // 7. Update database record
    await db
      .update(downloaderVideos)
      .set({
        translatedThumbnailUrl: cloudUrl,
        updatedAt: new Date(),
      })
      .where(eq(downloaderVideos.id, videoId));

    return NextResponse.json({
      success: true,
      translatedThumbnailUrl: cloudUrl,
      originalText: analysis.originalText,
      translatedText: analysis.translatedText,
    });
  } catch (err: any) {
    console.error('[hero-downloader-thumbnail] Unexpected Error:', err);
    return NextResponse.json(
      { error: err.message || 'Lỗi xử lý nội bộ máy chủ' },
      { status: 500 }
    );
  }
}
