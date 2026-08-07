// background.js - Ai2Hero Bridge Background Service Worker v2.0
let isPolling = false;
let processedJobsCount = 0;
let nextPollTimeout = null;
let currentPollIntervalMs = 15000;
const WATCHDOG_ALARM_NAME = 'watchdog_poll';

console.log('[Ai2Hero Bridge] Background Worker Started.');

// Báo thức sinh tồn: Đảm bảo Chrome Service Worker thức dậy sau mỗi 1 phút
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === WATCHDOG_ALARM_NAME) {
    console.log('[Ai2Hero Bridge] Watchdog Alarm triggered.');
    pollJobAndExecute();
  }
});

// Thiết lập lần đầu
chrome.alarms.create(WATCHDOG_ALARM_NAME, { periodInMinutes: 1 });

function scheduleNextPoll(delayMs) {
  if (nextPollTimeout) clearTimeout(nextPollTimeout);
  nextPollTimeout = setTimeout(pollJobAndExecute, delayMs || currentPollIntervalMs);
}

// Khởi chạy vòng lặp polling đầu tiên
scheduleNextPoll(1000);

async function pollJobAndExecute() {
  if (isPolling) return;

  const storage = await chrome.storage.local.get(['serverUrl', 'bridgeToken']);
  const serverUrl = (storage.serverUrl || 'https://ai2hero-flax.vercel.app').replace(/\/$/, '');
  const bridgeToken = storage.bridgeToken;

  if (!bridgeToken) {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#888888' });
    scheduleNextPoll(30000);
    return;
  }

  isPolling = true;

  try {
    // 1. Poll lấy job pending từ Server
    const res = await fetch(`${serverUrl}/api/connect-hub/bridge`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bridgeToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 401) {
      chrome.action.setBadgeText({ text: 'AUTH' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
      console.warn('[Ai2Hero Bridge] Bridge Token không hợp lệ!');
      scheduleNextPoll(60000);
      return;
    }

    if (!res.ok) {
      chrome.action.setBadgeText({ text: 'WAIT' });
      chrome.action.setBadgeBackgroundColor({ color: '#FFA500' });
      scheduleNextPoll(15000);
      return;
    }

    const data = await res.json();
    if (data.pollIntervalMs && typeof data.pollIntervalMs === 'number') {
      currentPollIntervalMs = Math.max(5000, data.pollIntervalMs); // Giới hạn tối thiểu 5s để tránh spam
    }

    if (!data.success || !data.job) {
      chrome.action.setBadgeText({ text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
      scheduleNextPoll(currentPollIntervalMs);
      return; // Không có job pending
    }

    const job = data.job;
    console.log(`[Ai2Hero Bridge] Nhận Job #${job.id} (Target: ${job.targetAi})`);
    chrome.action.setBadgeText({ text: 'BUSY' });
    chrome.action.setBadgeBackgroundColor({ color: '#2196F3' });

    // 2. Tìm hoặc Mở Tab cho targetAi
    let responseFromContent = null;
    
    try {
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
        
        // Chờ tab load xong thực sự thay vì chờ 4s cứng
        await awaitTabLoaded(tab.id, 15000).catch(err => {
          console.warn('[Ai2Hero Bridge] Cảnh báo chờ tab load:', err.message);
        });
        // Chờ thêm 2s để SPA khởi tạo DOM hoàn tất
        await new Promise(r => setTimeout(r, 2000));
      }

      // Xử lý đính kèm: Fetch URL thành Base64 từ Background (để né CORS)
      let processedAttachments = [];
      if (job.attachments && Array.isArray(job.attachments)) {
        for (const attach of job.attachments) {
          if (typeof attach === 'string' && attach.startsWith('http')) {
            try {
               const imgRes = await fetch(attach);
               const blob = await imgRes.blob();
               
               // Bảo vệ RAM: Bỏ qua nếu ảnh quá 5MB
               if (blob.size > 5 * 1024 * 1024) {
                 throw new Error('Dung lượng ảnh đính kèm quá lớn (>5MB).');
               }

               const reader = new FileReader();
               const base64Data = await new Promise((resolve, reject) => {
                  reader.onloadend = () => resolve(reader.result);
                  reader.onerror = () => reject(new Error('FileReader lỗi'));
                  reader.readAsDataURL(blob);
               });
               processedAttachments.push(base64Data);
            } catch (err) {
               console.warn('[Ai2Hero Bridge] Lỗi tải ảnh đính kèm:', err.message);
            }
          } else {
            processedAttachments.push(attach);
          }
        }
      }
      job.attachments = processedAttachments;

      // 3. Gửi Job tới Content Script
      let retryCount = 0;
      while (retryCount < 3) {
        try {
          responseFromContent = await chrome.tabs.sendMessage(tab.id, {
            action: 'PROCESS_AI_JOB',
            job
          });
          break;
        } catch (err) {
          console.warn(`[Ai2Hero Bridge] SendMessage thất bại (Lần ${retryCount + 1}): ${err.message}. Đang tiêm lại Script...`);
          
          const scriptFile = job.targetAi === 'chatgpt' ? 'content-chatgpt.js' : 'content-gemini.js';
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: [scriptFile]
            });
            await new Promise(r => setTimeout(r, 1500)); // Chờ script khởi tạo
          } catch (injectErr) {
            console.warn('[Ai2Hero Bridge] Lỗi tiêm Script:', injectErr.message);
          }
          retryCount++;
        }
      }

      if (!responseFromContent) {
        throw new Error('Content Script không phản hồi sau 3 lần thử.');
      }

    } catch (jobError) {
       responseFromContent = { success: false, error: jobError.message };
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
      console.log(`[Ai2Hero Bridge] Nộp kết quả Job #${job.id} thành công!`);
      
      // Đổi trạng thái badge hiển thị lỗi auth nếu Content Script phát hiện chưa đăng nhập
      if (!responseFromContent.success && responseFromContent.error === 'AUTH_REQUIRED') {
        chrome.action.setBadgeText({ text: 'AUTH' });
        chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
        scheduleNextPoll(10000); // Poll chậm lại khi gặp lỗi auth
        return;
      }
      
      // Poll ngay lập tức sau 2s nếu vừa chạy xong một tác vụ thành công (tăng tốc độ xử lý hàng loạt)
      scheduleNextPoll(2000);
    } else {
      console.error(`[Ai2Hero Bridge] Lỗi nộp kết quả Job #${job.id}`);
      scheduleNextPoll(currentPollIntervalMs);
    }

  } catch (err) {
    console.error('[Ai2Hero Bridge] Lỗi kết nối mạng khi poll:', err);
    scheduleNextPoll(currentPollIntervalMs);
  } finally {
    isPolling = false;
  }
}

// Chờ tab load xong thực sự
function awaitTabLoaded(tabId, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Chờ tải tab quá 15 giây.'));
    }, timeoutMs);

    function listener(id, changeInfo) {
      if (id === tabId && changeInfo.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}
