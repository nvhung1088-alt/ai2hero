from playwright.sync_api import sync_playwright
import time
import json

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
    
    def on_resp(r):
        if r.request.resource_type == 'xhr':
            try:
                body = r.text()
                if 'aweme_detail' in body or 'aweme_list' in body:
                    print(f"\n[+] Found aweme JSON in XHR: {r.url[:100]}")
                    with open("aweme_dump.json", "a", encoding="utf-8") as f:
                        f.write(body + "\n\n====\n\n")
            except:
                pass

    page.on('response', on_resp)
    
    # clear dump file
    open("aweme_dump.json", "w").close()
    
    try:
        page.goto('https://www.douyin.com/video/7641894056389348649', wait_until='domcontentloaded', timeout=20000)
    except:
        pass
        
    print("Waiting 15s...")
    time.sleep(15)
    browser.close()
    print("Done")
