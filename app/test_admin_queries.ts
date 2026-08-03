import { getAdminDashboardStats, getAdminGrowthData, getAdminLogs } from './lib/db/admin-queries';

async function test() {
  try {
    console.log('Testing getAdminDashboardStats...');
    await getAdminDashboardStats();
    console.log('Testing getAdminGrowthData...');
    await getAdminGrowthData();
    console.log('Testing getAdminLogs...');
    await getAdminLogs();
    console.log('All tests passed!');
  } catch (err) {
    console.error('Error occurred:', err);
  }
  process.exit(0);
}

test();
