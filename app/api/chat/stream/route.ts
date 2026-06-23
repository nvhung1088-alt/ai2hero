import { NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { socialMessages, socialConversationMembers } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { eq, and, gt, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const conversationIdStr = searchParams.get('conversationId');
  const lastIdStr = searchParams.get('lastId');

  if (!conversationIdStr) {
    return new Response('Missing conversationId', { status: 400 });
  }

  const conversationId = parseInt(conversationIdStr);
  const initialLastId = lastIdStr ? parseInt(lastIdStr) : 0;

  // Verify membership
  const membership = await db.query.socialConversationMembers.findFirst({
    where: and(
      eq(socialConversationMembers.conversationId, conversationId),
      eq(socialConversationMembers.userId, user.id)
    )
  });

  if (!membership) {
    return new Response('Forbidden', { status: 403 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      let lastId = initialLastId;
      const encoder = new TextEncoder();
      
      // Auto-close after 5 minutes of no new messages (optional)
      let idleTime = 0;
      const MAX_IDLE_TIME = 5 * 60 * 1000;

      const interval = setInterval(async () => {
        try {
          idleTime += 2000;
          
          if (idleTime >= MAX_IDLE_TIME) {
            controller.enqueue(encoder.encode(`event: timeout\ndata: {"message": "Connection closed due to inactivity"}\n\n`));
            clearInterval(interval);
            controller.close();
            return;
          }

          // Get new messages
          let newMessages: any[] = [];
          if (lastId > 0) {
            newMessages = await db.query.socialMessages.findMany({
              where: and(
                eq(socialMessages.conversationId, conversationId),
                gt(socialMessages.id, lastId)
              ),
              orderBy: desc(socialMessages.createdAt),
              limit: 50,
              with: {
                sender: true
              }
            });
            newMessages = newMessages.reverse();
          }

          if (newMessages.length > 0) {
            idleTime = 0; // Reset idle time
            lastId = newMessages[newMessages.length - 1].id;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(newMessages)}\n\n`));
          } else {
            // Send heartbeat to keep connection alive
            controller.enqueue(encoder.encode(`: heartbeat\n\n`));
          }
        } catch (err) {
          console.error('[SSE Error]', err);
          controller.enqueue(encoder.encode(`event: error\ndata: {"message": "Internal Server Error"}\n\n`));
          clearInterval(interval);
          try {
             controller.close();
          } catch (e) {}
        }
      }, 2000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch (e) {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
