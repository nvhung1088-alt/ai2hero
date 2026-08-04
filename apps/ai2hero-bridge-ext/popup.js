document.addEventListener('DOMContentLoaded', async () => {
  const serverUrlInput = document.getElementById('serverUrl');
  const bridgeTokenInput = document.getElementById('bridgeToken');
  const saveBtn = document.getElementById('saveBtn');
  const statusBadge = document.getElementById('statusBadge');
  const jobCountEl = document.getElementById('jobCount');

  // Load cấu hình đã lưu
  const data = await chrome.storage.local.get(['serverUrl', 'bridgeToken', 'processedJobsCount']);
  serverUrlInput.value = data.serverUrl || 'https://ai2hero-flax.vercel.app';
  bridgeTokenInput.value = data.bridgeToken || '';
  jobCountEl.innerText = data.processedJobsCount || 0;

  if (data.bridgeToken) {
    statusBadge.innerText = 'Đã kết nối';
    statusBadge.className = 'badge badge-on';
  } else {
    statusBadge.innerText = 'Chưa lưu token';
    statusBadge.className = 'badge badge-off';
  }

  saveBtn.addEventListener('click', async () => {
    const serverUrl = serverUrlInput.value.trim();
    const bridgeToken = bridgeTokenInput.value.trim();

    if (!bridgeToken) {
      alert('Vui lòng nhập Bridge Token!');
      return;
    }

    await chrome.storage.local.set({ serverUrl, bridgeToken });
    statusBadge.innerText = 'Đã kết nối';
    statusBadge.className = 'badge badge-on';

    saveBtn.innerText = 'ĐÃ LƯU THÀNH CÔNG!';
    setTimeout(() => {
      saveBtn.innerText = 'LƯU CẤU HÌNH';
    }, 1500);
  });
});
