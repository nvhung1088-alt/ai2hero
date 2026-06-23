import { redirect, notFound } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { getGroupById, getGroupMembers } from '@/lib/db/social-group-actions';
import { getGroupPendingMembers, getGroupPendingPosts } from '@/lib/db/social-queries';
import { db } from '@/lib/db/drizzle';
import { socialGroupMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { GroupAdminClient } from './admin-client';

export const revalidate = 0;

export default async function GroupAdminPage(props: { params: Promise<{ groupId: string }> }) {
  const params = await props.params;
  const groupId = parseInt(params.groupId);
  if (isNaN(groupId)) notFound();

  const user = await getUser();
  if (!user) redirect('/sign-in');

  const group = await getGroupById(groupId);
  if (!group) notFound();

  const membership = await db.query.socialGroupMembers.findFirst({
    where: and(eq(socialGroupMembers.groupId, groupId), eq(socialGroupMembers.userId, user.id))
  });

  if (!membership || (membership.role !== 'admin' && membership.role !== 'moderator')) {
    redirect(`/groups/${groupId}`);
  }

  const members = await getGroupMembers(groupId);
  const pendingMembers = await getGroupPendingMembers(groupId);
  const pendingPosts = await getGroupPendingPosts(groupId);

  return <GroupAdminClient 
    group={group} 
    members={members} 
    pendingMembers={pendingMembers}
    pendingPosts={pendingPosts}
    myRole={membership.role} 
  />;
}
