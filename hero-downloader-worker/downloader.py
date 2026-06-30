import os
import tempfile
import threading
import yt_dlp
from colorama import Fore

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

def download_video(video, update_callback, cookie_data: str = None):
    video_id = video.get('id')
    url = video.get('videoUrl')
    
    # Sửa lỗi hồi tố: Chuẩn hóa url Douyin đã lỡ lưu dạng modal_id vào DB
    if url and "douyin.com" in url and "modal_id=" in url:
        import urllib.parse
        parsed = urllib.parse.urlparse(url)
        qs = urllib.parse.parse_qs(parsed.query)
        if "modal_id" in qs:
            url = f"https://www.douyin.com/video/{qs['modal_id'][0]}"

    print(Fore.GREEN + f"[-] Dang tai video ID {video_id} - URL: {url}")

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
        # Bật giải mã JS của YouTube để lấy được link video thay vì bị kẹt ở image
        'js_runtimes': {'node': {}, 'deno': {}, 'bun': {}, 'quickjs': {}},
        'remote_components': ['ejs:github'],
        # Giảm số luồng tải xuống còn 3 để tránh bị Bilibili bóp băng thông làm hỏng chunk (nguyên nhân gây lag video)
        'concurrent_fragment_downloads': 3,
        # Timeout và Retry mạng
        'socket_timeout': 30,
        'sleep_requests': 1.5,
        'retries': 10,
        'fragment_retries': 10,
        'file_access_retries': 5,
    }

    # Bilibili cần Referer để không bị 403, nhưng Douyin check User-Agent rất gắt.
    if 'bilibili.com' in url:
        ydl_opts['http_headers'] = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Referer': 'https://www.bilibili.com',
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

        # Tìm file đã tải
        local_path = None
        for f in os.listdir(downloads_dir):
            if f.startswith(f"{video_id}_") and not f.endswith('.part') and not f.endswith('.ytdl'):
                local_path = os.path.join(downloads_dir, f)
                break

        if local_path:
            actual_size = os.path.getsize(local_path) if os.path.exists(local_path) else None
            update_callback(video_id, status='completed', progress=100, local_path=local_path, speed='', actual_size_bytes=actual_size)
            print(Fore.GREEN + f"[OK] Tai xong video ID {video_id}")
        else:
            update_callback(video_id, status='failed', error='File not found after download')

    except CancelledError:
        print(Fore.YELLOW + f"[-] Da huy tai video ID {video_id}")

    except Exception as e:
        error_msg = str(e).lower()
        # WinError 32 = file bị khóa bởi OneDrive / Antivirus. Coi như lỗi mềm, retry
        is_file_locked = "winerror 32" in error_msg or "unable to rename" in error_msg or "being used by another process" in error_msg
        # Lỗi mạng: retry tự động. Lỗi nặng: failed luôn.
        is_soft_error = is_file_locked or any(err in error_msg for err in ["timed out", "handshake", "connection reset", "503", "unable to download webpage", "416", "range"])
        
        if is_soft_error:
            # Xóa các file .part nếu gặp lỗi 416 để tải lại từ đầu
            if "416" in error_msg or "range" in error_msg:
                for f in os.listdir(downloads_dir):
                    if f.startswith(f"{video_id}_") and (f.endswith('.part') or f.endswith('.ytdl')):
                        try: os.remove(os.path.join(downloads_dir, f))
                        except: pass
                        
            with _lock:
                retry_counts[video_id] = retry_counts.get(video_id, 0) + 1
                current_retries = retry_counts[video_id]
            
            if current_retries <= 3:
                update_callback(video_id, status='pending', error=str(e), progress=last_progress[0], speed='')
                reason = "File bi khoa (OneDrive/AV)" if is_file_locked else "Loi mang"
                print(Fore.YELLOW + f"[!] {reason} video ID {video_id}. Tu dong thu lai {current_retries}/3...")
            else:
                update_callback(video_id, status='failed', error=f"Da thu lai 3 lan khong thanh cong: {str(e)}", progress=last_progress[0], speed='')
                print(Fore.RED + f"[X] Video ID {video_id} that bai sau 3 lan thu. Cho nguoi dung xu ly.")
                with _lock:
                    retry_counts[video_id] = 0
        else:
            update_callback(video_id, status='failed', error=f"Loi: {e}")
            print(Fore.RED + f"[X] Loi video ID {video_id}: {e}")

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
