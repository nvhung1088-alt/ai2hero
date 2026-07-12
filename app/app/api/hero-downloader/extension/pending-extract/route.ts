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

    // Call server action to get pending tasks and mark them as extracting
    const result = await getPendingExtractVideosAction(auth.teamId, 5);

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, tasks: result.tasks }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Pending-extract API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
  }
}
