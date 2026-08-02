import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { systemSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settingRes = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'global_polling_mode'))
      .limit(1);

    if (settingRes.length > 0 && settingRes[0].value) {
      const val = settingRes[0].value as any;
      const mode = (val?.mode as 'normal' | 'eco' | 'emergency') || 'normal';
      const pollIntervalMs = val?.pollIntervalMs || (mode === 'emergency' ? 60000 : mode === 'eco' ? 30000 : 15000);
      const idleTimeoutMinutes = typeof val?.idleTimeoutMinutes === 'number' ? val.idleTimeoutMinutes : 15;
      const maxBackoffMinutes = typeof val?.maxBackoffMinutes === 'number' ? val.maxBackoffMinutes : 5;
      const pauseOnBackground = typeof val?.pauseOnBackground === 'boolean' ? val.pauseOnBackground : true;
      
      return NextResponse.json({
        success: true,
        mode,
        pollIntervalMs,
        idleTimeoutMinutes,
        maxBackoffMinutes,
        pauseOnBackground,
        updatedAt: val?.updatedAt || settingRes[0].updatedAt,
      });
    }
  } catch (error: any) {
    console.error('Error reading polling config:', error);
  }

  // Fallback default
  return NextResponse.json({
    success: true,
    mode: 'normal',
    pollIntervalMs: 15000,
    idleTimeoutMinutes: 15,
    maxBackoffMinutes: 5,
    pauseOnBackground: true,
  });
}
