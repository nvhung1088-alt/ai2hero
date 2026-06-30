from playwright.sync_api import sync_playwright
import time
import json
import re

url = "https://www.douyin.com/video/7641894056389348649"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
    )
    
    # Intercept XHR/fetch responses
    captured = []
    
    def on_response(response):
        url_r = response.url
        if any(kw in url_r for kw in ['aweme', 'api/item', 'video/detail', 'feed', 'web/api']):
            try:
                body = response.text()
                captured.append({'url': url_r, 'body': body[:2000]})
            except:
                pass
    
    page.on("response", on_response)
    
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=15000)
    except Exception as e:
        print("Goto error:", e)
    
    time.sleep(5)
    
    print(f"Captured {len(captured)} XHR responses")
    for c in captured:
        print("  URL:", c['url'])
        if 'url_list' in c['body'] or 'play_addr' in c['body']:
            print("  >>> CONTAINS play_addr/url_list!")
            print("  Body[:500]:", c['body'][:500])

    # Thử đọc biến JS trực tiếp
    print("\n=== Trying JS globals ===")
    for var in ['window.__NEXT_DATA__', 'window.RENDER_DATA', 'window.SSR_RENDER_DATA_DOC', 
                'window._ROUTER_DATA', 'window.__aweme_detail__']:
        try:
            val = page.evaluate(f"JSON.stringify({var})")
            if val and val != 'null' and len(val) > 10:
                print(f"{var}: FOUND (len={len(val)})")
                # Cố lấy URL
                urls_found = re.findall(r'https://[^"]+douyinvod[^"]+', val)
                if urls_found:
                    print(f"  douyinvod URLs:", urls_found[:3])
            else:
                print(f"{var}: null/empty")
        except Exception as e:
            print(f"{var}: Error - {e}")
    
    # Check page title
    print("\nPage title:", page.title())
    
    # Screenshot
    page.screenshot(path='douyin_debug2.png')
    print("Screenshot saved: douyin_debug2.png")
    
    browser.close()
