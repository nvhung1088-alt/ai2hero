import { NextRequest, NextResponse } from 'next/server';
import { verifyExtensionToken } from '@/lib/db/extension-actions';
import { getPendingExtractVideosAction } from '@/lib/db/hero-downloader-actions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function extractBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

import { db } from '@/lib/db/drizzle';
import { systemSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function getPollingConfig() {
  try {
    const res = await db.select().from(systemSettings).where(eq(systemSettings.key, 'global_polling_mode')).limit(1);
    if (res.length > 0 && res[0].value) {
      const val = res[0].value as any;
      const mode = (val?.mode as 'normal' | 'eco' | 'emergency') || 'normal';
      const pollIntervalMs = val?.pollIntervalMs || (mode === 'emergency' ? 60000 : mode === 'eco' ? 30000 : 15000);
      const idleTimeoutMinutes = typeof val?.idleTimeoutMinutes === 'number' ? val.idleTimeoutMinutes : 15;
      const maxBackoffMinutes = typeof val?.maxBackoffMinutes === 'number' ? val.maxBackoffMinutes : 5;
      return { mode, pollIntervalMs, idleTimeoutMinutes, maxBackoffMinutes };
    }
  } catch (e) {}
  return { mode: 'normal', pollIntervalMs: 15000, idleTimeoutMinutes: 15, maxBackoffMinutes: 5 };
}

export async function GET(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Thiếu Bearer Token' }, { status: 401, headers: corsHeaders });
    }

    const auth = await verifyExtensionToken(token);
    if (!auth.success || !auth.teamId) {
      return NextResponse.json({ success: false, error: auth.error || 'Token không hợp lệ' }, { status: 401, headers: corsHeaders });
    }

    const pollingConfig = await getPollingConfig();

    // Call server action to get pending tasks and mark them as extracting
    const result = await getPendingExtractVideosAction(auth.teamId, 5);

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error, ...pollingConfig }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({
      success: true,
      tasks: result.tasks,
      pollingMode: pollingConfig.mode,
      pollIntervalMs: pollingConfig.pollIntervalMs,
      idleTimeoutMinutes: pollingConfig.idleTimeoutMinutes,
      maxBackoffMinutes: pollingConfig.maxBackoffMinutes,
    }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Pending-extract API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
  }
}
