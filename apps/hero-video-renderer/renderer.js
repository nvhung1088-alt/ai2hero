const btnPair = document.getElementById('btnPair');
const pairCodeInput = document.getElementById('pairCode');
const pairStatus = document.getElementById('pairStatus');
const pairingScreen = document.getElementById('pairing-screen');
const renderScreen = document.getElementById('render-screen');
const btnMockRender = document.getElementById('btnMockRender');
const renderStatus = document.getElementById('renderStatus');
const progressContainer = document.getElementById('progressBarContainer');
const progressFill = document.getElementById('progressFill');

const BASE_URL = 'http://localhost:3000/api/video-maker';
let deviceToken = localStorage.getItem('deviceToken');

// Khởi động
if (deviceToken) {
  showRenderScreen();
}

btnPair.addEventListener('click', async () => {
  const code = pairCodeInput.value.toUpperCase();
  if (code.length !== 6) {
    pairStatus.className = 'status error';
    pairStatus.innerText = 'Vui lòng nhập đúng 6 ký tự!';
    return;
  }

  btnPair.disabled = true;
  btnPair.innerText = 'Đang ghép nối...';
  
  try {
    const res = await fetch(`${BASE_URL}/auth/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        code, 
        deviceName: 'Hero Desktop Renderer', 
        deviceType: 'desktop' 
      })
    });
    
    const data = await res.json();
    
    if (data.success && data.token) {
      deviceToken = data.token;
      localStorage.setItem('deviceToken', deviceToken);
      pairStatus.className = 'status success';
      pairStatus.innerText = 'Ghép nối thành công!';
      setTimeout(showRenderScreen, 1500);
    } else {
      pairStatus.className = 'status error';
      pairStatus.innerText = data.error || 'Mã không hợp lệ hoặc đã hết hạn.';
    }
  } catch (err) {
    pairStatus.className = 'status error';
    pairStatus.innerText = 'Không thể kết nối đến máy chủ AI2Hero.';
  } finally {
    btnPair.disabled = false;
    btnPair.innerText = 'KẾT NỐI NGAY';
  }
});

function showRenderScreen() {
  pairingScreen.style.display = 'none';
  renderScreen.style.display = 'block';
  // Ở app thật sẽ mở WebSocket kết nối tới /api/video-maker/ws
}

// Bắt event FFMPEG render mock từ Main Process
btnMockRender.addEventListener('click', async () => {
  // Trong MVP thật, file ảnh phải tải về local trước
  // Ở đây giả lập truyền mảng scene rỗng hoặc scene có ảnh local để Main process check
  // MOCK
  renderStatus.innerText = 'Bắt đầu kết xuất Video bằng FFMPEG...';
  renderStatus.className = 'status';
  progressContainer.style.display = 'block';
  progressFill.style.width = '0%';
  btnMockRender.disabled = true;

  window.electronAPI.onRenderProgress((percent) => {
    renderStatus.innerText = `Đang kết xuất... ${percent.toFixed(1)}%`;
    progressFill.style.width = `${percent}%`;
  });

  try {
    // Để mock FFmpeg chạy không lỗi, truyền một object mock fail hoặc pass do không có input ảnh thực tế
    // Nếu truyền rỗng sẽ lỗi thiếu input. Ở đây làm mẫu gọi API.
    const result = await window.electronAPI.renderVideo([], 'test-output.mp4');
    renderStatus.innerText = `Thành công! Đã lưu tại: ${result.path}`;
    renderStatus.className = 'status success';
  } catch (err) {
    renderStatus.innerText = `Lỗi Render: ${err.error}`;
    renderStatus.className = 'status error';
  } finally {
    btnMockRender.disabled = false;
  }
});
