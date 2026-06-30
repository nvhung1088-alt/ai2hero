import re

html = open('douyin_debug.html', encoding='utf-8').read()

# Find all douyinvod URLs
urls = re.findall(r'https://[^\s"\'\\]+douyinvod\.com[^\s"\'\\]+', html)
print("=== douyinvod URLs found:", len(urls))
for u in urls[:5]:
    print(" ", u[:150])

# Try to find mp4 URLs
mp4_urls = re.findall(r'https://[^\s"\'\\]+\.mp4[^\s"\'\\]*', html)
print("\n=== .mp4 URLs found:", len(mp4_urls))
for u in mp4_urls[:5]:
    print(" ", u[:150])

# Find RENDER_DATA context
idx = html.find('RENDER_DATA')
if idx >= 0:
    print("\n=== RENDER_DATA context (300 chars):")
    print(html[idx:idx+300])
