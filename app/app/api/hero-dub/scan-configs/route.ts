import { NextResponse } from 'next/server';
import { verifyDubWorkerToken } from '@/lib/db/hero-dub-actions';
import { getDubScanConfigsAction } from '@/lib/db/hero-dub-scan-actions';
import { getCachedTrafficConfig } from '@/app/admin/actions';

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

export async function GET(request: Request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 401 });
  }

  const auth = await verifyDubWorkerToken(token);
  if (!auth.success || !auth.workerId || !auth.teamId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const trafficConfig = await getCachedTrafficConfig();
    const result = await getDubScanConfigsAction(auth.teamId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      configs: result.configs,
      pollingMode: trafficConfig.mode,
      pollIntervalMs: trafficConfig.pollIntervalMs,
    });
  } catch (error: any) {
    console.error('[API Scan Configs] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
