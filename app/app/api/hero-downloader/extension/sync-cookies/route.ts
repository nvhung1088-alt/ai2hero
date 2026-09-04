import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { downloaderCookies } from '@/lib/db/schema';
import { eq, and, ilike } from 'drizzle-orm';
import { verifyExtensionToken } from '@/lib/db/extension-actions';
import { getUser } from '@/lib/db/queries';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    const body = await req.json();
    const { domain, name, cookieData } = body;

    if (!cookieData || !cookieData.trim()) {
      return NextResponse.json({ success: false, error: 'Thiếu cookieData' }, { status: 400, headers: corsHeaders });
    }

    let targetTeamId: number | null = null;

    // 1. Kiểm tra Bearer Token nếu có
    const token = extractBearerToken(req);
    if (token) {
      const tokenResult = await verifyExtensionToken(token);
      if (tokenResult.success && tokenResult.teamId) {
        targetTeamId = tokenResult.teamId;
      }
    }

    // 2. Nếu không có token, thử lấy team từ user session
    if (!targetTeamId) {
      try {
        const user = await getUser();
        if (user && (user as any).teamId) {
          targetTeamId = (user as any).teamId;
        }
      } catch (e) {}
    }

    // 3. Fallback teamId từ body nếu được truyền
    if (!targetTeamId && body.teamId) {
      targetTeamId = Number(body.teamId);
    }

    // 4. Mặc định Workspace 3 nếu không xác định được
    if (!targetTeamId) {
      targetTeamId = 3;
    }

    const domainName = (domain || 'Global').toLowerCase();
    const cookieTitle = name || `${domainName.toUpperCase()} Cookie (Auto Sync)`;

    // Tìm cookie cũ của domain này trong Team để cập nhật ghi đè (Upsert)
    const existing = await db
      .select()
      .from(downloaderCookies)
      .where(
        and(
          eq(downloaderCookies.teamId, targetTeamId),
          ilike(downloaderCookies.name, `%${domainName}%`)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(downloaderCookies)
        .set({
          name: cookieTitle,
          cookieData: cookieData.trim(),
          status: 'alive',
          updatedAt: new Date(),
        })
        .where(eq(downloaderCookies.id, existing[0].id))
        .returning();

      return NextResponse.json(
        { success: true, action: 'updated', cookieId: updated.id, teamId: targetTeamId },
        { headers: corsHeaders }
      );
    } else {
      const [created] = await db
        .insert(downloaderCookies)
        .values({
          teamId: targetTeamId,
          name: cookieTitle,
          cookieData: cookieData.trim(),
          status: 'alive',
        })
        .returning();

      return NextResponse.json(
        { success: true, action: 'created', cookieId: created.id, teamId: targetTeamId },
        { headers: corsHeaders }
      );
    }
  } catch (error: any) {
    console.error('[API Downloader Sync Cookies] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}
