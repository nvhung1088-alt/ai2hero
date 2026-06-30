import yt_dlp

def hook(d):
    if d['status'] == 'downloading':
        info = d.get('info_dict', {})
        print("Hook size:", info.get('filesize_approx'), info.get('filesize'))
        raise Exception("Stop")

ydl_opts = {
    'quiet': True,
    'progress_hooks': [hook],
    'format': 'bestvideo[vcodec^=avc]+bestaudio/best',
}
with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    try:
        ydl.download(['https://www.bilibili.com/video/BV1LKKQ6QEun'])
    except Exception as e:
        print("Done:", e)
