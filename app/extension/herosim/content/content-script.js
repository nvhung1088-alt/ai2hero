// HeroSim Extension v4.0.1 — content/content-script.js
// Bộ máy Tự động điền kiên cố — Direct DOM Insertion & Dynamic Style Injection
// PATCH 4.0.1: Fix icon kép trên form 1 bước (Facebook) + Fix auto-fill bước 2 Google

'use strict';

// ─── 1. Tự động Inject CSS sạch vào Document Head khi khởi động ────────────────
function injectGlobalStyles() {
  if (document.getElementById('herosim-global-styles')) return;

  const style = document.createElement('style');
  style.id = 'herosim-global-styles';
  style.textContent = `
    /* CSS cho Icon đặt tuyệt đối trên input */
    .hs-icon {
      position: absolute;
      z-index: 1000;
      width: 20px;
      height: 20px;
      background: none;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      margin: 0;
      outline: none;
      transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      opacity: 0.85;
      box-sizing: border-box;
    }
    .hs-icon:hover {
      transform: scale(1.18);
      opacity: 1;
    }
    .hs-icon:active {
      transform: scale(0.9);
    }

    /* CSS cho Dropdown gợi ý chọn tài khoản */
    #hs-autofill-dropdown {
      position: absolute;
      z-index: 2147483647;
      width: 280px;
      max-height: 360px;
      background: rgba(12, 12, 18, 0.96) !important;
      backdrop-filter: blur(20px) !important;
      -webkit-backdrop-filter: blur(20px) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 12px !important;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5) !important;
      color: #f3f4f6 !important;
      font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
      font-size: 13px !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
      animation: hsFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
      box-sizing: border-box !important;
    }
    @keyframes hsFadeIn {
      from { opacity: 0; transform: scale(0.97) translateY(4px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .hs-dd-header {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      padding: 10px 12px !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
      font-weight: 700 !important;
      font-size: 12px !important;
      color: #f97316 !important;
    }
    .hs-dd-logo {
      flex-shrink: 0 !important;
    }
    .hs-dd-count {
      margin-left: auto !important;
      font-size: 9px !important;
      font-weight: 800 !important;
      color: #9ca3af !important;
      background: rgba(255, 255, 255, 0.08) !important;
      padding: 2px 6px !important;
      border-radius: 10px !important;
      text-transform: uppercase !important;
    }
    .hs-dd-search-container {
      padding: 6px 10px !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
      background: rgba(0, 0, 0, 0.1) !important;
    }
    .hs-dd-search {
      width: 100% !important;
      background: rgba(255, 255, 255, 0.04) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 6px !important;
      padding: 6px 8px !important;
      font-size: 11px !important;
      color: #ffffff !important;
      outline: none !important;
      font-family: inherit !important;
      box-sizing: border-box !important;
    }
    .hs-dd-search:focus {
      border-color: rgba(249, 115, 22, 0.5) !important;
      background: rgba(255, 255, 255, 0.06) !important;
    }
    .hs-dd-list {
      flex: 1 !important;
      overflow-y: auto !important;
      max-height: 240px !important;
    }
    .hs-dd-list::-webkit-scrollbar {
      width: 4px !important;
    }
    .hs-dd-list::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1) !important;
      border-radius: 2px !important;
    }
    .hs-dd-item {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      padding: 10px 12px !important;
      cursor: pointer !important;
      transition: all 0.15s !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.02) !important;
      box-sizing: border-box !important;
      user-select: none !important;
    }
    .hs-dd-item:hover {
      background: rgba(249, 115, 22, 0.08) !important;
    }
    .hs-dd-platform {
      font-size: 16px !important;
      flex-shrink: 0 !important;
    }
    .hs-dd-info {
      flex: 1 !important;
      min-width: 0 !important;
    }
    .hs-dd-name {
      font-weight: 700 !important;
      color: #ffffff !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }
    .hs-dd-user {
      font-size: 10px !important;
      color: #9ca3af !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      margin-top: 1px !important;
    }
    .hs-dd-badge {
      font-size: 11px !important;
      opacity: 0.6 !important;
      flex-shrink: 0 !important;
    }
    .hs-dd-empty {
      padding: 24px 12px !important;
      text-align: center !important;
      color: #9ca3af !important;
      line-height: 1.6 !important;
      font-size: 11px !important;
    }

    /* CSS cho Save Banner gợi ý */
    #hs-save-banner {
      position: fixed;
      top: -140px;
      left: 50%;
      transform: translateX(-50%);
      width: 360px;
      background: rgba(12, 12, 18, 0.96) !important;
      backdrop-filter: blur(20px) !important;
      -webkit-backdrop-filter: blur(20px) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 12px !important;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6) !important;
      color: #f3f4f6 !important;
      font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
      font-size: 13px !important;
      z-index: 2147483647 !important;
      overflow: hidden !important;
      transition: top 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
      display: flex !important;
      flex-direction: column !important;
      box-sizing: border-box !important;
    }
    #hs-save-banner.hs-banner-visible {
      top: 16px;
    }
    .hs-banner-header {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      padding: 10px 14px !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
      font-weight: 700 !important;
      font-size: 12px !important;
      color: #f97316 !important;
    }
    .hs-banner-close {
      margin-left: auto !important;
      background: none !important;
      border: none !important;
      color: #9ca3af !important;
      cursor: pointer !important;
      font-size: 12px !important;
      padding: 2px !important;
      line-height: 1 !important;
    }
    .hs-banner-close:hover {
      color: #ffffff !important;
    }
    .hs-banner-body {
      padding: 14px !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 12px !important;
    }
    .hs-banner-msg {
      line-height: 1.5 !important;
      color: #e5e7eb !important;
    }
    .hs-banner-actions {
      display: flex !important;
      justify-content: flex-end !important;
      gap: 8px !important;
    }
    .hs-banner-btn {
      padding: 8px 14px !important;
      border-radius: 6px !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      cursor: pointer !important;
      font-family: inherit !important;
      transition: all 0.2s !important;
      border: none !important;
      box-sizing: border-box !important;
    }
    .hs-banner-btn-save {
      background: linear-gradient(135deg, #f97316, #ec4899) !important;
      color: #ffffff !important;
    }
    .hs-banner-btn-save:hover {
      opacity: 0.9 !important;
    }
    .hs-banner-btn-save:disabled {
      opacity: 0.5 !important;
      cursor: not-allowed !important;
    }
    .hs-banner-btn-skip {
      background: rgba(255, 255, 255, 0.08) !important;
      color: #d1d5db !important;
      border: 1px solid rgba(255, 255, 255, 0.04) !important;
    }
    .hs-banner-btn-skip:hover {
      background: rgba(255, 255, 255, 0.15) !important;
      color: #ffffff !important;
    }
  `;
  document.head.appendChild(style);
}

