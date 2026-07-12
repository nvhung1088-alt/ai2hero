import os
import sys
import io
import time
import requests
import threading
from colorama import init, Fore, Style

# Đảm bảo in ra UTF-8 trên console Windows
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import config
from scanner import scan_project_videos
from downloader import download_video, cancel_download, active_downloads

active_scans = set()


init(autoreset=True)

API_BASE_URL = "http://localhost:3000/api/hero-downloader/worker"

def print_banner():
    print(Fore.CYAN + Style.BRIGHT + "="*60)
    print(Fore.CYAN + Style.BRIGHT + "   HERO DOWNLOADER LOCAL WORKER")
    print(Fore.CYAN + Style.BRIGHT + "="*60)

def pair_device():
    print_banner()
    cfg = config.load_config()
    if cfg.get("accessToken"):
        print(Fore.GREEN + f"[\u2713] Đã tìm thấy Token truy cập cho Team: {cfg.get('teamName')}")
        return cfg.get("accessToken")
        
    print(Fore.YELLOW + "Chưa có thông tin kết nối. Vui lòng kết nối thiết bị.")
    while True:
        code = input(Fore.WHITE + "Nhập MÃ LIÊN KẾT (từ Dashboard Web UI): ").strip()
        if not code:
            continue
            
        print(Fore.CYAN + f"\nĐang kết nối với Server ({API_BASE_URL})...")
        payload = {"code": code}
        
        try:
            res = requests.post(f"{API_BASE_URL}/pair", json=payload)
            data = res.json()
            
            if res.status_code == 200 and data.get("success"):
                token = data.get("accessToken")
                team_name = data.get("teamName")
                config.save_config({
                    "accessToken": token,
                    "teamName": team_name
                })
                print(Fore.GREEN + Style.BRIGHT + f"[\u2713] Ghép nối thành công với Workspace: {team_name}")
                return token
            else:
                print(Fore.RED + f"[\u2717] Lỗi: {data.get('error')}")
        except Exception as e:
            print(Fore.RED + f"[\u2717] Lỗi kết nối mạng: {str(e)}")

def api_patch_update(token, action, payload):
    headers = {"Authorization": f"Bearer {token}"}
    payload["action"] = action
    try:
        requests.patch(f"{API_BASE_URL}/update", json=payload, headers=headers)
    except:
        pass

def update_video_callback(token, video_id, status=None, progress=None, local_path=None, error=None, speed=None, size_bytes=None, actual_size_bytes=None):
    payload = {"videoId": video_id}
    if status is not None: payload["status"] = status
    if progress is not None: payload["progress"] = progress
    if local_path is not None: payload["localPath"] = local_path
    if size_bytes is not None: payload["sizeBytes"] = size_bytes
    if actual_size_bytes is not None: payload["actualSizeBytes"] = actual_size_bytes
    if error is not None: payload["error"] = error
    if speed is not None: payload["speed"] = speed
    api_patch_update(token, "update_video", payload)

