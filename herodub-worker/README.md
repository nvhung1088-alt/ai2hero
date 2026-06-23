# HeroDub Local Worker

Mã nguồn chạy local worker kết nối với nền tảng AI2Hero để tự động tải, dịch thuật và burn phụ đề video (Douyin, Bilibili, YouTube) không tốn chi phí GPU server.

## Yêu cầu hệ thống

1. **Python 3.10+** (Khuyên dùng Python 3.10 vì pyVideoTrans hoạt động ổn định nhất trên phiên bản này).
2. **pyVideoTrans** đã được cài đặt và setup (Tải tại: [pyVideoTrans Releases](https://github.com/jianchang512/pyvideotrans/releases)).

## Cách cài đặt và chạy

1. Cài đặt các thư viện Python cần thiết:
   ```bash
   pip install -r requirements.txt
   ```

2. Cấu hình file `config.py` (Mở file bằng text editor):
   - `SERVER_URL`: Địa chỉ web AI2Hero (Mặc định dev local là `http://localhost:3000`).
   - `PYVIDEOTRANS_DIR`: Cấu hình đường dẫn thư mục pyVideoTrans nếu công cụ không tự tìm thấy.

3. Khởi chạy worker:
   ```bash
   python worker.py
   ```

4. Nhập **Mã liên kết (Link Code)** gồm 6 ký tự được tạo từ Dashboard trang web HeroDub để hoàn thành ghép nối. Worker sẽ tự động lưu session vào `session.json` và chạy ngầm nhận tác vụ.
