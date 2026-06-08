import { getInboxesAction } from '@/lib/db/hero-care-actions';
import ChatClient from './chat-client';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function ChatPage({
  params
}: {
  params: Promise<any>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);

  if (isNaN(teamId)) {
    redirect('/dashboard');
  }

  const res = await getInboxesAction(teamId);
  const inboxes = res.success && res.data ? res.data : [];

  return (
    <div className="w-full h-full flex flex-col">
      <ChatClient teamId={teamId} inboxes={inboxes} />
    </div>
  );
}
