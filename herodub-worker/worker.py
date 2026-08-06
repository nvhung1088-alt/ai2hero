import os
import sys
import time
import shutil
import platform
import requests
from config import SERVER_URL, TEMP_DIR, OUTPUT_DIR, get_session, save_session, clear_session, PYVIDEOTRANS_DIR
from downloader import download_video
from translator import run_pyvideotrans
from uploader import upload_file_to_presigned_url

# Biến lưu thông tin session chạy hiện tại
session = None

def get_headers():
    if not session or 'accessToken' not in session:
        return {}
    return {
        'Authorization': f"Bearer {session['accessToken']}"
    }

def pair_worker():
    """
    Hỏi user nhập mã code 6 số từ dashboard và kết nối.
    """
    global session
    print("=" * 60)
    print("                  HERODUB LOCAL WORKER - PHASE 1")
    print("=" * 60)
    
    if not PYVIDEOTRANS_DIR:
        print("[-] CẢNH BÁO: Không thể tự động tìm thấy thư mục cài đặt pyVideoTrans.")
        user_dir = input("[?] Vui lòng nhập đường dẫn thư mục pyVideoTrans (ví dụ D:/pyvideotrans): ").strip()
        if not os.path.exists(user_dir) or not os.path.exists(os.path.join(user_dir, "cli.py")):
            print("[-] Đường dẫn không hợp lệ hoặc thiếu file cli.py. Thoát chương trình.")
            sys.exit(1)
        # Ghi đè cấu hình tạm thời
        import config
        config.PYVIDEOTRANS_DIR = os.path.abspath(user_dir)
    else:
        print(f"[+] Tìm thấy pyVideoTrans tại: {PYVIDEOTRANS_DIR}")

    print("\n[!] Thiết bị của bạn chưa được kết nối với AI2Hero Workspace.")
    print("[!] Vui lòng truy cập trang Web Dashboard của HeroDub và nhấn 'Kết nối máy local' để lấy mã 6 chữ số.")
    
    code = ""
    while not code:
        code = input("[?] Nhập mã kết nối (6 số): ").strip()
    
    device_name = platform.node()
    plat = sys.platform
    
    print(f"[*] Đang gửi yêu cầu kết nối đến {SERVER_URL}...")
    try:
        url = f"{SERVER_URL.rstrip('/')}/api/hero-dub/workers"
        res = requests.post(url, json={
            'code': code,
            'deviceName': device_name,
            'platform': plat,
            'version': '1.0.0'
        })
        
        if res.status_code != 200:
            print(f"[-] Lỗi kết nối ({res.status_code}): {res.json().get('error', 'Không xác định')}")
            return False
            
        data = res.json()
        session = {
            'workerId': data['workerId'],
            'accessToken': data['accessToken'],
            'teamId': data['teamId'],
            'teamName': data['teamName'],
            'deviceName': device_name,
            'platform': plat
        }
        save_session(session)
        print(f"[+] KẾT NỐI THÀNH CÔNG!")
        print(f"[+] Workspace liên kết: {session['teamName']}")
        print(f"[+] Worker ID: {session['workerId']}")
        print("=" * 60)
        return True
    except Exception as e:
        print(f"[-] Lỗi hệ thống khi kết nối: {str(e)}")
        return False

def check_auth():
    global session
    session = get_session()
    if not session:
        return False
        
    print("[*] Đang kiểm tra kết nối với server...")
    try:
        # Gửi thử heartbeat để verify token
        url = f"{SERVER_URL.rstrip('/')}/api/hero-dub/tasks"
        res = requests.post(url, headers=get_headers())
        if res.status_code == 200:
            print(f"[+] Đã kết nối với Workspace: {session['teamName']} (Worker: {session['deviceName']})")
            return True
        else:
            print("[-] Token liên kết đã hết hạn hoặc không hợp lệ.")
            clear_session()
            return False
    except Exception as e:
        print(f"[!] Không thể kết nối tới máy chủ: {str(e)}. Tiếp tục chạy chế độ offline retry.")
        return True # Giữ session để tự động retry khi có mạng

def update_task_progress(task_id, status, progress, error=None, source_title=None):
    """
    Cập nhật tiến độ task lên server.
    """
    print(f"[*] Cập nhật Task #{task_id}: {status} ({progress}%)" + (f" - Lỗi: {error}" if error else ""))
    try:
        url = f"{SERVER_URL.rstrip('/')}/api/hero-dub/tasks"
        payload = {
            'taskId': task_id,
            'status': status,
            'progress': progress
        }
        if error:
            payload['error'] = error
        if source_title:
            payload['sourceTitle'] = source_title
            
        res = requests.patch(url, json=payload, headers=get_headers())
        if res.status_code != 200:
            print(f"[-] Lỗi cập nhật tiến trình: {res.text}")
    except Exception as e:
        print(f"[-] Lỗi kết nối khi cập nhật tiến trình: {str(e)}")

def get_presigned_url(task_id, file_type):
    """
    Yêu cầu server sinh Presigned URL để upload file.
    """
    try:
        url = f"{SERVER_URL.rstrip('/')}/api/hero-dub/presign"
        res = requests.post(url, json={
            'taskId': task_id,
            'fileType': file_type
        }, headers=get_headers())
        
        if res.status_code != 200:
            raise Exception(f"Server error: {res.json().get('error', 'Unknown')}")
            
        data = res.json()
        return data['uploadUrl'], data['publicUrl']
    except Exception as e:
        raise Exception(f"Lỗi lấy Presigned URL ({file_type}): {str(e)}")

