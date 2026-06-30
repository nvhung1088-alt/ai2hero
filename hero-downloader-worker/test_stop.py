import yt_dlp
import json

def filter_func(info, incomplete):
    url = info.get('url', '')
    print('Checking', url)
    if 'watch?v=1' in url: # stop early
        raise yt_dlp.utils.DownloadCancelled('Found existing')
    return None

ydl = yt_dlp.YoutubeDL({'extract_flat': 'in_playlist', 'quiet': True, 'match_filter': filter_func})
try:
    res = ydl.extract_info('https://www.youtube.com/playlist?list=PL74092497672B104F', download=False)
    print('Entries length:', len(res.get('entries', [])))
except Exception as e:
    print('Exception caught:', type(e), e)
