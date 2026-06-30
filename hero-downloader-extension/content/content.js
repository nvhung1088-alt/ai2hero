// Inject the interceptor script into the page context
const s = document.createElement('script');
s.src = chrome.runtime.getURL('content/interceptor.js');
s.onload = function() {
    this.remove(); // cleanup
};
(document.head || document.documentElement).appendChild(s);

// Store found videos for the popup to read
let foundVideos = [];

// Listen for messages from the interceptor
window.addEventListener('message', function(event) {
    if (event.source !== window || !event.data) return;
    
    if (event.data.type === 'AI2HERO_DOUYIN_API') {
        const body = event.data.body;
        
        try {
            const data = JSON.parse(body);
            let awemeList = [];
            
            if (data.aweme_detail) {
                awemeList.push(data.aweme_detail);
            } else if (data.aweme_list) {
                awemeList = data.aweme_list;
            }

            let newCount = 0;
            
            for (const aweme of awemeList) {
                if (!aweme || !aweme.video) continue;
                
                // Extract play URL
                let playUrl = null;
                for (const key of ['play_addr', 'download_addr', 'play_addr_265']) {
                    const urlList = aweme.video[key]?.url_list || [];
                    if (urlList.length > 0) {
                        // Prefer douyinvod
                        const dyVod = urlList.find(u => u.includes('douyinvod.com'));
                        playUrl = dyVod || urlList[0];
                        if (playUrl) break;
                    }
                }
                
                if (playUrl) {
                    const videoId = aweme.aweme_id;
                    // Check if already found
                    if (!foundVideos.find(v => v.video_id === videoId)) {
                        foundVideos.push({
                            platform: 'douyin',
                            video_id: videoId,
                            title: aweme.desc || `Douyin Video ${videoId}`,
                            original_url: `https://www.douyin.com/video/${videoId}`,
                            direct_mp4_url: playUrl,
                            cover_url: aweme.video.cover?.url_list?.[0] || ''
                        });
                        newCount++;
                    }
                }
            }
            
            if (newCount > 0) {
                console.log(`[AI2Hero] Bắt được ${newCount} video mới. Tổng cộng: ${foundVideos.length} videos trong bộ nhớ.`);
            }
            
        } catch(e) {
            console.error("AI2Hero parse error:", e);
        }
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_VIDEOS") {
        sendResponse({ videos: foundVideos });
    } else if (request.action === "CLEAR_VIDEOS") {
        foundVideos = [];
        sendResponse({ success: true });
    }
});
