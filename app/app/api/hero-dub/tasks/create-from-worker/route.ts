import { NextResponse } from 'next/server';
import { verifyDubWorkerToken, createDubTaskAction } from '@/lib/db/hero-dub-actions';
import { updateDubScanConfigStatsAction } from '@/lib/db/hero-dub-scan-actions';
import * as path from 'path';
import * as fs from 'fs';

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
    const errors: string[] = [];
    
    const rawConfigId = config?.id || config?.config_id || config?.scan_config_id || config?.scanConfigId;
    const scanConfigId = rawConfigId ? parseInt(rawConfigId.toString()) : undefined;

    for (const filePath of videoPaths) {
      const sourceLang = config.sourceLang || config.source_lang;
      const targetLang = config.targetLang || config.target_lang;
      const asrEngine = config.asrEngine || config.asr_engine;
      const aiAppSlug = config.aiAppSlug || config.ai_app_slug;
      const aiModel = config.aiModel || config.ai_model;
      const subtitleMode = config.subtitleMode || config.subtitle_mode;
      const ttsEnabled = config.ttsEnabled ?? config.tts_enabled ?? false;
      const ttsEngine = config.ttsEngine || config.tts_engine;
      const ttsVoice = config.ttsVoice || config.tts_voice;
      const ttsSpeed = config.ttsSpeed || config.tts_speed || '1.2';
      const bgVolume = config.bgVolume || config.bg_volume;
      const ttsVolume = config.ttsVolume || config.tts_volume;
      const outputFolder = config.outputFolder || config.output_folder;

      // Auto-detect matching image thumbnail file in same folder
      let sourceThumbnailUrl: string | undefined = undefined;
      try {
        const parsedPath = path.parse(filePath);
        const possibleExts = ['.jpeg', '.jpg', '.png', '.webp', '.JPEG', '.JPG', '.PNG', '.WEBP'];
        for (const ext of possibleExts) {
          const imgPath = path.join(parsedPath.dir, `${parsedPath.name}${ext}`);
          if (fs.existsSync(imgPath)) {
            sourceThumbnailUrl = imgPath;
            break;
          }
        }
      } catch (e) {
        console.error('[create-from-worker] Thumbnail check error:', e);
      }

      const result = await createDubTaskAction({
        teamId: auth.teamId,
        userId: auth.userId,
        sourceUrl: filePath,
        taskTitle: path.basename(filePath),
        sourceThumbnailUrl,
        sourceLang,
        targetLang,
        asrEngine,
        translateEngine: aiAppSlug && aiModel ? 'connect-hub' : 'google-free',
        llmModel: aiAppSlug && aiModel ? `${aiAppSlug}|${aiModel}` : undefined,
        subtitleMode,
        ttsEnabled,
        ttsEngine,
        ttsVoice,
        ttsSpeed,
        bgVolume,
        ttsVolume,
        outputFolder: outputFolder?.trim() || undefined,
        scanConfigId,
      });

      console.log(`[create-from-worker] filePath=${filePath} result=`, JSON.stringify(result));

      if (result?.success) {
        successCount++;
      } else if (result?.error) {
        errors.push(`${path.basename(filePath)}: ${result.error}`);
      }
    }

    if (scanConfigId) {
      await updateDubScanConfigStatsAction(scanConfigId, successCount);
    }

    return NextResponse.json({ 
      success: true, 
      count: successCount,
      message: `Đã nộp ${successCount} video mới thành công.`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[API Create Task from Worker] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
