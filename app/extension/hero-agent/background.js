import { apiCall } from './utils/api.js';

const ALARM_POLL = 'hero-agent-poll';
const POLL_INTERVAL_MINUTES = 0.5; // 30 giây

// --- Startup & Alarms ---
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_POLL) {
    await pollAndExecuteTasks();
  }
});

// Lắng nghe messages từ Popup hoặc Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Cho phép async response
});

async function handleMessage(message, sender, sendResponse) {
  const { type, payload } = message;

  switch (type) {
    case 'LOGIN': {
      try {
        const { email, password } = payload;
        // Gọi Auth API dùng chung của hệ thống sim
        const data = await apiCall('/api/sim/extension/auth', 'POST', { email, password });
        sendResponse({ success: true, workspaces: data.workspaces, tempToken: data.tempToken });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      break;
    }

    case 'SELECT_WORKSPACE': {
      try {
        const { tempToken, teamId } = payload;
        // Gọi Select Workspace API
        const data = await apiCall('/api/sim/extension/auth/select-workspace', 'POST', { tempToken, teamId });
        
        await chrome.storage.local.set({
          token: data.accessToken,
          teamId: data.teamId,
          teamName: data.teamName,
          expiresAt: data.expiresAt,
          paired: true,
        });

        // Bắt đầu Alarm Polling
        await chrome.alarms.create(ALARM_POLL, { periodInMinutes: POLL_INTERVAL_MINUTES });
        
        sendResponse({ success: true, teamName: data.teamName });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      break;
    }

    case 'GET_STATE': {
      try {
        const stored = await chrome.storage.local.get(['paired', 'teamName', 'completedTasksCount']);
        const hasToken = await chrome.storage.local.get(['token']);
        let state = 'logged_out';
        if (stored.paired && hasToken.token) {
          state = 'paired';
        }
        sendResponse({
          success: true,
          state,
          teamName: stored.teamName || '',
          completedCount: stored.completedTasksCount || 0
        });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      break;
    }

    case 'UNPAIR': {
      try {
        await chrome.alarms.clear(ALARM_POLL);
        await chrome.storage.local.clear();
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      break;
    }

    case 'MANUAL_SCRAPE': {
      try {
        // Lấy active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
          sendResponse({ success: false, error: 'Không tìm thấy trang web đang xem' });
          return;
        }

        // Kiểm tra xem có phải trang hệ thống (chrome://...) không
        if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) {
          sendResponse({ success: false, error: 'Không thể cào các trang cài đặt hệ thống của trình duyệt.' });
          return;
        }

        // Gửi tin nhắn đến Content Script để extract nội dung
        const content = await requestExtraction(tab.id);
        
        // Gửi kết quả về server (taskId = 0)
        const res = await apiCall('/api/agent-node/extension/result', 'POST', {
          taskId: 0,
          status: 'success',
          content: {
            title: content.title,
            content: content.content,
            metadata: {
              ...content.metadata,
              url: tab.url
            },
            rawLength: content.rawLength,
            cleanLength: content.cleanLength
          }
        });

        // Tăng completedTasksCount
        const stored = await chrome.storage.local.get(['completedTasksCount']);
        const newCount = (stored.completedTasksCount || 0) + 1;
        await chrome.storage.local.set({ completedTasksCount: newCount });

        sendResponse({ success: true, resultId: res.resultId });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      break;
    }

    default:
      sendResponse({ success: false, error: 'Không hỗ trợ loại tin nhắn này' });
  }
}

// --- Logic Task Polling & Execution ---
let isPolling = false;

async function pollAndExecuteTasks() {
  if (isPolling) return;
  isPolling = true;

  try {
    const { paired } = await chrome.storage.local.get(['paired']);
    if (!paired) {
      await chrome.alarms.clear(ALARM_POLL);
      isPolling = false;
      return;
    }

    // Lấy tasks pending từ server
    const data = await apiCall('/api/agent-node/extension/tasks', 'GET');
    if (!data.success || !data.tasks || data.tasks.length === 0) {
      isPolling = false;
      return;
    }

    // Chạy tuần tự từng task
    for (const task of data.tasks) {
      let tabId = null;
      try {
        console.log(`[Hero Agent] Chạy task: ${task.id} - ${task.url}`);
        
        // Mở tab ẩn
        const tab = await chrome.tabs.create({ url: task.url, active: false });
        tabId = tab.id;
        
        // Đợi tab load xong
        await waitTabLoaded(tabId);

        // Đợi thêm 2 giây cho SPA render hoàn toàn (Facebook, Xiaohongshu cần thời gian render DOM)
        await new Promise(r => setTimeout(r, 2000));

        // Inject và trích xuất nội dung
        const content = await requestExtraction(tabId);
        
        // Đóng tab
        await chrome.tabs.remove(tabId);
        tabId = null;

        // Gửi kết quả về server
        await apiCall('/api/agent-node/extension/result', 'POST', {
          taskId: task.id,
          status: 'success',
          content: {
            title: content.title,
            content: content.content,
            metadata: {
              ...content.metadata,
              url: task.url
            },
            rawLength: content.rawLength,
            cleanLength: content.cleanLength
          }
        });

        // Lưu log hoàn thành
        const stored = await chrome.storage.local.get(['completedTasksCount']);
        const newCount = (stored.completedTasksCount || 0) + 1;
        await chrome.storage.local.set({ completedTasksCount: newCount });

      } catch (taskErr) {
        console.error(`[Hero Agent] Task ${task.id} thất bại:`, taskErr);
        
        // Đóng tab nếu đang mở
        if (tabId) {
          await chrome.tabs.remove(tabId).catch(() => {});
        }

        // Báo cáo lỗi về server
        await apiCall('/api/agent-node/extension/result', 'POST', {
          taskId: task.id,
          status: 'failed',
          errorMessage: taskErr.message || 'Lỗi không xác định khi cào nội dung.'
        }).catch(err => console.error('[Hero Agent] Gửi báo lỗi thất bại:', err));
      }
    }
  } catch (err) {
    console.error('[Hero Agent] Polling error:', err);
  } finally {
    isPolling = false;
  }
}

// Đợi tab load hoàn toàn
function waitTabLoaded(tabId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Tải trang web quá thời gian chờ (Timeout 15s)'));
    }, 15000);

    const listener = (id, changeInfo) => {
      if (id === tabId && changeInfo.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

// Yêu cầu content script extract nội dung
async function requestExtraction(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_CONTENT' });
    if (!response || !response.success) {
      throw new Error(response?.error || 'Không thể liên lạc với content script cào dữ liệu.');
    }
    return response.data;
  } catch (err) {
    // Nếu chưa inject script, thử inject động
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/extractor.js']
      });
      // Đợi 500ms rồi thử gửi lại tin nhắn
      await new Promise(r => setTimeout(r, 500));
      const response = await chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_CONTENT' });
      if (!response || !response.success) {
        throw new Error(response?.error || 'Content script inject thành công nhưng không phản hồi.');
      }
      return response.data;
    } catch (injectErr) {
      throw new Error(`Lỗi inject content script: ${injectErr.message}`);
    }
  }
}
