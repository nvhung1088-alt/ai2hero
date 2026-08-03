(function () {
    function isAllowedAi2HeroOrigin(origin) {
        return [
            "https://ai2hero-flax.vercel.app",
            "https://www.ai2hero.com",
            "https://ai2hero.com",
            "http://localhost:3000"
        ].includes(origin);
    }

    function setWorkspaceSubfolder(workspaceSlug, customSubfolder) {
        if (customSubfolder) {
            const finalPath = customSubfolder.startsWith("HeroVideo/") ? customSubfolder : "HeroVideo/" + customSubfolder;
            chrome.storage.local.set({ herovideo_subfolder: finalPath });
        } else if (workspaceSlug) {
            chrome.storage.local.set({ herovideo_subfolder: "HeroVideo/" + workspaceSlug });
        }
    }

    // [AI2HERO] Ping-Pong cơ chế nhận diện
    window.addEventListener('message', function(event) {
        if (event.source !== window) return;
        if (!isAllowedAi2HeroOrigin(event.origin)) return;
        if (event.data && event.data.type === 'HERO_VIDEO_EXT_CHECK') {
            chrome.storage.local.get(['herovideo_token', 'herovideo_workspace', 'herovideo_email', 'herovideo_ws_name'], function(result) {
                window.postMessage({ 
                    type: 'HERO_VIDEO_EXT_PING', 
                    hasAuth: Boolean(result.herovideo_token),
                    teamId: result.herovideo_workspace || null
                }, event.origin);
            });
        }

        // Nhận diện sự kiện yêu cầu mở thư mục downloads mặc định
        if (event.data && event.data.type === 'HERO_VIDEO_OPEN_FOLDER') {
            setWorkspaceSubfolder(event.data.workspaceSlug, event.data.customSubfolder);
            const rawSubfolder = event.data.customSubfolder || event.data.workspaceSlug;
            const subfolderPath = rawSubfolder.startsWith("HeroVideo/") ? rawSubfolder : "HeroVideo/" + rawSubfolder;
            chrome.runtime.sendMessage({ Message: "ensureWorkspaceFolder", subfolderPath: subfolderPath, open: true });
        }

        // Nhận diện sự kiện kết nối/cập nhật thư mục từ Web App (Dashboard)
        if (event.data && event.data.type === 'HERO_VIDEO_ENSURE_WORKSPACE_FOLDER') {
            setWorkspaceSubfolder(event.data.workspaceSlug, event.data.customSubfolder);
        }
    });

    var _videoObj = [];
    var _videoSrc = [];
    var _key = new Set();
    var m3u8Text = new Map();
    chrome.runtime.onMessage.addListener(function (Message, sender, sendResponse) {
        if (chrome.runtime.lastError) { return; }
        // 获取页面视频对象
        if (Message.Message == "getVideoState") {
            let videoObj = [];
            let videoSrc = [];
            document.querySelectorAll("video, audio").forEach(function (video) {
                if (video.currentSrc != "" && video.currentSrc != undefined) {
                    videoObj.push(video);
                    videoSrc.push(video.currentSrc);
                }
            });
            const iframe = document.querySelectorAll("iframe");
            if (iframe.length > 0) {
                iframe.forEach(function (iframe) {
                    if (iframe.contentDocument == null) { return true; }
                    iframe.contentDocument.querySelectorAll("video, audio").forEach(function (video) {
                        if (video.currentSrc != "" && video.currentSrc != undefined) {
                            videoObj.push(video);
                            videoSrc.push(video.currentSrc);
                        }
                    });
                });
            }
            if (videoObj.length > 0) {
                if (videoObj.length !== _videoObj.length || videoSrc.toString() !== _videoSrc.toString()) {
                    _videoSrc = videoSrc;
                    _videoObj = videoObj;
                }
                Message.index = Message.index == -1 ? 0 : Message.index;
                const video = videoObj[Message.index];
                const timePCT = video.currentTime / video.duration * 100;
                sendResponse({
                    time: timePCT,
                    currentTime: video.currentTime,
                    duration: video.duration,
                    volume: video.volume,
                    count: _videoObj.length,
                    src: _videoSrc,
                    paused: video.paused,
                    loop: video.loop,
                    speed: video.playbackRate,
                    muted: video.muted,
                    type: video.tagName.toLowerCase()
                });
                return true;
            }
            sendResponse({ count: 0 });
            return true;
        }
        // 速度控制
        if (Message.Message == "speed") {
            _videoObj[Message.index].playbackRate = Message.speed;
            return true;
        }
        // 画中画
        if (Message.Message == "pip") {
            if (document.pictureInPictureElement) {
                try { document.exitPictureInPicture(); } catch (e) { return true; }
                sendResponse({ state: false });
                return true;
            }
            try { _videoObj[Message.index].requestPictureInPicture(); } catch (e) { return true; }
            sendResponse({ state: true });
            return true;
        }
        // 全屏
        if (Message.Message == "fullScreen") {
            if (document.fullscreenElement) {
                try { document.exitFullscreen(); } catch (e) { return true; }
                sendResponse({ state: false });
                return true;
            }
            setTimeout(function () {
                try { _videoObj[Message.index].requestFullscreen(); } catch (e) { return true; }
            }, 500);
            sendResponse({ state: true });
            return true;
        }
        // 播放
        if (Message.Message == "play") {
            _videoObj[Message.index].play();
            return true;
        }
        // 暂停
        if (Message.Message == "pause") {
            _videoObj[Message.index].pause();
            return true;
        }
        // 循环播放
        if (Message.Message == "loop") {
            _videoObj[Message.index].loop = Message.action;
            return true;
        }
        // 设置音量
        if (Message.Message == "setVolume") {
            _videoObj[Message.index].volume = Message.volume;
            sendResponse("ok");
            return true;
        }
        // 静音
        if (Message.Message == "muted") {
            _videoObj[Message.index].muted = Message.action;
            return true;
        }
        // 设置视频进度
        if (Message.Message == "setTime") {
            const time = Message.time * _videoObj[Message.index].duration / 100;
            _videoObj[Message.index].currentTime = time;
            sendResponse("ok");
            return true;
        }
        // 截图视频图片
        if (Message.Message == "screenshot") {
            try {
                let video = _videoObj[Message.index];
                let canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
                let link = document.createElement("a");
                link.href = canvas.toDataURL("image/jpeg");
                link.download = `${location.hostname}-${secToTime(video.currentTime)}.jpg`;
                link.click();
                canvas = null;
                link = null;
                sendResponse("ok");
                return true;
            } catch (e) { console.log(e); return true; }
        }
        if (Message.Message == "getThumbnail") {
            try {
                let video = document.querySelector("video");
                if (!video) { sendResponse(""); return true; }
                let canvas = document.createElement("canvas");
                canvas.width = 320;
                canvas.height = 180;
                canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
                sendResponse(canvas.toDataURL("image/jpeg", 0.6));
                return true;
            } catch (e) { sendResponse(""); return true; }
        }
        if (Message.Message == "getKey") {
            sendResponse(Array.from(_key));
            return true;
        }
        if (Message.Message == "ffmpeg") {
            if (!Message.files) {
                window.postMessage(Message);
                sendResponse("ok");
                return true;
            }
            Message.quantity ??= Message.files.length;
            for (let item of Message.files) {
                const data = { ...Message, ...item };
                data.type = item.type ?? "video";
                if (data.data instanceof Blob) {
                    window.postMessage(data);
                } else {
                    fetch(data.data)
                        .then(response => response.blob())
                        .then(blob => {
                            data.data = blob;
                            window.postMessage(data);
                        });
                }
            }
            sendResponse("ok");
            return true;
        }
        if (Message.Message == "getPage") {
            if (Message.find) {
                const DOM = document.querySelector(Message.find);
                DOM ? sendResponse(DOM.innerHTML) : sendResponse("");
                return true;
            }
            sendResponse(document.documentElement.outerHTML);
            return true;
        }
        if (Message.Message == "getM3u8Text") {
            if (Message.url && m3u8Text.has(Message.url)) {
                sendResponse(m3u8Text.get(Message.url));
                return true;
            }
            sendResponse("");
            return true;
        }
    });

    // Heart Beat
    var Port;
    function connect() {
        Port = chrome.runtime.connect(chrome.runtime.id, { name: "HeartBeat" });
        Port.postMessage("HeartBeat");
        Port.onMessage.addListener(function (message, Port) { return true; });
        Port.onDisconnect.addListener(connect);
    }
    connect();

    function secToTime(sec) {
        let time = "";
        let hour = Math.floor(sec / 3600);
        let min = Math.floor((sec % 3600) / 60);
        sec = Math.floor(sec % 60);
        if (hour > 0) { time = hour + "'"; }
        if (min < 10) { time += "0"; }
        time += min + "'";
        if (sec < 10) { time += "0"; }
        time += sec;
        return time;
    }
    const isFirefox = navigator.userAgent.includes('Firefox');
    const sendAddMedia = (data) => {
        chrome.runtime.sendMessage({
            Message: "addMedia",
            url: data.url,
            href: data.href ?? location.href,
            extraExt: data.ext,
            mime: data.mime,
            requestHeaders: { referer: data.referer },
            requestId: data.requestId,
            thumbnail: data.thumbnail
        });
    };
    window.addEventListener("message", (event) => {
        const action = ["catCatchAddMedia", "catCatchAddKey", "catCatchFFmpeg", "catCatchFFmpegResult"];
        if (!event.data || !event.data.action || event.origin !== window.location.origin || !action.includes(event.data.action)) { return; }
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (event.data.action == "catCatchAddMedia") {
            if (!event.data.url) { return; }
            if (event.data.url.startsWith("blob:") && isFirefox) {
                fetch(event.data.url)
                    .then(response => response.text())
                    .then(text => {
                        m3u8Text.set(event.data.url, text);
                        sendAddMedia(event.data);
                    });
                return;
            }
            sendAddMedia(event.data);
        }
        if (event.data.action == "catCatchAddKey") {
            let key = event.data.key;
            if (key instanceof ArrayBuffer || key instanceof Array) {
                key = ArrayToBase64(key);
            }
            if (_key.has(key)) { return; }
            _key.add(key);
            chrome.runtime.sendMessage({
                Message: "send2local",
                action: "addKey",
                data: key,
            });
            chrome.runtime.sendMessage({
                Message: "popupAddKey",
                data: key,
                url: event.data.url,
            });
        }
        if (event.data.action == "catCatchFFmpeg") {
            if (!event.data.use ||
                !event.data.files ||
                !event.data.files instanceof Array ||
                event.data.files.length == 0
            ) { return; }
            event.data.title = event.data.title ?? document.title ?? new Date().getTime().toString();
            event.data.title = event.data.title.replaceAll('"', "").replaceAll("'", "").replaceAll(" ", "");
            let data = {
                Message: event.data.action,
                action: event.data.use,
                files: event.data.files,
                url: event.data.href ?? event.source.location.href,
            };
            data = { ...event.data, ...data };
            chrome.runtime.sendMessage(data);
        }
        if (event.data.action == "catCatchFFmpegResult") {
            if (!event.data.state || !event.data.tabId) { return; }
            chrome.runtime.sendMessage({ Message: "catCatchFFmpegResult", ...event.data });
        }

    }, { capture: true });

    function ArrayToBase64(data) {
        try {
            let bytes = new Uint8Array(data);
            let binary = "";
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            if (typeof _btoa == "function") {
                return _btoa(binary);
            }
            return btoa(binary);
        } catch (e) {
            return false;
        }
    }

    // [AI2HERO] Inject interceptor.js vào page context của Douyin
    // Dùng script.src vì chrome-extension:// URL được whitelist trong CSP của Douyin
    // KHÔNG dùng textContent (bị CSP chặn vì inline-script bị cấm)
    if (window.location.hostname.includes('douyin.com') || window.location.hostname.includes('bilibili.com')) {
        if (!window.__ai2hero_injected) {
            const s = document.createElement('script');
            s.src = chrome.runtime.getURL('js/interceptor.js');
            s.onload = function() { this.remove(); };
            (document.head || document.documentElement).appendChild(s);
            window.__ai2hero_injected = true;
        }

        // Khắc phục lỗi video đơn: Đọc trực tiếp từ RENDER_DATA nếu không có XHR
        setTimeout(() => {
            try {
                const script = document.getElementById('RENDER_DATA');
                if (script) {
                    const decoded = decodeURIComponent(script.innerHTML);
                    const data = JSON.parse(decoded);
                    let awemeList = [];
                    const findAweme = (obj, depth = 0) => {
                        if (!obj || typeof obj !== 'object' || depth > 8) return;
                        if (obj.aweme_detail) awemeList.push(obj.aweme_detail);
                        if (obj.aweme && obj.aweme.aweme_id) awemeList.push(obj.aweme);
                        if (obj.aweme_id && obj.desc !== undefined) awemeList.push(obj); // Direct aweme object in array
                        if (obj.aweme_list && Array.isArray(obj.aweme_list)) awemeList = awemeList.concat(obj.aweme_list);
                        Object.values(obj).forEach(val => {
                            if (typeof val === 'object') findAweme(val, depth + 1);
                        });
                    };
                    findAweme(data);
                    if (awemeList.length > 0) {
                        console.log("[AI2Hero] Phục hồi dữ liệu từ RENDER_DATA thành công!");
                        window.postMessage({
                            type: 'AI2HERO_DOUYIN_API',
                            body: JSON.stringify({ aweme_list: awemeList })
                        }, '*');
                    }
                }
            } catch (e) {
                console.error("[AI2Hero] Lỗi đọc RENDER_DATA:", e);
            }
        }, 1500);
    }

    // [AI2HERO] Douyin AJAX Interceptor receiver
    let _douyinVideos = [];
    const _douyinVideoIds = new Set();
    let crawlRecentIds = new Set();
    let crawlMaxScanVideos = 50;
    let crawlConsecutiveDuplicates = 0;
    let channelAuthorSecUid = null; // Khóa tác giả chính chủ của kênh

    window.addEventListener('message', function(event) {
        if (event.source !== window || !event.data) return;
        if (event.data.type === 'AI2HERO_DOUYIN_API') {
            try {
                const data = JSON.parse(event.data.body);
                let awemeList = [];
                
                if (data.aweme_detail) awemeList.push(data.aweme_detail);
                if (data.aweme_list) awemeList = awemeList.concat(data.aweme_list);
                if (data.aweme_details) awemeList = awemeList.concat(data.aweme_details);

                let newCount = 0;
                awemeList.forEach(aweme => {
                    if (!aweme || !aweme.video || !aweme.aweme_id) return;
                    
                    // LỌC 1: Bỏ qua video rác, quảng cáo, và bài đăng dạng ảnh
                    if (aweme.images && aweme.images.length > 0) return;
                    if (aweme.is_ads) return;

                    // LỌC 1.5: Khóa tác giả chính chủ (chống cào tràn sang phần Video Gợi Ý / Related Videos ở cuối kênh)
                    const authorSecUid = aweme.author ? aweme.author.sec_uid : null;
                    
                    // Tự động nhận diện sec_uid tác giả từ URL hoặc video đầu tiên của kênh
                    if (!channelAuthorSecUid) {
                        const secUidMatch = window.location.href.match(/\/user\/([^?\/]+)/);
                        if (secUidMatch && secUidMatch[1]) {
                            channelAuthorSecUid = secUidMatch[1];
                        } else if (authorSecUid) {
                            channelAuthorSecUid = authorSecUid;
                        }
                    }

                    // Nếu đã xác định được kênh tác giả, CHỈ bắt video của tác giả đó
                    if (channelAuthorSecUid && authorSecUid && authorSecUid !== channelAuthorSecUid) {
                        console.log(`[AI2Hero] Bỏ qua video gợi ý của tác giả khác (${aweme.author?.nickname || authorSecUid})`);
                        return;
                    }

                    const id = String(aweme.aweme_id);
                    
                    // LỌC trùng lặp với cơ sở dữ liệu (Server) - Dừng cào thông minh (Break-on-existing)
                    if (isCrawling && crawlRecentIds.has(id)) {
                        crawlConsecutiveDuplicates++;
                        console.log(`[AI2Hero] Phát hiện video trùng lặp thứ ${crawlConsecutiveDuplicates} trên DB: ${id}`);
                        if (crawlConsecutiveDuplicates >= 5) {
                            console.log("[AI2Hero] Đã phát hiện 5 video trùng liên tiếp. Tự động dừng cào.");
                            stopAutoCrawl();
                        }
                        return;
                    }
                    
                    // Nếu là video mới, reset bộ đếm liên tiếp trùng
                    if (isCrawling) {
                        crawlConsecutiveDuplicates = 0;
                    }

                    // LỌC 2: Tránh trùng lặp id (Mỗi id bắt đúng 1 lần trong phiên)
                    if (_douyinVideoIds.has(id)) return;

                    const videoObj = aweme.video;
                    let bestUrl = "";
                    let quality = "Default";

                    // LỌC 3: Chọn trực tiếp luồng play_addr mặc định (luôn luôn có tiếng 100% và nét chuẩn H264)
                    if (videoObj.play_addr && videoObj.play_addr.url_list && videoObj.play_addr.url_list.length > 0) {
                        const vodUrl = videoObj.play_addr.url_list.find(u => u.includes('douyinvod.com'));
                        bestUrl = vodUrl || videoObj.play_addr.url_list[0];
                        quality = "1080p/720p Muxed";
                    }

                    if (bestUrl) {
                        if (bestUrl.startsWith("//")) bestUrl = "https:" + bestUrl;
                        
                        // Lọc giới hạn tối đa số lượng video
                        if (isCrawling && crawlMaxScanVideos && (totalSyncedVideos + _douyinVideos.length) >= crawlMaxScanVideos) {
                            console.log(`[AI2Hero] Đạt giới hạn quét tối đa ${crawlMaxScanVideos} video. Tự động dừng cào.`);
                            stopAutoCrawl();
                            return;
                        }
                        
                        let rawCover = "";
                        if (videoObj.cover && videoObj.cover.url_list && videoObj.cover.url_list.length > 0) {
                            rawCover = videoObj.cover.url_list[0];
                        } else if (videoObj.origin_cover && videoObj.origin_cover.url_list && videoObj.origin_cover.url_list.length > 0) {
                            rawCover = videoObj.origin_cover.url_list[0];
                        } else if (videoObj.dynamic_cover && videoObj.dynamic_cover.url_list && videoObj.dynamic_cover.url_list.length > 0) {
                            rawCover = videoObj.dynamic_cover.url_list[0];
                        }
                        if (rawCover && rawCover.startsWith("//")) {
                            rawCover = "https:" + rawCover;
                        }

                        _douyinVideoIds.add(id);
                        _douyinVideos.push({
                            platform: 'douyin',
                            video_id: id,
                            title: (aweme.desc || '').substring(0, 100) || `Douyin_${id}`,
                            original_url: `https://www.douyin.com/video/${id}`,
                            direct_mp4_url: bestUrl,
                            quality: quality,
                            author: aweme.author ? (aweme.author.nickname || aweme.author.sec_uid) : "Unknown",
                            cover_url: rawCover,
                            duration: videoObj.duration ? Math.round(videoObj.duration / 1000) : 0,
                            captured_at: Date.now()
                        });
                        newCount++;
                    }
                });

                if (newCount > 0) {
                    console.log(`[AI2Hero] Bắt được ${newCount} video Douyin chuẩn (đã lọc rác). Tổng: ${_douyinVideoIds.size} videos.`);
                    
                    // Cập nhật giao diện đếm tổng video đã cào
                    const capturedEl = document.getElementById('crawl-stat-captured');
                    if (capturedEl) capturedEl.innerText = _douyinVideoIds.size;

                    try {
                        chrome.runtime.sendMessage({
                            action: 'DOUYIN_VIDEOS_CAPTURED',
                            videos: _douyinVideos.slice(-newCount)
                        });
                    } catch (e) {
                        console.warn("[AI2Hero] Failed to send captured videos to background:", e);
                    }
                }

            } catch(e) {
                console.error("[AI2Hero] Lỗi phân tích Douyin JSON data", e);
            }
        }

        if (event.data.type === 'AI2HERO_BILIBILI_API') {
            try {
                const data = JSON.parse(event.data.body);
                let vlist = [];

                if (data && data.data && data.data.list && Array.isArray(data.data.list.vlist)) {
                    vlist = data.data.list.vlist;
                } else if (data && data.data && Array.isArray(data.data.vlist)) {
                    vlist = data.data.vlist;
                }

                let newCount = 0;
                vlist.forEach(item => {
                    if (!item || (!item.bvid && !item.aid)) return;

                    const bvid = item.bvid || item.aid;
                    const id = String(bvid);

                    if (isCrawling && crawlRecentIds.has(id)) {
                        crawlConsecutiveDuplicates++;
                        console.log(`[AI2Hero] Bilibili: Phát hiện video trùng lặp thứ ${crawlConsecutiveDuplicates} trên DB: ${id}`);
                        if (crawlConsecutiveDuplicates >= 5) {
                            console.log("[AI2Hero] Bilibili: Đã phát hiện 5 video trùng liên tiếp. Tự động dừng cào.");
                        }
                    }

                    if (_douyinVideoIds.has(id)) return;

                    let pic = item.pic || '';
                    if (pic.startsWith('//')) {
                        pic = 'https:' + pic;
                    }

                    const videoUrl = `https://www.bilibili.com/video/${bvid}`;

                    if (isCrawling && crawlMaxScanVideos && (totalSyncedVideos + _douyinVideos.length) >= crawlMaxScanVideos) {
                        return;
                    }

                    _douyinVideoIds.add(id);
                    _douyinVideos.push({
                        platform: 'bilibili',
                        video_id: id,
                        original_url: videoUrl,
                        play_addr: videoUrl,
                        desc: item.title || '',
                        author: item.author || '',
                        cover: pic,
                        duration: item.length || 0
                    });
                    newCount++;
                });

                if (newCount > 0) {
                    console.log(`[AI2Hero] Bắt được ${newCount} video Bilibili chuẩn. Tổng: ${_douyinVideoIds.size} videos.`);
                    const capturedEl = document.getElementById('crawl-stat-captured');
                    if (capturedEl) capturedEl.innerText = _douyinVideoIds.size;

                    try {
                        chrome.runtime.sendMessage({
                            action: 'DOUYIN_VIDEOS_CAPTURED',
                            videos: _douyinVideos.slice(-newCount)
                        });
                    } catch (e) {
                        console.warn("[AI2Hero] Failed to send Bilibili captured videos to background:", e);
                    }
                }

            } catch (e) {
                console.error("[AI2Hero] Lỗi phân tích Bilibili JSON data", e);
            }
        }
    });

    // =========================================================================
    // AUTOMATIC SCROLL CRAWLER ENGINE FOR DOUYIN
    // =========================================================================
    let crawlIntervalId = null;
    let isCrawling = false;
    let crawlAuthToken = "";
    let crawlTeamId = "";
    let crawlApiBase = "";
    let crawlProjectId = null;
    let totalSyncedVideos = 0;
    let lastScrollHeight = 0;
    let sameHeightCount = 0;

    function startAutoCrawl(token, teamId, apiBase, projectId, recentIds = [], maxScanVideos = 50) {
        if (isCrawling) return;
        isCrawling = true;
        crawlAuthToken = token;
        crawlTeamId = teamId;
        crawlApiBase = apiBase;
        crawlProjectId = projectId || null;
        totalSyncedVideos = 0;
        lastScrollHeight = document.documentElement.scrollHeight;
        sameHeightCount = 0;
        channelAuthorSecUid = null; // Reset tác giả kênh
        
        crawlRecentIds = new Set(recentIds || []);
        crawlMaxScanVideos = maxScanVideos || 50;
        crawlConsecutiveDuplicates = 0;

        // Inject CSS pulse nếu chưa có
        if (!document.getElementById('ai2hero-pulse-style')) {
            const style = document.createElement('style');
            style.id = 'ai2hero-pulse-style';
            style.innerHTML = `@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } }`;
            document.head.appendChild(style);
        }

        // Tạo Floating UI trôi lơ lửng góc dưới bên trái
        removeFloatingUI();
        const ui = document.createElement('div');
        ui.id = 'ai2hero-crawler-ui';
        ui.style.cssText = `
            position: fixed;
            bottom: 25px;
            left: 25px;
            z-index: 2147483647;
            background: rgba(9, 9, 11, 0.95) !important;
            border: 1px solid rgba(251, 146, 60, 0.4) !important;
            border-radius: 14px !important;
            padding: 16px !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6) !important;
            width: 230px !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            color: #fff !important;
            backdrop-filter: blur(12px) !important;
            text-align: left !important;
        `;
        ui.innerHTML = `
            <div style="font-weight: 700; color: #fb923c; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; font-size: 14px;">
                <span style="animation: pulse 2s infinite; font-size: 16px; display: inline-block;">🤖</span> Robot Đang Cào Douyin...
            </div>
            <div style="font-size: 12px; color: #d4d4d8; margin-bottom: 14px; line-height: 1.6;">
                • Đã cào: <strong id="crawl-stat-captured" style="color: #fb923c; font-size: 13px;">${_douyinVideoIds.size}</strong> video<br>
                • Đã đồng bộ: <strong id="crawl-stat-synced" style="color: #4ade80; font-size: 13px;">0</strong> video
            </div>
            <button id="btn-crawl-stop" style="width: 100% !important; border: none !important; background: #ef4444 !important; color: #fff !important; padding: 10px !important; border-radius: 8px !important; font-weight: 700 !important; cursor: pointer !important; font-size: 13px !important; transition: background 0.2s !important;">
                ⏹ Dừng cào & Đồng bộ
            </button>
        `;
        document.body.appendChild(ui);

        document.getElementById('btn-crawl-stop').addEventListener('click', () => {
            stopAutoCrawl();
        });

        // Bắt đầu chu kỳ cuộn trang
        crawlIntervalId = setInterval(performCrawlStep, 1500);
        console.log("[AI2Hero Crawler] Đã kích hoạt robot cào tự động.");
    }

    function stopAutoCrawl() {
        if (!isCrawling) return;
        isCrawling = false;
        if (crawlIntervalId) {
            clearInterval(crawlIntervalId);
            crawlIntervalId = null;
        }

        // Bắn nốt video còn tồn trong buffer lên Server
        uploadCrawlBatch(true).then(() => {
            if (crawlProjectId) {
                try {
                    chrome.runtime.sendMessage({
                        action: 'DOUYIN_SCAN_COMPLETE',
                        projectId: crawlProjectId
                    });
                } catch(e) {}
            }
        });

        const ui = document.getElementById('ai2hero-crawler-ui');
        if (ui) {
            ui.innerHTML = `
                <div style="font-weight: 700; color: #4ade80; margin-bottom: 8px; font-size: 14px;">
                    ✅ Đã Hoàn Thành!
                </div>
                <div style="font-size: 12px; color: #e4e4e7; line-height: 1.5;">
                    Đã cào <strong>${_douyinVideoIds.size}</strong> video và đồng bộ <strong>${totalSyncedVideos}</strong> video vào hàng đợi.
                </div>
            `;
            setTimeout(removeFloatingUI, 4000);
        }
        console.log("[AI2Hero Crawler] Robot cào tự động đã dừng.");
    }

    function removeFloatingUI() {
        const ui = document.getElementById('ai2hero-crawler-ui');
        if (ui) ui.remove();
    }

    function performCrawlStep() {
        if (!isCrawling) return;

        // 1. Tự động đóng popup đăng nhập của Douyin (nếu có) để không bị kẹt cuộn trang
        const closeBtn = document.querySelector('.dy-account-close');
        if (closeBtn) {
            try { closeBtn.click(); } catch(e) {}
        }

        // 2. Phao phát hiện chạm đáy kênh Douyin ("暂时没有更多了" hoặc "没有更多了")
        const pageText = document.body.innerText || "";
        if (pageText.includes('暂时没有更多了') || pageText.includes('没有更多了')) {
            console.log("[AI2Hero Crawler] Đã phát hiện dòng thông báo hết video trên trang (暂时没有更多了). Tự động dừng cào.");
            stopAutoCrawl();
            return;
        }

        // 3. Cuộn trang giả lập thao tác người dùng (scroll ngẫu nhiên từ 450 - 750px)
        const scrollAmount = Math.floor(Math.random() * 300) + 450;
        window.scrollBy(0, scrollAmount);

        // 4. Kiểm tra kẹt trang (kéo đến đáy trang profile không load thêm được nữa)
        const currentScrollHeight = document.documentElement.scrollHeight;
        if (currentScrollHeight === lastScrollHeight) {
            sameHeightCount++;
            if (sameHeightCount >= 15) { // Quá 22.5 giây không thay đổi chiều cao trang
                console.log("[AI2Hero Crawler] Đã cuộn hết trang hoặc bị nghẽn. Tự động hoàn thành.");
                stopAutoCrawl();
                return;
            }
        } else {
            sameHeightCount = 0;
            lastScrollHeight = currentScrollHeight;
        }

        // 5. Batch Upload: Nếu gom được từ 10 video, bắn ngay lên Server
        if (_douyinVideos.length >= 10) {
            uploadCrawlBatch(false);
        }
    }

    async function uploadCrawlBatch(isFinal = false) {
        if (!_douyinVideos.length) return;

        const videosToUpload = [..._douyinVideos];
        const countToUpload = videosToUpload.length;

        console.log(`[AI2Hero Crawler] Đang gửi đồng bộ ${countToUpload} video lên Server...`);

        try {
            const bodyData = {
                teamId: crawlTeamId,
                videos: videosToUpload
            };
            if (crawlProjectId) {
                bodyData.projectId = crawlProjectId;
            }
            const res = await fetch(`${crawlApiBase}/api/hero-downloader/extension`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + crawlAuthToken
                },
                body: JSON.stringify(bodyData)
            });
            const data = await res.json();
            if (data.success) {
                totalSyncedVideos += countToUpload;
                const syncedEl = document.getElementById('crawl-stat-synced');
                if (syncedEl) syncedEl.innerText = totalSyncedVideos;

                // Xóa phần video đã gửi thành công ra khỏi buffer
                _douyinVideos.splice(0, countToUpload);
                console.log(`[AI2Hero Crawler] Đã đồng bộ thành công ${countToUpload} video.`);
            } else {
                console.error("[AI2Hero Crawler] Lỗi từ API:", data.error);
            }
        } catch (e) {
            console.error("[AI2Hero Crawler] Không thể gửi video lên Server:", e);
        }
    }

    // API phục vụ cho popup.js lấy danh sách hoặc xóa
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "GET_DOUYIN_VIDEOS") {
            sendResponse({ success: true, videos: _douyinVideos });
            return true;
        }
        if (request.action === "CLEAR_DOUYIN_VIDEOS") {
            _douyinVideos = [];
            _douyinVideoIds.clear();
            sendResponse({ success: true });
            return true;
        }
        if (request.action === "START_AUTO_CRAWL") {
            try {
                startAutoCrawl(
                    request.token, 
                    request.teamId, 
                    request.apiBase, 
                    request.projectId, 
                    request.recentIds || [], 
                    request.maxScanVideos || 50
                );
                sendResponse({ success: true });
            } catch (e) {
                sendResponse({ success: false, error: e.toString() });
            }
            return true;
        }
        if (request.action === "STOP_AUTO_CRAWL") {
            stopAutoCrawl();
            sendResponse({ success: true });
            return true;
        }
    });

})();
