import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { dubTasks, connectHubConnections, connectHubBridgeJobs, dubProjects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskId, imageBase64, logoBase64, logoSource } = body;

    if (!taskId || !imageBase64) {
      return NextResponse.json({ error: 'taskId and imageBase64 are required' }, { status: 400 });
    }

    // 1. Get task details
    const [task] = await db
      .select()
      .from(dubTasks)
      .where(eq(dubTasks.id, taskId))
      .limit(1);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 2. Tìm connection của browser-ai-bridge thuộc team này
    const [connection] = await db
      .select()
      .from(connectHubConnections)
      .where(and(eq(connectHubConnections.teamId, task.teamId), eq(connectHubConnections.appSlug, 'browser-ai-bridge'), eq(connectHubConnections.status, 'connected')))
      .limit(1);

    if (!connection) {
      return NextResponse.json({ error: 'No active Browser AI Bridge connection found for this team' }, { status: 400 });
    }

    // 3. Chuẩn bị danh sách attachments
    const attachments: any[] = [
      { type: 'image', name: 'thumbnail_original', base64: imageBase64 }
    ];

    if (logoBase64 && logoSource !== 'none') {
      attachments.push({ type: 'image', name: 'logo_brand', base64: logoBase64 });
    }

    // 4. Chuẩn bị Prompt Thiết kế Thumbnail Chuyên Nghiệp
    let promptText = `Bạn là một Chuyên gia Thiết kế Banner & Thumbnail Phim hàng đầu. Hãy thiết kế lại tấm ảnh thumbnail (ảnh bìa) đính kèm này theo các yêu cầu nghiêm ngặt sau:\n\n` +
      `1. GIỮ NGUYÊN BỐ CỤC & ẢNH NỀN: Giữ nguyên 100% phông nền, nhân vật và biểu cảm nghệ thuật của tấm ảnh gốc. Không thay đổi nhân vật hay ánh sáng phông nền.\n` +
      `2. THAY THẾ CHỮ SANG TIẾNG VIỆT: Phát hiện toàn bộ các câu chữ/tiêu đề trên ảnh gốc và DỊCH SANG TIẾNG VIỆT với văn phong giật gân, cuốn hút, hấp dẫn và tự nhiên.\n` +
      `3. TYPOGRAPHY & FONT CHỮ: Sử dụng phông chữ tiếng Việt nghệ thuật, ấn tượng, có hiệu ứng nổi bật (Glow/Shadow/3D) phù hợp với bối cảnh và màu sắc tấm ảnh.\n`;

    if (task.translateContext && task.translateContext.trim()) {
      promptText += `4. TUÂN THỦ TÊN PHIM VÀ BỐI CẢNH DO NGƯỜI DÙNG CUNG CẤP:\n${task.translateContext.trim()}\n`;
    }

    if (logoBase64 && logoSource !== 'none') {
      const posMap: Record<string, string> = {
        'top-left': 'góc trên bên trái (top-left)',
        'top-right': 'góc trên bên phải (top-right)',
        'bottom-left': 'góc dưới bên trái (bottom-left)',
        'bottom-right': 'góc dưới bên phải (bottom-right)',
        'center': 'ở chính giữa banner (center)',
      };
      const posText = posMap[task.thumbnailLogoPosition || 'top-left'] || 'góc trên bên trái (top-left)';
      promptText += `5. CHÈN LOGO THƯƠNG HIỆU: Hãy chèn tấm ảnh logo đính kèm thứ 2 vào ${posText}. GIỮ NGUYÊN 100% HÌNH DẠNG, MÀU SẮC VÀ TỶ LỆ LOGO GỐC, tuyệt đối không biến dạng logo và không che mặt nhân vật.\n`;
    }

    promptText += `\nHãy xuất ra tấm ảnh bìa hoàn thiện đẹp mắt, chuyên nghiệp nhất theo tỷ lệ 16:9.`;

    // 5. Khởi tạo Job trong bridge với targetAi lấy từ model (chatgpt / gemini / claude)
    const targetAiModel = (task.thumbnailAiModel && ['gemini', 'chatgpt', 'claude'].includes(task.thumbnailAiModel.toLowerCase()))
      ? task.thumbnailAiModel.toLowerCase()
      : 'gemini';

    const jobId = crypto.randomUUID();
    await db.insert(connectHubBridgeJobs).values({
      id: jobId,
      teamId: task.teamId,
      connectionId: connection.id,
      callerModule: 'hero-dub',
      targetAi: targetAiModel,
      prompt: promptText,
      attachments: attachments,
      status: 'pending',
    });

    console.log(`[Thumbnail Redesign API] Created Bridge Job ${jobId} for task #${taskId}`);

    // 6. Polling chờ Extension hoàn thành tác vụ (Tối đa 90s)
    const startTime = Date.now();
    const TIMEOUT_MS = 90000;

    while (Date.now() - startTime < TIMEOUT_MS) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const [updatedJob] = await db
        .select()
        .from(connectHubBridgeJobs)
        .where(eq(connectHubBridgeJobs.id, jobId))
        .limit(1);

      if (updatedJob && updatedJob.status === 'done' && updatedJob.result) {
        // Cập nhật kết quả thumbnail vào DB
        await db
          .update(dubTasks)
          .set({ resultThumbnailUrl: updatedJob.result })
          .where(eq(dubTasks.id, taskId));

        return NextResponse.json({
          success: true,
          resultThumbnailUrl: updatedJob.result,
          message: 'Thiết kế lại Thumbnail AI thành công!'
        });
      }

      if (updatedJob && updatedJob.status === 'failed') {
        return NextResponse.json({ error: updatedJob.error || 'AI Bridge processing failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Thumbnail redesign request timed out' }, { status: 504 });

  } catch (error: any) {
    console.error('[Thumbnail Redesign API Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
