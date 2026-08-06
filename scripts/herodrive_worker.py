import os
import sys
import time
import argparse
import requests
import json
import shutil
import concurrent.futures
from datetime import datetime
from pathlib import Path

# Fix encoding cho Windows console
if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')

WORKER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 AI2HeroWorker/1.0",
    "Accept": "application/json"
}

def parse_args():
    parser = argparse.ArgumentParser(description="HeroDrive Python Local Worker")
    parser.add_argument("--project", type=int, help="ID của Dự án Quét (Tùy chọn)")
    parser.add_argument("--config", type=int, help="ID của Cấu hình quét (Tùy chọn)")
    parser.add_argument("--server", type=str, default="https://www.ai2hero.com", help="URL máy chủ AI2Hero")
    parser.add_argument("--interval", type=int, default=60, help="Thời gian giãn cách kiểm tra polling (giây)")
    parser.add_argument("--workers", type=int, default=2, help="Số luồng upload song song (Mặc định 2 luồng để tối ưu băng thông)")
    return parser.parse_args()

def format_seconds_human(seconds):
    if not seconds or seconds <= 0:
        return "vài giây"
    if seconds < 60:
        return f"{seconds} giây"
    elif seconds < 3600:
        mins = seconds // 60
        secs = seconds % 60
        return f"{mins} phút {secs}s"
    else:
        hours = seconds // 3600
        mins = (seconds % 3600) // 60
        return f"{hours} giờ {mins} phút"

TEMP_FILE_EXTENSIONS = {
    '.part', '.crdownload', '.tmp', '.download', '.aria2', 
    '.ytdl', '.bak', '.~tmp', '.~lock', '.downloading', '.d3v'
}

def is_temp_or_downloading_file(file_name):
    name_lower = file_name.lower()
    for temp_ext in TEMP_FILE_EXTENSIONS:
        if name_lower.endswith(temp_ext):
            return True
    if '.part.' in name_lower or '.crdownload.' in name_lower or '.tmp.' in name_lower:
        return True
    if file_name.startswith('~$') or file_name.startswith('._'):
        return True
    return False

def get_file_type(extension):
    ext = extension.lower()
    if ext in ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv']:
        return 'video'
    elif ext in ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']:
        return 'image'
    elif ext in ['.txt', '.json', '.md', '.srt', '.vtt']:
        return 'text'
    return 'other'

def scan_and_group_local_folder(folder_path):
    if not os.path.exists(folder_path):
        return []

    grouped = {}
    
    for entry in os.scandir(folder_path):
        if entry.is_file():
            file_name = entry.name
            
            # Bỏ qua hoàn toàn các file tạm / file đang tải dở (.part, .crdownload, .tmp...)
            if is_temp_or_downloading_file(file_name):
                continue

            path_obj = Path(file_name)
            base_name = path_obj.stem # Tên không bao gồm extension
            ext = path_obj.suffix

            if base_name not in grouped:
                grouped[base_name] = []

            grouped[base_name].append({
                "fileName": file_name,
                "fileExtension": ext,
                "fileType": get_file_type(ext),
                "fileSize": entry.stat().st_size,
                "localPath": entry.path
            })

    items = []
    for base_name, files in grouped.items():
        items.append({
            "baseName": base_name,
            "files": files
        })
    
    return items

