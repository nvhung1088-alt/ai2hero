import { getSnapshotsAction, getInboxesAction } from '@/lib/db/hero-care-actions';
import SnapshotsClient from './snapshots-client';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function SnapshotsPage({
  params
}: {
  params: Promise<any>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);

  if (isNaN(teamId)) {
    redirect('/dashboard');
  }

  // Load snapshots & inboxes
  const [snapshotsRes, inboxesRes] = await Promise.all([
    getSnapshotsAction(teamId),
    getInboxesAction(teamId)
  ]);

  const snapshots = snapshotsRes.success && snapshotsRes.data ? snapshotsRes.data : [];
  const inboxes = inboxesRes.success && inboxesRes.data ? inboxesRes.data : [];

  return (
    <div className="w-full">
      <SnapshotsClient
        teamId={teamId}
        initialSnapshots={snapshots as any[]}
        inboxes={inboxes as any[]}
      />
    </div>
  );
}
