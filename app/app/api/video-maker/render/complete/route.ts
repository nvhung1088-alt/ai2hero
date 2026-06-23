import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { extensionTokens, videoProjects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
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

    const body = await req.json();
    const { projectId, outputUrl, outputStorage, error } = body;

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
    }

    // Verify ownership
    const [project] = await db.select().from(videoProjects).where(
      and(
        eq(videoProjects.id, projectId),
        eq(videoProjects.teamId, teamId)
      )
    ).limit(1);

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    if (error) {
      await db.update(videoProjects).set({
        status: 'error',
        updatedAt: new Date()
      }).where(eq(videoProjects.id, projectId));
    } else {
      await db.update(videoProjects).set({
        status: 'done',
        outputUrl,
        outputStorage: outputStorage || 'local',
        updatedAt: new Date()
      }).where(eq(videoProjects.id, projectId));
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Render Complete Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
