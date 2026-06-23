import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { getPageById } from '@/lib/db/social-page-actions';
import { PageAdminClient } from './admin-client';

export default async function PageAdminRoute({ params }: { params: Promise<{ pageId: string }> }) {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const { pageId: pageIdStr } = await params;
  const pageId = parseInt(pageIdStr, 10);
  if (isNaN(pageId)) redirect('/pages');

  const pageData = await getPageById(pageId);
  if (!pageData) redirect('/pages');

  if (pageData.ownerId !== user.id) {
    redirect(`/pages/${pageId}`);
  }

  return <PageAdminClient pageData={pageData} />;
}