def run_worker_loop(token):
    headers = {"Authorization": f"Bearer {token}"}
    print(Fore.GREEN + "\n[-] Đang chạy vòng lặp Polling công việc (Ấn Ctrl+C để thoát)...")
    
    poll_interval = 5
    _last_heartbeat = [0]  # Lưu thời gian in heartbeat gần nhất
    
    while True:
        has_new_tasks = False
        has_force = False
        try:
            active_ids_str = ",".join(map(str, active_downloads.keys()))
            url = f"{API_BASE_URL}/tasks?teamId={config.load_config().get('teamId')}&active={active_ids_str}"
            
            # In heartbeat mỗi 60 giây để biết Worker còn sống (không spam mỗi poll)
            import time as _time
            now = _time.time()
            if now - _last_heartbeat[0] >= 60:
                active_count = len(active_downloads)
                if active_count > 0:
                    ids = list(active_downloads.keys())
                    print(Fore.CYAN + f"[Worker] Dang tai {active_count} video: {ids}")
                else:
                    print(Fore.CYAN + "[Worker] Cho viec... (0 download)")
                _last_heartbeat[0] = now
            
            res = requests.get(url, headers={"Authorization": f"Bearer {token}"})
            
            if res.status_code == 200:
                data = res.json()
                if data.get("success"):
                    scan_tasks = data.get("scanTasks", [])
                    download_tasks = data.get("downloadTasks", [])
                    cookie_data = data.get("cookieData")
                    
                    if scan_tasks or download_tasks:
                        has_new_tasks = True

                    # Kiểm tra có force_pending không để điều chỉnh poll_interval
                    has_force = any(v.get("status") == "force_pending" for v in download_tasks)
                        
                    # 1. Xử lý Quét
                    for proj in scan_tasks:
                        proj_id = proj["id"]
                        if proj_id in active_scans:
                            continue
                            
                        active_scans.add(proj_id)
                        
                        def scan_thread_target(p=proj, cd=cookie_data):
                            try:
                                videos = scan_project_videos(p, cd)
                                # Gửi kết quả về
                                api_patch_update(token, "scan_complete", {
                                    "projectId": p["id"],
                                    "videos": videos
                                })
                            finally:
                                active_scans.discard(p["id"])
                                
                        t = threading.Thread(target=scan_thread_target)
                        t.daemon = True
                        t.start()
                    
                    # 2. Xử lý Tải (đặt đúng trong block success)
                    max_concurrent = data.get("maxConcurrentDownloads", 3)
                    for video in download_tasks:
                        vid = video["id"]
                        
                        if video["status"] in ["pending", "force_pending"]:
                            if vid not in active_downloads:
                                is_forced = video["status"] == "force_pending"
                                if not is_forced and len(active_downloads) >= max_concurrent:
                                    continue # Đã đạt giới hạn tải cùng lúc, bỏ qua chờ vòng lặp sau
                                
                                print(Fore.GREEN + f"[*] Bắt đầu tải video ID {vid}...")
                                # Cập nhật trạng thái thành downloading ngay lập tức
                                update_video_callback(token, vid, status="downloading", progress=0)
                                
                                # Khởi chạy luồng tải
                                def thread_target(v=video, cd=cookie_data):
                                    download_video(v, lambda v_id, status=None, progress=None, local_path=None, error=None, speed=None, size_bytes=None, actual_size_bytes=None: update_video_callback(token, v_id, status, progress, local_path, error, speed, size_bytes, actual_size_bytes), cookie_data=cd)
                                    
                                t = threading.Thread(target=thread_target)
                                t.daemon = True
                                t.start()
                        elif video["status"] == "paused":
                            if vid in active_downloads:
                                cancel_download(vid)
                            
            elif res.status_code == 401:
                print(Fore.RED + "[!] Token hết hạn hoặc không hợp lệ. Vui lòng xoá config.json và chạy lại.")
                break
            else:
                print(f"[DEBUG] API returned {res.status_code}: {res.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"[DEBUG] Network error: {e}")
            pass # Lỗi mạng, sẽ thử lại ở vòng sau
        except Exception as e:
            print(f"[ERROR] Worker loop exception: {e}")
            import traceback
            traceback.print_exc()
            time.sleep(5)
            
        # Adaptive Polling:
        # - Có force_pending: poll ngay sau 5s (user vừa bấm "Tải ngay")
        # - Đang tải: poll 15s/lần (đủ để thấy tiến độ %)
        # - Nhàn rỗi: poll 30s/lần
        active_total = len(active_downloads) + len(active_scans)
        if has_force:
            poll_interval = 5
        elif active_total > 0 or has_new_tasks:
            poll_interval = 15
        else:
            poll_interval = 30
            
        time.sleep(poll_interval)

if __name__ == '__main__':
    from local_api import start_server
    api_thread = threading.Thread(target=start_server, daemon=True)
    api_thread.start()
    
    token = pair_device()
    if token:
        run_worker_loop(token)
