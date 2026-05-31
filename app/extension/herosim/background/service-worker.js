// HeroSim Extension v4.0 — background/service-worker.js
// Quản lý luồng xác thực trực tiếp, lưu trữ an toàn & đồng bộ hai chiều

import { deriveKey, decrypt, encrypt, generateSalt, parseSalt } from '../lib/crypto.js';

const isDev = !('update_url' in chrome.runtime.getManifest());
let API_BASE = isDev 
  ? 'http://localhost:3000/api/sim/extension' 
  : 'https://www.ai2hero.com/api/sim/extension';

const ALARM_SYNC = 'herosim-sync';
const SYNC_INTERVAL_MINUTES = 5;

// Load API base dynamic (phục vụ local dev testing hoặc override nếu cần)
chrome.storage.local.get(['herosim_api_base']).then((res) => {
  if (res.herosim_api_base) {
    API_BASE = res.herosim_api_base;
  }
  console.log(`[HeroSim Background] Sử dụng API Base: ${API_BASE}`);
});

// ─── Export/Import CryptoKey sang Base64 để lưu vào chrome.storage.session ─────
async function exportKey(key) {
  const exported = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

async function importKey(keyB64) {
  const rawKey = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
}

async function getDerivedKey() {
  const stored = await chrome.storage.session.get(['herosim_derived_key']);
  if (!stored.herosim_derived_key) return null;
  try {
    return await importKey(stored.herosim_derived_key);
  } catch (err) {
    console.error('Import derived key error:', err);
    return null;
  }
}

async function setDerivedKey(key) {
  if (!key) {
    await chrome.storage.session.remove(['herosim_derived_key']);
    return;
  }
  const keyB64 = await exportKey(key);
  await chrome.storage.session.set({ herosim_derived_key: keyB64 });
}

// ─── Startup & Alarms ────────────────────────────────────────────────────────
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_SYNC) {
    console.log('[HeroSim Background] Chạy đồng bộ định kỳ...');
    await syncAccounts();
  }
});

// Lắng nghe tin nhắn từ Popup và Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sendResponse);
  return true; // Phản hồi không đồng bộ
});