def upload_file_to_google_drive(access_token, file_path, file_name, target_folder_id=None):
    if not os.path.exists(file_path):
        return False, None, "File local không tồn tại"

    file_size = os.path.getsize(file_path)

    file_mime = "application/octet-stream"
    if file_name.endswith(('.jpg', '.jpeg')): file_mime = "image/jpeg"
    elif file_name.endswith('.png'): file_mime = "image/png"
    elif file_name.endswith('.mp4'): file_mime = "video/mp4"
    elif file_name.endswith('.srt'): file_mime = "text/plain"
    elif file_name.endswith('.txt'): file_mime = "text/plain"

    # 1. Khởi tạo Session Resumable Upload với Google Drive v3 API (Auto Retry 3 lần nếu Google gặp 502)
    session_url_endpoint = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable"
    init_headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": file_mime,
        "X-Upload-Content-Length": str(file_size)
    }

    metadata = {"name": file_name}
    if target_folder_id:
        metadata["parents"] = [target_folder_id]

    upload_url = None
    for init_attempt in range(3):
        try:
            init_res = requests.post(session_url_endpoint, headers=init_headers, json=metadata, timeout=60)
            if init_res.status_code == 200:
                upload_url = init_res.headers.get("Location")
                if upload_url:
                    break
            elif init_res.status_code == 401:
                return False, None, "TOKEN_EXPIRED"
            elif init_res.status_code in (500, 502, 503, 504):
                print(f"   ⚠️ Máy chủ Google trả về HTTP {init_res.status_code} tạm thời, thử lại sau 5s (lần {init_attempt + 1}/3)...")
                time.sleep(5)
                continue
            else:
                return False, None, f"Lỗi tạo Session Resumable HTTP {init_res.status_code}: {init_res.text[:200]}"
        except Exception as e:
            if init_attempt < 2:
                time.sleep(5)
                continue
            return False, None, f"Lỗi khởi tạo Session: {str(e)}"

    if not upload_url:
        return False, None, "Không nhận được Resumable Location URL từ Google API"

    # 2. Upload Chunked Stream (Block 8MB) với % live progress & Auto Retry 5xx
    chunk_size = 8 * 1024 * 1024 # 8 MB block
    with open(file_path, "rb") as f:
        offset = 0
        while offset < file_size:
            chunk_data = f.read(chunk_size)
            chunk_len = len(chunk_data)
            start_byte = offset
            end_byte = offset + chunk_len - 1

            chunk_headers = {
                "Content-Length": str(chunk_len),
                "Content-Range": f"bytes {start_byte}-{end_byte}/{file_size}"
            }

            pct = int((end_byte + 1) / file_size * 100)
            mb_uploaded = (end_byte + 1) / (1024 * 1024)
            mb_total = file_size / (1024 * 1024)

            chunk_success = False
            for attempt in range(5):
                print(f"   🚀 [{pct}%] Uploading chunk: {mb_uploaded:.1f} MB / {mb_total:.1f} MB ...", end="\r", flush=True)
                try:
                    res = requests.put(upload_url, headers=chunk_headers, data=chunk_data, timeout=120)

                    if res.status_code in (200, 201):
                        print(f"\n   ✅ Upload hoàn tất: {file_name} ({mb_total:.1f} MB)")
                        res_data = res.json()
                        return True, res_data.get("id"), None
                    elif res.status_code == 308:
                        offset += chunk_len
                        chunk_success = True
                        break
                    elif res.status_code == 401:
                        return False, None, "TOKEN_EXPIRED"
                    elif res.status_code in (500, 502, 503, 504):
                        print(f"\n   ⚠️ Google API gặp lỗi HTTP {res.status_code} tạm thời, tự động nghỉ 5s thử lại chunk (lần {attempt + 1}/5)...")
                        time.sleep(5)
                        continue
                    else:
                        print("")
                        return False, None, f"Lỗi Upload Chunk HTTP {res.status_code}: {res.text[:200]}"
                except Exception as chunk_err:
                    if attempt < 4:
                        print(f"\n   ⚠️ Gián đoạn mạng, nghỉ 5s thử lại chunk (lần {attempt + 1}/5)...")
                        time.sleep(5)
                        continue
                    else:
                        print("")
                        return False, None, f"Lỗi kết nối sau 5 lần thử: {str(chunk_err)}"

            if not chunk_success:
                return False, None, "Upload chunk thất bại sau 5 lần thử lại"

    return False, None, "Upload kết thúc bất thường"

