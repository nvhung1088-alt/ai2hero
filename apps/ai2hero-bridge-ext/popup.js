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

  // Helper gửi message có tự động tiêm Script nếu tab chưa nạp
  async function sendJobWithAutoInject(tab, job, scriptFile = 'content-gemini.js') {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await chrome.tabs.sendMessage(tab.id, {
          action: 'PROCESS_AI_JOB',
          job
        });
        return res;
      } catch (err) {
        console.warn(`[Popup] sendMessage attempt ${attempt + 1} failed: ${err.message}. Đang tiêm script...`);
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [scriptFile]
          });
          await new Promise((r) => setTimeout(r, 800));
        } catch (injectErr) {
          console.warn('[Popup] Injection error:', injectErr);
        }
      }
    }
    throw new Error('Không thể kết nối tới tab Gemini. Vui lòng bấm F5 (Reload) lại tab gemini.google.com rồi thử lại!');
  }

  // 3. Nút Test Gửi Text sang Gemini
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

      const response = await sendJobWithAutoInject(tab, {
        id: 'test_text_' + Date.now(),
        prompt: 'Hãy chào AI2Hero và xác nhận kết nối Browser Bridge v2.0 thành công trong 1 câu ngắn gọn.',
        targetAi: 'gemini',
        autoNewChat: false
      });

      if (response && response.success) {
        alert('🎉 Phản hồi từ Gemini:\n\n' + response.result);
      } else {
        alert('❌ Lỗi: ' + (response?.error || 'Không nhận được phản hồi từ content script.'));
      }
    } catch (err) {
      alert('❌ Lỗi kết nối: ' + err.message);
    } finally {
      testBtn.innerText = '⚡ GỬI TEST TEXT TỚI GEMINI';
      testBtn.disabled = false;
    }
  });

  // 4. Nút Test Gửi Ảnh Mẫu sang Gemini
  testImageBtn.addEventListener('click', async () => {
    testImageBtn.innerText = '⏳ Đang dán ảnh & gửi...';
    testImageBtn.disabled = true;

    try {
      let tabs = await chrome.tabs.query({ url: 'https://gemini.google.com/*' });
      let tab = tabs.length > 0 ? tabs[0] : null;

      if (!tab) {
        tab = await chrome.tabs.create({ url: 'https://gemini.google.com/app', active: true });
        await new Promise((r) => setTimeout(r, 4500));
      }

      // Tạo 1 sample canvas image (120x80px màu xanh cam gradient có text AI2Hero)
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 250;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 400, 250);
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 400, 250);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AI2Hero Bridge Test', 200, 130);
      const sampleBase64 = canvas.toDataURL('image/png');

      const response = await sendJobWithAutoInject(tab, {
        id: 'test_img_' + Date.now(),
        prompt: 'Hãy nhìn bức ảnh đính kèm này và cho biết bạn nhìn thấy chữ gì và màu sắc gì trong ảnh?',
        attachments: [sampleBase64],
        targetAi: 'gemini',
        autoNewChat: false
      });

      if (response && response.success) {
        alert('🎉 Gemini đã nhận ảnh và phản hồi:\n\n' + response.result);
      } else {
        alert('❌ Lỗi gửi ảnh: ' + (response?.error || 'Không thể dán ảnh hoặc nhận câu trả lời.'));
      }
    } catch (err) {
      alert('❌ Lỗi kết nối: ' + err.message);
    } finally {
      testImageBtn.innerText = '🖼️ GỬI TEST ẢNH MẪU TỚI GEMINI';
      testImageBtn.disabled = false;
    }
  });

  // 5. Nút Đồng Bộ Cookie Tự Động
  const syncCookiesBtn = document.getElementById('syncCookiesBtn');
  const cookieStatus = document.getElementById('cookieStatus');

  if (syncCookiesBtn) {
    syncCookiesBtn.addEventListener('click', async () => {
      syncCookiesBtn.innerText = '⏳ Đang đồng bộ Cookie...';
      syncCookiesBtn.disabled = true;
      if (cookieStatus) cookieStatus.style.display = 'none';

      try {
        chrome.runtime.sendMessage({ action: 'SYNC_ALL_COOKIES' }, (response) => {
          if (response && response.success && response.results) {
            const list = response.results.map((r) => `${r.domain}: ${r.count} cookies`).join(', ');
            if (response.results.length > 0) {
              if (cookieStatus) {
                cookieStatus.innerText = `✅ Đã đồng bộ ${list}`;
                cookieStatus.style.display = 'block';
              }
              alert(`🎉 ĐỒNG BỘ COOKIE THÀNH CÔNG!\n\nĐã nạp tự động sang Local Worker & Server:\n- ${response.results.map((r) => `${r.domain.toUpperCase()}: ${r.count} cookies`).join('\n- ')}`);
            } else {
              alert('ℹ️ Không tìm thấy cookie nào của Douyin/Bilibili/TikTok trên trình duyệt.\n\nVui lòng mở sẵn 1 tab Douyin hoặc Bilibili rồi bấm lại nút này nhé!');
            }
          } else {
            alert('❌ Lỗi đồng bộ cookie: ' + (response?.error || 'Không thể kết nối background worker.'));
          }
          syncCookiesBtn.innerText = '🔄 ĐỒNG BỘ COOKIE (DOUYIN / BILI / TIKTOK)';
          syncCookiesBtn.disabled = false;
        });
      } catch (err) {
        alert('❌ Lỗi kết nối: ' + err.message);
        syncCookiesBtn.innerText = '🔄 ĐỒNG BỘ COOKIE (DOUYIN / BILI / TIKTOK)';
        syncCookiesBtn.disabled = false;
      }
    });
  }
});
