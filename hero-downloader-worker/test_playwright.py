from playwright.sync_api import sync_playwright
import time
import json

def extract_douyin_video(url, cookie_file=None):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
        )
        
        # Load cookies if any
        if cookie_file:
            try:
                cookies = []
                with open(cookie_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        if not line.startswith('#') and line.strip():
                            parts = line.strip().split('\t')
                            if len(parts) >= 7:
                                cookies.append({
                                    "domain": parts[0],
                                    "path": parts[2],
                                    "name": parts[5],
                                    "value": parts[6],
                                    "secure": parts[3].upper() == 'TRUE',
                                    "expires": int(parts[4])
                                })
                if cookies:
                    context.add_cookies(cookies)
            except Exception as e:
                print("Cookie error:", e)

        page = context.new_page()
        video_url = None

        def handle_response(response):
            nonlocal video_url
            try:
                # Douyin API response that contains video URL
                if "aweme/detail" in response.url or "video/detail" in response.url:
                    text = response.text()
                    data = json.loads(text)
                    # Extract from aweme_detail -> video -> play_addr -> url_list
                    if 'aweme_detail' in data:
                        url_list = data['aweme_detail'].get('video', {}).get('play_addr', {}).get('url_list', [])
                        if url_list:
                            video_url = url_list[0]
            except Exception:
                pass
            
            # Alternative: Catch media requests directly
            req_url = response.url
            if ".mp4" in req_url or "video_id=" in req_url or "v5.douyinvod.com" in req_url or "v93.douyinvod.com" in req_url:
                if response.request.resource_type == "media":
                    video_url = req_url

        page.on("response", handle_response)
        
        print("Navigating to", url)
        page.goto(url, wait_until="networkidle", timeout=20000)
        
        # Wait a bit for the video to load
        for _ in range(30):
            if video_url:
                break
            time.sleep(0.5)

        # Fallback: check video tag
        if not video_url:
            try:
                video_elem = page.query_selector('video source')
                if video_elem:
                    video_url = video_elem.get_attribute('src')
            except Exception:
                pass

        browser.close()
        return video_url

if __name__ == "__main__":
    url = "https://www.douyin.com/video/7641894056389348649"
    res = extract_douyin_video(url, "test_cookie.txt")
    print("\nRESULT MP4 URL:")
    print(res)
