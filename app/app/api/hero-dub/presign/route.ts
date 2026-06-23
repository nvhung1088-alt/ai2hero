import { NextResponse } from 'next/server';
import { verifyDubWorkerToken, getPresignedUploadUrlAction } from '@/lib/db/hero-dub-actions';

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
  if (!auth.success || !auth.teamId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { taskId, fileType } = body;

    if (!taskId || !fileType) {
      return NextResponse.json({ error: 'taskId and fileType are required' }, { status: 400 });
    }

    if (fileType !== 'video' && fileType !== 'srt') {
      return NextResponse.json({ error: 'fileType must be "video" or "srt"' }, { status: 400 });
    }

    const result = await getPresignedUploadUrlAction(taskId, auth.teamId, fileType);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      uploadUrl: result.uploadUrl,
      publicUrl: result.publicUrl,
    });
  } catch (error: any) {
    console.error('[API Presign] Presign error:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
