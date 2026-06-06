import { db } from '@/lib/db/drizzle';
import { connectHubWebhooks, connectHubWebhookLogs } from '@/lib/db/schema';
import { decryptField } from '@/lib/sim-crypto';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

function timingSafeEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (e) {
    return false;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  try {
    const { webhookId } = await params;
    const [webhook] = await db
      .select()
      .from(connectHubWebhooks)
      .where(eq(connectHubWebhooks.id, webhookId))
      .limit(1);

    if (!webhook) {
      return Response.json({ error: 'Webhook not found' }, { status: 404 });
    }

    return Response.json({
      success: true,
      message: 'Webhook endpoint active',
      appSlug: webhook.appSlug,
      status: webhook.status,
    });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  const { webhookId } = await params;
  const processedAt = new Date();
  
  // Trích xuất metadata request
  const method = request.method;
  const sourceIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '0.0.0.0';
  
  // Convert headers thành JSON-safe object
  const headersObj: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headersObj[key] = value;
  });

  // Tìm webhook trong DB
  let webhook: any = null;
  try {
    const [found] = await db
      .select()
      .from(connectHubWebhooks)
      .where(eq(connectHubWebhooks.id, webhookId))
      .limit(1);
    webhook = found;
  } catch (e) {
    console.error('Error fetching webhook details:', e);
  }

  if (!webhook) {
    return Response.json({ error: 'Webhook not found' }, { status: 404 });
  }

  if (webhook.status !== 'active') {
    return Response.json({ error: 'Webhook is paused' }, { status: 403 });
  }

  let rawBody = '';
  let parsedPayload: any = null;
  let signatureValid = 0; // 0 = invalid / unchecked, 1 = valid
  let errorMessage: string | null = null;
  let status: 'success' | 'failed' = 'success';

  try {
    // Đọc raw body (giới hạn 1MB)
    rawBody = await request.text();
    if (rawBody.length > 1024 * 1024) {
      throw new Error('Payload too large (limit 1MB)');
    }

    // Cố gắng parse JSON
    try {
      parsedPayload = JSON.parse(rawBody);
    } catch {
      // Cho phép raw text
      parsedPayload = { rawText: rawBody };
    }

    // Giải mã plain secret key
    const plainSecret = decryptField(webhook.secretHash) || '';

    // Lấy signature headers hoặc query token
    const signatureHeader = 
      request.headers.get('x-hub-signature-256') || 
      request.headers.get('x-signature') || 
      request.headers.get('x-shopify-hmac-sha256') ||
      '';

    const { searchParams } = new URL(request.url);
    const queryToken = searchParams.get('token') || '';

    if (queryToken && plainSecret) {
      // Xác thực qua Token trên query string
      if (timingSafeEqual(queryToken, plainSecret)) {
        signatureValid = 1;
      }
    } else if (signatureHeader && plainSecret) {
      // Xác thực qua HMAC-SHA256
      if (webhook.appSlug === 'shopify') {
        // Shopify HMAC sử dụng Base64
        const computedSignature = crypto
          .createHmac('sha256', plainSecret)
          .update(rawBody)
          .digest('base64');
        if (timingSafeEqual(signatureHeader, computedSignature)) {
          signatureValid = 1;
        }
      } else {
        // Mặc định hoặc GitHub (Hex)
        let receivedSignature = signatureHeader;
        if (signatureHeader.startsWith('sha256=')) {
          receivedSignature = signatureHeader.substring(7);
        }

        const computedHex = crypto
          .createHmac('sha256', plainSecret)
          .update(rawBody)
          .digest('hex');

        const computedBase64 = crypto
          .createHmac('sha256', plainSecret)
          .update(rawBody)
          .digest('base64');

        if (
          timingSafeEqual(receivedSignature, computedHex) || 
          timingSafeEqual(receivedSignature, computedBase64)
        ) {
          signatureValid = 1;
        }
      }
    }
  } catch (error: any) {
    status = 'failed';
    errorMessage = error.message || 'Lỗi xử lý request webhook';
  }

  // Ghi log webhook và cập nhật counter vào DB
  try {
    await db.insert(connectHubWebhookLogs).values({
      webhookId: webhook.id,
      teamId: webhook.teamId,
      method,
      sourceIp,
      headers: headersObj,
      rawBody: rawBody || null,
      parsedPayload: parsedPayload || null,
      signatureValid,
      status,
      errorMessage,
      processedAt,
    });

    // Cập nhật statistics cho webhook
    await db
      .update(connectHubWebhooks)
      .set({
        receivedCount: webhook.receivedCount + 1,
        lastReceivedAt: processedAt,
        updatedAt: new Date(),
      })
      .where(eq(connectHubWebhooks.id, webhook.id));

  } catch (dbError: any) {
    console.error('Error logging webhook trigger:', dbError);
  }

  return Response.json({ success: status === 'success', received: true });
}
