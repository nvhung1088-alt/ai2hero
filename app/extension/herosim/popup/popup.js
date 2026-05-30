// HeroSim Extension — popup/popup.js
// Điều khiển 3 trạng thái UI + giao tiếp với Service Worker

// ─── Platform icon map ─────────────────────────────────────────────────────────
const PLATFORM_ICONS = {
  facebook: '📘', google: '🔵', tiktok: '🎵', zalo: '💬',
  instagram: '📸', twitter: '🐦', youtube: '▶️', shopee: '🛒',
  lazada: '🏪', grab: '🟢', momo: '💜', vnpay: '💳',
  telegram: '✈️', discord: '💜', github: '🐙', default: '🔑'
};

function getPlatformIcon(platformKey) {
  if (!platformKey) return PLATFORM_ICONS.default;
  const key = platformKey.toLowerCase();
  for (const [k, icon] of Object.entries(PLATFORM_ICONS)) {
    if (key.includes(k)) return icon;
  }
  return PLATFORM_ICONS.default;
}

// ─── State management ─────────────────────────────────────────────────────────
let allAccounts = [];

function showState(stateName) {
  document.querySelectorAll('.state').forEach(el => el.style.display = 'none');
  const el = document.getElementById(`state-${stateName}`);
  if (el) el.style.display = 'flex';
}

function showToast(msg, duration = 2000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, duration);
}

function setLoading(btnId, spinnerId, loading) {
  const btn = document.getElementById(btnId);
  const spinner = document.getElementById(spinnerId);
  if (btn) btn.disabled = loading;
  if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
}

function showError(elementId, msg) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
}

function hideError(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.style.display = 'none';
}

// ─── Message to Service Worker ─────────────────────────────────────────────────
function sendMsg(type, payload = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// ─── Accounts rendering ────────────────────────────────────────────────────────
function renderAccounts(accounts) {
  const list = document.getElementById('accounts-list');

  if (!accounts || accounts.length === 0) {
    list.innerHTML = `<div class="empty-msg">
      Chưa có tài khoản nào.<br>
      <small>Đồng bộ từ <strong>ai2hero.com/sim</strong> trước.</small>
    </div>`;
    return;
  }

  list.innerHTML = accounts.map(acc => `
    <div class="account-card">
      <div class="account-icon">${getPlatformIcon(acc.platformKey)}</div>
      <div class="account-info">
        <div class="account-name">${escapeHtml(acc.accountName)}</div>
        <div class="account-user">${escapeHtml(acc.username || acc.loginEmail || '')}</div>
      </div>
      <div class="account-actions">
        ${acc.username ? `<button class="copy-btn" data-type="user" data-value="${escapeAttr(acc.username)}">User</button>` : ''}
        ${acc.password ? `<button class="copy-btn" data-type="pw" data-value="${escapeAttr(acc.password)}">🔑 PW</button>` : ''}
      </div>
    </div>
  `).join('');

  // Copy button handlers
  list.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const value = btn.dataset.value;
      const type = btn.dataset.type;

      try {
        await navigator.clipboard.writeText(value);
        const original = btn.textContent;
        btn.textContent = '✓ Đã copy!';
        btn.classList.add('copied');

        // Xóa clipboard sau 30 giây (bảo mật)
        if (type === 'pw') {
          setTimeout(async () => {
            try {
              const current = await navigator.clipboard.readText();
              if (current === value) {
                await navigator.clipboard.writeText('');
              }
            } catch (_) {}
          }, 30000);
        }

        setTimeout(() => {
          btn.textContent = original;
          btn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        showToast('Không thể copy — thử lại');
      }
    });
  });
}

