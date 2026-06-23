'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAppDynamicPath } from './apps-registry';

const PREVIEW_COOKIE_PREFIX = 'preview_app_';

export async function enablePreviewModeAction(appId: string, teamId: number) {
  const cookieStore = await cookies();
  cookieStore.set(`${PREVIEW_COOKIE_PREFIX}${appId}`, teamId.toString(), {
    path: '/',
    maxAge: 60 * 60, // 1 hour preview
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  const path = getAppDynamicPath(appId, teamId);
  redirect(path);
}

export async function disablePreviewModeAction(appId: string) {
  const cookieStore = await cookies();
  cookieStore.delete(`${PREVIEW_COOKIE_PREFIX}${appId}`);
  redirect('/dashboard/store');
}

export async function isPreviewMode(appId: string, teamId: string | number): Promise<boolean> {
  const cookieStore = await cookies();
  const previewTeamId = cookieStore.get(`${PREVIEW_COOKIE_PREFIX}${appId}`)?.value;
  return previewTeamId === teamId.toString();
}
