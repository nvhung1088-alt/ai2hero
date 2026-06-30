from playwright.sync_api import sync_playwright
import time
import json
import re

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        channel='chrome',
        args=['--disable-blink-features=AutomationControlled']
    )
    page = browser.new_page(
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        locale='zh-CN'
    )
    
    captured = []
    
    def on_resp(r):
        if r.request.resource_type == 'xhr':
            try:
                body = r.text()
                if 'aweme_detail' in body and 'play_addr' in body:
                    print("\n[+] Found aweme_detail in XHR!")
                    data = json.loads(body)
                    aweme = data.get('aweme_detail', {})
                    video = aweme.get('video', {})
                    for key in ['play_addr', 'download_addr', 'play_addr_265']:
                        addr = video.get(key)
                        if addr:
                            url_list = addr.get('url_list', [])
                            print(f"  - {key}.url_list: {url_list}")
                            
                    # Let's also print the whole video dict keys
                    print("  - Video keys:", video.keys())
            except Exception as e:
                print("Error parsing XHR:", e)

    page.on('response', on_resp)
    
    try:
        page.goto('https://www.douyin.com/video/7641894056389348649', wait_until='domcontentloaded', timeout=20000)
    except:
        pass
        
    print("Waiting 15s...")
    time.sleep(15)
    browser.close()
    print("Done")
