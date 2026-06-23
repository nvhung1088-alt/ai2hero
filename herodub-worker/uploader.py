import os
import requests

def upload_file_to_presigned_url(file_path, presigned_url, content_type):
    """
    Upload file nhị phân trực tiếp lên Presigned URL bằng PUT request.
    Cần sử dụng PUT và gửi đúng content-type, content-length.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Không tìm thấy file cần tải lên: {file_path}")
        
    file_size = os.path.getsize(file_path)
    print(f"[Uploader] Đang tải lên {os.path.basename(file_path)} ({file_size / 1024 / 1024:.2f} MB)...")
    
    # Nếu là local upload fallback endpoint (url bắt đầu bằng /api/)
    # thì ta ghép thêm host server_url vào
    from config import SERVER_URL
    upload_target = presigned_url
    if presigned_url.startswith('/api/'):
        upload_target = f"{SERVER_URL.rstrip('/')}{presigned_url}"

    with open(file_path, 'rb') as f:
        headers = {
            'Content-Type': content_type,
            'Content-Length': str(file_size)
        }
        
        # Gửi PUT request
        response = requests.put(upload_target, data=f, headers=headers)
        
        if response.status_code not in (200, 201):
            raise Exception(f"Tải lên thất bại với mã phản hồi {response.status_code}: {response.text}")
            
    print(f"[Uploader] Tải lên thành công: {os.path.basename(file_path)}")
    return True
