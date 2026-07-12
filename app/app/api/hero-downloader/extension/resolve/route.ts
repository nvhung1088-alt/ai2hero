import { NextRequest, NextResponse } from 'next/server';
import { verifyExtensionToken } from '@/lib/db/extension-actions';
import { resolveVideoDirectUrlAction, markExtractFailedAction } from '@/lib/db/hero-downloader-actions';

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

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Thiếu Bearer Token' }, { status: 401, headers: corsHeaders });
    }

    const auth = await verifyExtensionToken(token);
    if (!auth.success || !auth.teamId) {
      return NextResponse.json({ success: false, error: auth.error || 'Token không hợp lệ' }, { status: 401, headers: corsHeaders });
    }

    const data = await req.json();
    const { videoId, directMp4Url, error } = data;

    if (!videoId) {
      return NextResponse.json({ success: false, error: 'videoId is required' }, { status: 400, headers: corsHeaders });
    }

    if (directMp4Url) {
      const result = await resolveVideoDirectUrlAction(videoId, auth.teamId, directMp4Url);
      if (result.error) {
        return NextResponse.json({ success: false, error: result.error }, { status: 500, headers: corsHeaders });
      }
      return NextResponse.json({ success: true, video: result.video }, { headers: corsHeaders });
    } else if (error) {
      const result = await markExtractFailedAction(videoId, auth.teamId, error);
      if (result.error) {
        return NextResponse.json({ success: false, error: result.error }, { status: 500, headers: corsHeaders });
      }
      return NextResponse.json({ success: true, video: result.video }, { headers: corsHeaders });
    } else {
      return NextResponse.json({ success: false, error: 'Either directMp4Url or error is required' }, { status: 400, headers: corsHeaders });
    }
  } catch (err: any) {
    console.error('Resolve API error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: corsHeaders });
  }
}
