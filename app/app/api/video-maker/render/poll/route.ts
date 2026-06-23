import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { extensionTokens, videoProjects } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { jwtVerify } from 'jose';

const authSecret = process.env.AUTH_SECRET;
if (!authSecret) throw new Error('AUTH_SECRET is required');
const key = new TextEncoder().encode(authSecret);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7);

    // Verify token
    const { payload } = await jwtVerify(token, key);
    if (payload.type !== 'extension') {
      return NextResponse.json({ success: false, error: 'Invalid token type' }, { status: 403 });
    }

    const deviceId = payload.deviceId as number;
    const teamId = payload.teamId as number;

    const [device] = await db.select().from(extensionTokens).where(eq(extensionTokens.id, deviceId)).limit(1);
    if (!device || device.revokedAt !== null || new Date(device.expiresAt) < new Date()) {
      return NextResponse.json({ success: false, error: 'Device is inactive or revoked' }, { status: 403 });
    }

    // Cập nhật last_used_at
    await db.update(extensionTokens).set({ lastUsedAt: new Date() }).where(eq(extensionTokens.id, deviceId));

    // Tìm dự án đang chờ render
    const [project] = await db.select().from(videoProjects).where(
      and(
        eq(videoProjects.teamId, teamId),
        eq(videoProjects.status, 'ready_to_render')
      )
    ).limit(1);

    if (!project) {
      return NextResponse.json({ success: true, hasJob: false });
    }

    // Có job, assign cho thiết bị này
    await db.update(videoProjects).set({
      status: 'rendering',
      renderDeviceId: deviceId,
      updatedAt: new Date()
    }).where(eq(videoProjects.id, project.id));

    return NextResponse.json({
      success: true,
      hasJob: true,
      job: {
        projectId: project.id,
        title: project.title,
        scenes: project.scenes
      }
    });

  } catch (error: any) {
    console.error('Render Poll Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
