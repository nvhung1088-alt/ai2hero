# === SHARED WORKER POLLING & TRAFFIC CONFIG ===
# Đảm bảo Python Local Worker không spam Vercel Serverless Functions

import time

# Cấu hình thời gian Polling (tính bằng Giây)
IDLE_POLL_INTERVAL = 20      # Khi chưa có task: nghỉ 20 giây mới hỏi server 1 lần (thay vì 2s)
BUSY_POLL_INTERVAL = 5       # Khi đang chạy task: nghỉ 5 giây
MAX_IDLE_BACKOFF = 60        # Khi rảnh > 10 phút: nghỉ 60 giây

class SmartWorkerPoller:
    def __init__(self, worker_name="Worker"):
        self.worker_name = worker_name
        self.idle_count = 0

    def get_sleep_duration(self, has_task: bool) -> int:
        if has_task:
            self.idle_count = 0
            return BUSY_POLL_INTERVAL
        
        self.idle_count += 1
        # Giãn thời gian nghỉ tăng dần nếu rảnh lâu
        if self.idle_count > 10:
            return min(IDLE_POLL_INTERVAL * 2, MAX_IDLE_BACKOFF)
        return IDLE_POLL_INTERVAL

    def sleep(self, has_task: bool):
        duration = self.get_sleep_duration(has_task)
        if not has_task:
            print(f"[{self.worker_name}] Hàng đợi trống. Tạm dừng {duration}s trước lần quét tiếp theo (Bảo vệ Vercel quota)...")
        time.sleep(duration)
