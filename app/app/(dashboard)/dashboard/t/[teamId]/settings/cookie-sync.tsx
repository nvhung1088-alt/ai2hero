'use client';

import { useEffect } from 'react';
import { setActiveTeamCookie } from '@/lib/team-cookie';

export function CookieSync({ teamId }: { teamId: number }) {
  useEffect(() => {
    setActiveTeamCookie(teamId).catch(console.error);
  }, [teamId]);
  
  return null;
}
