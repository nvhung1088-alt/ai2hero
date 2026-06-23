'use server';

import { cookies } from 'next/headers';

export async function setActiveTeamCookie(teamId: string | number) {
  const cookieStore = await cookies();
  cookieStore.set('activeTeamId', teamId.toString(), {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export async function getActiveTeamCookie(): Promise<number | null> {
  const cookieStore = await cookies();
  const teamIdStr = cookieStore.get('activeTeamId')?.value;
  if (!teamIdStr) return null;
  
  // Trích xuất số từ chuỗi (ví dụ: 'team-1' -> 1) để map với DB team.id
  const match = teamIdStr.match(/\d+/);
  if (match) {
    return parseInt(match[0], 10);
  }
  return null;
}
