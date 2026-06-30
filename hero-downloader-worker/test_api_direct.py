import requests

video_id = "7641894056389348649"

# Check raw response from Douyin web API
url = f"https://www.douyin.com/aweme/v1/web/aweme/detail/?aweme_id={video_id}"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
    'Referer': 'https://www.douyin.com/',
    'Accept': 'application/json, */*',
}
res = requests.get(url, headers=headers, timeout=10)
print("Status:", res.status_code)
print("Content-Type:", res.headers.get('Content-Type'))
print("Content-Length:", len(res.content))
print("First 500 bytes raw:", res.content[:500])
