import urllib.request
from http.cookiejar import MozillaCookieJar

url = "https://www.douyin.com/video/7641894056389348649"

cj = MozillaCookieJar('test_cookie.txt')
cj.load()

opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
opener.addheaders = [
    ('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
    ('Referer', 'https://www.douyin.com/')
]

try:
    response = opener.open(url)
    html = response.read().decode('utf-8')
    with open('douyin_html.txt', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Fetched HTML, length:", len(html))
    
    # Check if "play_addr" or ".mp4" is in HTML
    if "play_addr" in html:
        print("play_addr FOUND in HTML!")
    if "RENDER_DATA" in html:
        print("RENDER_DATA FOUND in HTML!")
except Exception as e:
    print("Error:", e)