def process_file_item(file_item, mapping_tokens, server_url, now_str):
    file_id = file_item.get("id")
    local_path = file_item.get("localPath")
    file_name = file_item.get("fileName")

    if not local_path or not os.path.exists(local_path):
        print(f"🧹 [{now_str}] Đã dọn dẹp file thiếu local khỏi Server: {file_name}")
        complete_url = f"{server_url}/api/hero-drive/worker?action=file_complete"
        try:
            requests.post(complete_url, headers=WORKER_HEADERS, json={
                "fileId": file_id,
                "status": "failed",
                "error": "Local file not found or already moved"
            }, timeout=120)
        except Exception:
            pass
        return

    access_token = file_item.get("accessToken")
    target_folder_id = file_item.get("targetFolderId")
    delete_after_upload = file_item.get("deleteAfterUpload", False)

    if not access_token:
        for m_id_str, t_info in mapping_tokens.items():
            if t_info.get("accessToken"):
                access_token = t_info.get("accessToken")
                target_folder_id = t_info.get("targetFolderId")
                delete_after_upload = t_info.get("deleteAfterUpload", False)
                break

    if not access_token:
        print(f"⚠️ [{now_str}] Chưa có Access Token Google Drive cho file: {file_name}")
        return

    print(f"⏳ [{now_str}] Uploading: {file_name} ...")
    success, drive_file_id, err_msg = upload_file_to_google_drive(
        access_token, local_path, file_name, target_folder_id
    )

    if success:
        print(f"✅ [{now_str}] Tải thành công! Drive ID: {drive_file_id}")
        if delete_after_upload:
            try:
                os.remove(local_path)
                print(f"🗑️ Đã xóa file đĩa C: {local_path}")
            except Exception as ex:
                print(f"❌ Lỗi xóa file local: {ex}")

        complete_url = f"{server_url}/api/hero-drive/worker?action=file_complete"
        try:
            requests.post(complete_url, headers=WORKER_HEADERS, json={
                "fileId": file_id,
                "driveFileId": drive_file_id,
                "status": "completed"
            }, timeout=120)
        except Exception as e:
            print(f"❌ [{now_str}] Lỗi cập nhật trạng thái completed: {e}")
    else:
        if err_msg == "TOKEN_EXPIRED":
            print(f"⚠️ [{now_str}] Token Drive đã hết hạn (401). Worker sẽ nhận Token mới ở lượt polling tiếp theo.")
            return

        print(f"❌ [{now_str}] Lỗi upload {file_name}: {err_msg}")
        complete_url = f"{server_url}/api/hero-drive/worker?action=file_complete"
        try:
            requests.post(complete_url, headers=WORKER_HEADERS, json={
                "fileId": file_id,
                "status": "failed",
                "error": err_msg
            }, timeout=120)
        except Exception as e:
            print(f"❌ [{now_str}] Lỗi cập nhật trạng thái failed: {e}")

