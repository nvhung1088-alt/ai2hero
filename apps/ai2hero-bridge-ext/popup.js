document.addEventListener('DOMContentLoaded', async () => {
  const wsUrlInput = document.getElementById('wsUrl');
  const serverUrlInput = document.getElementById('serverUrl');
  const bridgeTokenInput = document.getElementById('bridgeToken');
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  const wsStatusBadge = document.getElementById('wsStatusBadge');
  const cloudStatusBadge = document.getElementById('cloudStatusBadge');
  const jobCountEl = document.getElementById('jobCount');

  // 1. Tải cấu hình đã lưu
  const data = await chrome.storage.local.get([
    'wsUrl',
    'serverUrl',
    'bridgeToken',
    'processedJobsCount'
  ]);

  wsUrlInput.value = data.wsUrl || 'ws://127.0.0.1:8765';
  serverUrlInput.value = data.serverUrl || 'https://ai2hero-flax.vercel.app';
  bridgeTokenInput.value = data.bridgeToken || '';
  jobCountEl.innerText = data.processedJobsCount || 0;

  // Cloud status badge
  if (data.bridgeToken) {
    cloudStatusBadge.innerText = 'Đã cấu hình';
    cloudStatusBadge.className = 'badge badge-cloud-on';
  } else {
    cloudStatusBadge.innerText = 'Chưa lưu token';
    cloudStatusBadge.className = 'badge badge-cloud-off';
  }

  // WS status check qua background worker
  chrome.runtime.sendMessage({ action: 'GET_WS_STATUS' }, (res) => {
    if (res && res.isWsConnected) {
      wsStatusBadge.innerText = 'Đang hoạt động (Online)';
      wsStatusBadge.className = 'badge badge-ws-on';
    } else {
      wsStatusBadge.innerText = 'Chưa bật Worker Local';
      wsStatusBadge.className = 'badge badge-ws-off';
    }
  });

  // 2. Lưu cấu hình
  saveBtn.addEventListener('click', async () => {
    const wsUrl = wsUrlInput.value.trim() || 'ws://127.0.0.1:8765';
    const serverUrl = serverUrlInput.value.trim();
    const bridgeToken = bridgeTokenInput.value.trim();

    await chrome.storage.local.set({ wsUrl, serverUrl, bridgeToken });

    if (bridgeToken) {
      cloudStatusBadge.innerText = 'Đã cấu hình';
      cloudStatusBadge.className = 'badge badge-cloud-on';
    }

    saveBtn.innerText = '✅ ĐÃ LƯU THÀNH CÔNG!';
    setTimeout(() => {
      saveBtn.innerText = 'LƯU CẤU HÌNH';
    }, 1500);
  });

  // 3. Nút Test Gửi Prompt sang Gemini
  testBtn.addEventListener('click', async () => {
    testBtn.innerText = '⏳ Đang gửi test...';
    testBtn.disabled = true;

    try {
      let tabs = await chrome.tabs.query({ url: 'https://gemini.google.com/*' });
      let tab = tabs.length > 0 ? tabs[0] : null;

      if (!tab) {
        tab = await chrome.tabs.create({ url: 'https://gemini.google.com/app', active: true });
        await new Promise((r) => setTimeout(r, 4500));
      }

      // Gửi prompt test
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'PROCESS_AI_JOB',
        job: {
          id: 'test_' + Date.now(),
          prompt: 'Hãy chào AI2Hero và xác nhận kết nối Browser Bridge v2.0 thành công trong 1 câu ngắn gọn.',
          targetAi: 'gemini',
          autoNewChat: false
        }
      });

      if (response && response.success) {
        alert('🎉 Phản hồi từ Gemini:\n\n' + response.result);
      } else {
        alert('❌ Lỗi: ' + (response?.error || 'Không nhận được phản hồi từ content script.'));
      }
    } catch (err) {
      alert('❌ Lỗi kết nối: ' + err.message);
    } finally {
      testBtn.innerText = '⚡ GỬI TEST PROMPT TỚI GEMINI';
      testBtn.disabled = false;
    }
  });
});
