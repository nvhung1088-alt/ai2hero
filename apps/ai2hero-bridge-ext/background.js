// background.js - Ai2Hero Bridge Service Worker (WebSocket Local Realtime + Cloud HTTP Fallback)

let wsClient = null;
let isWsConnected = false;
let isHttpPolling = false;
let processedJobsCount = 0;
let nextPollTimeout = null;
let currentPollIntervalMs = 15000;

console.log('[Ai2Hero Bridge] Background Worker v2.0 (WebSocket + KeepAlive) Started.');

// 1. Keep-Alive Alarm: Đảm bảo Service Worker MV3 không bị Chrome cho ngủ đông
chrome.alarms.create('bridgeKeepAlive', { periodInMinutes: 0.33 }); // ~20s
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'bridgeKeepAlive') {
    // Ping WS nếu đang kết nối
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
      wsClient.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_WS_STATUS') {
    sendResponse({ isWsConnected, isHttpPolling, processedJobsCount });
    return true;
  }
});

// 2. Khởi tạo kết nối WebSocket Local (ws://127.0.0.1:8765)
async function initWebSocketClient() {
  const storage = await chrome.storage.local.get(['wsUrl', 'enableWsBridge']);
  const enableWs = storage.enableWsBridge !== false; // Mặc định bật
  const wsUrl = storage.wsUrl || 'ws://127.0.0.1:8765';

  if (!enableWs) {
    if (wsClient) {
      wsClient.close();
      wsClient = null;
    }
    isWsConnected = false;
    return;
  }

  if (wsClient && (wsClient.readyState === WebSocket.OPEN || wsClient.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    console.log(`[Ai2Hero Bridge] Đang kết nối WebSocket tới ${wsUrl}...`);
    wsClient = new WebSocket(wsUrl);

    wsClient.onopen = () => {
      console.log('[Ai2Hero Bridge] ✅ Kết nối WebSocket Local thành công!');
      isWsConnected = true;
      updateBadgeStatus();
      wsClient.send(JSON.stringify({ type: 'CLIENT_HELLO', client: 'Ai2Hero-Chrome-Extension', version: '2.0.0' }));
    };

    wsClient.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'PONG' || message.type === 'HEARTBEAT') return;

        if (message.action === 'PROCESS_AI_JOB' || message.type === 'EXECUTE_JOB') {
          const job = message.job || message;
          console.log(`[Ai2Hero Bridge WS] Nhận Job #${job.id} từ Local Worker (Target: ${job.targetAi || 'gemini'})`);
          
          updateBadgeStatus('BUSY');

          const response = await executeAiJobOnTab(job);

          // Nộp kết quả ngay lập tức qua WebSocket
          if (wsClient && wsClient.readyState === WebSocket.OPEN) {
            wsClient.send(JSON.stringify({
              type: 'JOB_RESULT',
              jobId: job.id,
              success: response.success,
              result: response.result || null,
              error: response.error || null,
              durationMs: response.durationMs
            }));
            console.log(`[Ai2Hero Bridge WS] Đã gửi kết quả Job #${job.id} qua WebSocket.`);
          }

          processedJobsCount++;
          await chrome.storage.local.set({ processedJobsCount });
          updateBadgeStatus();
        }
      } catch (err) {
        console.error('[Ai2Hero Bridge WS] Lỗi xử lý message:', err);
      }
    };

    wsClient.onclose = () => {
      isWsConnected = false;
      updateBadgeStatus();
      // Tự động thử kết nối lại sau 3s
      setTimeout(initWebSocketClient, 3000);
    };

    wsClient.onerror = (err) => {
      isWsConnected = false;
      updateBadgeStatus();
    };
  } catch (e) {
    isWsConnected = false;
    setTimeout(initWebSocketClient, 5000);
  }
}

// Khởi chạy WebSocket ngay khi worker bật
initWebSocketClient();

// 3. Cloud HTTP Polling Fallback (Cho chế độ Connect Hub Cloud)
function scheduleNextHttpPoll(delayMs) {
  if (nextPollTimeout) clearTimeout(nextPollTimeout);
  nextPollTimeout = setTimeout(pollCloudJobAndExecute, delayMs || currentPollIntervalMs);
}

scheduleNextHttpPoll(2000);

async function pollCloudJobAndExecute() {
  if (isHttpPolling) return;

  const storage = await chrome.storage.local.get(['serverUrl', 'bridgeToken', 'enableCloudPoll']);
  const enableCloud = storage.enableCloudPoll !== false;
  const serverUrl = (storage.serverUrl || 'https://ai2hero-flax.vercel.app').replace(/\/$/, '');
  const bridgeToken = storage.bridgeToken;

  if (!enableCloud || !bridgeToken) {
    updateBadgeStatus();
    scheduleNextHttpPoll(30000);
    return;
  }

  isHttpPolling = true;

  try {
    const res = await fetch(`${serverUrl}/api/connect-hub/bridge`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bridgeToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 401) {
      console.warn('[Ai2Hero Bridge Cloud] Bridge Token không hợp lệ!');
      updateBadgeStatus('ERR');
      scheduleNextHttpPoll(60000);
      return;
    }

    if (!res.ok) {
      scheduleNextHttpPoll(30000);
      return;
    }

    const data = await res.json();
    if (data.pollIntervalMs && typeof data.pollIntervalMs === 'number') {
      currentPollIntervalMs = Math.max(10000, data.pollIntervalMs);
    }

    if (!data.success || !data.job) {
      updateBadgeStatus();
      scheduleNextHttpPoll(currentPollIntervalMs);
      return;
    }

    const job = data.job;
    console.log(`[Ai2Hero Bridge Cloud] Nhận Job #${job.id} (Target: ${job.targetAi})`);
    updateBadgeStatus('BUSY');

    const response = await executeAiJobOnTab(job);

    // Submit kết quả về Cloud API
    const submitBody = {
      jobId: job.id,
      result: response.success ? response.result : null,
      error: response.success ? null : response.error
    };

    await fetch(`${serverUrl}/api/connect-hub/bridge`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bridgeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(submitBody)
    });

    processedJobsCount++;
    await chrome.storage.local.set({ processedJobsCount });
    console.log(`[Ai2Hero Bridge Cloud] Nộp kết quả Job #${job.id} thành công!`);

  } catch (err) {
    console.error('[Ai2Hero Bridge Cloud] Poll network error:', err);
  } finally {
    isHttpPolling = false;
    scheduleNextHttpPoll(isWsConnected ? 30000 : 2000);
  }
}