async function handleMessage(message, sendResponse) {
  const { type, payload } = message;

  switch (type) {
    // ─── LOGIN: Đăng nhập bằng email + password ─────────────────────────
    case 'LOGIN': {
      const { email, password } = payload;
      try {
        const res = await fetch(`${API_BASE}/auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!data.success) {
          sendResponse({ success: false, error: data.error });
          return;
        }

        sendResponse({
          success: true,
          tempToken: data.tempToken,
          user: data.user,
          workspaces: data.workspaces
        });
      } catch (err) {
        sendResponse({ success: false, error: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.' });
      }
      break;
    }

    // ─── SELECT_WORKSPACE: Chọn workspace, lưu token & đồng bộ lần đầu ───
    case 'SELECT_WORKSPACE': {
      const { tempToken, teamId, password } = payload;
      try {
        const res = await fetch(`${API_BASE}/auth/select-workspace`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tempToken, teamId }),
        });
        const data = await res.json();

        if (!data.success) {
          sendResponse({ success: false, error: data.error });
          return;
        }

        // Sinh salt và derived key từ password chính chủ
        const saltB64 = generateSalt();
        const salt = parseSalt(saltB64);
        const key = await deriveKey(password, salt);
        await setDerivedKey(key);

        // Mã hóa accessToken
        const encryptedToken = await encrypt(data.accessToken, key);

        await chrome.storage.local.set({
          herosim_paired: true,
          herosim_encrypted_token: encryptedToken,
          herosim_salt: saltB64,
          herosim_team_id: data.teamId,
          herosim_team_name: data.teamName,
          herosim_token_expires: data.expiresAt,
          herosim_locked: false,
        });

        // Bắt đầu alarm sync định kỳ
        await chrome.alarms.create(ALARM_SYNC, { periodInMinutes: SYNC_INTERVAL_MINUTES });

        // Đồng bộ tài khoản ngay lập tức
        const syncRes = await syncAccounts();

        sendResponse({ success: true, teamName: data.teamName, syncCount: syncRes.count || 0 });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      break;
    }

    // ─── UNLOCK: Mở khóa bằng password ──────────────────────────────────
    case 'UNLOCK': {
      const { password } = payload;
      try {
        const stored = await chrome.storage.local.get(['herosim_encrypted_token', 'herosim_salt']);
        if (!stored.herosim_salt || !stored.herosim_encrypted_token) {
          sendResponse({ success: false, error: 'Thiết bị chưa được kết nối' });
          return;
        }

        const salt = parseSalt(stored.herosim_salt);
        const key = await deriveKey(password, salt);

        // Thử giải mã token để kiểm chứng mật khẩu
        let accessToken;
        try {
          accessToken = await decrypt(stored.herosim_encrypted_token, key);
        } catch (_) {
          sendResponse({ success: false, error: 'Mật khẩu không đúng' });
          return;
        }

        // Mật khẩu đúng -> lưu key vào RAM session
        await setDerivedKey(key);
        await chrome.storage.local.set({ herosim_locked: false });

        // Sync data nền (không block việc mở khóa)
        syncAccounts().catch(console.error);

        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      break;
    }

    // ─── LOCK: Khóa Vault, xóa key khỏi RAM ─────────────────────────────
    case 'LOCK': {
      await setDerivedKey(null);
      await chrome.storage.local.set({ herosim_locked: true });
      sendResponse({ success: true });
      break;
    }

    // ─── GET_STATE: Lấy trạng thái hiện tại ─────────────────────────────
    case 'GET_STATE': {
      try {
        const stored = await chrome.storage.local.get([
          'herosim_paired',
          'herosim_locked',
          'herosim_team_name',
          'herosim_last_sync'
        ]);
        const key = await getDerivedKey();
        
        let state = 'logged_out';
        if (stored.herosim_paired) {
          state = (key && !stored.herosim_locked) ? 'unlocked' : 'locked';
        }

        sendResponse({
          success: true,
          state,
          teamName: stored.herosim_team_name || '',
          lastSync: stored.herosim_last_sync || null
        });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      break;
    }

    // ─── GET_ACCOUNTS: Lấy danh sách tài khoản (đã giải mã) ───────────────
    case 'GET_ACCOUNTS': {
      const key = await getDerivedKey();
      if (!key) {
        sendResponse({ success: false, locked: true });
        return;
      }
      try {
        const stored = await chrome.storage.local.get(['herosim_accounts_cache']);
        const cache = stored.herosim_accounts_cache || [];

        const accounts = await Promise.all(
          cache.map(async (acc) => {
            try {
              const decryptedPw = acc.encryptedLocal
                ? await decrypt(acc.encryptedLocal, key)
                : null;
              return { ...acc, password: decryptedPw, encryptedLocal: undefined };
            } catch {
              return { ...acc, password: null };
            }
          })
        );

        sendResponse({ success: true, accounts });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      break;
    }

    // ─── CHECK_ACCOUNT_EXISTS: Kiểm tra tài khoản đã tồn tại chưa ────────
    case 'CHECK_ACCOUNT_EXISTS': {
      const key = await getDerivedKey();
      if (!key) {
        sendResponse({ success: false, locked: true });
        return;
      }
      try {
        const { username, password, pageUrl } = payload;
        const stored = await chrome.storage.local.get(['herosim_accounts_cache']);
        const cache = stored.herosim_accounts_cache || [];

        // Lọc các account khớp domain trang hiện tại
        const matched = cache.filter((acc) => matchDomain(pageUrl, acc.loginUrl, acc.platformKey));

        let found = false;
        let passwordChanged = false;

        for (const acc of matched) {
          if (acc.username && username && acc.username.toLowerCase() === username.toLowerCase()) {
            found = true;
            if (acc.encryptedLocal) {
              try {
                const decryptedPw = await decrypt(acc.encryptedLocal, key);
                if (decryptedPw !== password) {
                  passwordChanged = true;
                }
              } catch (err) {
                console.error('Giải mã password kiểm tra thất bại:', err);
              }
            }
            break; // Tìm thấy tài khoản tương ứng, dừng vòng lặp
          }
        }

        sendResponse({ success: true, found, passwordChanged });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      break;
    }

    // ─── PUSH_ACCOUNT: Đẩy tài khoản mới/cập nhật lên server ────────────
    case 'PUSH_ACCOUNT': {
      const key = await getDerivedKey();
      if (!key) {
        sendResponse({ success: false, locked: true });
        return;
      }
      try {
        const { platformKey, accountName, username, password, loginUrl } = payload;
        
        const stored = await chrome.storage.local.get(['herosim_encrypted_token']);
        if (!stored.herosim_encrypted_token) {
          sendResponse({ success: false, error: 'Không tìm thấy token liên kết' });
          return;
        }

        const accessToken = await decrypt(stored.herosim_encrypted_token, key);

        // Đẩy lên Next.js API
        const res = await fetch(`${API_BASE}/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            accounts: [{
              platformKey,
              accountName,
              username,
              password,
              loginUrl
            }]
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          sendResponse({ success: false, error: errData.error || `Lỗi HTTP ${res.status}` });
          return;
        }

        const data = await res.json();
        if (!data.success) {
          sendResponse({ success: false, error: data.error });
          return;
        }

        // Đồng bộ ngược lại về local ngay lập tức để lấy dữ liệu chuẩn kèm ID
        await syncAccounts();

        sendResponse({ success: true, message: data.message });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      break;
    }

    // ─── QUERY_URL: Tìm accounts khớp URL (Content Script gọi) ───────────
    case 'QUERY_URL': {
      const key = await getDerivedKey();
      if (!key) {
        sendResponse({ success: false, locked: true });
        return;
      }

      const { pageUrl } = payload;
      const stored = await chrome.storage.local.get(['herosim_accounts_cache']);
      const cache = stored.herosim_accounts_cache || [];

      // So khớp thông minh exact hoặc suffix domain
      const matched = cache.filter((acc) => matchDomain(pageUrl, acc.loginUrl, acc.platformKey));

      // Giải mã password của các accounts khớp
      const accounts = await Promise.all(
        matched.map(async (acc) => {
          let password = null;
          if (acc.encryptedLocal) {
            try {
              password = await decrypt(acc.encryptedLocal, key);
            } catch {}
          }
          return { ...acc, password, encryptedLocal: undefined };
        })
      );

      sendResponse({ success: true, accounts });
      break;
    }

    // ─── SYNC: Đồng bộ thủ công ─────────────────────────────────────────
    case 'SYNC': {
      const key = await getDerivedKey();
      if (!key) {
        sendResponse({ success: false, locked: true });
        return;
      }
      const result = await syncAccounts();
      sendResponse(result);
      break;
    }

    // ─── UNPAIR: Đăng xuất, xóa toàn bộ cache ────────────────────────────
    case 'UNPAIR': {
      await setDerivedKey(null);
      await chrome.alarms.clear(ALARM_SYNC);
      await chrome.storage.local.clear();
      sendResponse({ success: true });
      break;
    }

    default:
      sendResponse({ success: false, error: 'Không hỗ trợ loại tin nhắn này' });
  }
}

// ─── Helper: So khớp domain kiên cố (exact hoặc suffix) ──────────────────────
function matchDomain(pageUrl, loginUrl, platformKey) {
  if (!pageUrl) return false;
  let pageHost = '';
  try {
    pageHost = new URL(pageUrl).hostname.toLowerCase();
    if (pageHost.startsWith('www.')) pageHost = pageHost.slice(4);
  } catch {
    return false;
  }

  if (loginUrl) {
    try {
      let accHost = new URL(loginUrl).hostname.toLowerCase();
      if (accHost.startsWith('www.')) accHost = accHost.slice(4);
      // Exact match hoặc suffix match (ví dụ: login.facebook.com khớp facebook.com)
      if (pageHost === accHost || pageHost.endsWith('.' + accHost)) {
        return true;
      }
    } catch {}
  }

  if (platformKey) {
    const plat = platformKey.toLowerCase().trim();
    if (plat.includes('.')) {
      if (pageHost === plat || pageHost.endsWith('.' + plat)) return true;
    } else {
      // Nếu chỉ là platform slug như "facebook" -> kiểm tra có chứa trong hostname không
      if (pageHost === plat || pageHost.includes(plat)) return true;
    }
  }

  return false;
}

// ─── Helper: Đồng bộ accounts từ Server về Cache Local ────────────────────────
async function syncAccounts() {
  const key = await getDerivedKey();
  if (!key) return { success: false, locked: true };

  try {
    const stored = await chrome.storage.local.get(['herosim_encrypted_token']);
    if (!stored.herosim_encrypted_token) return { success: false, error: 'Không tìm thấy token' };

    const accessToken = await decrypt(stored.herosim_encrypted_token, key);

    const res = await fetch(`${API_BASE}/sync`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        // Token hết hạn đột ngột hoặc bị thu hồi ở server -> Lock
        await setDerivedKey(null);
        await chrome.storage.local.set({ herosim_locked: true });
      }
      return { success: false, error: `Lỗi kết nối HTTP ${res.status}` };
    }

    const data = await res.json();
    if (!data.success) return { success: false, error: data.error };

    // Mã hóa thêm một lớp AES-GCM cục bộ trước khi lưu cache
    await cacheAccounts(data.accounts, key);
    await chrome.storage.local.set({ herosim_last_sync: new Date().toISOString() });

    return { success: true, count: data.accounts.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── Helper: Cache mã hóa accounts local ─────────────────────────────────────
async function cacheAccounts(accounts, key) {
  const encrypted = await Promise.all(
    accounts.map(async (acc) => {
      const encryptedLocal = acc.password
        ? await encrypt(acc.password, key)
        : null;
      return {
        id: acc.id,
        platformKey: acc.platformKey,
        accountName: acc.accountName,
        username: acc.username,
        loginUrl: acc.loginUrl,
        loginEmail: acc.loginEmail,
        importanceLevel: acc.importanceLevel,
        status: acc.status,
        updatedAt: acc.updatedAt || null,
        encryptedLocal, // Chỉ lưu local bản mã hóa bằng Master Key
      };
    })
  );
  await chrome.storage.local.set({ herosim_accounts_cache: encrypted });
}
