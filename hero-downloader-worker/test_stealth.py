from playwright.sync_api import sync_playwright
import time

stealth_js = """
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [{name:'Chrome PDF Plugin'}] });
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
    if (!window.chrome) window.chrome = { runtime: {} };
"""

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--disable-blink-features=AutomationControlled'])
    context = browser.new_context(
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        locale='zh-CN'
    )
    page = context.new_page()
    page.add_init_script(stealth_js)
    
    captured = []
    def on_resp(r):
        u = r.url
        if any(k in u for k in ['aweme', 'item_info', 'video', 'feed', 'douyinvod']):
            captured.append(u)
    page.on('response', on_resp)
    
    try:
        page.goto('https://www.douyin.com/video/7641894056389348649', wait_until='domcontentloaded', timeout=20000)
    except Exception as e:
        print('Goto error:', type(e).__name__)
    
    time.sleep(10)
    
    wd = page.evaluate('navigator.webdriver')
    print('navigator.webdriver:', wd)
    print('Page title:', page.title())
    print('XHR captured:', len(captured))
    for u in captured[:10]:
        print(' -', u[:120])
    
    try:
        src = page.evaluate('document.querySelector("video") ? document.querySelector("video").src : null')
        print('video.src:', src)
    except Exception as e:
        print('video error:', e)
    
    page.screenshot(path='stealth_test.png')
    print('Screenshot: stealth_test.png')
    browser.close()
