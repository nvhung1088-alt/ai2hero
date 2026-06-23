import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { agentNodeTasks, connectHubConnections } from '@/lib/db/schema';
import { verifyExtensionToken } from '@/lib/db/extension-actions';
import { and, eq, inArray } from 'drizzle-orm';
import { updateTaskStatusAction, saveTaskResultAction } from '@/lib/db/agent-node-actions';
import { runConnectorAction } from '@/lib/connect-hub/connector-service';
import { runChiaSeGPU } from '@/lib/connect-hub/connectors/runners/chiasegpu';
import { dispatchMvpFeedPost } from '@/lib/db/feed-dispatcher';

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

function buildAnalysisPrompt(content: string) {
  return `Bạn là một chuyên gia nghiên cứu nội dung và SEO. Hãy phân tích bài viết dưới đây và trả về một đối tượng JSON duy nhất có cấu trúc chính xác như sau (KHÔNG thêm bất kỳ giải thích, text định dạng Markdown \`\`\`json ngoài đối tượng JSON này):

{
  "summary": "Tóm tắt ngắn gọn nội dung cốt lõi của bài viết trong 2-3 câu",
  "tags": ["Mảng 3-5 tags chủ đề tổng quát, ví dụ: công nghệ, làm đẹp, kinh doanh, phong cách sống"],
  "keywords": ["Mảng 3-5 từ khóa SEO chính trích xuất từ bài viết"],
  "contentAngles": ["Mảng 2-3 góc viết gợi ý mới để phát triển nội dung dựa trên bài này"],
  "tone": "Giọng điệu của bài viết, chọn 1 trong: professional, casual, humorous, informative, inspirational, promotional",
  "language": "Mã ngôn ngữ 2 ký tự của bài viết, ví dụ: vi, en, zh, ja"
}

Nội dung bài viết cần phân tích:
----------------------------------
${content}
----------------------------------`;
}

function cleanAndParseJson(text: string) {
  try {
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.substring(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }
    return JSON.parse(cleanText.trim());
  } catch (error) {
    console.error('[json-parse-error] Failed to parse:', text);
    return null;
  }
}

