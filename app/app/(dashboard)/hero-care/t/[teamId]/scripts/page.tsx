import { getScriptsAction, getInboxesAction } from '@/lib/db/hero-care-actions';
import ScriptsClient from './scripts-client';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function ScriptsPage({
  params
}: {
  params: Promise<any>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);

  if (isNaN(teamId)) {
    redirect('/dashboard');
  }

  // Load scripts & inboxes
  const [scriptsRes, inboxesRes] = await Promise.all([
    getScriptsAction(teamId),
    getInboxesAction(teamId)
  ]);

  const scripts = scriptsRes.success && scriptsRes.data ? scriptsRes.data : [];
  const inboxes = inboxesRes.success && inboxesRes.data ? inboxesRes.data : [];

  return (
    <div className="w-full">
      <ScriptsClient
        teamId={teamId}
        initialScripts={scripts as any[]}
        inboxes={inboxes as any[]}
      />
    </div>
  );
}
