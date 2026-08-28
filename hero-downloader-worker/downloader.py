import os
import re
import tempfile
import threading
import base64
import requests
import yt_dlp
from colorama import Fore

def _strip_ansi(text: str) -> str:
    """Xóa tất cả ANSI escape codes khỏi chuỗi (tránh lem ký tự rác lên Web UI)."""
    return re.sub(r'\x1b\[[0-9;]*m|\x1b\[[0-9;]*K', '', str(text)) if text else ''

# Lock bảo vệ dict active_downloads (thread-safe)
_lock = threading.Lock()
retry_counts = {} # video_id -> count
active_downloads = {}  # videoId -> {"cancel": threading.Event}

class CancelledError(Exception):
    pass

def _write_cookie_file(cookie_data: str) -> str | None:
    """Ghi cookie_data (Netscape format) ra file tạm, trả về đường dẫn file."""
    if not cookie_data or not cookie_data.strip():
        return None
    try:
        tmp = tempfile.NamedTemporaryFile(
            mode='w', suffix='.txt', delete=False, encoding='utf-8'
        )
        # Đảm bảo header Netscape đúng format
        if not cookie_data.strip().startswith('# Netscape'):
            tmp.write('# Netscape HTTP Cookie File\n')
        tmp.write(cookie_data)
        tmp.close()
        return tmp.name
    except Exception as e:
        print(Fore.RED + f"[!] Khong the ghi file cookie tam: {e}")
        return None

def _format_speed(bytes_per_sec: float) -> str:
    """Chuyển bytes/s thành chuỗi dễ đọc (KB/s, MB/s)."""
    if bytes_per_sec <= 0:
        return ''
    if bytes_per_sec >= 1024 * 1024:
        return f"{bytes_per_sec / 1024 / 1024:.1f} MB/s"
    return f"{bytes_per_sec / 1024:.0f} KB/s"

def _has_existing_thumbnail(downloads_dir, video_id):
    """Kiểm tra xem thư mục đã chứa bất kỳ file ảnh thumbnail nào của video_id chưa."""
    if not downloads_dir or not os.path.exists(downloads_dir):
        return False
    prefix = f"{video_id}_"
    try:
        for fname in os.listdir(downloads_dir):
            if fname.startswith(prefix) and fname.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                return True
    except Exception:
        pass
    return False

def optimize_and_save_thumbnail(img_data, dest_thumb_path: str, target_res: int = 720, quality: int = 85) -> bool:
    """
    Tối ưu hóa ảnh bìa Thumbnail:
    - Resize về chuẩn 720p (1280x720 cho ngang, 720x1280 cho dọc/Shorts) giữ nguyên 100% tỷ lệ khung hình.
    - Nén JPEG cao cấp (quality=85, optimize=True, progressive=True) giảm dung lượng xuống ~100-200 KB siêu nhẹ.
    """
    try:
        from PIL import Image
        import io

        if isinstance(img_data, (bytes, bytearray)):
            img = Image.open(io.BytesIO(img_data))
        elif isinstance(img_data, str) and os.path.exists(img_data):
            img = Image.open(img_data)
        else:
            return False

        # Chuyển đổi RGBA / Palette sang RGB chuẩn
        if img.mode in ("RGBA", "P"):
            rgb_img = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "RGBA":
                rgb_img.paste(img, mask=img.split()[3])
            else:
                rgb_img.paste(img)
            img = rgb_img
        elif img.mode != "RGB":
            img = img.convert("RGB")

        orig_w, orig_h = img.size
        
        # Resize về chuẩn 720p giữ nguyên Aspect Ratio
        if orig_w >= orig_h:
            # Ảnh ngang: Chiều cao = 720 (chiều rộng tối đa 1280)
            if orig_h > target_res:
                new_h = target_res
                new_w = int(orig_w * (target_res / orig_h))
                if new_w > 1280:
                    new_w = 1280
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        else:
            # Ảnh dọc: Chiều rộng = 720 (chiều cao tối đa 1280)
            if orig_w > target_res:
                new_w = target_res
                new_h = int(orig_h * (target_res / orig_w))
                if new_h > 1280:
                    new_h = 1280
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

        # Lưu file JPEG tối ưu
        os.makedirs(os.path.dirname(dest_thumb_path), exist_ok=True)
        img.save(dest_thumb_path, "JPEG", quality=quality, optimize=True, progressive=True)
        final_size = os.path.getsize(dest_thumb_path)
        print(Fore.GREEN + f"[✓] Da toi uu anh Thumbnail 720p ({img.size[0]}x{img.size[1]}, {final_size//1024} KB): {os.path.basename(dest_thumb_path)}")
        return True
    except Exception as e:
        print(Fore.YELLOW + f"[!] Khong the toi uu anh thumbnail: {e}")
        # Fallback lưu dữ liệu gốc nếu có dạng bytes
        try:
            if isinstance(img_data, (bytes, bytearray)):
                with open(dest_thumb_path, 'wb') as f:
                    f.write(img_data)
                return True
        except Exception:
            pass
        return False