// ─── 2. Hằng số & State cục bộ ────────────────────────────────────────────────
const HS_ATTR = 'data-herosim';
const HS_ICON_CLASS = 'hs-icon';
const HS_DROPDOWN_ID = 'hs-autofill-dropdown';
const HS_BANNER_ID = 'hs-save-banner';

let activeDropdown = null;
let activePwField = null;
let activeUserField = null;

// SVG Logo thẻ SIM bảo mật của HeroSim (Bypass CSP 100% nhờ inline SVG)
const HS_LOGO_SVG = `
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="hs-dd-logo" style="display: block; pointer-events: none; flex-shrink: 0;">
    <defs>
      <linearGradient id="hs-grad-sim" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f97316" />
        <stop offset="100%" stop-color="#ec4899" />
      </linearGradient>
    </defs>
    <!-- Thẻ SIM vát góc cao cấp -->
    <path d="M4 2h10l6 6v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2z" fill="url(#hs-grad-sim)"/>
    <!-- Bản mạch chip SIM cách điệu -->
    <rect x="6" y="8" width="8" height="8" rx="1.5" fill="#ffffff" fill-opacity="0.3"/>
    <path d="M10 8v8M6 12h8M6 10h8M6 14h8" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" opacity="0.8"/>
    <!-- Ổ khóa bảo mật mini ở góc dưới bên phải -->
    <circle cx="16" cy="16" r="6" fill="#f97316" stroke="#ffffff" stroke-width="1.2"/>
    <path d="M16 13a1.5 1.5 0 00-1.5 1.5v1h-.5v2h4v-2h-.5v-1a1.5 1.5 0 00-1.5-1.5zm0.5 2.5h-1v-1a.5.5 0 111 0v1z" fill="#ffffff"/>
  </svg>
`;

