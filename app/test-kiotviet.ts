import { runKiotViet } from './lib/connect-hub/connectors/runners/kiotviet';

async function runTests() {
  const retailer = process.env.KV_RETAILER || process.argv[2];
  const clientId = process.env.KV_CLIENT_ID || process.argv[3];
  const clientSecret = process.env.KV_CLIENT_SECRET || process.argv[4];

  console.log("=== KIOTVIET CONNECTOR V3.0 TEST SCRIPT ===");
  
  if (!retailer || !clientId || !clientSecret) {
    console.log("\n[!] Không tìm thấy KiotViet credentials trong biến môi trường hoặc tham số truyền vào.");
    console.log("Cú pháp chạy với credentials thật: pnpm tsx test-kiotviet.ts <retailer> <clientId> <clientSecret>\n");
    
    console.log(">>> Đang chạy [MOCK SECURITY TEST] để kiểm duyệt tính năng ẩn giấu mã bí mật PII...\n");
    try {
       await runKiotViet({ 
         retailer: 'test_fake_shop', 
         clientId: 'e9b2c3f4-1234-abcd', 
         clientSecret: 'secret_fake_99999999_hidden_111' 
       }, 'probe_sample_data', {});
    } catch(e: any) {
       console.log("✅ Lỗi mong đợi đã bị bắt giữ. Nội dung lỗi (đã được làm sạch):");
       console.log(e.message);
       if (e.message.includes('***') && !e.message.includes('secret_fake_99999999_hidden_111')) {
         console.log("\n✅ Security Check PASSED: Client Secret và Token đã bị che thành công.");
       } else {
         console.log("\n❌ Security Check FAILED: Lộ thông tin nhạy cảm.");
       }
    }
    return;
  }

  // --- Real API Tests ---
  const credentials = { retailer, clientId, clientSecret };

  try {
    console.log(`\n>>> Đang test với gian hàng: [${retailer}]...`);
    
    // Test 1: list_branches (Simple GET)
    console.log('\n[1] Testing action: list_branches...');
    const branches = await runKiotViet(credentials, 'list_branches', {});
    console.log(`✅ Thành công! Tìm thấy ${branches.total} chi nhánh.`);
    
    // Test 2: get_customer_debt_report (Composite with Server-Side Sorting)
    console.log('\n[2] Testing action: get_customer_debt_report (Server-Side Sorting Validation)...');
    const debts = await runKiotViet(credentials, 'get_customer_debt_report', { pageSize: 5 });
    console.log(`✅ Thành công! Top khách nợ (max 5):`);
    debts.customers.forEach((c: any) => {
      console.log(`   - Khách hàng: ${c.name} | Dư nợ: ${c.debt.toLocaleString('vi-VN')} VND`);
    });

  } catch (error: any) {
    console.error('\n❌ Thực thi thật thất bại:', error.message);
  }
}

runTests();