def _download_thumbnail(thumbnail_url: str, base_filepath: str):
    """Tải ảnh thumbnail chất lượng cao nhất về cùng thư mục với video (chỉ tải khi chưa có)."""
    if not thumbnail_url:
        return None
    try:
        dir_name = os.path.dirname(base_filepath)
        file_name = os.path.basename(base_filepath)
        video_id = file_name.split('_')[0] if '_' in file_name else ''
        thumb_path = os.path.splitext(base_filepath)[0] + ".jpg"

        # 1. Hỗ trợ Base64 Data URL (data:image/...) - Luôn luôn ghi đè file cũ bằng Poster gốc mới nhất
        if thumbnail_url.startswith("data:image/"):
            b64_str = thumbnail_url.split(",", 1)[1] if "," in thumbnail_url else thumbnail_url
            img_bytes = base64.b64decode(b64_str)
            if len(img_bytes) > 500:
                if optimize_and_save_thumbnail(img_bytes, thumb_path):
                    print(Fore.CYAN + f"[*] Da luu & ghi de thumbnail Base64: {os.path.basename(thumb_path)}")
                    return thumb_path
                else:
                    with open(thumb_path, 'wb') as f:
                        f.write(img_bytes)
                    return thumb_path

        # Nếu đã có thumbnail từ trước và không phải Base64 thì bỏ qua
        if video_id and _has_existing_thumbnail(dir_name, video_id):
            return None

        if thumbnail_url.startswith("//"):
            thumbnail_url = "https:" + thumbnail_url

        # Bilibili: loại bỏ @... suffix để tải ảnh master full HD/4K gốc
        if "hdslb.com" in thumbnail_url:
            thumbnail_url = re.sub(r'@[^/]+$', '', thumbnail_url)

        # YouTube: nâng cấp lên maxresdefault (1080p)
        if "i.ytimg.com" in thumbnail_url or "youtube.com" in thumbnail_url:
            thumbnail_url = re.sub(r'/(hqdefault|mqdefault|sddefault)\.jpg', '/maxresdefault.jpg', thumbnail_url)

        # Douyin: Chỉ nâng cấp khi là public bucket tos-cn-p-0015, còn lại GIỮ NGUYÊN signed URL có chữ ký
        if "tos-cn-p-0015" in thumbnail_url:
            thumbnail_url = re.sub(r'https?://[^/]+douyinpic\.com', 'https://p3.douyinpic.com', thumbnail_url)
            thumbnail_url = thumbnail_url.split('?')[0]
            if '~tplv-' in thumbnail_url:
                thumbnail_url = re.sub(r'~tplv-[^.]+(?:\.jpeg|\.webp|\.jpg)?', '~tplv-dy-1080p.jpeg', thumbnail_url)
            else:
                thumbnail_url = thumbnail_url + '~tplv-dy-1080p.jpeg'

        # Nếu file đã tồn tại thì bỏ qua
        if os.path.exists(thumb_path):
            return thumb_path
            
        # Chọn Referer động theo nền tảng tránh bị CDN chặn 403
        referer = 'https://www.bilibili.com/'
        if 'douyin' in thumbnail_url:
            referer = 'https://www.douyin.com/'
        elif 'tiktok' in thumbnail_url:
            referer = 'https://www.tiktok.com/'
        elif 'youtube' in thumbnail_url or 'ytimg' in thumbnail_url:
            referer = 'https://www.youtube.com/'

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': referer
        }
        res = requests.get(thumbnail_url, headers=headers, timeout=15)
        res.raise_for_status()

        if optimize_and_save_thumbnail(res.content, thumb_path):
            print(Fore.CYAN + f"[*] Da tai & toi uu xong thumbnail HD: {os.path.basename(thumb_path)}")
            return thumb_path
        else:
            with open(thumb_path, 'wb') as f:
                f.write(res.content)
            return thumb_path
    except Exception as e:
        print(Fore.YELLOW + f"[!] Khong the tai thumbnail: {e}")
        return None

