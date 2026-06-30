import urllib.parse
from yt_dlp.cookies import load_cookies

cookie_text = """# Netscape HTTP Cookie File
# https://curl.haxx.se/rfc/cookie_spec.html
# This is a generated file! Do not edit.

www.douyin.com	FALSE	/	FALSE	1787366541	s_v_web_id	verify_mqq1gxq0_A0gDxqeK_okz1_45mJ_BnPW_F9OlxWRZZjev
.douyin.com	TRUE	/	TRUE	1813900208	ttwid	1%7CMertkqav7s49cKNvvBsIV1NF0U3lc_uTHzz57Fu0vsY%7C1782796111%7C584ccc45ce4a7f672789f6f6f73d28de8e9e251e2b82933f1f6b072515e06c3b
"""
with open("test_cookie.txt", "w") as f:
    f.write(cookie_text)

import yt_dlp
ydl = yt_dlp.YoutubeDL({'cookiefile': 'test_cookie.txt'})
jar = ydl.cookiejar

for cookie in jar:
    print(cookie.domain, cookie.name, cookie.value)

print("Cookies for www.douyin.com:", jar._cookies.get('www.douyin.com'))
print("Cookies for .douyin.com:", jar._cookies.get('.douyin.com'))
