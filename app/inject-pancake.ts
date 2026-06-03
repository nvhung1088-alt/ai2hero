import { db } from './lib/db/drizzle';
import { connectHubConnections } from './lib/db/schema';

async function main() {
  const team = await db.query.teams.findFirst();
  if (!team) {
    console.error("No team found!");
    process.exit(1);
  }

  // Check if exists
  const exists = await db.query.connectHubConnections.findFirst({
    where: (table, { eq }) => eq(table.appSlug, 'pancake-chat')
  });

  if (exists) {
    console.log("Already exists, skipping.");
    process.exit(0);
  }

  // Need user
  const user = await db.query.users.findFirst();
  if (!user) {
    console.error("No user found!");
    process.exit(1);
  }

  await db.insert(connectHubConnections).values({
    teamId: team.id,
    userId: user.id,
    appSlug: 'pancake-chat',
    appName: 'Pancake Chat',
    connectionName: 'Kết nối Pancake',
    authType: 'api_key',
    encryptedCredentials: JSON.stringify({ accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiSMawbmcgTmd1eeG7hW4iLCJleHAiOjE3ODgxODU5MDcsImFwcGxpY2F0aW9uIjoxLCJ1aWQiOiI2ZWUxZjRhYy04N2I4LTQzNjItYjI1NC1jZGM0NjQ3ODcxMDYiLCJzZXNzaW9uX2lkIjoiNjFjZGM2OTMtNmUwMC00OTgxLTljODgtN2QyNjYxMjFiMGU2IiwiaWF0IjoxNzgwNDA5OTA3LCJmYl9pZCI6IjEwMjA3NDgzMjU1OTAxOTQ2IiwibG9naW5fc2Vzc2lvbiI6bnVsbCwiZmJfbmFtZSI6IkjGsG5nIE5ndXnhu4VuIn0.mX5ooe6whJ9vvLPb7odLgAZvWoQsFMCl9n4mNLYLP2U" }),
    status: 'connected',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log("Injected pancake-chat connection successfully!");
  process.exit(0);
}

main().catch(console.error);
