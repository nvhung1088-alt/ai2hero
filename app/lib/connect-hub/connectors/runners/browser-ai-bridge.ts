import { db } from '@/lib/db/drizzle';
import { connectHubBridgeJobs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function runBrowserAiBridge(
  creds: Record<string, string>,
  actionSlug: string,
  input: Record<string, any>,
  extraContext?: { teamId?: number; connectionId?: number; callerModule?: string }
): Promise<any> {
  if (actionSlug !== 'chat_completion') {
    throw new Error(`Action "${actionSlug}" không được hỗ trợ bởi Browser AI Bridge.`);
  }

  const prompt = input.prompt;
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Nội dung Prompt là bắt buộc.');
  }

  const targetAi = input.targetAi || 'gemini';
  const attachments = input.attachments ? (typeof input.attachments === 'string' ? JSON.parse(input.attachments) : input.attachments) : null;
  const teamId = input.teamId || extraContext?.teamId;
  const connectionId = input.connectionId || extraContext?.connectionId;
  const callerModule = input.callerModule || extraContext?.callerModule || 'unknown';

  if (!teamId || !connectionId) {
    throw new Error('Thiếu thông tin teamId hoặc connectionId.');
  }

  let jobId = input.jobId;
  let jobRecord: any = null;

  // 1. Nếu caller truyền jobId cũ (khi retry), kiểm tra xem job cũ đã hoàn thành chưa
  if (jobId) {
    const [existing] = await db
      .select()
      .from(connectHubBridgeJobs)
      .where(and(eq(connectHubBridgeJobs.id, jobId), eq(connectHubBridgeJobs.teamId, teamId)))
      .limit(1);

    if (existing) {
      if (existing.status === 'done' && existing.result) {
        return {
          choices: [{ message: { content: existing.result } }],
          content: existing.result,
          targetAi: existing.targetAi,
          jobId: existing.id,
          isCompleted: true,
        };
      }
      if (existing.status === 'failed') {
        throw new Error(`Job #${jobId} báo lỗi từ Extension: ${existing.error || 'Unknown error'}`);
      }
      jobRecord = existing;
    }
  }

  // 2. Nếu chưa có jobRecord, tạo Job mới
  if (!jobRecord) {
    jobId = uuidv4();
    const [newJob] = await db
      .insert(connectHubBridgeJobs)
      .values({
        id: jobId,
        teamId,
        connectionId,
        callerModule,
        targetAi,
        prompt,
        attachments,
        status: 'pending',
      })
      .returning();
    jobRecord = newJob;
  }

  // 3. Vòng lặp chờ Extension xử lý (tối đa 45 giây)
  const startTime = Date.now();
  const TIMEOUT_MS = 45000; // 45s safe limit cho Vercel

  while (Date.now() - startTime < TIMEOUT_MS) {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Poll DB mỗi 2 giây

    const [latest] = await db
      .select()
      .from(connectHubBridgeJobs)
      .where(eq(connectHubBridgeJobs.id, jobId))
      .limit(1);

    if (latest) {
      if (latest.status === 'done' && latest.result) {
        return {
          choices: [{ message: { content: latest.result } }],
          content: latest.result,
          targetAi: latest.targetAi,
          jobId: latest.id,
          isCompleted: true,
        };
      }
      if (latest.status === 'failed') {
        throw new Error(`Lỗi từ Extension trình duyệt: ${latest.error || 'Không thể lấy kết quả từ AI'}`);
      }
    }
  }

  // 4. Nếu quá 45s chưa có kết quả (Extension đang xử lý hoặc chưa khởi chạy)
  return {
    choices: [{ message: { content: `[PENDING] Extension đang xử lý trên trình duyệt. Job ID: ${jobId}` } }],
    content: `[PENDING] Task đã được gửi tới Extension. Đang chờ AI phản hồi...`,
    jobId,
    targetAi,
    isPending: true,
  };
}
