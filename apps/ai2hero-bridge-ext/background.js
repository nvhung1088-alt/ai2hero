// background.js - Ai2Hero Bridge Background Service Worker

let isPolling = false;
let processedJobsCount = 0;

console.log('[Ai2Hero Bridge] Background Worker Started.');

// Quản lý Polling Loop
setInterval(() => {
  pollJobAndExecute();
}, 3000);

async function pollJobAndExecute() {
  if (isPolling) return;

  const storage = await chrome.storage.local.get(['serverUrl', 'bridgeToken']);
  const serverUrl = (storage.serverUrl || 'https://ai2hero-flax.vercel.app').replace(/\/$/, '');
  const bridgeToken = storage.bridgeToken;

  if (!bridgeToken) {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#888888' });
    return;
  }

  isPolling = true;

  try {
    // 1. Poll lấy job pending từ Server Connect Hub
    const res = await fetch(`${serverUrl}/api/connect-hub/bridge`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bridgeToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 401) {
      chrome.action.setBadgeText({ text: 'ERR' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
      console.warn('[Ai2Hero Bridge] Bridge Token không hợp lệ!');
      return;
    }

    if (!res.ok) {
      chrome.action.setBadgeText({ text: 'WAIT' });
      chrome.action.setBadgeBackgroundColor({ color: '#FFA500' });
      return;
    }

    const data = await res.json();

    if (!data.success || !data.job) {
      chrome.action.setBadgeText({ text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
      return; // Không có job
    }

    const job = data.job;
    console.log(`[Ai2Hero Bridge] Nhận Job #${job.id} (Target: ${job.targetAi})`);
    chrome.action.setBadgeText({ text: 'BUSY' });
    chrome.action.setBadgeBackgroundColor({ color: '#2196F3' });

    // 2. Tìm hoặc Mở Tab cho targetAi
    const targetUrl = job.targetAi === 'chatgpt' 
      ? 'https://chatgpt.com/*' 
      : 'https://gemini.google.com/*';

    const defaultOpenUrl = job.targetAi === 'chatgpt'
      ? 'https://chatgpt.com/'
      : 'https://gemini.google.com/app';

    let tabs = await chrome.tabs.query({ url: targetUrl });
    let tab = tabs.length > 0 ? tabs[0] : null;

    if (!tab) {
      console.log(`[Ai2Hero Bridge] Mở tab mới cho ${job.targetAi}...`);
      tab = await chrome.tabs.create({ url: defaultOpenUrl, active: true });
      await new Promise(r => setTimeout(r, 4000)); // Chờ trang load
    }

    // 3. Gửi Job tới Content Script
    let responseFromContent = null;
    let retryCount = 0;

    while (retryCount < 3) {
      try {
        responseFromContent = await chrome.tabs.sendMessage(tab.id, {
          action: 'PROCESS_AI_JOB',
          job
        });
        break;
      } catch (err) {
        console.warn(`[Ai2Hero Bridge] Chờ Content Script sẵn sàng... (Lần ${retryCount + 1})`);
        retryCount++;
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (!responseFromContent) {
      throw new Error('Content Script không phản hồi trên tab AI.');
    }

    // 4. Submit kết quả về Server
    const submitBody = {
      jobId: job.id,
      result: responseFromContent.success ? responseFromContent.result : null,
      error: responseFromContent.success ? null : responseFromContent.error
    };

    const submitRes = await fetch(`${serverUrl}/api/connect-hub/bridge`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bridgeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(submitBody)
    });

    if (submitRes.ok) {
      processedJobsCount++;
      await chrome.storage.local.set({ processedJobsCount });
      console.log(`[Ai2Hero Bridge] Nộp kết quả Job #${job.id} THÀNH CÔNG!`);
    } else {
      console.error(`[Ai2Hero Bridge] Lỗi nộp kết quả Job #${job.id}`);
    }

  } catch (err) {
    console.error('[Ai2Hero Bridge] Poll error:', err);
  } finally {
    isPolling = false;
  }
}
