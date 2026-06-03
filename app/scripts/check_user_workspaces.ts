import { db } from '../lib/db/drizzle';
import { users, teamMembers, teams, systemSettings } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkDb() {
  console.log('--- CHECKING test@test.com ---');
  const userList = await db.select().from(users).where(eq(users.email, 'test@test.com'));
  
  if (userList.length === 0) {
    console.log('User not found!');
  } else {
    const user = userList[0];
    console.log(`User ID: ${user.id}, Name: ${user.name}`);
    
    const memberships = await db.select({
      role: teamMembers.role,
      teamId: teams.id,
      teamName: teams.name,
      planName: teams.planName
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, user.id));
    
    console.log(`Found ${memberships.length} memberships:`);
    console.table(memberships);
  }

  console.log('\n--- CHECKING BILLING_PLANS ---');
  const settings = await db.select().from(systemSettings).where(eq(systemSettings.key, 'BILLING_PLANS'));
  if (settings.length === 0) {
    console.log('BILLING_PLANS not found in database. Fallback to default in code.');
  } else {
    console.log('BILLING_PLANS value:');
    console.dir(settings[0].value, { depth: null });
  }

  process.exit(0);
}

checkDb().catch(console.error);