export async function POST(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 401 });
  }

  const auth = await verifyExtensionToken(token);
  if (!auth.success || !auth.teamId || !auth.userId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { taskId, status, content, errorMessage } = body;

    // 1. Kiểm tra task hoặc tạo task mới nếu cào thủ công (taskId = 0 hoặc undefined)
    let task;
    const isManual = !taskId || taskId === 0;

    if (isManual) {
      if (!content || !content.content) {
        return NextResponse.json({ error: 'content.content is required' }, { status: 400 });
      }
      
      const [newTask] = await db
        .insert(agentNodeTasks)
        .values({
          teamId: auth.teamId,
          userId: auth.userId,
          url: content.metadata?.url || 'Manual Scrape',
          type: 'article',
          priority: 3,
          status: 'processing',
        })
        .returning();
      task = newTask;
    } else {
      const [existingTask] = await db
        .select()
        .from(agentNodeTasks)
        .where(and(eq(agentNodeTasks.id, taskId), eq(agentNodeTasks.teamId, auth.teamId)))
        .limit(1);

      if (!existingTask) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      task = existingTask;
    }

    const currentTaskId = task.id;

    // 2. Nếu extension báo lỗi cào
    if (status === 'failed') {
      await updateTaskStatusAction(currentTaskId, auth.teamId, 'failed', errorMessage || 'Extension failed to scrape content');
      return NextResponse.json({ success: true, message: 'Task marked as failed' });
    }

    if (!content || !content.content) {
      return NextResponse.json({ error: 'content.content is required for success status' }, { status: 400 });
    }

    // Cập nhật trạng thái sang processing (nếu không phải manual đã set sẵn)
    if (!isManual) {
      await updateTaskStatusAction(currentTaskId, auth.teamId, 'processing');
    }

    // 3. Tìm AI connection cho team
    const [aiConnection] = await db
      .select()
      .from(connectHubConnections)
      .where(
        and(
          eq(connectHubConnections.teamId, auth.teamId),
          eq(connectHubConnections.status, 'connected'),
          inArray(connectHubConnections.appSlug, ['openai', 'chiasegpu'])
        )
      )
      .limit(1);

    // 4. Gọi AI phân tích nội dung
    const prompt = buildAnalysisPrompt(content.content);
    let aiText = '';
    let usedModel = 'gpt-3.5-turbo';

    try {
      if (aiConnection) {
        usedModel = aiConnection.appSlug === 'chiasegpu' ? 'gpt-3.5-turbo' : 'gpt-4o-mini';
        const aiRes = await runConnectorAction({
          teamId: auth.teamId,
          connectionId: aiConnection.id,
          actionSlug: 'chat_completion',
          input: {
            model: usedModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
          },
          callerModule: 'hero-agent',
        });

        if (aiRes.success && aiRes.data) {
          aiText = aiRes.data.choices?.[0]?.message?.content || '';
        } else {
          throw new Error(aiRes.error || 'Failed to call AI via connector');
        }
      } else {
        // Fallback: Gọi trực tiếp ChiaSeGPU runner (sử dụng API key hệ thống)
        const response = await runChiaSeGPU({}, 'chat_completion', {
          prompt,
          model: usedModel,
          temperature: 0.3,
        });
        aiText = response.choices?.[0]?.message?.content || '';
      }
    } catch (aiError: any) {
      console.error('[API Result] AI invocation error:', aiError);
      await updateTaskStatusAction(currentTaskId, auth.teamId, 'failed', `AI analysis failed: ${aiError.message}`);
      return NextResponse.json({ error: 'AI analysis failed: ' + aiError.message }, { status: 500 });
    }

    // 5. Parse kết quả JSON từ AI
    const aiParsed = cleanAndParseJson(aiText);
    if (!aiParsed) {
      const errorMsg = 'AI returned invalid JSON format';
      await updateTaskStatusAction(currentTaskId, auth.teamId, 'failed', errorMsg);
      return NextResponse.json({ error: errorMsg, rawResponse: aiText }, { status: 500 });
    }

    // 6. Lưu kết quả
    const saveRes = await saveTaskResultAction({
      taskId: currentTaskId,
      teamId: auth.teamId,
      rawTitle: content.title || 'Untitled',
      rawContent: content.content,
      rawMetadata: content.metadata || {},
      rawLength: content.rawLength || content.content.length,
      cleanLength: content.cleanLength || content.content.length,
      sourceUrl: task.url,
      aiSummary: aiParsed.summary || '',
      aiAnalysis: aiParsed,
      aiModel: usedModel,
      tags: aiParsed.tags || [],
      keywords: aiParsed.keywords || [],
      contentAngles: aiParsed.contentAngles || [],
      tone: aiParsed.tone || 'informative',
      language: aiParsed.language || 'vi',
      contentReady: true,
    });

    if (saveRes.error) {
      await updateTaskStatusAction(currentTaskId, auth.teamId, 'failed', `Failed to save result: ${saveRes.error}`);
      return NextResponse.json({ error: 'Failed to save result: ' + saveRes.error }, { status: 500 });
    }

    // Cập nhật trạng thái task sang completed
    await updateTaskStatusAction(currentTaskId, auth.teamId, 'completed');

    // 7. Đẩy bài viết thông báo lên Social Feed
    try {
      await dispatchMvpFeedPost({
        teamId: auth.teamId,
        userId: auth.userId,
        type: 'mvp_result',
        appId: 'hero-agent',
        message: `🤖 [Hero Agent] Đã cào và phân tích xong nội dung từ nguồn: ${content.title || task.url}`,
        resultPreview: aiParsed.summary || 'Đã phân tích và trích xuất từ khóa, góc viết thành công.',
        resultMetrics: [
          { label: 'Số từ', value: String(content.content.split(/\s+/).length) },
          { label: 'Ngôn ngữ', value: aiParsed.language || 'vi' },
          { label: 'Tone giọng', value: aiParsed.tone || 'informative' }
        ]
      });
    } catch (feedError) {
      console.error('[API Result] Error dispatching feed post:', feedError);
    }

    return NextResponse.json({ success: true, resultId: saveRes.resultId });
  } catch (error: any) {
    console.error('[API Result] Error processing result:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
