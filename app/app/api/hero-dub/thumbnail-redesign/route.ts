import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { dubTasks, connectHubConnections, connectHubBridgeJobs, dubProjects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

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

    // 4. Chuẩn bị Prompt
    let promptText = `Bạn là một chuyên gia đồ họa banner phim điện ảnh. Hãy thiết kế lại tấm ảnh thumbnail (ảnh bìa) đính kèm này:\n` +
      `1. GIỮ NGUYÊN nhân vật, phông nền và bố cục nghệ thuật của tấm ảnh gốc.\n` +
      `2. THAY THẾ toàn bộ các câu chữ tiếng Trung trên ảnh sang tiếng Việt chuẩn văn phong phim Tiên Hiệp/Cổ Trang/Hành động, mượt mà và gây tò mò cho khán giả.\n`;

    if (task.translateContext && task.translateContext.trim()) {
      promptText += `3. TUÂN THỦ TÊN PHIM VÀ BỐI CẢNH DO NGƯỜI DÙNG CUNG CẤP:\n${task.translateContext.trim()}\n`;
    }

    if (logoBase64 && logoSource !== 'none') {
      promptText += `4. CHÈN LOGO THƯƠNG HIỆU: Hãy chèn tấm ảnh logo được đính kèm thứ 2 vào góc trên bên trái (top-left) của banner sao cho nổi bật, chuyên nghiệp và không che mất mặt nhân vật.\n`;
    }

    promptText += `Hãy xuất ra tấm ảnh bìa hoàn thiện theo tỷ lệ chuẩn 16:9 sắc nét nhất.`;

    // 5. Khởi tạo Job trong bridge
    const jobId = uuidv4();
    await db.insert(connectHubBridgeJobs).values({
      id: jobId,
      teamId: task.teamId,
      connectionId: connection.id,
      callerModule: 'hero-dub',
      targetAi: 'gemini',
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
