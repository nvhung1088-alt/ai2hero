import React from 'react';
import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { HeroWebClient } from './heroweb-client';
import { getUserWebsitesAction } from '@/lib/db/website-actions';

export default async function HeroWebPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const { websites, error } = await getUserWebsitesAction();

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  const mappedWebsites = (websites || []).map(w => ({
    ...w,
    createdAt: w.createdAt || new Date()
  }));

  return <HeroWebClient user={user} initialWebsites={mappedWebsites} />;
}
