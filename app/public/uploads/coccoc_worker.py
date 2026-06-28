import os
import sys
import time
import requests
import json
import yt_dlp

BASE_URL = "http://localhost:3000"
CONFIG_FILE = "worker_config.json"

print("==============================================")
print("   HERO COCCOC LOCAL WORKER (REAL YT-DLP)")
print("   Version: 2.5 (Python-based)")
print("==============================================")

access_token = None
worker_id = None
team_id = None

# Đọc cấu hình
auto_kill_browser = False
if os.path.exists(CONFIG_FILE):
    try:
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            config = json.load(f)
            access_token = config.get("accessToken")
            worker_id = config.get("workerId")
            team_id = config.get("teamId")
            auto_kill_browser = config.get("autoKillBrowser")
            print(f"[INFO] Phat hien cau hinh cu: Worker #{worker_id} (Team #{team_id})")
    except Exception:
        pass

if auto_kill_browser is None:
    print("\n[?] Tinh nang nang cao: Neu trinh duyet (Edge/Chrome) bi khoa khong the lay Cookie, Worker co the TU DONG EP DONG trinh duyet do.")
    ans = input("    Ban co cho phep Worker Tu dong ep dong trinh duyet khong? (y/n): ")
    auto_kill_browser = True if ans.strip().lower() == 'y' else False
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                c = json.load(f)
            c["autoKillBrowser"] = auto_kill_browser
            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(c, f, indent=2)
        except Exception:
            pass

if not access_token:
    try:
        pairing_code = input("Nhap ma lien ket 6 chu so hien thi tren Dashboard: ").strip()
        if not pairing_code:
            sys.exit(1)
        print(f"[INFO] Dang gui yeu cau ghep noi den {BASE_URL} voi ma: {pairing_code}...")
        res = requests.post(f"{BASE_URL}/api/hero-coccoc/workers", json={
            "code": pairing_code,
            "deviceName": "Local Cốc Cốc Real Worker",
            "platform": "windows",
            "version": "2.0.0"
        })
        if res.status_code != 200:
            print(f"[ERROR] Ghep noi that bai: {res.json().get('error', 'Loi!')}")
            sys.exit(1)
        data = res.json()
        access_token = data.get("accessToken")
        worker_id = data.get("workerId")
        team_id = data.get("teamId")
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump({"accessToken": access_token, "workerId": worker_id, "teamId": team_id}, f, indent=2)
        print(f"[OK] Ghep noi thanh cong! Worker ID: {worker_id}")
    except Exception as e:
        print(f"[ERROR] Loi ket noi: {e}")
        sys.exit(1)

headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

print("\n==============================================")
print("[OK] Worker dang bat dau lang nghe hang doi (3s/lan)...")
print("==============================================")

def update_task_status(task_id, status, logs_list, metadata=None):
    payload = {"taskId": task_id, "status": status, "logs": logs_list}
    if metadata:
        payload.update(metadata)
    try:
        requests.patch(f"{BASE_URL}/api/hero-coccoc/tasks", headers=headers, json=payload)
    except:
        pass

