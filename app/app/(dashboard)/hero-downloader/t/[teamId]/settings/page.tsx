import { redirect } from 'next/navigation';
import DownloaderSettingsClient from './downloader-settings-client';
import { getDownloaderSettingsAction, getDownloaderCookiesAction } from '@/lib/db/hero-downloader-actions';

export default async function DownloaderSettingsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);

  if (isNaN(teamId)) {
    redirect('/dashboard');
  }

  const [settingsRes, cookiesRes] = await Promise.all([
    getDownloaderSettingsAction(teamId),
    getDownloaderCookiesAction(teamId)
  ]);

  const initialSettings = settingsRes.success ? settingsRes.settings : null;
  const initialCookies = cookiesRes.success ? cookiesRes.cookies : [];

  return <DownloaderSettingsClient teamId={teamId} initialSettings={initialSettings} initialCookies={initialCookies} />;
}
