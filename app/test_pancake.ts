import { runPancakeChat } from './lib/connect-hub/connectors/runners/pancake-chat';

const USER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiSMawbmcgTmd1eeG7hW4iLCJleHAiOjE3ODgxODU5MDcsImFwcGxpY2F0aW9uIjoxLCJ1aWQiOiI2ZWUxZjRhYy04N2I4LTQzNjItYjI1NC1jZGM0NjQ3ODcxMDYiLCJzZXNzaW9uX2lkIjoiNjFjZGM2OTMtNmUwMC00OTgxLTljODgtN2QyNjYxMjFiMGU2IiwiaWF0IjoxNzgwNDA5OTA3LCJmYl9pZCI6IjEwMjA3NDgzMjU1OTAxOTQ2IiwibG9naW5fc2Vzc2lvbiI6bnVsbCwiZmJfbmFtZSI6IkjGsG5nIE5ndXnhu4VuIn0.mX5ooe6whJ9vvLPb7odLgAZvWoQsFMCl9n4mNLYLP2U";

async function test() {
  console.log("=== BẮT ĐẦU TEST PANCAKE CHAT API ===");
  
  try {
    // 1. Test List Pages
    console.log("\\n1. Đang lấy danh sách Pages...");
    const pagesRes = await runPancakeChat(
      { userAccessToken: USER_TOKEN },
      'list_pages',
      {}
    );
    console.log(`✅ Đã tìm thấy ${pagesRes.data.length} trang.`);
    if (pagesRes.data.length > 0) {
      console.log(`Trang đầu tiên: ${pagesRes.data[0].name} (ID: ${pagesRes.data[0].id})`);
    }

    // 2. Test Lấy Thống kê Tổng quan (Pages Statistics) - từ 7 ngày trước đến hiện tại
    console.log("\\n2. Đang quét thống kê các Pages trong 7 ngày qua...");
    const until = Math.floor(Date.now() / 1000);
    const since = until - (7 * 24 * 60 * 60); // 7 ngày trước
    
    const statsRes = await runPancakeChat(
      { userAccessToken: USER_TOKEN },
      'get_page_statistics',
      { since: since.toString(), until: until.toString() }
    );
    
    console.log(`✅ Đã quét thống kê thành công ${statsRes.total_pages} trang.`);
    if (statsRes.data && statsRes.data.length > 0) {
      console.log(`Thống kê trang đầu tiên (${statsRes.data[0]._page_name}):`, 
        JSON.stringify(statsRes.data[0], null, 2).substring(0, 300) + '...'
      );
    }

  } catch (err: any) {
    console.error("❌ Lỗi khi test:", err.message);
  }
}

test();