def _extract_frame_from_video(video_filepath: str, output_thumb_path: str) -> bool:
    """Trích xuất 1 khung hình Master HD 1080p từ video bằng ffmpeg và tối ưu về 720p."""
    try:
        import shutil, subprocess
        if not shutil.which('ffmpeg') or not os.path.exists(video_filepath):
            return False
        cmd = ['ffmpeg', '-y', '-ss', '00:00:01', '-i', video_filepath, '-vframes', '1', '-update', '1', '-q:v', '2', output_thumb_path]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if res.returncode == 0 and os.path.exists(output_thumb_path) and os.path.getsize(output_thumb_path) > 1000:
            optimize_and_save_thumbnail(output_thumb_path, output_thumb_path)
            return True
        return False
    except Exception:
        return False

def _ensure_hd_thumbnail(video_filepath: str, thumbnail_url: str = None) -> str | None:
    """Đảm bảo file ảnh thumbnail đạt chuẩn (ưu tiên ảnh Poster gốc của tác giả, tuyệt đối không ghi đè frame video). Trả về Data URI Base64 để đồng bộ lên Server."""
    if not video_filepath or not os.path.exists(video_filepath):
        return None

    dir_name = os.path.dirname(video_filepath)
    file_name = os.path.basename(video_filepath)
    video_id = file_name.split('_')[0] if '_' in file_name else ''
    default_thumb_path = os.path.splitext(video_filepath)[0] + ".jpg"
    thumb_file = None

    # 1. Tải và lưu ảnh Poster gốc từ URL hoặc Base64 nếu có
    if thumbnail_url and not _has_existing_thumbnail(dir_name, video_id):
        thumb_file = _download_thumbnail(thumbnail_url, video_filepath)

    # 2. Fallback: CHỈ trích xuất 1 frame từ video khi hoàn toàn KHÔNG CÓ bất kỳ nguồn ảnh nào từ tác giả
    if not thumbnail_url and not _has_existing_thumbnail(dir_name, video_id):
        ok = _extract_frame_from_video(video_filepath, default_thumb_path)
        if ok:
            print(Fore.GREEN + f"[*] Da trich xuat anh thumbnail tu video cho ID {video_id}")
            thumb_file = default_thumb_path

    # Tìm file thumbnail đã lưu để sinh Base64 Data URI gửi lên Web UI
    prefix = f"{video_id}_"
    if not thumb_file and os.path.exists(dir_name):
        for fname in os.listdir(dir_name):
            if fname.startswith(prefix) and fname.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                thumb_file = os.path.join(dir_name, fname)
                break

    if thumb_file and os.path.exists(thumb_file):
        try:
            # Đảm bảo nén 720p trước khi sinh Base64
            optimize_and_save_thumbnail(thumb_file, thumb_file, target_res=720, quality=85)
            if os.path.getsize(thumb_file) < 1500000:
                with open(thumb_file, 'rb') as f:
                    b64_data = base64.b64encode(f.read()).decode('utf-8')
                return f"data:image/jpeg;base64,{b64_data}"
        except Exception as e:
            print(Fore.YELLOW + f"[!] Khong the encode Base64 thumbnail: {e}")

    if thumbnail_url and thumbnail_url.startswith("data:image/"):
        return thumbnail_url

    return None

