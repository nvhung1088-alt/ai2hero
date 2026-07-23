// [AI2Hero] Douyin API Interceptor - hooks fetch + XHR to capture video metadata
(function() {
    if (window.__ai2hero_injected) return;
    window.__ai2hero_injected = true;

    // Patterns API của Douyin để bắt thông tin video (mở rộng tối đa)
    function isDouyinVideoAPI(url) {
        // Nếu đang ở trang Cá nhân (Channel), CHỈ bắt API của kênh đó để tránh dính video rác (Recommended)
        if (window.location.pathname.includes('/user/')) {
            return url.includes('aweme/v1/web/aweme/post') || 
                   url.includes('aweme/v1/web/mix/aweme') || 
                   url.includes('aweme_detail');
        }

        return url.includes('aweme/v1/web/aweme/detail') ||
               url.includes('aweme/v1/web/aweme/post') ||
               url.includes('aweme/v1/web/mix/aweme') ||
               url.includes('aweme/v1/web/feed') ||
               url.includes('aweme/v1/feed') ||
               url.includes('web/aweme') ||
               url.includes('/api/aweme') ||
               url.includes('play_addr') ||
               url.includes('aweme_detail') ||
               url.includes('/video/feed') ||
               url.includes('recommend/feed');
    }

    function isBilibiliVideoAPI(url) {
        return url.includes('x/space/wbi/arc/search') || 
               url.includes('x/space/arc/search') ||
               url.includes('x/web-interface/wbi/index/top/rcmd') ||
               url.includes('x/space/video');
    }

    // DEBUG: Log TẤT CẢ URL đi qua (để tìm endpoint đúng - comment out sau khi debug xong)
    function debugLogURL(type, url) {
        if (url && (url.includes('douyin.com') || url.includes('tiktok.com') || url.includes('bilibili.com'))) {
            if (url.includes('aweme') || url.includes('video') || url.includes('feed') || url.includes('space')) {
                console.log('[AI2Hero DEBUG]', type, ':', url.substring(0, 150));
            }
        }
    }

    // 1. Hook window.fetch
    const _origFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await _origFetch.apply(this, args);
        const url = (args[0] && args[0].url) || (typeof args[0] === 'string' ? args[0] : '') || '';

        debugLogURL('FETCH', url);

        if (isDouyinVideoAPI(url)) {
            const clone = response.clone();
            clone.text().then(function(body) {
                if (body && body.length > 100) {
                    console.log('[AI2Hero] ✅ Bắt được API video Douyin:', url.substring(0, 100));
                    window.postMessage({
                        type: 'AI2HERO_DOUYIN_API',
                        url: url,
                        body: body
                    }, '*');
                }
            }).catch(function(e) {});
        } else if (isBilibiliVideoAPI(url)) {
            const clone = response.clone();
            clone.text().then(function(body) {
                if (body && body.length > 50) {
                    console.log('[AI2Hero] ✅ Bắt được API video Bilibili:', url.substring(0, 100));
                    window.postMessage({
                        type: 'AI2HERO_BILIBILI_API',
                        url: url,
                        body: body
                    }, '*');
                }
            }).catch(function(e) {});
        }
        return response;
    };

    // 2. Hook XMLHttpRequest
    const _XHR = XMLHttpRequest.prototype;
    const _open = _XHR.open;
    const _send = _XHR.send;

    _XHR.open = function(method, url) {
        this._ai2hero_url = url;
        return _open.apply(this, arguments);
    };

    _XHR.send = function(postData) {
        this.addEventListener('load', function() {
            const url = this._ai2hero_url || '';
            debugLogURL('XHR', url);

            if (isDouyinVideoAPI(url)) {
                try {
                    const body = this.responseText;
                    if (body && body.length > 100) {
                        console.log('[AI2Hero] ✅ XHR Bắt được API video Douyin:', url.substring(0, 100));
                        window.postMessage({
                            type: 'AI2HERO_DOUYIN_API',
                            url: url,
                            body: body
                        }, '*');
                    }
                } catch(e) {}
            } else if (isBilibiliVideoAPI(url)) {
                try {
                    const body = this.responseText;
                    if (body && body.length > 50) {
                        console.log('[AI2Hero] ✅ XHR Bắt được API video Bilibili:', url.substring(0, 100));
                        window.postMessage({
                            type: 'AI2HERO_BILIBILI_API',
                            url: url,
                            body: body
                        }, '*');
                    }
                } catch(e) {}
            }
        });
        return _send.apply(this, arguments);
    };

    console.log('🚀 AI2Hero API Interceptor Injected! (v2 - expanded patterns + debug)');
})();
