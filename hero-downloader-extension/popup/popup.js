let currentVideos = [];

// Ask content script for videos
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0] && tabs[0].url.includes("douyin.com")) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "GET_VIDEOS"}, function(response) {
            if (response && response.videos && response.videos.length > 0) {
                currentVideos = response.videos;
                document.getElementById('videoCount').innerText = currentVideos.length;
                document.getElementById('btnSend').disabled = false;
                document.getElementById('btnSend').innerText = `Đồng bộ ${currentVideos.length} Video`;
            }
        });
    } else {
        document.querySelector('.info').innerHTML = "<div class='label'>Vui lòng mở trang web Douyin.com để bắt link.</div>";
    }
});

document.getElementById('btnSend').addEventListener('click', async () => {
    const btn = document.getElementById('btnSend');
    const statusMsg = document.getElementById('statusMsg');
    
    btn.disabled = true;
    btn.innerText = "Đang gửi...";
    statusMsg.style.display = 'none';
    statusMsg.className = 'status';

    try {
        // Gọi thẳng vào API nội bộ (đang chạy cổng 3000)
        // Team ID cứng tạm thời (hoặc lấy từ setting/storage nếu làm bản hoàn chỉnh)
        // Trong app AI2Hero, người dùng thường có auth, nhưng API này có thể được protect bằng API Key hoặc auth cookie nếu mở cùng trình duyệt.
        // Tạm gọi API công khai trên local
        const res = await fetch("http://localhost:3000/api/hero-downloader/extension", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                videos: currentVideos
            })
        });

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        
        statusMsg.innerText = `✅ Đã gửi thành công ${currentVideos.length} video!`;
        statusMsg.style.display = 'block';
        
        // Clear videos in content script after successful sync
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "CLEAR_VIDEOS"});
        });
        
        setTimeout(() => { window.close(); }, 2000);
        
    } catch (error) {
        console.error("Lỗi gửi API:", error);
        statusMsg.innerText = `❌ Lỗi: Không kết nối được API (Cổng 3000 có chạy không?)`;
        statusMsg.className = 'status error';
        statusMsg.style.display = 'block';
        btn.disabled = false;
        btn.innerText = `Thử lại (${currentVideos.length})`;
    }
});
