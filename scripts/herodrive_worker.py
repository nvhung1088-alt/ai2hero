import os
import sys
import time
import argparse
import requests
import json
from datetime import datetime
from pathlib import Path

# Fix encoding cho Windows console
if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')

def parse_args():
    parser = argparse.ArgumentParser(description="HeroDrive Python Local Worker")
    parser.add_argument("--project", type=int, help="ID của Dự án Quét (Tùy chọn)")
    parser.add_argument("--config", type=int, help="ID của Cấu hình quét (Tùy chọn)")
    parser.add_argument("--server", type=str, default="https://www.ai2hero.com", help="URL máy chủ AI2Hero")
    parser.add_argument("--interval", type=int, default=10, help="Thời gian giãn cách quét mặc định (giây)")
    return parser.parse_args()

def parse_interval_to_seconds(val):
    if not val:
        return 10
    val_str = str(val).strip().lower()
    if val_str.endswith('s'):
        try: return max(5, int(val_str[:-1]))
        except: return 10
    elif val_str.endswith('m'):
        try: return max(5, int(val_str[:-1]) * 60)
        except: return 10
    elif val_str.endswith('h'):
        try: return max(5, int(val_str[:-1]) * 3600)
        except: return 10
    try:
        return max(5, int(val_str))
    except:
        return 10

def format_seconds_human(seconds):
    if seconds < 60:
        return f"{seconds} giây"
    elif seconds < 3600:
        mins = seconds // 60
        return f"{mins} phút ({seconds}s)"
    else:
        hours = seconds // 3600
        return f"{hours} giờ ({seconds}s)"

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
    url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
    
    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    metadata = {
        "name": file_name
    }
    if target_folder_id:
        metadata["parents"] = [target_folder_id]

    file_mime = "application/octet-stream"
    if file_name.endswith(('.jpg', '.jpeg')): file_mime = "image/jpeg"
    elif file_name.endswith('.png'): file_mime = "image/png"
    elif file_name.endswith('.mp4'): file_mime = "video/mp4"
    elif file_name.endswith('.srt'): file_mime = "text/plain"
    elif file_name.endswith('.txt'): file_mime = "text/plain"

    try:
        files = {
            "data": ("metadata", json.dumps(metadata), "application/json; charset=UTF-8"),
            "file": (file_name, open(file_path, "rb"), file_mime)
        }
        response = requests.post(url, headers=headers, files=files, timeout=300)
        if response.status_code == 200:
            res_data = response.json()
            return True, res_data.get("id"), None
        else:
            return False, None, f"HTTP {response.status_code}: {response.text}"
    except Exception as e:
        return False, None, str(e)

def main():
    args = parse_args()
    server_url = args.server.rstrip('/')
    project_id = args.project
    config_id = args.config
    default_interval = args.interval

    print("🚀 ===============================================")
    print("🚀 KHỞI CHẠY HERODRIVE PYTHON WORKER (GLOBAL SYNC)")
    print(f"🌐 Máy chủ kết nối: {server_url}")
    print("⚡ Trạng thái: Đang kết nối máy chủ và kiểm tra thư mục quét...")
    print("🚀 ===============================================")

    while True:
        now_str = datetime.now().strftime("%H:%M:%S")
        next_sleep = default_interval

        try:
            # Lấy toàn bộ task đang hoạt động
            if project_id:
                api_url = f"{server_url}/api/hero-drive/worker?action=get_project_tasks&projectId={project_id}"
            elif config_id:
                api_url = f"{server_url}/api/hero-drive/worker?action=get_pending_files&configId={config_id}"
            else:
                api_url = f"{server_url}/api/hero-drive/worker?action=get_all_tasks"

            res = requests.get(api_url, timeout=15)
            if res.status_code == 200:
                data = res.json()
                if data.get("success"):
                    mappings = data.get("mappings", [])
                    mapping_tokens = data.get("mappingTokens", {})
                    pending_files = data.get("files", [])

                    # Tính thời gian chờ động theo cài đặt scanInterval từ Web
                    if mappings:
                        intervals = [parse_interval_to_seconds(m.get("scanInterval")) for m in mappings if m.get("scanInterval")]
                        if intervals:
                            next_sleep = min(intervals)

                    human_next_sleep = format_seconds_human(next_sleep)

                    if not mappings:
                        print(f"📡 [{now_str}] Chưa có Thư mục Quét nào được kích hoạt trên Web (Chờ {human_next_sleep})...")
                    else:
                        # 1. Quét từng local folder mapping và sync
                        for m in mappings:
                            local_folder = m.get("localFolderPath")
                            mapping_id = m.get("id")
                            mapping_name = m.get("name", "Thư mục Quét")

                            if not local_folder or not os.path.exists(local_folder):
                                print(f"⚠️ [{now_str}] Thư mục local chưa tồn tại trên máy tính: {local_folder}")
                                continue

                            items = scan_and_group_local_folder(local_folder)
                            if items:
                                print(f"🔍 [{now_str}] Quét [{mapping_name}]: Phát hiện {len(items)} nhóm bài đăng ở local ({local_folder})")
                                sync_url = f"{server_url}/api/hero-drive/worker?action=sync"
                                requests.post(sync_url, json={
                                    "mappingId": mapping_id,
                                    "items": items
                                }, timeout=15)

                    # 2. Upload Pending Files
                    if pending_files:
                        print(f"📦 [{now_str}] Có {len(pending_files)} tệp đính kèm đang chờ upload...")
                        for file_item in pending_files:
                            file_id = file_item.get("id")
                            local_path = file_item.get("localPath")
                            file_name = file_item.get("fileName")

                            if not local_path or not os.path.exists(local_path):
                                print(f"⚠️ [{now_str}] Không tìm thấy file local: {local_path}")
                                continue

                            access_token = file_item.get("accessToken")
                            target_folder_id = file_item.get("targetFolderId")
                            delete_after_upload = file_item.get("deleteAfterUpload", False)

                            # Fallback nếu chưa có trong file_item
                            if not access_token:
                                for m_id_str, t_info in mapping_tokens.items():
                                    if t_info.get("accessToken"):
                                        access_token = t_info.get("accessToken")
                                        target_folder_id = t_info.get("targetFolderId")
                                        delete_after_upload = t_info.get("deleteAfterUpload", False)
                                        break

                            if not access_token:
                                print(f"⚠️ [{now_str}] Chưa có Access Token Google Drive cho file: {file_name}")
                                print(f"👉 Vui lòng dán Client ID, Client Secret & Refresh Token vào Connect Hub tại https://www.ai2hero.com/hero-drive/settings")
                                continue

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
                                requests.post(complete_url, json={
                                    "fileId": file_id,
                                    "driveFileId": drive_file_id,
                                    "status": "completed"
                                }, timeout=15)
                            else:
                                print(f"❌ [{now_str}] Lỗi upload: {err_msg}")
                                complete_url = f"{server_url}/api/hero-drive/worker?action=file_complete"
                                requests.post(complete_url, json={
                                    "fileId": file_id,
                                    "status": "failed",
                                    "error": err_msg
                                }, timeout=15)
                    else:
                        if mappings:
                            print(f"📡 [{now_str}] Đã kiểm tra {len(mappings)} thư mục quét. Chưa có file mới cần upload. Lượt quét tiếp theo sau: {human_next_sleep}...")

            else:
                print(f"⚠️ [{now_str}] Máy chủ trả về HTTP {res.status_code}")

        except Exception as e:
            print(f"⚠️ [{now_str}] Lỗi kết nối Worker Loop: {e}")

        time.sleep(next_sleep)

if __name__ == "__main__":
    main()