def download_direct_mp4(video, url, update_callback):
    """Tải trực tiếp file MP4 từ CDN link bằng requests (không cần yt-dlp)."""
    video_id = video.get('id')
    title = video.get('title') or "douyin"
    safe_title = "".join([c for c in title if c.isalnum() or c in [' ', '_', '-']]).strip()
    safe_title = safe_title.replace(' ', '_')
    downloads_dir = video.get('localFolder')
    if not downloads_dir:
        downloads_dir = os.path.abspath(os.path.join(os.getcwd(), "downloads"))
    os.makedirs(downloads_dir, exist_ok=True)
    
    filepath = os.path.join(downloads_dir, f"{video_id}_{safe_title}.mp4")
    print(Fore.GREEN + f"[-] Dang tai direct MP4 video ID {video_id}...")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.douyin.com'
    }
    cancel_event = threading.Event()
    with _lock:
        active_downloads[video_id] = {"cancel": cancel_event}

    try:
        # Download thumbnail (chỉ tải 1 ảnh duy nhất nếu chưa có)
        thumbnail_url = video.get('thumbnailUrl')
        if thumbnail_url and video.get('downloadThumbnail', True) and not _has_existing_thumbnail(downloads_dir, video_id):
            _download_thumbnail(thumbnail_url, filepath)

        response = requests.get(url, headers=headers, stream=True, timeout=30)
        response.raise_for_status()
        total_bytes = int(response.headers.get('content-length', 0))
        
        update_callback(video_id, status='downloading', progress=0, speed='', size_bytes=total_bytes)
        
        downloaded = 0
        last_progress = 0
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=1048576): # 1MB buffer (Tải 1 luồng đơn, tối ưu I/O đĩa cứng)
                if active_downloads.get(video_id, {}).get("cancel", threading.Event()).is_set():
                    raise Exception("Bị huỷ bởi người dùng")

                f.write(chunk)
                downloaded += len(chunk)
                pct = int(downloaded / total_bytes * 100) if total_bytes else 0
                
                if pct >= last_progress + 3 or pct >= 100:
                    update_callback(video_id, status='downloading', progress=pct, speed='', size_bytes=total_bytes)
                    last_progress = pct
                    import sys
                    sys.stdout.write(f"\r[Video {video_id}] Downloading: {pct}% ")
                    sys.stdout.flush()
                    
        import sys
        sys.stdout.write("\n")

        # Đảm bảo có Thumbnail HD 1080p (tự trích xuất từ video nếu ảnh từ URL < 720p hoặc thiếu)
        synced_b64_thumb = None
        if video.get('downloadThumbnail', True):
            synced_b64_thumb = _ensure_hd_thumbnail(filepath, video.get('thumbnailUrl'))

        update_callback(video_id, status='completed', progress=100, local_path=filepath, speed='', actual_size_bytes=downloaded, thumbnail_url=synced_b64_thumb)
        print(Fore.GREEN + f"[OK] Tai xong video ID {video_id} (Direct)")
        return True
    except Exception as e:
        print(Fore.RED + f"[X] Direct download failed for video ID {video_id}: {e}")
        if not video.get('videoUrl'):
            update_callback(video_id, status='failed', error=str(e))
        if os.path.exists(filepath):
            try: os.remove(filepath)
            except: pass
        return False
    finally:
        with _lock:
            if video_id in active_downloads:
                del active_downloads[video_id]

