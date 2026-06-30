import yt_dlp
import json

ydl = yt_dlp.YoutubeDL({'extract_flat': 'in_playlist', 'quiet': True})
res = ydl.extract_info('https://space.bilibili.com/471515996', download=False, process=False)

entries = res.get('entries')
print("Is generator:", type(entries))
count = 0
for e in entries:
    print(e.get('url') or e.get('bvid'))
    count += 1
    if count >= 3:
        break
print("Done")
