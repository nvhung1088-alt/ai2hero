import HistoryClient from './history-client';

export const revalidate = 0;

export default async function HistoryPage({
  params,
}: {
  params: Promise<any>;
}) {
  const { teamId: teamIdStr } = await params;
  const teamId = parseInt(teamIdStr, 10);
  
  if (isNaN(teamId)) {
    return <div>Invalid Team ID</div>;
  }

  return <HistoryClient teamId={teamId} />;
}