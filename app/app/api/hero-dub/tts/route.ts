import { NextResponse } from 'next/server';
import { verifyDubWorkerToken } from '@/lib/db/hero-dub-actions';
import { db } from '@/lib/db/drizzle';
import { dubTasks, connectHubConnections } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { decryptField } from '@/lib/sim-crypto';
import { executeAction } from '@/lib/connect-hub/connectors/engine';

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
  if (!auth.success || !auth.workerId || !auth.teamId) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { taskId, text, voice } = body;

    if (!taskId || !text) {
      return NextResponse.json({ error: 'taskId and text are required' }, { status: 400 });
    }

    // 1. Get task to verify team ownership
    const [task] = await db
      .select({ id: dubTasks.id })
      .from(dubTasks)
      .where(and(eq(dubTasks.id, taskId), eq(dubTasks.teamId, auth.teamId)))
      .limit(1);

    if (!task) {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
    }

    // 2. Fetch the OpenAI connection for this team (since Connect Hub TTS currently uses OpenAI)
    const [connection] = await db
      .select()
      .from(connectHubConnections)
      .where(
        and(
          eq(connectHubConnections.teamId, auth.teamId),
          eq(connectHubConnections.appSlug, 'openai'),
          eq(connectHubConnections.status, 'connected')
        )
      )
      .limit(1);

    if (!connection) {
      return NextResponse.json({ error: 'OpenAI connection not found or disconnected in Connect Hub' }, { status: 400 });
    }

    // 3. Decrypt credentials
    const decryptedJson = decryptField(connection.encryptedCredentials) || '{}';
    const credentials = JSON.parse(decryptedJson);

    // 4. Call Connect Hub Engine
    const result = await executeAction('openai', credentials, 'text_to_speech', {
      model: 'tts-1', // Default model
      text,
      voice: voice || 'nova'
    });

    if (!result.success || !result.data) {
       console.error('[API TTS] AI Engine Error:', result.error);
       return NextResponse.json({ error: result.error || 'AI TTS request failed' }, { status: 500 });
    }

    // Connect Hub executeAction wraps return data in { success, data }
    // Let's unwrap if nested
    let resultData = result.data;
    if (resultData && resultData.success && resultData.data) {
      resultData = resultData.data;
    }

    const { audio, format } = resultData;
    if (!audio) {
      console.error('[API TTS] No audio content returned from runner:', resultData);
      return NextResponse.json({ error: 'No audio returned from TTS engine' }, { status: 500 });
    }

    // 5. Convert base64 back to binary buffer
    const audioBuffer = Buffer.from(audio, 'base64');

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': format === 'mp3' ? 'audio/mpeg' : `audio/${format}`,
        'Content-Length': audioBuffer.length.toString()
      }
    });

  } catch (error: any) {
    console.error('[API TTS] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
