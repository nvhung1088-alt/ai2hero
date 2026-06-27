import { NextResponse } from 'next/server';
import { verifyCoccocWorkerToken, pollCoccocProjectsToScanAction } from '@/lib/db/hero-coccoc-actions';

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

  const auth = await verifyCoccocWorkerToken(token);
  if (!auth.success || !auth.teamId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await pollCoccocProjectsToScanAction(auth.teamId);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, projects: result.projects });
  } catch (error: any) {
    console.error('[API Coccoc Scan Configs] Error polling projects:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