// ─── 3. Multi-step Handler (sessionStorage) ──────────────────────────────────
function getPendingPassword() {
  try { return sessionStorage.getItem('__hsPendingPassword'); } catch { return null; }
}
function setPendingPassword(password) {
  try {
    if (password) sessionStorage.setItem('__hsPendingPassword', password);
    else sessionStorage.removeItem('__hsPendingPassword');
  } catch {}
}
function getLastFilledEmail() {
  try { return sessionStorage.getItem('__hsLastFilledEmail'); } catch { return null; }
}
function setLastFilledEmail(email) {
  try {
    if (email) sessionStorage.setItem('__hsLastFilledEmail', email);
    else sessionStorage.removeItem('__hsLastFilledEmail');
  } catch {}
}

// ─── 4. Helper: Giao tiếp với Service Worker ──────────────────────────────────
function swMsg(type, payload = {}) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type, payload }, (res) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(res || { success: false });
        }
      });
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
}

// ─── 5. Form Scanner (Quét DOM thông minh) ─────────────────────────────────────
function findFormPair(pwField) {
  const form = pwField.closest('form') || document.body;
  const candidates = Array.from(form.querySelectorAll(
    'input[type=text], input[type=email], input[type=tel]'
  )).filter(el => el !== pwField && isElementVisible(el));

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Thuật toán điểm ưu tiên
  const scored = candidates.map(el => {
    let score = 0;
    const ac = (el.autocomplete || '').toLowerCase();
    const name = (el.name || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    
    if (ac === 'username' || ac === 'email') score += 100;
    if (/user|email|login|identifier|account/.test(name + id)) score += 50;
    if (el.type === 'email') score += 30;
    return { el, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].el;
}

function findPasswordField(userField) {
  if (!userField) return null;
  const form = userField.closest('form') || userField.closest('div') || document.body;
  const pwFields = Array.from(form.querySelectorAll('input[type=password]')).filter(isElementVisible);
  if (pwFields.length > 0) return pwFields[0];

  // Fallback quét toàn bộ trang
  const allPws = Array.from(document.querySelectorAll('input[type=password]')).filter(isElementVisible);
  if (allPws.length > 0) return allPws[0];

  return null;
}

function isElementVisible(el) {
  const rect = el.getBoundingClientRect();
  return window.getComputedStyle(el).display !== 'none' &&
         window.getComputedStyle(el).visibility !== 'hidden';
}

// ─── 6. Value Injector (Bypass React/Vue/Angular State) ────────────────────────
function fillField(el, value) {
  if (!el || value === undefined || value === null) return;

  console.log(`[HeroSim Engine] Điền trường:`, el, `với giá trị dài:`, value.length);

  el.focus();

  // Dùng prototype setter chuẩn của Bitwarden bypass React 16+ overrides
  const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
  const nativeSetter = descriptor?.set;

  if (nativeSetter) {
    nativeSetter.call(el, value);
  } else {
    el.value = value;
  }

  // Bypass React _valueTracker
  if (el._valueTracker) {
    el._valueTracker.setValue('');
  }

  // Phát InputEvent và ChangeEvent khép kín (bubbles: true)
  el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: value }));
  el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

  console.log('[HeroSim Engine] Điền hoàn tất.');
}

