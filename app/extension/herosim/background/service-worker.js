// HeroSim Extension — background/service-worker.js
// Manifest V3 Service Worker: xử lý Pairing, Unlock, Sync
// Derived key CHỈ trong RAM — mất khi SW idle → State B (nhập PIN lại)

import { deriveKey, decrypt, encrypt, generateSalt, parseSalt } from '../lib/crypto.js';

const API_BASE = 'https://ai2hero.com/api/sim/extension';
const ALARM_SYNC = 'herosim-sync';
const SYNC_INTERVAL_MINUTES = 5;

// ─── Derived key trong RAM (mất khi SW bị Chrome tắt) ────────────────────────
let _derivedKey = null;

// ─── Startup: kiểm tra trạng thái lock ───────────────────────────────────────
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// ─── Alarm: sync định kỳ mỗi 5 phút ─────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_SYNC) {
    await syncAccounts();
  }
});

// ─── Message handlers từ Popup ────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sendResponse);
  return true; // async response
});

async function handleMessage(message, sendResponse) {
  const { type, payload } = message;

  switch (type) {
    // ─── PAIR: Ghép nối lần đầu bằng link code ─────────────────────────
    case 'PAIR': {
      const { linkCode, masterPin } = payload;
      try {
        const res = await fetch(`${API_BASE}/pair`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ linkCode }),
        });
        const data = await res.json();

        if (!data.success) {
          sendResponse({ success: false, error: data.error });
          return;
        }

        // Sinh salt + derive key từ Master PIN
        const saltB64 = generateSalt();
        const salt = parseSalt(saltB64);
        _derivedKey = await deriveKey(masterPin, salt);

        // Mã hóa accessToken bằng derived key trước khi lưu storage
        const encryptedToken = await encrypt(data.accessToken, _derivedKey);

        await chrome.storage.local.set({
          herosim_paired: true,
          herosim_encrypted_token: encryptedToken,
          herosim_salt: saltB64,
          herosim_team_id: data.teamId,
          herosim_team_name: data.teamName,
          herosim_token_expires: data.expiresAt,
          herosim_locked: false,
        });

        // Bắt đầu alarm sync
        await chrome.alarms.create(ALARM_SYNC, { periodInMinutes: SYNC_INTERVAL_MINUTES });

        // Sync ngay lần đầu
        await syncAccounts();

        sendResponse({ success: true, teamName: data.teamName });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      break;
    }

    // ─── UNLOCK: Nhập PIN để giải mã key trong RAM ─────────────────────
    case 'UNLOCK': {
      const { masterPin } = payload;
      try {
        const stored = await chrome.storage.local.get([
          'herosim_encrypted_token',
          'herosim_salt',
        ]);

        if (!stored.herosim_salt || !stored.herosim_encrypted_token) {
          sendResponse({ success: false, error: 'Chưa liên kết Extension' });
          return;
        }

        const salt = parseSalt(stored.herosim_salt);
        const key = await deriveKey(masterPin, salt);

        // Thử giải mã token — nếu PIN sai sẽ throw
        const accessToken = await decrypt(stored.herosim_encrypted_token, key);

        // Verify token hợp lệ (Bearer test call)
        const res = await fetch(`${API_BASE}/sync`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (!res.ok) {
          sendResponse({ success: false, error: 'PIN sai hoặc token đã hết hạn' });
          return;
        }

        // PIN đúng — lưu key vào RAM
        _derivedKey = key;
        await chrome.storage.local.set({ herosim_locked: false });

        // Sync data mới nhất
        const syncData = await res.json();
        if (syncData.success) {
          await cacheAccounts(syncData.accounts, _derivedKey);
        }

        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: 'PIN không đúng' });
      }
      break;
    }

    // ─── LOCK: Xóa derived key khỏi RAM ────────────────────────────────
    case 'LOCK': {
      _derivedKey = null;
      await chrome.storage.local.set({ herosim_locked: true });
      sendResponse({ success: true });
      break;
    }

    // ─── GET_ACCOUNTS: Lấy danh sách accounts từ cache ─────────────────
    case 'GET_ACCOUNTS': {
      if (!_derivedKey) {
        sendResponse({ success: false, locked: true });
        return;
      }
      try {
        const stored = await chrome.storage.local.get(['herosim_accounts_cache']);
        const cache = stored.herosim_accounts_cache || [];

        // Giải mã tất cả accounts
        const accounts = await Promise.all(
          cache.map(async (acc) => {
            try {
              const decryptedPw = acc.encryptedLocal
                ? await decrypt(acc.encryptedLocal, _derivedKey)
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

    // ─── SYNC_NOW: Đồng bộ ngay lập tức ───────────────────────────────
    case 'SYNC_NOW': {
      if (!_derivedKey) {
        sendResponse({ success: false, locked: true });
        return;
      }
      const result = await syncAccounts();
      sendResponse(result);
      break;
    }

    // ─── GET_STATUS: Trạng thái Extension ──────────────────────────────
    case 'GET_STATUS': {
      const stored = await chrome.storage.local.get([
        'herosim_paired',
        'herosim_locked',
        'herosim_team_name',
        'herosim_last_sync',
      ]);
      sendResponse({
        paired: !!stored.herosim_paired,
        locked: !_derivedKey || !!stored.herosim_locked,
        teamName: stored.herosim_team_name,
        lastSync: stored.herosim_last_sync,
      });
      break;
    }

    // ─── UNPAIR: Xóa toàn bộ data ──────────────────────────────────────
    case 'UNPAIR': {
      _derivedKey = null;
      await chrome.alarms.clear(ALARM_SYNC);
      await chrome.storage.local.clear();
      sendResponse({ success: true });
      break;
    }

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
}

// ─── Sync accounts từ server về cache ────────────────────────────────────────
async function syncAccounts() {
  if (!_derivedKey) return { success: false, locked: true };

  try {
    const stored = await chrome.storage.local.get(['herosim_encrypted_token', 'herosim_salt']);
    if (!stored.herosim_encrypted_token) return { success: false, error: 'No token' };

    const accessToken = await decrypt(stored.herosim_encrypted_token, _derivedKey);

    const res = await fetch(`${API_BASE}/sync`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        // Token hết hạn — lock
        _derivedKey = null;
        await chrome.storage.local.set({ herosim_locked: true });
      }
      return { success: false, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    if (!data.success) return { success: false, error: data.error };

    // Cache accounts với mã hóa thêm lớp AES-GCM client-side
    await cacheAccounts(data.accounts, _derivedKey);
    await chrome.storage.local.set({ herosim_last_sync: new Date().toISOString() });

    return { success: true, count: data.accounts.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── Lưu accounts vào cache (mã hóa thêm lớp local) ─────────────────────────
async function cacheAccounts(accounts, key) {
  const encrypted = await Promise.all(
    accounts.map(async (acc) => {
      // encryptedPassword từ server là ciphertext AES-256-CBC server-side
      // Extension mã hóa thêm lớp AES-GCM để bảo vệ cache local
      const encryptedLocal = acc.encryptedPassword
        ? await encrypt(acc.encryptedPassword, key)
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
        encryptedLocal, // Lưu server ciphertext (đã mã hóa thêm lớp local)
      };
    })
  );
  await chrome.storage.local.set({ herosim_accounts_cache: encrypted });
}
