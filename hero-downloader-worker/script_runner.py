import os
import sys

def run_custom_script(script_code: str, context: dict = None):
    """
    Thực thi mã Python tuỳ chỉnh (Add Code).
    Cảnh báo: Hàm này có thể thực thi mã tuỳ ý, nên chỉ dùng cho Local Worker.
    """
    if not script_code:
        return
        
    print(f"[-] Đang chạy Script tuỳ chỉnh...")
    
    # Tạo môi trường thực thi với các biến toàn cục và cục bộ
    global_env = globals().copy()
    local_env = context or {}
    
    try:
        # Thực thi mã Python
        exec(script_code, global_env, local_env)
        print(f"[\u2713] Chạy Script tuỳ chỉnh thành công.")
    except Exception as e:
        print(f"[!] Lỗi khi chạy Script tuỳ chỉnh: {str(e)}")

# Ví dụ mẫu
if __name__ == '__main__':
    sample_code = \"\"\"
def process_webhook(video_id):
    print(f"Webhook called for video {video_id}")
    
process_webhook(local_ctx_video_id)
\"\"\"
    run_custom_script(sample_code, {"local_ctx_video_id": 123})
