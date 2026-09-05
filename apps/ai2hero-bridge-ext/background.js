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
  if (request.action === 'CONVERT_IMAGE_BASE64') {
    fetchImageAsBase64WithCookies(request.url)
      .then((base64) => sendResponse({ success: !!base64, base64 }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
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

// Chuyển đổi Blob sang Base64 chuẩn MV3 Service Worker (Không dùng FileReader vì Service Worker không có window/FileReader)
async function blobToBase64(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  const mimeType = blob.type || 'image/jpeg';
  return `data:${mimeType};base64,${btoa(binary)}`;
}

// Tải ảnh trực tuyến và chuyển thành Base64 kèm Header Cookie Google (Bypass 403 Forbidden 100%)
async function fetchImageAsBase64WithCookies(url) {
  if (!url || !url.startsWith('http')) return null;
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://gemini.google.com/'
    };

    // Nếu là ảnh CDN của Google, lấy toàn bộ Cookie Google để đảm bảo không bao giờ bị 403
    if (url.includes('googleusercontent.com') || url.includes('google.com')) {
      try {
        const [googleCookies, geminiCookies] = await Promise.all([
          chrome.cookies.getAll({ domain: 'google.com' }).catch(() => []),
          chrome.cookies.getAll({ domain: 'googleusercontent.com' }).catch(() => [])
        ]);
        const allCookies = [...googleCookies, ...geminiCookies];
        if (allCookies.length > 0) {
          const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join('; ');
          headers['Cookie'] = cookieHeader;
        }
      } catch (cookieErr) {
        console.warn('[Ai2Hero Bridge] Không thể đọc cookies:', cookieErr);
      }
    }

    const imgRes = await fetch(url, { headers });
    if (imgRes.ok) {
      const blob = await imgRes.blob();
      if (blob.size > 2000) {
        return await blobToBase64(blob);
      }
    }
  } catch (err) {
    console.warn('[Ai2Hero Bridge] fetchImageAsBase64WithCookies error:', err);
  }
  return null;
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
    } else if (targetAi === 'gemini' && job.autoNewChat !== false && tab.url && tab.url.includes('/app/') && !tab.url.endsWith('/app')) {
      console.log(`[Ai2Hero Bridge] Tab Gemini đang ở đoạn chat cũ (${tab.url}). Đang điều hướng về https://gemini.google.com/app...`);
      await chrome.tabs.update(tab.id, { url: 'https://gemini.google.com/app' });
      await new Promise((resolve) => {
        const navListener = (tabId, info) => {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(navListener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(navListener);
        setTimeout(resolve, 5000);
      });
      await new Promise(r => setTimeout(r, 1500)); // Chờ DOM giao diện mới sẵn sàng
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
            const base64Data = await fetchImageAsBase64WithCookies(attachUrl);
            if (base64Data) {
              processedAttachments.push({ type: 'image', base64: base64Data });
            }
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

    // 4. Nếu kết quả trả về có ảnh trực tuyến (https://...), background service worker tải ngay sang Base64 với full Cookie Google
    if (responseFromContent && responseFromContent.result && typeof responseFromContent.result === 'string') {
      const imgMatch = responseFromContent.result.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
      if (imgMatch && imgMatch[1]) {
        const onlineImgUrl = imgMatch[1];
        console.log(`[Ai2Hero Bridge] Đang chuyển đổi ảnh online sang Base64 trong background: ${onlineImgUrl.slice(0, 60)}...`);
        try {
          const base64Data = await fetchImageAsBase64WithCookies(onlineImgUrl);
          if (base64Data) {
            responseFromContent.result = responseFromContent.result.replace(onlineImgUrl, base64Data);
            console.log(`[Ai2Hero Bridge] ✅ Đã chuyển đổi thành công ảnh sang Base64 chống 403 Forbidden!`);
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

// 6. Lắng nghe yêu cầu từ Content Scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'CONVERT_IMAGE_BASE64') {
    fetchImageAsBase64WithCookies(message.url)
      .then((b64) => {
        if (b64) {
          sendResponse({ success: true, base64: b64 });
        } else {
          sendResponse({ success: false, error: 'Không thể fetch Base64' });
        }
      })
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }

  if (message.action === 'DOWNLOAD_IMAGE_FILE') {
    const targetUrl = message.url;
    const filename = message.filename || `Ai2Hero_Thumbnail_${Date.now()}.jpg`;
    chrome.downloads.download(
      {
        url: targetUrl,
        filename: filename,
        saveAs: false,
        conflictAction: 'overwrite'
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.warn('[Ai2Hero Bridge] chrome.downloads error:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log(`[Ai2Hero Bridge] ✅ Chrome Downloads đã kích hoạt tải file #${downloadId}: ${filename}`);
          sendResponse({ success: true, downloadId });
        }
      }
    );
    return true; // async response
  }

  if (message.action === 'SYNC_ALL_COOKIES') {
    syncPlatformCookies(message.domain || null)
      .then((results) => sendResponse({ success: true, results }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }
});

// ============================================================
// 7. AUTO COOKIE SYNC ENGINE (Douyin, Bilibili, TikTok, YouTube)
// ============================================================

function formatNetscapeCookies(cookies) {
  if (!cookies || cookies.length === 0) return '';
  let output = '# Netscape HTTP Cookie File\n# http://curl.haxx.se/rfc/cookie_spec.html\n# This file was generated by Ai2Hero Auto Cookie Sync\n\n';
  for (const c of cookies) {
    const domain = c.domain;
    const flag = domain.startsWith('.') ? 'TRUE' : 'FALSE';
    const path = c.path || '/';
    const secure = c.secure ? 'TRUE' : 'FALSE';
    const expiration = c.expirationDate ? Math.floor(c.expirationDate) : (Math.floor(Date.now() / 1000) + 86400 * 365);
    const name = c.name;
    const value = c.value;
    output += `${domain}\t${flag}\t${path}\t${secure}\t${expiration}\t${name}\t${value}\n`;
  }
  return output;
}

async function extractCookiesForDomain(targetDomain) {
  try {
    const cleanDomain = targetDomain.replace(/^\./, '');
    const [dotDomainCookies, exactDomainCookies] = await Promise.all([
      chrome.cookies.getAll({ domain: '.' + cleanDomain }).catch(() => []),
      chrome.cookies.getAll({ domain: cleanDomain }).catch(() => [])
    ]);

    const cookieMap = new Map();
    [...dotDomainCookies, ...exactDomainCookies].forEach((c) => {
      cookieMap.set(`${c.domain}:${c.name}`, c);
    });

    const uniqueCookies = Array.from(cookieMap.values());
    const netscapeStr = formatNetscapeCookies(uniqueCookies);
    return {
      domain: cleanDomain,
      count: uniqueCookies.length,
      netscape: netscapeStr
    };
  } catch (err) {
    console.warn(`[Ai2Hero Bridge] Lỗi trích xuất cookie domain ${targetDomain}:`, err);
    return { domain: targetDomain, count: 0, netscape: '' };
  }
}

async function syncPlatformCookies(specificDomain = null) {
  const targetDomains = specificDomain ? [specificDomain] : ['douyin.com', 'bilibili.com', 'tiktok.com', 'youtube.com'];
  const results = [];

  for (const domain of targetDomains) {
    const extracted = await extractCookiesForDomain(domain);
    if (extracted.count > 0 && extracted.netscape) {
      results.push(extracted);

      // 1. Đồng bộ tức thì sang Local Worker API (Port 19998)
      try {
        await fetch('http://127.0.0.1:19998/cookies/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain: extracted.domain,
            count: extracted.count,
            cookieData: extracted.netscape
          })
        }).catch(() => {});
      } catch (e) {}

      // 2. Đồng bộ sang Server Cloud API
      try {
        const storage = await chrome.storage.local.get(['serverUrl', 'bridgeToken']);
        const serverUrl = (storage.serverUrl || 'https://ai2hero-flax.vercel.app').replace(/\/$/, '');
        const bridgeToken = storage.bridgeToken;

        if (serverUrl) {
          await fetch(`${serverUrl}/api/hero-downloader/extension/sync-cookies`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(bridgeToken ? { 'Authorization': `Bearer ${bridgeToken}` } : {})
            },
            body: JSON.stringify({
              domain: extracted.domain,
              name: `${extracted.domain.toUpperCase()} Cookie (Auto Sync)`,
              cookieData: extracted.netscape
            })
          }).catch(() => {});
        }
      } catch (e) {}
    }
  }

  console.log(`[Ai2Hero Bridge] ✅ Đã hoàn tất đồng bộ ${results.length} bộ Cookie nền tảng.`);
  return results;
}

async function forceFetchAndSyncCookies(targetDomain) {
  const cleanDomain = targetDomain.replace(/^\./, '');
  const extracted = await extractCookiesForDomain(cleanDomain);

  if (extracted.count > 0) {
    console.log(`[Ai2Hero Bridge] ⚡ Đã có sẵn ${extracted.count} cookies cho ${cleanDomain}. Đang nạp sang Worker...`);
    await syncPlatformCookies(cleanDomain);
  } else {
    // Nếu Chrome chưa từng mở domain này -> tự động mở tab ngầm 2.5s để Chrome nhận cookie rồi đóng lại
    console.log(`[Ai2Hero Bridge] 🌐 Chưa có Cookie ${cleanDomain} trên Chrome. Đang tự động mở tab ngầm lấy Cookie...`);
    try {
      chrome.tabs.create({ url: `https://www.${cleanDomain}/`, active: false }, (tab) => {
        setTimeout(async () => {
          await syncPlatformCookies(cleanDomain);
          if (tab && tab.id) {
            try {
              chrome.tabs.remove(tab.id);
            } catch (e) {}
          }
        }, 2500);
      });
    } catch (err) {
      console.warn(`[Ai2Hero Bridge] Không thể tạo tab ngầm: ${err.message}`);
    }
  }
}

// 8. VÒNG LẶP AUTO-POLLING LẮNG NGHE YÊU CẦU TỪ LOCAL WORKER (Mỗi 3s)
async function pollWorkerCookieRequests() {
  try {
    const res = await fetch('http://127.0.0.1:19998/cookies/poll_requests', { method: 'GET' }).catch(() => null);
    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.hasRequests && Array.isArray(data.requests)) {
        for (const reqDomain of data.requests) {
          console.log(`[Ai2Hero Bridge] 🚨 Nhận tín hiệu cấp cứu Cookie từ Worker cho: ${reqDomain}`);
          await forceFetchAndSyncCookies(reqDomain);
        }
      }
    }
  } catch (e) {}

  setTimeout(pollWorkerCookieRequests, 3000);
}

// Khởi chạy vòng lặp Auto-Polling ngay khi Service Worker khởi động
pollWorkerCookieRequests();

// Tự động đồng bộ Cookie lần đầu tiên khi Extension chạy
setTimeout(() => {
  syncPlatformCookies();
}, 2000);

// Tự động đồng bộ cookie ngầm khi người dùng duyệt web Douyin/Bilibili/Tiktok
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('douyin.com')) syncPlatformCookies('douyin.com');
    else if (tab.url.includes('bilibili.com')) syncPlatformCookies('bilibili.com');
    else if (tab.url.includes('tiktok.com')) syncPlatformCookies('tiktok.com');
    else if (tab.url.includes('youtube.com')) syncPlatformCookies('youtube.com');
  }
});

