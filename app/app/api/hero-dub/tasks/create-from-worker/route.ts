import { NextResponse } from 'next/server';
import { verifyDubWorkerToken, createDubTaskAction } from '@/lib/db/hero-dub-actions';
import { updateDubScanConfigStatsAction } from '@/lib/db/hero-dub-scan-actions';
import * as path from 'path';

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

export async function POST(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 401 });
  }

  const auth = await verifyDubWorkerToken(token);
  if (!auth.success || !auth.workerId || !auth.teamId || !auth.userId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { videoPaths, config } = body;
    // videoPaths is string[]
    // config is the scan config

    if (!videoPaths || !Array.isArray(videoPaths) || videoPaths.length === 0) {
      if (config && config.id) {
        await updateDubScanConfigStatsAction(config.id, 0);
      }
      return NextResponse.json({ success: true, count: 0, message: 'No new videos to process' });
    }

    let successCount = 0;
    
    for (const filePath of videoPaths) {
      const result = await createDubTaskAction({
        teamId: auth.teamId,
        userId: auth.userId,
        sourceUrl: filePath,
        taskTitle: config.name ? `${config.name} - ${path.basename(filePath)}` : path.basename(filePath),
        sourceLang: config.sourceLang,
        targetLang: config.targetLang,
        asrEngine: config.asrEngine,
        translateEngine: config.aiAppSlug && config.aiModel ? 'connect-hub' : 'google-free',
        llmModel: config.aiAppSlug && config.aiModel ? `${config.aiAppSlug}|${config.aiModel}` : undefined,
        subtitleMode: config.subtitleMode,
        ttsEnabled: config.ttsEnabled,
        ttsEngine: config.ttsEngine,
        ttsVoice: config.ttsVoice,
        ttsSpeed: config.ttsSpeed,
        bgVolume: config.bgVolume,
        ttsVolume: config.ttsVolume,
        outputFolder: config.outputFolder,
      });

      if (result.success && !result.isDuplicate) {
        successCount++;
      }
    }

    if (config.id) {
      await updateDubScanConfigStatsAction(config.id, successCount);
    }

    return NextResponse.json({ 
      success: true, 
      count: successCount,
      message: `Đã nộp ${successCount} video mới thành công.` 
    });
  } catch (error: any) {
    console.error('[API Create Task from Worker] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
