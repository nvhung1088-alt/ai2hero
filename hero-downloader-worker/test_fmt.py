import yt_dlp

ydl_opts = {
    'quiet': False,
    'format': 'bestvideo[vcodec^=avc]+bestaudio/bestvideo+bestaudio/best',
}
print("String:", ydl_opts['format'])
