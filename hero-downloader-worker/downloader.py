import os
import re
import tempfile
import threading
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

def _download_thumbnail(thumbnail_url: str, base_filepath: str):
    """Tải ảnh thumbnail chất lượng cao nhất về cùng thư mục với video (chỉ tải khi chưa có)."""
    if not thumbnail_url:
        return
    try:
        dir_name = os.path.dirname(base_filepath)
        file_name = os.path.basename(base_filepath)
        video_id = file_name.split('_')[0] if '_' in file_name else ''
        if video_id and _has_existing_thumbnail(dir_name, video_id):
            return

        if thumbnail_url.startswith("//"):
            thumbnail_url = "https:" + thumbnail_url

        # Bilibili: loại bỏ @... suffix để tải ảnh master full HD/4K gốc
        if "hdslb.com" in thumbnail_url:
            thumbnail_url = re.sub(r'@[^/]+$', '', thumbnail_url)

        # YouTube: nâng cấp lên maxresdefault (1080p)
        if "i.ytimg.com" in thumbnail_url or "youtube.com" in thumbnail_url:
            thumbnail_url = re.sub(r'/(hqdefault|mqdefault|sddefault)\.jpg', '/maxresdefault.jpg', thumbnail_url)

        # Douyin: loại bỏ tham số bóp ảnh
        if "douyinpic.com" in thumbnail_url or "byteimg.com" in thumbnail_url:
            thumbnail_url = re.sub(r'(\?|&)image_process=[^&]+', '', thumbnail_url)

        ext = thumbnail_url.split('?')[0].split('.')[-1]
        if ext.lower() not in ['jpg', 'jpeg', 'png', 'webp']:
            ext = 'jpg'
        thumb_path = os.path.splitext(base_filepath)[0] + f".{ext}"
        
        # Nếu file đã tồn tại thì bỏ qua
        if os.path.exists(thumb_path):
            return
            
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
        res = requests.get(thumbnail_url, headers=headers, stream=True, timeout=15)
        res.raise_for_status()
        with open(thumb_path, 'wb') as f:
            for chunk in res.iter_content(chunk_size=8192):
                f.write(chunk)
        print(Fore.CYAN + f"[*] Da tai xong thumbnail HD: {os.path.basename(thumb_path)}")
    except Exception as e:
        print(Fore.YELLOW + f"[!] Khong the tai thumbnail: {e}")

def _extract_frame_from_video(video_filepath: str, output_thumb_path: str) -> bool:
    """Trích xuất 1 khung hình Master HD 1080p từ video bằng ffmpeg."""
    try:
        import shutil, subprocess
        if not shutil.which('ffmpeg') or not os.path.exists(video_filepath):
            return False
        cmd = ['ffmpeg', '-y', '-ss', '00:00:01', '-i', video_filepath, '-frames:v', '1', '-q:v', '2', output_thumb_path]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return res.returncode == 0 and os.path.exists(output_thumb_path) and os.path.getsize(output_thumb_path) > 1000
    except Exception:
        return False

def _ensure_hd_thumbnail(video_filepath: str, thumbnail_url: str = None):
    """Đảm bảo file ảnh thumbnail đạt chuẩn (ưu tiên ảnh Poster gốc của tác giả, fallback trích xuất video nếu không có ảnh)."""
    if not video_filepath or not os.path.exists(video_filepath):
        return

    dir_name = os.path.dirname(video_filepath)
    file_name = os.path.basename(video_filepath)
    video_id = file_name.split('_')[0] if '_' in file_name else ''
    default_thumb_path = os.path.splitext(video_filepath)[0] + ".jpg"

    # 1. Tải ảnh Poster từ URL nếu có
    if thumbnail_url and not _has_existing_thumbnail(dir_name, video_id):
        _download_thumbnail(thumbnail_url, video_filepath)

    # 2. Fallback: Nếu không có ảnh bìa hoặc tải ảnh thất bại, mới trích xuất 1 frame từ video
    if not _has_existing_thumbnail(dir_name, video_id):
        ok = _extract_frame_from_video(video_filepath, default_thumb_path)
        if ok:
            print(Fore.GREEN + f"[*] Da trich xuat anh thumbnail tu video cho ID {video_id}")

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
        if video.get('downloadThumbnail', True):
            _ensure_hd_thumbnail(filepath, video.get('thumbnailUrl'))

        update_callback(video_id, status='completed', progress=100, local_path=filepath, speed='', actual_size_bytes=downloaded)
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
        if local_path and video.get('downloadThumbnail', True):
            _ensure_hd_thumbnail(local_path, video.get('thumbnailUrl'))

        if local_path:
            actual_size = os.path.getsize(local_path) if os.path.exists(local_path) else None
            update_callback(video_id, status='completed', progress=100, local_path=local_path, speed='', actual_size_bytes=actual_size)
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