// Chạy lại tối đa 5 lần × 300ms đối phó với việc React SPA re-render đè xóa state
function retryFillPassword(pwField, password, attempt = 0) {
  const MAX_ATTEMPTS = 5;
  const RETRY_DELAY = 300;

  let currentPwField = pwField;
  if (!currentPwField || !currentPwField.isConnected) {
    currentPwField = document.querySelector('input[type=password]');
  }

  if (currentPwField) {
    currentPwField.focus();
    fillField(currentPwField, password);
  }

  setTimeout(() => {
    let checkField = currentPwField;
    if (!checkField || !checkField.isConnected) {
      checkField = document.querySelector('input[type=password]');
    }

    if (checkField && checkField.value === password) {
      // Đã điền thành công bền vững -> Clear pending và phát visual check
      setPendingPassword(null);
      flashConfirm(checkField, '#ec4899');
    } else if (attempt < MAX_ATTEMPTS) {
      console.log(`[HeroSim Engine] Trạng thái password bị đè xóa. Thử lại lần ${attempt + 1}...`);
      retryFillPassword(checkField || pwField, password, attempt + 1);
    } else {
      setPendingPassword(null); // Đóng để tránh vòng lặp
    }
  }, RETRY_DELAY);
}

function flashConfirm(el, color) {
  if (!el) return;
  const origOutline = el.style.outline;
  el.style.outline = `2px dashed ${color}`;
  el.style.outlineOffset = '2px';
  setTimeout(() => { el.style.outline = origOutline; el.style.outlineOffset = ''; }, 1200);
}

// ─── 7. Direct DOM UI (Icons, Dropdown, Save Banner) ───────────────────────────

