// Wrap XMLHttpRequest and fetch to intercept JSON responses
(function() {
    // 1. Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        const url = args[0]?.url || (typeof args[0] === 'string' ? args[0] : '');
        
        // We only care about Douyin APIs returning aweme data
        if (url.includes('aweme/v1/web/aweme/detail') || 
            url.includes('aweme/v1/web/aweme/post') || 
            url.includes('aweme/v1/web/aweme/related') ||
            url.includes('aweme/v1/web/mix/aweme')) {
            
            // Clone response so original app can still consume it
            const clone = response.clone();
            clone.text().then(body => {
                window.postMessage({
                    type: 'AI2HERO_DOUYIN_API',
                    url: url,
                    body: body
                }, '*');
            }).catch(e => console.error("AI2Hero Fetch Intercept Error", e));
        }
        return response;
    };

    // 2. Intercept XMLHttpRequest
    const XHR = XMLHttpRequest.prototype;
    const open = XHR.open;
    const send = XHR.send;

    XHR.open = function(method, url) {
        this._url = url;
        return open.apply(this, arguments);
    };

    XHR.send = function(postData) {
        this.addEventListener('load', function() {
            const url = this._url || '';
            if (url.includes('aweme/v1/web/aweme/detail') || 
                url.includes('aweme/v1/web/aweme/post') || 
                url.includes('aweme/v1/web/aweme/related') ||
                url.includes('aweme/v1/web/mix/aweme')) {
                
                try {
                    const body = this.responseText;
                    window.postMessage({
                        type: 'AI2HERO_DOUYIN_API',
                        url: url,
                        body: body
                    }, '*');
                } catch(e) {
                    console.error("AI2Hero XHR Intercept Error", e);
                }
            }
        });
        return send.apply(this, arguments);
    };
    
    console.log("🚀 AI2Hero API Interceptor Injected!");
})();
