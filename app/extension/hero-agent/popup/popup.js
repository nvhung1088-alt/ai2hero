document.addEventListener('DOMContentLoaded', async () => {
  // Views
  const viewLoggedOut = document.getElementById('view-logged-out');
  const viewSelectWorkspace = document.getElementById('view-select-workspace');
  const viewPaired = document.getElementById('view-paired');

  // Login inputs & buttons
  const inputEmail = document.getElementById('input-email');
  const inputPassword = document.getElementById('input-password');
  const inputServer = document.getElementById('input-server');
  const btnLogin = document.getElementById('btn-login');
  const loginError = document.getElementById('login-error');

  // Workspace select elements
  const selectWorkspace = document.getElementById('select-workspace');
  const btnSelectWorkspace = document.getElementById('btn-select-workspace');
  const btnCancelWorkspace = document.getElementById('btn-cancel-workspace');
  const workspaceError = document.getElementById('workspace-error');

  // Paired view elements
  const txtWorkspaceName = document.getElementById('txt-workspace-name');
  const txtCompletedCount = document.getElementById('txt-completed-count');
  const btnScrapeNow = document.getElementById('btn-scrape-now');
  const btnUnpair = document.getElementById('btn-unpair');
  const scrapeMessage = document.getElementById('scrape-message');

  // Load server URL cache if exists
  const cache = await chrome.storage.local.get(['serverUrl', 'email']);
  if (cache.serverUrl) {
    inputServer.value = cache.serverUrl;
  }
  if (cache.email) {
    inputEmail.value = cache.email;
  }

  // --- Functions ---

  function showView(view) {
    [viewLoggedOut, viewSelectWorkspace, viewPaired].forEach(v => v.classList.remove('active'));
    view.classList.add('active');
  }

  function toggleLoading(btn, isLoading) {
    const text = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.spinner');
    if (isLoading) {
      btn.disabled = true;
      text.classList.add('hidden');
      spinner.classList.remove('hidden');
    } else {
      btn.disabled = false;
      text.classList.remove('hidden');
      spinner.classList.add('hidden');
    }
  }

  function showError(el, message) {
    if (message) {
      el.innerText = message;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  function showToast(message, isError = false) {
    scrapeMessage.innerText = message;
    scrapeMessage.style.color = isError ? 'var(--danger-color)' : 'var(--text-primary)';
    scrapeMessage.classList.remove('hidden');
    setTimeout(() => {
      scrapeMessage.classList.add('hidden');
    }, 4000);
  }

  // Khởi tạo trạng thái ban đầu
  async function initState() {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error contacting background:', chrome.runtime.lastError);
        return;
      }

      if (response && response.success) {
        if (response.state === 'paired') {
          txtWorkspaceName.innerText = response.teamName;
          txtCompletedCount.innerText = response.completedCount;
          showView(viewPaired);
        } else if (response.state === 'select_workspace' && response.tempAuth) {
          populateWorkspaces(response.tempAuth.workspaces);
          showView(viewSelectWorkspace);
        } else {
          showView(viewLoggedOut);
        }
      }
    });
  }

  function populateWorkspaces(workspaces) {
    selectWorkspace.innerHTML = '';
    workspaces.forEach(ws => {
      const option = document.createElement('option');
      option.value = ws.id;
      option.innerText = ws.name;
      selectWorkspace.appendChild(option);
    });
  }

  // --- Event Listeners ---

  // 1. Đăng nhập
  btnLogin.addEventListener('click', async () => {
    const email = inputEmail.value.trim();
    const password = inputPassword.value;
    const serverUrl = inputServer.value.trim() || 'https://www.ai2hero.com';

    if (!email || !password) {
      showError(loginError, 'Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    showError(loginError, null);
    toggleLoading(btnLogin, true);

    // Lưu serverUrl và email vào cache local
    await chrome.storage.local.set({ serverUrl, email });

    chrome.runtime.sendMessage({
      type: 'LOGIN',
      payload: { email, password }
    }, (res) => {
      toggleLoading(btnLogin, false);
      if (chrome.runtime.lastError) {
        showError(loginError, 'Lỗi kết nối background worker');
        return;
      }

      if (res.success) {
        // Lưu tạm tempToken
        chrome.storage.local.set({ tempToken: res.tempToken });
        populateWorkspaces(res.workspaces);
        showView(viewSelectWorkspace);
      } else {
        showError(loginError, res.error || 'Đăng nhập thất bại');
      }
    });
  });

  // 2. Chọn Workspace
  btnSelectWorkspace.addEventListener('click', async () => {
    const teamId = parseInt(selectWorkspace.value);
    const { tempToken } = await chrome.storage.local.get(['tempToken']);

    if (!teamId || !tempToken) {
      showError(workspaceError, 'Thông tin không hợp lệ. Vui lòng thử lại.');
      return;
    }

    showError(workspaceError, null);
    toggleLoading(btnSelectWorkspace, true);

    chrome.runtime.sendMessage({
      type: 'SELECT_WORKSPACE',
      payload: { tempToken, teamId }
    }, (res) => {
      toggleLoading(btnSelectWorkspace, false);
      if (res.success) {
        txtWorkspaceName.innerText = res.teamName;
        txtCompletedCount.innerText = '0';
        showView(viewPaired);
      } else {
        showError(workspaceError, res.error || 'Liên kết Workspace thất bại');
      }
    });
  });

  // 3. Quay lại màn hình đăng nhập
  btnCancelWorkspace.addEventListener('click', async () => {
    await chrome.storage.local.remove(['tempToken']);
    showView(viewLoggedOut);
  });

  // 4. Ngắt kết nối
  btnUnpair.addEventListener('click', () => {
    if (confirm('Bạn có chắc chắn muốn ngắt kết nối thiết bị?')) {
      chrome.runtime.sendMessage({ type: 'UNPAIR' }, (res) => {
        if (res.success) {
          inputPassword.value = '';
          showView(viewLoggedOut);
        }
      });
    }
  });

  // 5. Cào nóng trang hiện tại
  btnScrapeNow.addEventListener('click', () => {
    toggleLoading(btnScrapeNow, true);
    showError(workspaceError, null);

    chrome.runtime.sendMessage({ type: 'MANUAL_SCRAPE' }, (res) => {
      toggleLoading(btnScrapeNow, false);
      if (chrome.runtime.lastError) {
        showToast('Lỗi kết nối extension', true);
        return;
      }

      if (res.success) {
        showToast('🚀 Đã gửi trang! AI đang xử lý trên server...');
        // Cập nhật số lượng hoàn thành
        chrome.storage.local.get(['completedTasksCount'], (stored) => {
          txtCompletedCount.innerText = stored.completedTasksCount || 0;
        });
      } else {
        showToast(`❌ Thất bại: ${res.error || 'Lỗi không xác định'}`, true);
      }
    });
  });

  // Lắng nghe tín hiệu hết hạn phiên làm việc
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SESSION_EXPIRED') {
      showView(viewLoggedOut);
      showError(loginError, 'Phiên làm việc hết hạn. Vui lòng đăng nhập lại.');
    }
  });

  // Khởi động
  initState();
});
