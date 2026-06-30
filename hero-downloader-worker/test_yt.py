import yt_dlp

ydl_opts = {
    'quiet': False,
    'cookiesfrombrowser': ('chrome', ),
}
with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    try:
        ydl.extract_info('https://www.youtube.com/watch?v=u8Tq-5eAeQI', download=False)
        print("Success")
    except Exception as e:
        print("Error:", e)
