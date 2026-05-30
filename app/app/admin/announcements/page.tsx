import { db } from '@/lib/db/drizzle';
import { systemAnnouncements, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import AnnouncementsClient from './announcements-client';

export const dynamic = 'force-dynamic';

export default async function AdminAnnouncementsPage() {
  // Fetch announcements from DB join with users (creator)
  const announcementsList = await db
    .select({
      id: systemAnnouncements.id,
      title: systemAnnouncements.title,
      content: systemAnnouncements.content,
      version: systemAnnouncements.version,
      severity: systemAnnouncements.severity,
      createdAt: systemAnnouncements.createdAt,
      creatorName: users.name,
      creatorEmail: users.email,
    })
    .from(systemAnnouncements)
    .leftJoin(users, eq(systemAnnouncements.createdBy, users.id))
    .orderBy(desc(systemAnnouncements.createdAt));

  return <AnnouncementsClient initialAnnouncements={announcementsList} />;
}