def complete_task(task_id, result_video_url, result_srt_url):
    """
    Báo cáo hoàn thành tác vụ.
    """
    print(f"[+] Đang hoàn thành Task #{task_id}...")
    try:
        url = f"{SERVER_URL.rstrip('/')}/api/hero-dub/tasks"
        payload = {
            'taskId': task_id,
            'status': 'completed',
            'progress': 100,
            'resultVideoUrl': result_video_url,
            'resultSrtUrl': result_srt_url,
            'preview': {
                'duration': 0,
                'subtitleCount': 0
            },
            'actualCost': 0
        }
        res = requests.patch(url, json=payload, headers=get_headers())
        if res.status_code == 200:
            print(f"[+] Task #{task_id} đã hoàn thành thành công!")
        else:
            print(f"[-] Lỗi báo cáo hoàn thành: {res.text}")
    except Exception as e:
        print(f"[-] Lỗi kết nối khi hoàn thành task: {str(e)}")

def clean_temp_files():
    """
    Dọn dẹp thư mục tạm để tránh đầy ổ cứng
    """
    for folder in [TEMP_DIR, OUTPUT_DIR]:
        if os.path.exists(folder):
            try:
                shutil.rmtree(folder)
                os.makedirs(folder, exist_ok=True)
            except Exception as e:
                print(f"[!] Không thể dọn dẹp thư mục {folder}: {str(e)}")

def process_task(task):
    task_id = task['id']
    source_url = task['sourceUrl']
    print(f"\n[+] BẮT ĐẦU XỬ LÝ TASK #{task_id}")
    print(f"[+] Link video: {source_url}")
    
    clean_temp_files()
    
    try:
        # Bước 1: Download video
        update_task_progress(task_id, 'downloading', 10)
        video_path, source_title = download_video(source_url, TEMP_DIR)
        
        # Cập nhật tiêu đề video lên DB web
        update_task_progress(task_id, 'downloading', 20, source_title=source_title)
        
        # Bước 2: Dịch thuật bằng pyVideoTrans
        def on_translation_progress(status, progress_percent):
            update_task_progress(task_id, status, progress_percent)
            
        result_video, result_srt = run_pyvideotrans(
            PYVIDEOTRANS_DIR, 
            video_path, 
            task, 
            on_translation_progress
        )
        
        # Bước 3 & 4: Lưu file kết quả ra Local Desktop (KHÔNG UPLOAD)
        update_task_progress(task_id, 'uploading', 85) # Vẫn giữ event để báo đang lưu file
        
        EXPORT_DIR = os.path.join(os.path.expanduser("~"), "Desktop", "Ai2Hero-Exports")
        os.makedirs(EXPORT_DIR, exist_ok=True)
        
        # Tạo tên file mới
        final_video_name = f"HeroDub_Task{task_id}.mp4"
        final_srt_name = f"HeroDub_Task{task_id}.srt"
        
        video_public_url = os.path.join(EXPORT_DIR, final_video_name)
        srt_public_url = os.path.join(EXPORT_DIR, final_srt_name)
        
        # Copy file từ thư mục tạm ra thư mục xuất
        shutil.copy2(result_video, video_public_url)
        if result_srt and os.path.exists(result_srt):
            shutil.copy2(result_srt, srt_public_url)
        else:
            srt_public_url = ""
            
        print(f"[+] Đã lưu video kết quả tại: {video_public_url}")
        
        # Bước 5: Báo hoàn thành
        complete_task(task_id, video_public_url, srt_public_url)
        
    except Exception as e:
        print(f"[-] Lỗi xử lý Task #{task_id}: {str(e)}")
        update_task_progress(task_id, 'failed', 0, error=str(e))
    finally:
        clean_temp_files()

def main():
    global session
    os.makedirs(TEMP_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Kiểm tra xác thực
    if not check_auth():
        paired = False
        while not paired:
            paired = pair_worker()
            if not paired:
                print("[-] Thử lại kết nối sau 3 giây...")
                time.sleep(3)

    # Vòng lặp chính của worker
    print("\n[+] HeroDub Worker đang hoạt động. Đang lắng nghe tác vụ...")
    
    last_heartbeat = 0
    
    while True:
        try:
            now = time.time()
            # 1. Gửi Heartbeat mỗi 30 giây
            if now - last_heartbeat >= 30:
                url = f"{SERVER_URL.rstrip('/')}/api/hero-dub/tasks"
                requests.post(url, headers=get_headers())
                last_heartbeat = now
                
            # 2. Poll tác vụ mới
            url = f"{SERVER_URL.rstrip('/')}/api/hero-dub/tasks"
            res = requests.get(url, headers=get_headers())
            
            poll_interval = 15.0
            if res.status_code == 200:
                data = res.json()
                if isinstance(data, dict) and data.get("pollIntervalMs"):
                    poll_interval = max(10.0, float(data.get("pollIntervalMs")) / 1000.0)
                task = data.get('task')
                if task:
                    process_task(task)
                    # Sau khi xử lý xong thì tiếp tục vòng lặp ngay lập tức để check task tiếp theo
                    continue
            else:
                print(f"[-] Lỗi poll task ({res.status_code}): {res.text}")
                
        except Exception as e:
            print(f"[-] Lỗi trong vòng lặp chính của Worker: {str(e)}")
            poll_interval = 30.0
            
        time.sleep(poll_interval)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[+] Đang tắt HeroDub Worker. Tạm biệt!")
        sys.exit(0)