// A. Inject Icon gợi ý trực tiếp vào DOM thật
function injectIconToField(field, pwField) {
  if (!field || field.getAttribute(HS_ATTR)) return;
  field.setAttribute(HS_ATTR, 'true');

  const parent = field.parentElement;
  if (!parent) return;

  const pStyle = window.getComputedStyle(parent);
  if (pStyle.position === 'static') parent.style.position = 'relative';

  // Thêm padding right cho input để icon không che text
  const origPR = parseInt(window.getComputedStyle(field).paddingRight) || 8;
  field.style.paddingRight = Math.max(origPR, 30) + 'px';

  // Tạo icon button
  const icon = document.createElement('button');
  icon.type = 'button';
  icon.className = HS_ICON_CLASS;
  icon.title = 'Điền từ HeroSim Vault';
  icon.setAttribute('aria-label', 'HeroSim Autofill');
  icon.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; pointer-events: none;">
      <defs>
        <linearGradient id="hs-grad-icon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f97316" />
          <stop offset="100%" stop-color="#ec4899" />
        </linearGradient>
      </defs>
      <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="url(#hs-grad-icon)"/>
      <path d="M12 7a3 3 0 00-3 3v2H8v5h8v-5h-1v-2a3 3 0 00-3-3zm1 5h-2v-2a1 1 0 112 0v2z" fill="#ffffff"/>
    </svg>
  `;

  parent.appendChild(icon);

  // Căn vị trí icon theo input
  function positionIcon() {
    const rect = field.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    icon.style.top = (rect.top - parentRect.top + rect.height / 2 - 10) + 'px';
    icon.style.right = '6px';
  }
  positionIcon();
  window.addEventListener('resize', positionIcon, { passive: true });

  // Click icon → hiện gợi ý
  icon.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeDropdown) {
      hideDropdown();
    } else {
      showAutofillDropdown(field, pwField, icon);
    }
  });
}

// B. Hiển thị Dropdown gợi ý tài khoản trực tiếp trong DOM body
async function showAutofillDropdown(userField, pwField, anchorBtn) {
  hideDropdown();

  const res = await swMsg('QUERY_URL', { pageUrl: window.location.href });

  const dropdown = document.createElement('div');
  dropdown.id = HS_DROPDOWN_ID;
  dropdown.setAttribute('role', 'listbox');

  activeDropdown = dropdown;
  activePwField = pwField;
  activeUserField = userField;

  if (!res.success || res.locked) {
    dropdown.innerHTML = `
      <div class="hs-dd-header">
        ${HS_LOGO_SVG}
        <span>HeroSim Vault</span>
      </div>
      <div class="hs-dd-empty">
        🔒 Vault của bạn đã khóa.<br>
        Mở Extension Popup để mở khóa.
      </div>`;
  } else if (!res.accounts || res.accounts.length === 0) {
    dropdown.innerHTML = `
      <div class="hs-dd-header">
        ${HS_LOGO_SVG}
        <span>HeroSim Vault</span>
      </div>
      <div class="hs-dd-empty">
        Không có tài khoản khớp URL.<br>
        <small>Thêm tại <strong>ai2hero.com</strong></small>
      </div>`;
  } else {
    const accountsData = res.accounts;
    const items = accountsData.map((acc, idx) => `
      <div class="hs-dd-item" role="option" tabindex="0" data-idx="${idx}">
        <span class="hs-dd-platform">${getEmojiForPlatform(acc.platformKey)}</span>
        <div class="hs-dd-info">
          <div class="hs-dd-name">${escHtml(acc.accountName)}</div>
          <div class="hs-dd-user">${escHtml(acc.username || acc.loginEmail || '')}</div>
        </div>
        <span class="hs-dd-badge">${acc.password ? '🔑' : '—'}</span>
      </div>
    `).join('');

    const searchBar = accountsData.length >= 3 ? `
      <div class="hs-dd-search-container">
        <input type="text" class="hs-dd-search" placeholder="🔍 Lọc tài khoản..." autocomplete="off">
      </div>` : '';

    dropdown.innerHTML = `
      <div class="hs-dd-header">
        ${HS_LOGO_SVG}
        <span>HeroSim Vault</span>
        <span class="hs-dd-count">${accountsData.length} tài khoản</span>
      </div>
      ${searchBar}
      <div class="hs-dd-list">${items}</div>`;

    // Ô tìm kiếm nhanh
    const searchInput = dropdown.querySelector('.hs-dd-search');
    if (searchInput) {
      setTimeout(() => searchInput.focus(), 80);

      // Cô lập keyboard input khỏi website gốc
      ['keydown', 'keyup', 'keypress'].forEach(evtName => {
        searchInput.addEventListener(evtName, (e) => { e.stopPropagation(); });
      });

      searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        dropdown.querySelectorAll('.hs-dd-item').forEach(item => {
          const idx = parseInt(item.dataset.idx, 10);
          const acc = accountsData[idx];
          if (!acc) return;

          const searchPool = [acc.accountName, acc.username, acc.loginEmail, acc.platformKey].filter(Boolean).join(' ').toLowerCase();
          item.style.display = searchPool.includes(query) ? '' : 'none';
        });
      });

      // Hỗ trợ điền email bước 1 tự động
      const lastEmail = getLastFilledEmail();
      if (lastEmail) {
        searchInput.value = lastEmail;
        searchInput.dispatchEvent(new Event('input'));
        setLastFilledEmail(null);
      }
    }

    // Logic Click Điền
    dropdown.querySelectorAll('.hs-dd-item').forEach(item => {
      const fillHandler = () => {
        const idx = parseInt(item.dataset.idx, 10);
        const acc = accountsData[idx];
        if (!acc) return;

        const username = acc.username || acc.loginEmail || '';
        const password = acc.password || '';

        const uField = activeUserField;
        const pField = findPasswordField(uField) || activePwField;

        if (uField && uField.type !== 'password') {
          fillField(uField, username);
          flashConfirm(uField, '#f97316');
        }

        if (pField && pField.type === 'password' && password) {
          retryFillPassword(pField, password);
        } else if (password) {
          // Lưu password pending cho multi-step bước 2
          setPendingPassword(password);
          setLastFilledEmail(username);
        }

        setTimeout(hideDropdown, 120);
      };

      item.addEventListener('mousedown', (e) => e.preventDefault());
      item.addEventListener('click', fillHandler);
      item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fillHandler(); });
    });
  }

  document.body.appendChild(dropdown);
  positionDropdown(anchorBtn, dropdown);

  setTimeout(() => {
    document.addEventListener('click', onOutsideClick);
    document.addEventListener('keydown', onEscKey);
  }, 10);
}

function positionDropdown(anchorBtn, dropdown) {
  const rect = anchorBtn.getBoundingClientRect();
  const scrollY = window.scrollY || window.pageYOffset;
  const scrollX = window.scrollX || window.pageXOffset;
  
  let top = rect.bottom + scrollY + 6;
  let left = rect.left + scrollX - 250; // Lùi sang trái để tránh bị lệch lề phải

  if (left < 10) left = 10;
  if (left + 280 > window.innerWidth + scrollX) left = window.innerWidth + scrollX - 290;

  dropdown.style.top = top + 'px';
  dropdown.style.left = left + 'px';
}

function hideDropdown() {
  if (activeDropdown) {
    activeDropdown.remove();
    activeDropdown = null;
  }
  document.removeEventListener('click', onOutsideClick);
  document.removeEventListener('keydown', onEscKey);
}

function onOutsideClick(e) {
  if (activeDropdown && !activeDropdown.contains(e.target) &&
      !e.target.classList.contains(HS_ICON_CLASS) &&
      !e.target.closest('.' + HS_ICON_CLASS)) {
    hideDropdown();
  }
}

function onEscKey(e) {
  if (e.key === 'Escape') hideDropdown();
}

// C. Save / Update Banner (Gợi ý lưu tài khoản mới / cập nhật password)
function showSaveBanner({ username, password, isUpdate, platformKey, loginUrl }) {
  hideSaveBanner();

  const banner = document.createElement('div');
  banner.id = HS_BANNER_ID;

  banner.innerHTML = `
    <div class="hs-banner-header">
      ${HS_LOGO_SVG}
      <span>HeroSim Vault</span>
      <button class="hs-banner-close" title="Đóng">✕</button>
    </div>
    <div class="hs-banner-body">
      <div class="hs-banner-msg">
        ${isUpdate 
          ? `🔄 Bạn vừa thay đổi mật khẩu của <strong>${escHtml(username)}</strong>.<br>Cập nhật lại vào Vault của không gian?`
          : `💾 Lưu tài khoản <strong>${escHtml(username)}</strong> vào Vault không?`}
      </div>
      <div class="hs-banner-actions">
        <button class="hs-banner-btn hs-banner-btn-save">${isUpdate ? '✓ Cập nhật' : '✓ Lưu lại'}</button>
        <button class="hs-banner-btn hs-banner-btn-skip">Bỏ qua</button>
      </div>
    </div>`;

  document.body.appendChild(banner);

  requestAnimationFrame(() => banner.classList.add('hs-banner-visible'));

  banner.querySelector('.hs-banner-close').addEventListener('click', hideSaveBanner);
  banner.querySelector('.hs-banner-btn-skip').addEventListener('click', hideSaveBanner);
  
  const saveBtn = banner.querySelector('.hs-banner-btn-save');
  saveBtn.addEventListener('click', async () => {
    saveBtn.textContent = '⏳ Đang lưu...';
    saveBtn.disabled = true;

    const parts = window.location.hostname.replace('www.', '').split('.');
    const hostname = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    const res = await swMsg('PUSH_ACCOUNT', {
      platformKey: platformKey || hostname,
      accountName: username,
      username,
      password,
      loginUrl: loginUrl || window.location.origin
    });

    if (res.success) {
      saveBtn.textContent = '✓ Thành công!';
      setTimeout(hideSaveBanner, 1500);
    } else {
      saveBtn.textContent = '✕ ' + (res.error || 'Lỗi kết nối');
      saveBtn.disabled = false;
      setTimeout(hideSaveBanner, 3000);
    }
  });

  // Tự ẩn sau 15 giây
  setTimeout(hideSaveBanner, 15000);
}

function hideSaveBanner() {
  const banner = document.getElementById(HS_BANNER_ID);
  if (banner) {
    banner.classList.remove('hs-banner-visible');
    setTimeout(() => banner.remove(), 400);
  }
}

// ─── 8. Submit Detector ───────────────────────────────────────────────────────
function attachSubmitListener(form) {
  if (form.getAttribute('data-hs-submit-attached')) return;
  form.setAttribute('data-hs-submit-attached', 'true');

  form.addEventListener('submit', async () => {
    const pwField = form.querySelector('input[type=password]');
    if (!pwField) return;

    const userField = findFormPair(pwField);
    if (!userField) return;

    const username = userField.value.trim();
    const password = pwField.value;
    if (!username || !password) return;

    const check = await swMsg('CHECK_ACCOUNT_EXISTS', {
      username,
      password,
      pageUrl: window.location.href
    });

    if (!check.success) return;

    const parts = window.location.hostname.replace('www.', '').split('.');
    const hostname = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    const loginUrl = window.location.origin;

    if (!check.found) {
      // Gợi ý lưu mới
      setTimeout(() => {
        showSaveBanner({ username, password, isUpdate: false, platformKey: hostname, loginUrl });
      }, 1000);
    } else if (check.passwordChanged) {
      // Gợi ý update
      setTimeout(() => {
        showSaveBanner({ username, password, isUpdate: true, platformKey: hostname, loginUrl });
      }, 1000);
    }
  }, { capture: true });
}

// ─── 9. Orchestrator Page Processing ──────────────────────────────────────────
function processPage() {
  // Tự động inject CSS sạch vào head nếu chưa có
  injectGlobalStyles();

  // Chỉ xử lý các ô password đang hiển thị thực sự (tránh điền vào ô ẩn của Google/SPA)
  const pwFields = Array.from(document.querySelectorAll('input[type=password]')).filter(isElementVisible);

  // === FIX BUG 2: Xử lý pending password cho Google Multi-step ===
  // Chỉ tiêu thụ pendingPw MỘT LẦN khi có ít nhất 1 ô password visible.
  // Không xóa pending trước - để retryFillPassword tự xóa khi thành công.
  if (pwFields.length > 0) {
    const pendingPw = getPendingPassword();
    if (pendingPw) {
      console.log('[HeroSim v4.0.1] Phát hiện pending password cho bước 2, bắt đầu điền...');
      // Đánh dấu đã consumed để tránh các lần processPage sau gọi trùng
      setPendingPassword(null);
      retryFillPassword(pwFields[0], pendingPw);
    }
  }

  for (const pwField of pwFields) {
    // === FIX BUG 1: CHỈ inject icon vào ô email/username, KHÔNG inject vào ô password ===
    // Cách Bitwarden: icon chỉ hiện trên username field để điền cả 2 cùng lúc.
    // Nếu form có cả email + password → chỉ icon trên email.
    // Nếu form chỉ có password (bước 2 Google đã được xử lý bằng pending) → không icon.
    const userField = findFormPair(pwField);
    if (userField && isElementVisible(userField)) {
      injectIconToField(userField, pwField);
    }
    // Chỉ inject icon vào password field nếu KHÔNG TÌM ĐƯỢC ô username nào
    // (ví dụ: trang chỉ có 1 ô password để đổi mật khẩu)
    else if (!userField) {
      injectIconToField(pwField, pwField);
    }

    const form = pwField.closest('form');
    if (form) attachSubmitListener(form);
  }

  // Multi-step Login: Nếu chưa có password field, chèn icon vào ô nhập email đơn độc
  if (pwFields.length === 0) {
    const singleUserFields = Array.from(document.querySelectorAll(
      'input[type=email], input[name=identifier], input[name=login], input[name=username], input[autocomplete=username], input[autocomplete=email]'
    )).filter(isElementVisible);

    for (const userField of singleUserFields) {
      injectIconToField(userField, null);
    }
  }
}

// MutationObserver debounce 300ms xử lý SPA
let debounceTimer = null;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(processPage, 300);
});

// ─── 10. Khởi động (Init) ─────────────────────────────────────────────────────
function init() {
  processPage();
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ─── 11. Utils / Platform Emojis ──────────────────────────────────────────────
function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const PLATFORM_EMOJIS = {
  facebook: '📘', google: '🔵', tiktok: '🎵', zalo: '💬',
  instagram: '📸', twitter: '🐦', youtube: '▶️', shopee: '🛒',
  lazada: '🏪', telegram: '✈️', discord: '💜', github: '🐙',
};

function getEmojiForPlatform(platformKey) {
  if (!platformKey) return '🔑';
  const k = platformKey.toLowerCase();
  for (const [name, emoji] of Object.entries(PLATFORM_EMOJIS)) {
    if (k.includes(name)) return emoji;
  }
  return '🔑';
}
