import urllib.request
import json

url = "https://www.douyin.com/video/7641894056389348649"

api_url = f"https://api.douyin.wtf/api?url={url}"
try:
    req = urllib.request.Request(api_url, headers={'User-Agent': 'Mozilla/5.0'})
    response = urllib.request.urlopen(req)
    data = json.loads(response.read().decode('utf-8'))
    print("douyin.wtf response:", data)
except Exception as e:
    print("douyin.wtf Error:", e)