function filterAccounts(query) {
  if (!query.trim()) {
    renderAccounts(allAccounts);
    return;
  }
  const q = query.toLowerCase();
  const filtered = allAccounts.filter(acc =>
    (acc.accountName || '').toLowerCase().includes(q) ||
    (acc.username || '').toLowerCase().includes(q) ||
    (acc.platformKey || '').toLowerCase().includes(q)
  );
  renderAccounts(filtered);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── Load accounts và hiển thị dashboard ──────────────────────────────────────
async function loadDashboard(teamName) {
  if (teamName) {
    document.getElementById('dashboard-team-name').textContent = teamName;
  }

  try {
    const res = await sendMsg('GET_ACCOUNTS');
    if (res.locked) {
      showState('unlock');
      return;
    }
    if (res.success) {
      allAccounts = res.accounts || [];
      renderAccounts(allAccounts);
    }
  } catch (err) {
    document.getElementById('accounts-list').innerHTML =
      `<div class="empty-msg">Lỗi tải danh sách: ${err.message}</div>`;
  }

  // Hiển thị thời gian sync cuối
  const stored = await chrome.storage.local.get(['herosim_last_sync']);
  if (stored.herosim_last_sync) {
    const date = new Date(stored.herosim_last_sync);
    document.getElementById('sync-status').textContent =
      `Sync cuối: ${date.toLocaleTimeString('vi-VN')}`;
  }
}

// ─── Init: kiểm tra trạng thái ban đầu ────────────────────────────────────────
async function init() {
  try {
    const status = await sendMsg('GET_STATUS');

    if (!status.paired) {
      showState('pair');
      return;
    }

    if (status.locked) {
      showState('unlock');
      const teamEl = document.getElementById('unlock-team-name');
      if (teamEl && status.teamName) teamEl.textContent = status.teamName;
      // Auto focus PIN input
      setTimeout(() => {
        const pinEl = document.getElementById('unlock-pin');
        if (pinEl) pinEl.focus();
      }, 100);
      return;
    }

    showState('dashboard');
    await loadDashboard(status.teamName);
  } catch (err) {
    // Service Worker chưa ready — mặc định state pair
    showState('pair');
  }
}

// ─── Event listeners ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();

  // ── STATE A: Pair ──────────────────────────────────────────────────────
  const pairCode = document.getElementById('pair-code');
  if (pairCode) {
    pairCode.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
  }

  document.getElementById('toggle-pair-pin')?.addEventListener('click', () => {
    const pin = document.getElementById('pair-pin');
    pin.type = pin.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('btn-pair')?.addEventListener('click', async () => {
    hideError('pair-error');
    const code = document.getElementById('pair-code')?.value.trim();
    const pin = document.getElementById('pair-pin')?.value;

    if (!code || code.length < 4) {
      showError('pair-error', 'Vui lòng nhập mã liên kết hợp lệ (4-6 ký tự)');
      return;
    }
    if (!pin || pin.length < 4) {
      showError('pair-error', 'Master PIN phải có ít nhất 4 ký tự');
      return;
    }

    setLoading('btn-pair', 'pair-spinner', true);
    try {
      const res = await sendMsg('PAIR', { linkCode: code, masterPin: pin });
      if (res.success) {
        showToast(`✅ Đã liên kết với ${res.teamName || 'Workspace'}!`);
        showState('dashboard');
        await loadDashboard(res.teamName);
      } else {
        showError('pair-error', res.error || 'Lỗi liên kết. Vui lòng thử lại.');
      }
    } catch (err) {
      showError('pair-error', `Lỗi kết nối: ${err.message}`);
    } finally {
      setLoading('btn-pair', 'pair-spinner', false);
    }
  });

  // Enter key pair
  document.getElementById('pair-pin')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-pair')?.click();
  });

  // ── STATE B: Unlock ────────────────────────────────────────────────────
  document.getElementById('toggle-unlock-pin')?.addEventListener('click', () => {
    const pin = document.getElementById('unlock-pin');
    pin.type = pin.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('btn-unlock')?.addEventListener('click', async () => {
    hideError('unlock-error');
    const pin = document.getElementById('unlock-pin')?.value;

    if (!pin || pin.length < 4) {
      showError('unlock-error', 'Vui lòng nhập Master PIN');
      return;
    }

    setLoading('btn-unlock', 'unlock-spinner', true);
    try {
      const res = await sendMsg('UNLOCK', { masterPin: pin });
      if (res.success) {
        const stored = await chrome.storage.local.get(['herosim_team_name']);
        showState('dashboard');
        await loadDashboard(stored.herosim_team_name);
      } else {
        showError('unlock-error', res.error || 'PIN không đúng. Vui lòng thử lại.');
      }
    } catch (err) {
      showError('unlock-error', `Lỗi: ${err.message}`);
    } finally {
      setLoading('btn-unlock', 'unlock-spinner', false);
    }
  });

  document.getElementById('unlock-pin')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-unlock')?.click();
  });

  document.getElementById('btn-unpair')?.addEventListener('click', async () => {
    if (!confirm('Xóa liên kết Extension này? Cần sinh mã mới từ ai2hero.com để kết nối lại.')) return;
    await sendMsg('UNPAIR');
    showState('pair');
    showToast('Đã hủy liên kết');
  });

  // ── STATE C: Dashboard ─────────────────────────────────────────────────
  document.getElementById('btn-lock')?.addEventListener('click', async () => {
    await sendMsg('LOCK');
    showState('unlock');
    showToast('🔒 Vault đã khóa');
    setTimeout(() => document.getElementById('unlock-pin')?.focus(), 100);
  });

  document.getElementById('btn-sync')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-sync');
    btn.style.opacity = '0.5';
    btn.style.pointerEvents = 'none';
    try {
      const res = await sendMsg('SYNC_NOW');
      if (res.success) {
        showToast(`✓ Đồng bộ ${res.count} tài khoản`);
        await loadDashboard();
      } else if (res.locked) {
        showState('unlock');
      } else {
        showToast(`Lỗi sync: ${res.error}`);
      }
    } finally {
      btn.style.opacity = '';
      btn.style.pointerEvents = '';
    }
  });

  document.getElementById('search-input')?.addEventListener('input', (e) => {
    filterAccounts(e.target.value);
  });
});
