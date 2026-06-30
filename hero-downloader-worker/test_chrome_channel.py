from playwright.sync_api import sync_playwright
import time

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
    video_url = None

    def on_resp(r):
        global video_url
        url = r.url
        rtype = r.request.resource_type
        captured.append({'url': url, 'type': rtype})
        # Xem tất cả XHR
        if rtype == 'xhr':
            print(f"[XHR] {url[:150]}")
            try:
                body = r.text()
                if 'url_list' in body or 'play_addr' in body or 'douyinvod' in body:
                    print(f"  >>> VIDEO DATA FOUND!")
                    print(f"  Body[:300]: {body[:300]}")
            except:
                pass
        if rtype == 'media' or 'douyinvod' in url:
            print(f"[MEDIA] {url[:150]}")
            video_url = url

    page.on('response', on_resp)

    try:
        page.goto('https://www.douyin.com/video/7641894056389348649',
                 wait_until='domcontentloaded', timeout=20000)
        print("Page loaded OK")
    except Exception as e:
        print(f"Goto: {type(e).__name__}")

    print("Waiting 20s for video to load...")
    for i in range(40):
        time.sleep(0.5)
        if i == 10:
            # Try clicking the video area after 5s
            try:
                page.mouse.click(960, 400)
                print("[Click] Clicked center of page")
            except:
                pass
        if i == 20:
            # Check video element
            try:
                src = page.evaluate("document.querySelector('video') ? document.querySelector('video').src : 'NO VIDEO ELEMENT'")
                print(f"[video.src at 10s]: {src}")
            except Exception as e:
                print(f"[video.src error]: {e}")

    print(f"\nTotal XHR: {sum(1 for r in captured if r['type'] == 'xhr')}")
    print(f"Total media: {sum(1 for r in captured if r['type'] == 'media')}")
    print(f"video_url found: {video_url}")

    # Final video src check
    try:
        src = page.evaluate("document.querySelector('video') ? document.querySelector('video').src : null")
        print(f"Final video.src: {src}")
        curr = page.evaluate("document.querySelector('video') ? document.querySelector('video').currentSrc : null")
        print(f"Final video.currentSrc: {curr}")
    except Exception as e:
        print(f"Final video check error: {e}")

    browser.close()
    print("Done")