def main():
    args = parse_args()
    server_url = args.server.rstrip('/')
    project_id = args.project
    config_id = args.config
    poll_interval = max(30, args.interval)

    print("🚀 ===============================================")
    print("🚀 KHỞI CHẠY HERODRIVE PYTHON WORKER (SMART POLLING 60S)")
    print(f"🌐 Máy chủ kết nối: {server_url}")
    print(f"⏱️ Nhịp Polling tiết kiệm Vercel Free: {poll_interval}s / 1 lần")
    print("⚡ Trạng thái: Đang kết nối máy chủ và kiểm tra lịch quét...")
    print("🚀 ===============================================")

    while True:
        now_str = datetime.now().strftime("%H:%M:%S")

        try:
            if project_id:
                api_url = f"{server_url}/api/hero-drive/worker?action=get_project_tasks&projectId={project_id}"
            elif config_id:
                api_url = f"{server_url}/api/hero-drive/worker?action=get_pending_files&configId={config_id}"
            else:
                api_url = f"{server_url}/api/hero-drive/worker?action=get_all_tasks"

            res = requests.get(api_url, headers=WORKER_HEADERS, timeout=120)
            if res.status_code == 200:
                data = res.json()
                if isinstance(data, dict) and data.get("pollIntervalMs"):
                    poll_interval = max(20, int(data.get("pollIntervalMs")) // 1000)
                if data.get("success"):
                    mappings = data.get("mappings", [])
                    mapping_tokens = data.get("mappingTokens", {})
                    pending_files = data.get("files", [])

                    if not mappings:
                        print(f"📡 [{now_str}] Chưa có Thư mục Quét nào được kích hoạt trên Web...")
                    else:
                        print(f"📡 [{now_str}] Đang theo dõi {len(mappings)} thư mục quét:")
                        
                        # 1. Quét từng local folder mapping
                        for m in mappings:
                            local_folder = m.get("localFolderPath")
                            mapping_id = m.get("id")
                            mapping_name = m.get("name", "Thư mục Quét")
                            should_scan = m.get("shouldScan", True)
                            remaining = m.get("remainingSeconds", 0)

                            if not should_scan:
                                rem_str = format_seconds_human(remaining)
                                print(f"   ⏳ [{mapping_name}]: Lần quét tới sau {rem_str}")
                                continue

                            print(f"   ⚡ [{mapping_name}]: Tiến hành quét local folder ({local_folder})...")

                            if not local_folder or not os.path.exists(local_folder):
                                print(f"   ⚠️ [{mapping_name}]: Thư mục local không tồn tại: {local_folder}")
                                continue

                            items = scan_and_group_local_folder(local_folder)
                            if items:
                                print(f"   🔍 Phát hiện {len(items)} nhóm bài đăng ở local")
                                
                                # Chia nhỏ mảng items thành các chunk (50 items/chunk) để tránh Vercel timeout
                                batch_size = 50
                                total_batches = (len(items) + batch_size - 1) // batch_size
                                
                                for i in range(0, len(items), batch_size):
                                    batch_items = items[i:i+batch_size]
                                    print(f"   📤 Đang đồng bộ batch {i//batch_size + 1}/{total_batches} ({len(batch_items)} nhóm)...")
                                    
                                    sync_url = f"{server_url}/api/hero-drive/worker?action=sync"
                                    try:
                                        requests.post(sync_url, headers=WORKER_HEADERS, json={
                                            "mappingId": mapping_id,
                                            "items": batch_items
                                        }, timeout=120)
                                    except Exception as e:
                                        print(f"   ⚠️ Lỗi đồng bộ batch {i//batch_size + 1}: {e}")
                                        
                            else:
                                print(f"   ✅ Quét hoàn tất, thư mục hiện chưa có file mới")
                                
                                # Chỉ gửi sync rỗng định kỳ 10 phút (600s) để Server biết worker còn sống
                                if 'LAST_EMPTY_SYNC' not in globals():
                                    globals()['LAST_EMPTY_SYNC'] = {}
                                last_sync_t = globals()['LAST_EMPTY_SYNC'].get(mapping_id, 0)
                                if time.time() - last_sync_t > 600:
                                    sync_url = f"{server_url}/api/hero-drive/worker?action=sync"
                                    try:
                                        requests.post(sync_url, headers=WORKER_HEADERS, json={
                                            "mappingId": mapping_id,
                                            "items": []
                                        }, timeout=120)
                                        globals()['LAST_EMPTY_SYNC'][mapping_id] = time.time()
                                    except Exception as e:
                                        pass

                    # 2. Upload Pending Files (Ưu tiên file nhỏ ảnh/txt trước, file lớn video sau; tối ưu băng thông)
                    if pending_files:
                        max_workers = max(1, getattr(args, 'workers', 2))
                        def get_file_sort_key(f):
                            f_type = f.get('fileType', '')
                            f_size = f.get('fileSize', 0)
                            type_order = 0 if f_type in ('image', 'text') else 1
                            return (type_order, f_size)

                        pending_files.sort(key=get_file_sort_key)
                        print(f"📦 [{now_str}] Có {len(pending_files)} tệp đính kèm đang chờ upload (Tải tối ưu {max_workers} luồng song song)...")
                        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
                            futures = [
                                executor.submit(process_file_item, file_item, mapping_tokens, server_url, now_str)
                                for file_item in pending_files
                            ]
                            # Chờ tất cả hoàn thành
                            for future in concurrent.futures.as_completed(futures):
                                pass

            elif res.status_code == 403:
                print(f"⚠️ [{now_str}] Máy chủ tạm thời bận (HTTP 403 - Nghỉ 30s)...")
                time.sleep(30)
                continue
            else:
                print(f"⚠️ [{now_str}] Máy chủ trả về HTTP {res.status_code}")

        except Exception as e:
            print(f"⚠️ [{now_str}] Lỗi kết nối Worker Loop: {e}")

        time.sleep(poll_interval)

if __name__ == "__main__":
    main()
