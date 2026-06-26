'use client';

import { useEffect } from 'react';
import { setActiveTeamCookie } from '@/lib/team-cookie';

export function CookieSync({ teamId }: { teamId: number }) {
  useEffect(() => {
    // Tránh Vòng lặp vô tận (Infinite Loop) của Server Action gây sập Next.js Server (AggregateError/Timeout)
    const currentCookie = document.cookie.split('; ').find(row => row.startsWith('activeTeamId='));
    const currentTeamId = currentCookie ? currentCookie.split('=')[1] : null;
    
    if (currentTeamId !== teamId.toString()) {
      setActiveTeamCookie(teamId).catch(console.error);
    }
  }, [teamId]);
  
  return null;
}