// 4. Hàm thực thi Job trên Tab AI (Gemini / ChatGPT)
async function executeAiJobOnTab(job) {
  const startTime = Date.now();
  try {
    const targetAi = (job.targetAi || 'gemini').toLowerCase();
    const targetUrl = targetAi === 'chatgpt' ? 'https://chatgpt.com/*' : 'https://gemini.google.com/*';
    const defaultOpenUrl = targetAi === 'chatgpt' ? 'https://chatgpt.com/' : 'https://gemini.google.com/app';
    const scriptFile = targetAi === 'chatgpt' ? 'content-chatgpt.js' : 'content-gemini.js';

    // 1. Tìm hoặc mở Tab AI
    let tabs = await chrome.tabs.query({ url: targetUrl });
    let tab = tabs.length > 0 ? tabs[0] : null;

    if (!tab) {
      console.log(`[Ai2Hero Bridge] Đang mở tab mới cho ${targetAi}...`);
      tab = await chrome.tabs.create({ url: defaultOpenUrl, active: true });
      await new Promise(r => setTimeout(r, 4500)); // Chờ tab tải DOM
    }

    // 2. Chuyển đổi URLs đính kèm thành Base64 blobs trong background (để tránh lỗi CORS)
    let processedAttachments = [];
    if (job.attachments && Array.isArray(job.attachments)) {
      for (const attach of job.attachments) {
        let attachUrl = null;
        if (typeof attach === 'string' && attach.startsWith('http')) {
          attachUrl = attach;
        } else if (attach && attach.url && typeof attach.url === 'string' && attach.url.startsWith('http')) {
          attachUrl = attach.url;
        }

        if (attachUrl) {
          try {
            const imgRes = await fetch(attachUrl);
            const blob = await imgRes.blob();
            const reader = new FileReader();
            const base64Data = await new Promise((resolve, reject) => {
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            processedAttachments.push({ type: 'image', base64: base64Data });
          } catch (err) {
            console.warn('[Ai2Hero Bridge] Lỗi tải ảnh đính kèm từ URL:', err);
          }
        } else {
          processedAttachments.push(attach);
        }
      }
    }
    job.attachments = processedAttachments;

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
        console.warn(`[Ai2Hero Bridge] SendMessage thất bại (Lần ${retryCount + 1}): ${err.message}. Đang tiêm Script...`);
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [scriptFile]
          });
          await new Promise(r => setTimeout(r, 1000));
        } catch (injectErr) {
          console.warn('[Ai2Hero Bridge] Lỗi khi tiêm Script:', injectErr);
        }
        retryCount++;
      }
    }

    if (!responseFromContent) {
      throw new Error(`Content Script trên tab ${targetAi} không phản hồi.`);
    }

    // 4. Nếu kết quả trả về có ảnh trực tuyến (https://...), background service worker tải ngay sang Base64 để chống 403 Forbidden
    if (responseFromContent && responseFromContent.result && typeof responseFromContent.result === 'string') {
      const imgMatch = responseFromContent.result.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
      if (imgMatch && imgMatch[1]) {
        const onlineImgUrl = imgMatch[1];
        console.log(`[Ai2Hero Bridge] Đang chuyển đổi ảnh online sang Base64 trong background: ${onlineImgUrl.slice(0, 60)}...`);
        try {
          const imgRes = await fetch(onlineImgUrl);
          if (imgRes.ok) {
            const blob = await imgRes.blob();
            if (blob.size > 2000) {
              const reader = new FileReader();
              const base64Data = await new Promise((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
              responseFromContent.result = responseFromContent.result.replace(onlineImgUrl, base64Data);
              console.log(`[Ai2Hero Bridge] ✅ Đã chuyển đổi thành công ảnh sang Base64 (${blob.size} bytes) chống 403 Forbidden!`);
            }
          }
        } catch (fetchErr) {
          console.warn('[Ai2Hero Bridge] Không thể fetch ảnh trong background:', fetchErr);
        }
      }
    }

    return {
      success: responseFromContent.success,
      result: responseFromContent.result,
      error: responseFromContent.error,
      durationMs: Date.now() - startTime
    };

  } catch (err) {
    return {
      success: false,
      error: err.message || 'Lỗi không xác định khi thực thi trên Tab AI',
      durationMs: Date.now() - startTime
    };
  }
}

// 5. Cập nhật Badge giao diện Extension
function updateBadgeStatus(forceStatus) {
  if (forceStatus === 'BUSY') {
    chrome.action.setBadgeText({ text: 'BUSY' });
    chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
    return;
  }
  if (forceStatus === 'ERR') {
    chrome.action.setBadgeText({ text: 'ERR' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    return;
  }

  if (isWsConnected) {
    chrome.action.setBadgeText({ text: 'WS' });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' }); // Green
  } else {
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' }); // Blue
  }
}
