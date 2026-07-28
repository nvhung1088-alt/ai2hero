import { batchTranslateTeamAiAction } from './lib/db/youtube-sync-actions';
async function main() {
  // Pass teamId as string instead of number
  const res = await batchTranslateTeamAiAction("3" as any);
  console.log("RESULT:", res);
}
main().catch(console.error);
