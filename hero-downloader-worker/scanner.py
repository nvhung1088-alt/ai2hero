import os
import yt_dlp
from colorama import Fore
from downloader import _write_cookie_file

def _get_best_thumbnail(entry):
    """Tìm ảnh thumbnail có độ phân giải cao nhất từ yt-dlp entry."""
    if not entry:
        return ""
    thumbnails = entry.get('thumbnails')
    best_url = ""
    max_res = -1
    
    if isinstance(thumbnails, list) and thumbnails:
        for t in thumbnails:
            if not isinstance(t, dict):
                continue
            u = t.get('url')
            if not u:
                continue
            w = t.get('width') or 0
            h = t.get('height') or 0
            pref = t.get('preference') or 0
            res_score = (w * h) if (w and h) else (pref * 1000 + 100)
            if res_score > max_res:
                max_res = res_score
                best_url = u
                
    if not best_url:
        best_url = entry.get('thumbnail') or ""
        
    if best_url.startswith("//"):
        best_url = "https:" + best_url
        
    # Bilibili: loại bỏ @... suffix để lấy ảnh master full HD/4K
    if "hdslb.com" in best_url:
        import re
        best_url = re.sub(r'@[^/]+$', '', best_url)
        
    # YouTube: nâng cấp lên maxresdefault (1080p)
    if "i.ytimg.com" in best_url or "youtube.com" in best_url:
        import re
        best_url = re.sub(r'/(hqdefault|mqdefault|sddefault)\.jpg', '/maxresdefault.jpg', best_url)
        
    return best_url

def scan_project_videos(project, cookie_data=None):
    url = project.get('sourceUrl')
    max_videos = project.get('maxScanVideos', 5)
    print(Fore.CYAN + f"[-] Dang quet du an {project.get('name')} - URL: {url}")

    cookie_file = _write_cookie_file(cookie_data) if cookie_data else None

    ydl_opts = {
        'extract_flat': 'in_playlist',
        'quiet': True,
        'no_warnings': True,
        'socket_timeout': 30,
    }
    
    # Header phù hợp theo platform
    if 'douyin.com' in url:
        ydl_opts['http_headers'] = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
            'Referer': 'https://www.douyin.com',
        }
    else:
        ydl_opts['http_headers'] = {
            'Referer': 'https://www.bilibili.com',
        }

    if cookie_file:
        ydl_opts['cookiefile'] = cookie_file

    recent_urls = set(project.get('recentUrls', []))
    videos = []
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Dùng process=False để nhận Generator (giúp lazy-load list Bilibili)
            info = ydl.extract_info(url, download=False, process=False)
            
            entries = info.get('entries') if info else []
            # Nếu không phải playlist thì info chính là video đơn
            if not entries and info and info.get('id'):
                entries = [info]

            for entry in entries:
                if not entry:
                    continue
                video_url = entry.get('url') or entry.get('webpage_url') or entry.get('original_url')
                if not video_url:
                    continue
                    
                # Chuẩn hóa URL Douyin nếu bị dính modal_id
                if "douyin.com" in video_url and "modal_id=" in video_url:
                    import urllib.parse
                    parsed = urllib.parse.urlparse(video_url)
                    qs = urllib.parse.parse_qs(parsed.query)
                    if "modal_id" in qs:
                        video_url = f"https://www.douyin.com/video/{qs['modal_id'][0]}"
                
                # CƠ CHẾ QUÉT THÔNG MINH (Break-on-existing):
                # Nếu video_url đã nằm trong 100 video gần nhất của DB, tức là đã quét tới chỗ cũ -> Dừng ngay lập tức!
                if video_url in recent_urls:
                    print(Fore.YELLOW + f"  -> Da gap video cu ({video_url}), hoan thanh dong bo kenh!")
                    break

                fallback_title = entry.get('id') or video_url.split('/')[-1]
                videos.append({
                    "url": video_url,
                    "title": entry.get('title') or fallback_title,
                    "duration": entry.get('duration') or 0,
                    "author": entry.get('uploader') or entry.get('channel') or "",
                    "thumbnail": _get_best_thumbnail(entry),
                })

        print(Fore.GREEN + f"[+] Quet duoc {len(videos)} video tu {project.get('name')}")
        return videos
    except Exception as e:
        error_msg = str(e)
        if "Request is blocked by server (412)" in error_msg:
            print(Fore.RED + f"[!] Bilibili chan yeu cau quet kenh (Loi 412 - Anti-bot).")
            print(Fore.YELLOW + "    Giai phap: Them Cookie Bilibili hop le vao Cai dat du an tren Web.")
        else:
            print(Fore.RED + f"[!] Loi quet du an: {error_msg}")
        return []
    finally:
        if cookie_file and os.path.exists(cookie_file):
            try:
                os.remove(cookie_file)
            except:
                pass