def download_video(video, update_callback, cookie_data: str = None):
    print(f"[DEBUG Worker] video object received: {video}")
    video_id = video.get('id')
    url = video.get('directMp4Url') or video.get('videoUrl')
    
    # Sửa lỗi hồi tố: Chuẩn hóa url Douyin đã lỡ lưu dạng modal_id vào DB
    if url and "douyin.com" in url and "modal_id=" in url:
        import urllib.parse
        parsed = urllib.parse.urlparse(url)
        qs = urllib.parse.parse_qs(parsed.query)
        if "modal_id" in qs:
            url = f"https://www.douyin.com/video/{qs['modal_id'][0]}"

    if url and ('douyinvod.com' in url or 'zjcdn.com' in url or '.mp4' in url.lower() or 'video_mp4' in url.lower() or 'play_addr' in url):
        success = download_direct_mp4(video, url, update_callback)
        if success:
            return True
        else:
            print(Fore.YELLOW + f"[*] Direct download failed, falling back to yt-dlp with videoUrl...")
            url = video.get('videoUrl')
            if not url:
                if video.get('videoUrl'): # It already checked above, but just in case
                    pass 
                else:
                    return False

    print(Fore.GREEN + f"[-] Dang tai video ID {video_id} - URL: {url}")

    downloads_dir = video.get('localFolder')
    if not downloads_dir:
        downloads_dir = os.path.abspath(os.path.join(os.getcwd(), "downloads"))
    os.makedirs(downloads_dir, exist_ok=True)

    output_template = os.path.join(downloads_dir, f"{video_id}_%(title)s.%(ext)s")

    cancel_event = threading.Event()
    with _lock:
        active_downloads[video_id] = {"cancel": cancel_event}

    last_progress = [0]      # mutable để dùng trong closure
    last_speed_report = [0]  # throttle gửi speed

    def progress_hook(d):
        # Kiểm tra cancel mỗi lần hook được gọi
        if cancel_event.is_set():
            raise CancelledError("Download cancelled by user")

        if d['status'] == 'downloading':
            total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
            downloaded = d.get('downloaded_bytes', 0)
            speed_bytes = d.get('speed') or 0
            speed_str = _format_speed(speed_bytes)
            
            # Lấy dung lượng ước tính tổng (video + audio) nếu có
            info = d.get('info_dict', {})
            expected_size = info.get('filesize_approx') or info.get('filesize') or d.get('total_bytes_estimate') or d.get('total_bytes')
            
            if total > 0:
                pct = int(downloaded / total * 100)
                
                # Sửa lỗi: Khi yt-dlp tải xong Video (100%) và chuyển sang tải Audio, pct sẽ tụt về 0.
                if pct < last_progress[0] - 10:
                    last_progress[0] = 0
                
                # Gửi update mỗi khi tăng 3% hoặc đạt 100%
                if pct >= last_progress[0] + 3 or pct >= 100:
                    update_callback(video_id, status='downloading', progress=pct, speed=speed_str, size_bytes=expected_size)
                    last_progress[0] = pct
                    last_speed_report[0] = speed_bytes
            elif speed_str and speed_bytes != last_speed_report[0]:
                # Không biết total, vẫn cập nhật speed
                update_callback(video_id, status='downloading', progress=last_progress[0], speed=speed_str, size_bytes=expected_size)
                last_speed_report[0] = speed_bytes

        elif d['status'] == 'finished':
            update_callback(video_id, status='downloading', progress=100, speed='')

    # Ghi cookie ra file tạm
    cookie_file = _write_cookie_file(cookie_data)

    ydl_opts = {
        'outtmpl': output_template,
        'quiet': True,
        'no_warnings': True,
        'progress_hooks': [progress_hook],
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', # Ưu tiên MP4 tự nhiên để tương thích tốt nhất, fallback về best
        'merge_output_format': 'mp4',         # Hợp nhất thành mp4, tránh rớt tiếng
        'js_runtimes': {'node': {}, 'deno': {}, 'bun': {}, 'quickjs': {}},
        'remote_components': ['ejs:github'],
        # Giữ nguyên 1 luồng đơn duy nhất cho mỗi video theo yêu cầu an toàn tuyệt đối
        'concurrent_fragment_downloads': 1,
        # Timeout và Retry mạng (hạ sleep_requests từ 1.5s xuống 0.3s để loại bỏ delay vô ích)
        'socket_timeout': 30,
        'sleep_requests': 0.3,
        'retries': 10,
        'fragment_retries': 10,
        'file_access_retries': 5,
    }

    # Chỉ để yt-dlp tải 1 file thumbnail duy nhất nếu chưa có bất kỳ file ảnh thumbnail nào trong thư mục
    if video.get('downloadThumbnail', True) and not _has_existing_thumbnail(downloads_dir, video_id):
        ydl_opts['writethumbnail'] = True

    # Bilibili cần Referer và User-Agent Chrome chuẩn để CDN không đóng kết nối (Remote end closed connection).
    if 'bilibili.com' in url:
        ydl_opts['http_headers'] = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.bilibili.com/',
        }
    elif 'douyin.com' in url or 'douyinvod.com' in url:
        if 'douyinvod.com' in url or url.endswith('.mp4'):
            print(Fore.CYAN + "[+] Phat hien link Direct MP4 cua Douyin. Bo qua trich xuat...")
            ydl_opts['http_headers'] = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
                'Referer': 'https://www.douyin.com',
            }
        else:
            print(Fore.YELLOW + "[!] Phat hien link Douyin goc. Chuyen giao thang cho yt-dlp...")
            # Truyền thẳng URL cho yt-dlp xử lý (Yêu cầu Cookie để tải được độ phân giải cao)
            ydl_opts['http_headers'] = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
                'Referer': 'https://www.douyin.com',
            }

    if cookie_file:
        ydl_opts['cookiefile'] = cookie_file
        print(Fore.CYAN + f"[+] Su dung Cookie tu file: {cookie_file}")

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # Tìm file video đã tải (chỉ lấy các định dạng video, bỏ qua ảnh thumbnail .jpg/.webp/.png)
        video_exts = ('.mp4', '.mkv', '.webm', '.flv', '.mov', '.avi', '.ts')
        local_path = None
        for f in os.listdir(downloads_dir):
            if f.startswith(f"{video_id}_") and f.lower().endswith(video_exts) and not f.endswith('.part') and not f.endswith('.ytdl'):
                local_path = os.path.join(downloads_dir, f)
                break

        # Đảm bảo có Thumbnail HD 1080p (tự trích xuất từ video nếu ảnh từ URL < 720p hoặc thiếu)
        synced_b64_thumb = None
        if local_path and video.get('downloadThumbnail', True):
            synced_b64_thumb = _ensure_hd_thumbnail(local_path, video.get('thumbnailUrl'))

        if local_path:
            actual_size = os.path.getsize(local_path) if os.path.exists(local_path) else None
            update_callback(video_id, status='completed', progress=100, local_path=local_path, speed='', actual_size_bytes=actual_size, thumbnail_url=synced_b64_thumb)
            print(Fore.GREEN + f"[OK] Tai xong video ID {video_id}")
        else:
            update_callback(video_id, status='failed', error='File not found after download')

    except CancelledError:
        print(Fore.YELLOW + f"[-] Da huy tai video ID {video_id}")

    except Exception as e:
        clean_err = _strip_ansi(str(e))
        error_msg = clean_err.lower()
        # WinError 32 = file bị khóa bởi OneDrive / Antivirus. Coi như lỗi mềm, retry
        is_file_locked = "winerror 32" in error_msg or "unable to rename" in error_msg or "being used by another process" in error_msg
        # Lỗi mạng / 403 Forbidden / 503 / Bilibili CDN drop: retry tự động 3 lần.
        soft_keywords = [
            "timed out", "handshake", "connection", "reset", "500", "502", "503", "504",
            "403", "forbidden", "unable to download", "416", "range", "giving up",
            "remote end closed", "socket", "eof", "network", "service unavailable",
            "did not get any data blocks", "data blocks"
        ]
        is_soft_error = is_file_locked or any(err in error_msg for err in soft_keywords)
        
        if is_soft_error:
            # Xóa các file .part/.ytdl nếu gặp lỗi 403/416/forbidden/data blocks để tải lại sạch từ đầu
            if any(err in error_msg for err in ["403", "416", "forbidden", "range", "data blocks"]):
                for f in os.listdir(downloads_dir):
                    if f.startswith(f"{video_id}_") and (f.endswith('.part') or f.endswith('.ytdl')):
                        try: os.remove(os.path.join(downloads_dir, f))
                        except: pass
                        
            with _lock:
                retry_counts[video_id] = retry_counts.get(video_id, 0) + 1
                current_retries = retry_counts[video_id]
            
            if current_retries <= 3:
                update_callback(video_id, status='pending', error=clean_err, progress=last_progress[0], speed='')
                reason = "File bi khoa (OneDrive/AV)" if is_file_locked else "Loi mang/CDN Bilibili"
                print(Fore.YELLOW + f"[!] {reason} video ID {video_id}. Tu dong thu lai {current_retries}/3...")
            else:
                update_callback(video_id, status='failed', error=f"Da thu lai 3 lan khong thanh cong: {clean_err}", progress=last_progress[0], speed='')
                print(Fore.RED + f"[X] Video ID {video_id} that bai sau 3 lan thu. Cho nguoi dung xu ly.")
                with _lock:
                    retry_counts[video_id] = 0
        else:
            update_callback(video_id, status='failed', error=f"Loi: {clean_err}")
            print(Fore.RED + f"[X] Loi video ID {video_id}: {clean_err}")

    finally:
        # Dọn dẹp TẤT CẢ các file rác .part và .ytdl của video này sau khi xong hoặc lỗi
        try:
            for f in os.listdir(downloads_dir):
                if f.startswith(f"{video_id}_") and (f.endswith('.part') or f.endswith('.ytdl')):
                    try: os.remove(os.path.join(downloads_dir, f))
                    except: pass
        except:
            pass
        
        with _lock:
            if video_id in active_downloads:
                del active_downloads[video_id]
        
        # Xoá file cookie tạm sau khi xong
        if cookie_file and os.path.exists(cookie_file):
            try:
                os.remove(cookie_file)
            except:
                pass

def cancel_download(video_id):
    with _lock:
        entry = active_downloads.get(video_id)
    if entry:
        entry["cancel"].set()
        print(Fore.YELLOW + f"[-] Gui tin hieu huy cho video ID {video_id}")
