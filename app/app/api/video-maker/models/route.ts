import { NextRequest, NextResponse } from 'next/server';
import { verifyExtensionToken } from '@/lib/db/extension-actions';
import { db } from '@/lib/db/drizzle';
import { connectHubConnections } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getConnectorBySlug } from '@/lib/connect-hub/connectors/registry';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const toonflowModels: any[] = [
      {
        modelName: 'mock:mock-text',
        type: 'text',
        think: false
      },
      {
        modelName: 'mock:mock-image',
        type: 'image',
        modes: ['text']
      },
      {
        modelName: 'mock:mock-video',
        type: 'video',
        modes: ['text', 'singleImage'],
        audio: false,
        durationResolutionMap: {
          '5': ['720p', '1080p']
        }
      }
    ];

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: true, models: toonflowModels });
    }

    const token = authHeader.substring(7);
    const authResult = await verifyExtensionToken(token);

    if (!authResult.success || !authResult.teamId) {
      return NextResponse.json({ success: true, models: toonflowModels });
    }

    // Lấy các connections đang hoạt động của team
    const connections = await db
      .select()
      .from(connectHubConnections)
      .where(
        and(
          eq(connectHubConnections.teamId, authResult.teamId),
          eq(connectHubConnections.status, 'connected')
        )
      );



    for (const conn of connections) {
      const connector = getConnectorBySlug(conn.appSlug);
      if (!connector || !connector.aiCapability || !connector.aiModels) {
        continue;
      }

      for (const model of connector.aiModels) {
        // Định dạng modelName: "connectionId:modelRealName"
        const formattedModelName = `${conn.id}:${model.name}`;

        if (model.type === 'text') {
          toonflowModels.push({
            modelName: formattedModelName,
            type: 'text',
            think: model.think || false
          });
        } else if (model.type === 'image') {
          toonflowModels.push({
            modelName: formattedModelName,
            type: 'image',
            modes: model.modes || ['text']
          });
        } else if (model.type === 'video') {
          toonflowModels.push({
            modelName: formattedModelName,
            type: 'video',
            modes: model.modes || ['text', 'singleImage'],
            audio: false, // Default false cho mock
            durationResolutionMap: {
              '5': ['720p', '1080p']
            }
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      models: toonflowModels
    });
  } catch (err: any) {
    console.error('[video-maker-models] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi máy chủ nội bộ.' },
      { status: 500 }
    );
  }
}