def process_download_task(task):
    task_id = task.get("id")
    video_url = task.get("videoUrl")
    
    target_folder = "C:\\Users\\ADMIN\\Downloads\\CocCoc-Downloads"
    if task.get("project") and isinstance(task.get("project"), dict):
        folder_conf = task["project"].get("downloadFolder")
        if folder_conf:
            target_folder = folder_conf
            
    os.makedirs(target_folder, exist_ok=True)
    
    print(f"\n[+] TAI TAC VU #{task_id}: {video_url}")
    update_task_status(
        task_id, "downloading", 
        [{"time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "action": "Khởi chạy", "message": f"Bắt đầu cào dữ liệu từ {video_url} bằng yt-dlp."}]
    )
    
    downloaded_file = ""
    file_size = 0
    duration = 0
    
    def my_hook(d):
        nonlocal downloaded_file, file_size
        if d['status'] == 'finished':
            downloaded_file = d.get('filename')
            file_size = d.get('total_bytes', 0)
            if not file_size and d.get('total_bytes_estimate'):
                file_size = d.get('total_bytes_estimate')
            print(f"[OK] Tai hoan tat: {downloaded_file}")
            
    cookie_file_path = os.path.join(target_folder, "cookies.txt")
    base_ydl_opts = {
        'outtmpl': os.path.join(target_folder, f'%(title)s [%(id)s].%(ext)s'),
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'progress_hooks': [my_hook],
        'quiet': False,
        'no_warnings': True,
    }
    
    try:
        def do_download(opts):
            with yt_dlp.YoutubeDL(opts) as ydl:
                print(f"      -> Dang boc tach thong tin luong stream...")
                info_dict = ydl.extract_info(video_url, download=True)
                return info_dict
                
        # Thu tu uu tien: 1. File cookies.txt -> 2. Configured Browser -> 3. Edge -> 4. Chrome -> 5. No Cookie
        opts_to_try = []
        if os.path.exists(cookie_file_path):
            opts_to_try.append({**base_ydl_opts, 'cookiefile': cookie_file_path})
            
        profile_config = task.get("project", {}).get("profileConfig") if task.get("project") and isinstance(task.get("project"), dict) else None
        if profile_config:
            b_type = profile_config.get("userDataPath", "")
            b_profile = profile_config.get("profileDir", "Default")
            if b_type:
                opts_to_try.append({**base_ydl_opts, 'cookiesfrombrowser': (b_type, b_profile)})
                
        opts_to_try.append({**base_ydl_opts, 'cookiesfrombrowser': ('edge',)})
        opts_to_try.append({**base_ydl_opts, 'cookiesfrombrowser': ('chrome',)})
        opts_to_try.append(base_ydl_opts)
        
        info_dict = None
        last_error = None
        
        for idx, opts in enumerate(opts_to_try):
            try:
                if 'cookiefile' in opts:
                    print("      [+] Dang su dung file cookies.txt...")
                elif 'cookiesfrombrowser' in opts:
                    browser = opts['cookiesfrombrowser'][0]
                    prof_dir = opts['cookiesfrombrowser'][1] if len(opts['cookiesfrombrowser']) > 1 else None
                    if prof_dir:
                        print(f"      [+] Dang muon cookie tu {browser} (Profile: {prof_dir})...")
                    else:
                        print(f"      [+] Dang muon cookie tu {browser}...")
                else:
                    print("      [+] Dang thu tai khong dung cookie...")
                    
                info_dict = do_download(opts)
                break # Thanh cong
            except Exception as e:
                last_error = e
                err_msg = str(e).lower()
                if "cookie" in err_msg or "locked" in err_msg or "412" in err_msg or "precondition" in err_msg or "permission" in err_msg:
                    if 'cookiesfrombrowser' in opts and auto_kill_browser:
                        browser = opts['cookiesfrombrowser'][0]
                        print(f"      [!] Phat hien khoa DB! Dang ep dong trinh duyet {browser}...")
                        if browser == "edge": os.system("taskkill /f /im msedge.exe >nul 2>&1")
                        elif browser == "chrome": os.system("taskkill /f /im chrome.exe >nul 2>&1")
                        elif browser == "brave": os.system("taskkill /f /im brave.exe >nul 2>&1")
                        elif browser == "firefox": os.system("taskkill /f /im firefox.exe >nul 2>&1")
                        time.sleep(2)
                        try:
                            info_dict = do_download(opts)
                            break
                        except Exception as e2:
                            last_error = e2
                    continue # Thu cach tiep theo
                else:
                    raise e # Loi khac (vi du 404), throw luon
        
        if not info_dict:
            raise last_error

        duration = info_dict.get('duration', 0)
        title = info_dict.get('title', 'Video')
        
        if file_size == 0 and os.path.exists(downloaded_file):
            file_size = os.path.getsize(downloaded_file)
            
        update_task_status(
            task_id, "completed", 
            [{"time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "action": "Hoàn tất", "message": f"Đã tải xong: {title}"}],
            {"downloadedPath": downloaded_file, "fileSize": file_size, "duration": duration, "quality": "1080p/Auto"}
        )
        print(f"[OK] Task #{task_id} ket thuc. Size: {file_size/(1024*1024):.2f}MB, Duration: {duration}s")
            
    except Exception as e:
        print(f"[ERROR] Task #{task_id} that bai: {str(e)}")
        update_task_status(
            task_id, "failed", 
            [{"time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "action": "Lỗi", "message": str(e)}]
        )

def process_scan_projects():
    try:
        res = requests.get(f"{BASE_URL}/api/hero-coccoc/scan-configs", headers=headers)
        if res.status_code == 200:
            data = res.json()
            projects = data.get("projects", [])
            for proj in projects:
                print(f"\n[SCAN] Dang quet du an: {proj.get('name')} (Max {proj.get('maxVideosPerRun')} videos)")
                video_urls = []
                sources = proj.get("sources", [])
                max_videos = proj.get("maxVideosPerRun", 10)
                
                for src in sources:
                    source_val = src.get("sourceValue", "")
                    source_type = src.get("sourceType", "")
                    
                    if source_type == "direct_link":
                        video_urls.append(source_val)
                    else:
                        print(f"  -> Quet nguon: {source_val}")
                        query = source_val
                        if source_type == "search_keyword" and " || " in source_val:
                            parts = source_val.split(" || ")
                            channel_url = parts[0].strip()
                            keyword = parts[1].strip()
                            query = f"ytsearch{max_videos}:{channel_url} {keyword}"

                        try:
                            cookie_file_path = "C:\\Users\\ADMIN\\Downloads\\CocCoc-Downloads\\cookies.txt"
                            if proj.get("downloadFolder"):
                                cookie_file_path = os.path.join(proj.get("downloadFolder"), "cookies.txt")
                                
                            base_scan_opts = {
                                'extract_flat': True,
                                'quiet': True,
                                'playlistend': max_videos,
                            }
                            
                            opts_to_try = []
                            if os.path.exists(cookie_file_path):
                                opts_to_try.append({**base_scan_opts, 'cookiefile': cookie_file_path})
                                
                            profile_config = proj.get("profileConfig")
                            if profile_config:
                                b_type = profile_config.get("userDataPath", "")
                                b_profile = profile_config.get("profileDir", "Default")
                                if b_type:
                                    opts_to_try.append({**base_scan_opts, 'cookiesfrombrowser': (b_type, b_profile)})
                                    
                            opts_to_try.append({**base_scan_opts, 'cookiesfrombrowser': ('edge',)})
                            opts_to_try.append({**base_scan_opts, 'cookiesfrombrowser': ('chrome',)})
                            opts_to_try.append(base_scan_opts)

                            def do_extract(opts):
                                with yt_dlp.YoutubeDL(opts) as ydl:
                                    return ydl.extract_info(query, download=False)
                            
                            info = None
                            for idx, opts in enumerate(opts_to_try):
                                try:
                                    info = do_extract(opts)
                                    break
                                except Exception as e:
                                    err_msg = str(e).lower()
                                    if "cookie" in err_msg or "locked" in err_msg or "412" in err_msg or "precondition" in err_msg or "permission" in err_msg:
                                        if 'cookiesfrombrowser' in opts and auto_kill_browser:
                                            browser = opts['cookiesfrombrowser'][0]
                                            print(f"      [!] Phat hien khoa DB! Dang ep dong trinh duyet {browser} de quet...")
                                            if browser == "edge": os.system("taskkill /f /im msedge.exe >nul 2>&1")
                                            elif browser == "chrome": os.system("taskkill /f /im chrome.exe >nul 2>&1")
                                            elif browser == "brave": os.system("taskkill /f /im brave.exe >nul 2>&1")
                                            elif browser == "firefox": os.system("taskkill /f /im firefox.exe >nul 2>&1")
                                            time.sleep(2)
                                            try:
                                                info = do_extract(opts)
                                                break
                                            except:
                                                pass
                                        continue
                                    else:
                                        raise e
                                        
                            if info and 'entries' in info:
                                for entry in info['entries']:
                                    if entry and entry.get('url'):
                                        video_urls.append(entry.get('url'))
                                    elif entry and entry.get('webpage_url'):
                                        video_urls.append(entry.get('webpage_url'))
                            elif info and info.get('webpage_url'):
                                video_urls.append(info.get('webpage_url'))
                        except Exception as e:
                            print(f"  [ERROR] Loi khi quet nguon: {e}")
                
                # Xoa trung lap va limit
                unique_urls = list(dict.fromkeys(video_urls))[:max_videos]
                
                print(f"  -> Tim thay {len(unique_urls)} video. Gui len Server...")
                # Luon gui POST ke ca 0 video de update lastScanAt cho server
                post_res = requests.post(f"{BASE_URL}/api/hero-coccoc/tasks/create-from-worker", headers=headers, json={
                    "projectId": proj.get("id"),
                    "videoUrls": unique_urls
                })
                if post_res.status_code == 200:
                    print(f"  [OK] Dong bo task thanh cong.")
                else:
                    print(f"  [ERROR] Khong the dong bo task: {post_res.text}")
    except Exception as e:
        print(f"[ERROR] Loi trong qua trinh quet du an: {e}")

while True:
    try:
        # Bươc 1: Quét dự án mới (nếu có lịch)
        process_scan_projects()
        
        # Bươc 2: Polling task để tải
        res = requests.get(f"{BASE_URL}/api/hero-coccoc/tasks", headers=headers)
        if res.status_code == 401:
            print("[ERROR] Token het han.")
            if os.path.exists(CONFIG_FILE): os.remove(CONFIG_FILE)
            sys.exit(1)
            
        if res.status_code == 200:
            data = res.json()
            task = data.get("task")
            if task:
                process_download_task(task)
                
        time.sleep(3)
    except KeyboardInterrupt:
        print("\n[INFO] Dung worker.")
        break
    except Exception as e:
        print(f"[WARNING] Mat ket noi server, thu lai sau 5s...")
        time.sleep(5)
