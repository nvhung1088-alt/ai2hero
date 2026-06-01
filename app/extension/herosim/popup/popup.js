// HeroSim Extension v4.0 — popup/popup.js
// Điều khiển luồng UI 4 trạng thái & Giao tiếp với Service Worker

// ─── Platform Icon Map ─────────────────────────────────────────────────────────
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

// ─── State Management ─────────────────────────────────────────────────────────
let allAccounts = [];
let tempAuthData = {
  tempToken: '',
  password: '',
  workspaces: []
};

function showState(stateName) {
  document.querySelectorAll('.state').forEach(el => el.style.display = 'none');
  const el = document.getElementById(`state-${stateName}`);
  if (el) el.style.display = 'flex';
}

function showToast(msg, duration = 2000) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, duration);
  }
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

// ─── Render Accounts ───────────────────────────────────────────────────────────
function renderAccounts(accounts) {
  const list = document.getElementById('accounts-list');
  if (!list) return;

  if (!accounts || accounts.length === 0) {
    list.innerHTML = `<div class="empty-msg">
      Không tìm thấy tài khoản nào khớp.<br>
      <small>Vui lòng thêm tài khoản trên web <strong>ai2hero.com</strong> rồi bấm đồng bộ.</small>
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

  // Lắng nghe sự kiện Click Copy
  list.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const value = btn.dataset.value;
      const type = btn.dataset.type;

      try {
        await navigator.clipboard.writeText(value);
        const originalText = btn.textContent;
        btn.textContent = '✓';
        btn.classList.add('copied');

        // Tự động xóa clipboard sau 30 giây nếu là password
        if (type === 'pw') {
          setTimeout(async () => {
            try {
              const currentText = await navigator.clipboard.readText();
              if (currentText === value) {
                await navigator.clipboard.writeText('');
                console.log('[HeroSim] Đã tự động xóa password khỏi clipboard để bảo mật.');
              }
            } catch (_) {}
          }, 30000);
        }

        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('copied');
        }, 1500);
      } catch (err) {
        showToast('Không thể sao chép');
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
    (acc.platformKey || '').toLowerCase().includes(q) ||
    (acc.loginEmail || '').toLowerCase().includes(q)
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

// ─── Render Workspace List ─────────────────────────────────────────────────────
function renderWorkspaces(workspaces) {
  const container = document.getElementById('workspace-list');
  if (!container) return;

  if (!workspaces || workspaces.length === 0) {
    container.innerHTML = '<div class="empty-msg">Bạn không thuộc về workspace nào.</div>';
    return;
  }

  container.innerHTML = workspaces.map((ws, idx) => `
    <div class="workspace-item ${idx === 0 ? 'selected' : ''}" data-id="${ws.id}">
      <input type="radio" name="workspace-radio" class="workspace-radio" value="${ws.id}" ${idx === 0 ? 'checked' : ''}>
      <span class="workspace-name">${escapeHtml(ws.name)}</span>
      <span class="workspace-role">${escapeHtml(ws.role)}</span>
    </div>
  `).join('');

  container.querySelectorAll('.workspace-item').forEach(item => {
    item.addEventListener('click', () => {
      container.querySelectorAll('.workspace-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      const radio = item.querySelector('.workspace-radio');
      if (radio) radio.checked = true;
    });
  });
}

// ─── Load Dashboard ────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const res = await sendMsg('GET_ACCOUNTS');
    if (res.locked) {
      showState('locked');
      return;
    }
    if (res.success) {
      allAccounts = res.accounts || [];
      renderAccounts(allAccounts);
    }
  } catch (err) {
    const list = document.getElementById('accounts-list');
    if (list) list.innerHTML = `<div class="empty-msg">Lỗi tải dữ liệu: ${err.message}</div>`;
  }

  // Cập nhật thông tin Sync cuối
  const stored = await chrome.storage.local.get(['herosim_last_sync', 'herosim_team_id']);
  if (stored.herosim_last_sync) {
    const date = new Date(stored.herosim_last_sync);
    const syncStatus = document.getElementById('sync-status');
    if (syncStatus) {
      syncStatus.textContent = `Sync cuối: ${date.toLocaleTimeString('vi-VN')} | ${date.toLocaleDateString('vi-VN')}`;
    }
  }

  // Dựng dropdown switcher workspace
  const localData = await chrome.storage.local.get(['herosim_workspaces', 'herosim_team_id']);
  const workspaces = localData.herosim_workspaces || [];
  const activeTeamId = localData.herosim_team_id;

  const select = document.getElementById('dashboard-workspace-select');
  if (select && workspaces.length > 0) {
    select.innerHTML = workspaces.map(ws => `
      <option value="${ws.id}" ${ws.id === activeTeamId ? 'selected' : ''}>
        💼 ${escapeHtml(ws.name)} (${escapeHtml(ws.role)})
      </option>
    `).join('');
  }
}

// ─── Khởi tạo kiểm tra ban đầu (Init) ──────────────────────────────────────────
async function init() {
  try {
    const status = await sendMsg('GET_STATE');

    if (status.state === 'logged_out') {
      showState('logged-out');
      return;
    }

    if (status.state === 'select_workspace') {
      if (status.tempAuth) {
        tempAuthData = status.tempAuth;
        renderWorkspaces(tempAuthData.workspaces);
      }
      showState('select-workspace');
      return;
    }

    if (status.state === 'locked') {
      showState('locked');
      const lockedSub = document.getElementById('locked-team-name');
      if (lockedSub && status.teamName) {
        lockedSub.textContent = status.teamName;
      }
      setTimeout(() => {
        const passInput = document.getElementById('unlock-password');
        if (passInput) passInput.focus();
      }, 150);
      return;
    }

    // Đã mở khóa -> Chuyển thẳng vào Dashboard
    showState('dashboard');
    await loadDashboard();
  } catch (err) {
    showState('logged-out');
  }
}

// ─── Sự kiện DOM ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();

  // ── 1. Màn hình LoggedOut (Đăng nhập) ────────────────────────────────────────
  const toggleLoginPass = document.getElementById('toggle-login-password');
  if (toggleLoginPass) {
    toggleLoginPass.addEventListener('click', () => {
      const input = document.getElementById('login-password');
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });
  }

  const btnLogin = document.getElementById('btn-login');
  if (btnLogin) {
    btnLogin.addEventListener('click', async () => {
      hideError('login-error');
      const email = document.getElementById('login-email')?.value.trim();
      const password = document.getElementById('login-password')?.value;

      if (!email || !password) {
        showError('login-error', 'Vui lòng nhập đầy đủ email và mật khẩu');
        return;
      }

      setLoading('btn-login', 'login-spinner', true);
      try {
        const res = await sendMsg('LOGIN', { email, password });
        if (res.success) {
          // Lưu tạm thông tin xác thực để chuyển bước chọn Workspace
          tempAuthData = {
            tempToken: res.tempToken,
            password: password,
            workspaces: res.workspaces
          };

          // Lưu danh sách workspaces để dùng cho dropdown switcher sau này
          await chrome.storage.local.set({ herosim_workspaces: res.workspaces });

          renderWorkspaces(res.workspaces);
          showState('select-workspace');
        } else {
          showError('login-error', res.error || 'Thông tin đăng nhập không hợp lệ');
        }
      } catch (err) {
        showError('login-error', err.message || 'Lỗi kết nối máy chủ');
      } finally {
        setLoading('btn-login', 'login-spinner', false);
      }
    });
  }

  // Đăng nhập bằng phím Enter
  document.getElementById('login-password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnLogin?.click();
  });

  // ── 2. Màn hình Chọn Workspace ───────────────────────────────────────────────
  const btnSelectWorkspace = document.getElementById('btn-select-workspace');
  if (btnSelectWorkspace) {
    btnSelectWorkspace.addEventListener('click', async () => {
      hideError('workspace-error');
      const selectedItem = document.querySelector('.workspace-item.selected');
      if (!selectedItem) {
        showError('workspace-error', 'Vui lòng chọn một không gian làm việc');
        return;
      }
      const teamId = Number(selectedItem.dataset.id);

      setLoading('btn-select-workspace', 'workspace-spinner', true);
      try {
        const res = await sendMsg('SELECT_WORKSPACE', {
          tempToken: tempAuthData.tempToken,
          teamId,
          password: tempAuthData.password
        });

        if (res.success) {
          showToast(`✓ Đã kết nối với ${res.teamName}`);
          showState('dashboard');
          await loadDashboard();
        } else {
          showError('workspace-error', res.error || 'Kết nối thất bại');
        }
      } catch (err) {
        showError('workspace-error', err.message);
      } finally {
        setLoading('btn-select-workspace', 'workspace-spinner', false);
      }
    });
  }

  document.getElementById('btn-workspace-back')?.addEventListener('click', async () => {
    await chrome.storage.local.remove(['herosim_temp_auth']);
    tempAuthData = { tempToken: '', password: '', workspaces: [] };
    showState('logged-out');
  });

  // ── 3. Màn hình Khóa (Locked) ────────────────────────────────────────────────
  const toggleUnlockPass = document.getElementById('toggle-unlock-password');
  if (toggleUnlockPass) {
    toggleUnlockPass.addEventListener('click', () => {
      const input = document.getElementById('unlock-password');
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });
  }

  const btnUnlock = document.getElementById('btn-unlock');
  if (btnUnlock) {
    btnUnlock.addEventListener('click', async () => {
      hideError('unlock-error');
      const password = document.getElementById('unlock-password')?.value;

      if (!password) {
        showError('unlock-error', 'Vui lòng nhập mật khẩu');
        return;
      }

      setLoading('btn-unlock', 'unlock-spinner', true);
      try {
        const res = await sendMsg('UNLOCK', { password });
        if (res.success) {
          showState('dashboard');
          await loadDashboard();
        } else {
          showError('unlock-error', res.error || 'Mật khẩu không đúng');
        }
      } catch (err) {
        showError('unlock-error', err.message);
      } finally {
        setLoading('btn-unlock', 'unlock-spinner', false);
      }
    });
  }

  document.getElementById('unlock-password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnUnlock?.click();
  });

  document.getElementById('btn-logout-locked')?.addEventListener('click', async () => {
    if (confirm('Đăng xuất tài khoản khỏi thiết bị này?')) {
      await sendMsg('UNPAIR');
      showState('logged-out');
      showToast('Đã đăng xuất');
    }
  });

  // ── 4. Màn hình Bảng điều khiển (Dashboard) ──────────────────────────────────
  document.getElementById('btn-lock')?.addEventListener('click', async () => {
    await sendMsg('LOCK');
    showState('locked');
    showToast('🔒 Đã khóa vault');
    setTimeout(() => {
      const pass = document.getElementById('unlock-password');
      if (pass) pass.focus();
    }, 150);
  });

  document.getElementById('btn-sync')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-sync');
    if (btn) {
      btn.style.opacity = '0.5';
      btn.style.pointerEvents = 'none';
    }
    try {
      const res = await sendMsg('SYNC');
      if (res.success) {
        showToast(`✓ Đã đồng bộ ${res.count} tài khoản`);
        await loadDashboard();
      } else if (res.locked) {
        showState('locked');
      } else {
        showToast(`Lỗi sync: ${res.error}`);
      }
    } finally {
      if (btn) {
        btn.style.opacity = '';
        btn.style.pointerEvents = '';
      }
    }
  });

  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    if (confirm('Đăng xuất tài khoản khỏi thiết bị này?')) {
      await sendMsg('UNPAIR');
      showState('logged-out');
      showToast('Đã đăng xuất');
    }
  });

  document.getElementById('search-input')?.addEventListener('input', (e) => {
    filterAccounts(e.target.value);
  });

  // Xử lý chuyển workspace nhanh trên Dashboard
  const workspaceSelect = document.getElementById('dashboard-workspace-select');
  if (workspaceSelect) {
    workspaceSelect.addEventListener('change', async (e) => {
      const targetTeamId = Number(e.target.value);
      
      // Chuyển sang trạng thái đăng nhập lại để chọn Workspace nhằm đảm bảo quy trình bảo mật (sinh Key/Token mới)
      // Nhưng để mượt mà nhất, chúng ta có thể chuyển thẳng sang trạng thái "Chọn Workspace" nếu tempToken vẫn còn trong session.
      // Nếu không, yêu cầu đăng nhập lại.
      if (tempAuthData.tempToken && tempAuthData.password) {
        renderWorkspaces(tempAuthData.workspaces);
        showState('select-workspace');
        // Auto select target team
        const items = document.querySelectorAll('.workspace-item');
        items.forEach(item => {
          if (Number(item.dataset.id) === targetTeamId) {
            item.click();
          }
        });
        showToast('Nhập lại mật khẩu để đổi Workspace');
      } else {
        // Hết tempToken -> Logout bắt buộc nhập mật khẩu để đảm bảo derived key được tạo lại chuẩn xác.
        await sendMsg('UNPAIR');
        showState('logged-out');
        showToast('Vui lòng đăng nhập lại để chuyển Workspace');
      }
    });
  }
});
