# -*- coding: utf-8 -*-
"""
HERODUB PUBLISHING SUITE REPAIR & FIX TOOL v2.0
Tác vụ: Tự động quét toàn diện và sửa toàn bộ:
  1. Video còn tên tiếng Trung -> Dịch tên tiếng Việt + Đổi tên trọn bộ.
  2. Ảnh thumbnail còn chữ tiếng Trung (chưa phải 3D 720p) -> Vẽ lại chữ 3D Vàng Kim tiếng Việt.
  3. Video thiếu ảnh hoặc ảnh hỏng -> Trích xuất frame từ MP4 và vẽ chữ 3D.
  4. Video thiếu file mô tả -> Tạo file .txt đăng bài chuẩn.

Tác giả: Ai2Hero Team
Ngày nâng cấp: 2026-09-01
"""

import sys

# Bắt buộc UTF-8 trên Windows console để hiển thị tiếng Việt mượt mà không lỗi charmap
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import os
import re
import time
import json
import base64
import socket
import struct
import hashlib
import threading
import argparse
import shutil
import subprocess
from datetime import datetime, timedelta
from colorama import init, Fore, Style
from PIL import Image

init(autoreset=True)

# Cấu hình mặc định
DEFAULT_TARGET_DIR = r"C:\Users\ADMIN\OneDrive\Desktop\DOWNLOAD1\Rui-Nho-Hoang-Da-DICH"
WS_HOST = "127.0.0.1"
WS_PORT = 8765

# ---------------------------------------------------------
# WEBSOCKET BRIDGE SERVER CHO CHROME EXTENSION
# ---------------------------------------------------------
class LocalWebSocketBridgeServer:
    ROTATION_LIMIT = 10

    def __init__(self, host="127.0.0.1", port=8765):
        self.host = host
        self.port = port
        self.clients = []
        self.lock = threading.Lock()
        self.pending_jobs = {}
        self.server_socket = None
        self.is_running = False
        self.active_account_index = 0
        self.account_job_counter = 0
        self.account_status = {}  # sock -> { "exhausted": bool, "reset_str": str, "resume_ts": float }

    def start(self):
        if self.is_running:
            return True
        try:
            self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.server_socket.bind((self.host, self.port))
            self.server_socket.listen(5)
            self.is_running = True
            thread = threading.Thread(target=self._run_server, daemon=True)
            thread.start()
            print(Fore.CYAN + f"[*] WebSocket Bridge Server dang chay tai ws://{self.host}:{self.port}")
            return True
        except OSError as e:
            if getattr(e, 'errno', None) == 10048 or "10048" in str(e):
                print(Fore.RED + Style.BRIGHT + "\n[!] CANH BAO: Cong 8765 dang bi chiem dung!")
                print(Fore.YELLOW + "    -> Co the herodub_worker.py dang chay ngam.")
                print(Fore.YELLOW + "    -> Vui long tam dung herodub_worker.py (an Ctrl+C) truoc khi chay tool nay.\n")
            else:
                print(Fore.RED + f"[!] Loi bind WebSocket server: {e}")
            return False

    def _run_server(self):
        while self.is_running:
            try:
                client_sock, addr = self.server_socket.accept()
                threading.Thread(target=self._handle_client, args=(client_sock,), daemon=True).start()
            except Exception:
                break

    def _recv_exact(self, sock, num_bytes):
        buf = bytearray()
        while len(buf) < num_bytes:
            chunk = sock.recv(num_bytes - len(buf))
            if not chunk:
                return None
            buf.extend(chunk)
        return bytes(buf)

    def _handle_client(self, sock):
        try:
            request = sock.recv(2048).decode("utf-8", errors="ignore")
            if "Sec-WebSocket-Key:" not in request:
                sock.close()
                return

            key = request.split("Sec-WebSocket-Key: ")[1].split("\r\n")[0].strip()
            accept_key = base64.b64encode(
                hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode("utf-8")).digest()
            ).decode("utf-8")

            handshake = (
                "HTTP/1.1 101 Switching Protocols\r\n"
                "Upgrade: websocket\r\n"
                "Connection: Upgrade\r\n"
                f"Sec-WebSocket-Accept: {accept_key}\r\n\r\n"
            )
            sock.sendall(handshake.encode("utf-8"))

            with self.lock:
                if sock not in self.clients:
                    self.clients.append(sock)
                curr_idx = self.clients.index(sock) + 1
                total_clients = len(self.clients)

            print(Fore.GREEN + Style.BRIGHT + f"[*] Chrome Extension ket noi thanh cong! Pool: {total_clients} Tai khoan (Tai khoan #{curr_idx}).")

            while self.is_running:
                head = self._recv_exact(sock, 2)
                if not head:
                    break
                opcode = head[0] & 0x0F
                if opcode == 0x8:
                    break

                mask = (head[1] & 0x80) != 0
                payload_len = head[1] & 0x7F

                if payload_len == 126:
                    ext_len_bytes = self._recv_exact(sock, 2)
                    if not ext_len_bytes:
                        break
                    payload_len = struct.unpack(">H", ext_len_bytes)[0]
                elif payload_len == 127:
                    ext_len_bytes = self._recv_exact(sock, 8)
                    if not ext_len_bytes:
                        break
                    payload_len = struct.unpack(">Q", ext_len_bytes)[0]

                mask_key = None
                if mask:
                    mask_key = self._recv_exact(sock, 4)
                    if not mask_key:
                        break

                raw_payload = self._recv_exact(sock, payload_len)
                if raw_payload is None:
                    break

                if mask and mask_key:
                    unmasked = bytearray(raw_payload)
                    for i in range(len(unmasked)):
                        unmasked[i] ^= mask_key[i % 4]
                    message_str = unmasked.decode("utf-8", errors="ignore")
                else:
                    message_str = raw_payload.decode("utf-8", errors="ignore")

                if opcode == 0x1:
                    try:
                        msg_json = json.loads(message_str)
                        if msg_json.get("type") == "JOB_RESULT":
                            job_id = msg_json.get("jobId")
                            if job_id and job_id in self.pending_jobs:
                                self.pending_jobs[job_id]["result"] = msg_json
                                self.pending_jobs[job_id]["event"].set()
                    except Exception:
                        pass
        except Exception:
            pass
        finally:
            with self.lock:
                if sock in self.clients:
                    self.clients.remove(sock)
                if sock in self.account_status:
                    del self.account_status[sock]
            try:
                sock.close()
            except Exception:
                pass

    def send_frame(self, sock, message_str):
        payload = message_str.encode("utf-8")
        header = bytearray([0x81])
        length = len(payload)
        if length <= 125:
            header.append(length)
        elif length <= 65535:
            header.append(126)
            header.extend(struct.pack(">H", length))
        else:
            header.append(127)
            header.extend(struct.pack(">Q", length))
        sock.sendall(header + payload)

    def is_connected(self):
        with self.lock:
            return len(self.clients) > 0

    def _is_account_exhausted(self, sock):
        if sock not in self.account_status:
            return False
        st = self.account_status[sock]
        if not st.get("exhausted"):
            return False
        if time.time() >= st.get("resume_ts", 0):
            # Đã hết thời gian chờ, phục hồi tài khoản
            st["exhausted"] = False
            return False
        return True

    def _parse_reset_time_to_timestamp(self, reset_str):
        now = datetime.now()
        if reset_str and re.match(r'^\d{1,2}:\d{2}$', reset_str):
            try:
                h, m = map(int, reset_str.split(':'))
                target = now.replace(hour=h, minute=m, second=0, microsecond=0)
                if target <= now:
                    target += timedelta(days=1)
                # Thêm 2 phút đệm để đảm bảo máy chủ Google đã mở lại hoàn toàn
                target += timedelta(minutes=2)
                return target.timestamp(), reset_str
            except Exception:
                pass
        # Mặc định chờ 60 phút nếu không đọc được giờ cụ thể
        fallback_dt = now + timedelta(minutes=60)
        fallback_str = fallback_dt.strftime("%H:%M")
        return fallback_dt.timestamp(), fallback_str

    def _wait_for_all_accounts_countdown(self, resume_ts, reset_str):
        print(Fore.RED + Style.BRIGHT + "\n" + "=" * 70)
        print(Fore.RED + Style.BRIGHT + "🛑 TẤT CẢ TÀI KHOẢN ĐÃ HẾT HẠN MỨC PRO / TẠO ẢNH (QUOTA EXCEEDED)!")
        print(Fore.RED + Style.BRIGHT + "=" * 70)
        print(Fore.YELLOW + f"[*] Thời điểm Google đặt lại hạn mức (Reset Time): {reset_str}")
        print(Fore.CYAN + "[*] Hệ thống sẽ TỰ ĐỘNG ĐẾM NGƯỢC và TIẾP TỤC CHẠY khi đến giờ...")
        print(Fore.WHITE + "[*] Bạn có thể để máy ở đây (hoặc ấn Ctrl+C để tạm thoát bất kỳ lúc nào).\n")

        while time.time() < resume_ts:
            rem_sec = max(0, int(resume_ts - time.time()))
            hrs = rem_sec // 3600
            mins = (rem_sec % 3600) // 60
            secs = rem_sec % 60
            sys.stdout.write(f"\r{Fore.YELLOW}  ⏳ Đang đếm ngược chờ Reset Quota: [{hrs:02d}:{mins:02d}:{secs:02d}] còn lại (Tự chạy lúc {reset_str})...{Style.RESET_ALL} ")
            sys.stdout.flush()
            time.sleep(1.0)

        print(Fore.GREEN + Style.BRIGHT + f"\n\n[✓] ĐÃ ĐẾN GIỜ RESET QUOTA ({reset_str})! TỰ ĐỘNG PHỤC HỒI TOÀN BỘ TÀI KHOẢN VÀ TIẾP TỤC CHẠY...\n")
        with self.lock:
            self.account_status.clear()

    def _execute_job_on_socket(self, client_sock, prompt, target_ai="gemini", attachments=None, timeout=90, cancel_event=None):
        job_id = "ws_" + str(int(time.time() * 1000))
        event = threading.Event()
        self.pending_jobs[job_id] = {"event": event, "result": None}

        msg = {
            "action": "PROCESS_AI_JOB",
            "job": {
                "id": job_id,
                "targetAi": target_ai,
                "prompt": prompt,
                "attachments": attachments or [],
                "autoNewChat": True
            }
        }

        try:
            self.send_frame(client_sock, json.dumps(msg, ensure_ascii=False))
            start_wait = time.time()
            while time.time() - start_wait < timeout:
                if cancel_event and cancel_event.is_set():
                    return {"cancelled": True}
                if event.wait(timeout=0.5):
                    res = self.pending_jobs[job_id].get("result", {})
                    return res
        except Exception as e:
            if not (cancel_event and cancel_event.is_set()):
                print(Fore.YELLOW + f"  [!] WebSocket send error: {e}")
        finally:
            if job_id in self.pending_jobs:
                del self.pending_jobs[job_id]
        return None

    def execute_job(self, prompt, target_ai="gemini", attachments=None, timeout=90, cancel_event=None, allow_failover=True):
        while True:
            if cancel_event and cancel_event.is_set():
                return None

            with self.lock:
                all_clients = list(self.clients)
                if not all_clients:
                    return None

                # Lọc danh sách các tài khoản CÒN QUOTA
                usable_clients = [s for s in all_clients if not self._is_account_exhausted(s)]

            # NẾU TẤT CẢ TÀI KHOẢN ĐỀU HẾT QUOTA -> TỰ ĐỘNG ĐẾM NGƯỢC CHỜ RESET
            if not usable_clients:
                earliest_resume = float('inf')
                earliest_reset_str = "60 phút"
                with self.lock:
                    for s, st in self.account_status.items():
                        if st.get("resume_ts", 0) < earliest_resume:
                            earliest_resume = st["resume_ts"]
                            earliest_reset_str = st.get("reset_str", "60 phút")

                if earliest_resume == float('inf'):
                    earliest_resume = time.time() + 3600
                    earliest_reset_str = "17:03"

                self._wait_for_all_accounts_countdown(earliest_resume, earliest_reset_str)
                continue

            with self.lock:
                start_index = self.active_account_index % len(usable_clients)

            total_usable = len(usable_clients) if allow_failover else 1

            for attempt_offset in range(total_usable):
                if cancel_event and cancel_event.is_set():
                    return None

                cand_idx = (start_index + attempt_offset) % len(usable_clients)
                client_sock = usable_clients[cand_idx]
                global_acc_num = all_clients.index(client_sock) + 1

                if attempt_offset == 0:
                    current_job_num = self.account_job_counter + 1
                    if len(all_clients) > 1:
                        print(Fore.CYAN + f"  [⚡ WebSocket Local] Dang xu ly tren Tai khoan #{global_acc_num}/{len(all_clients)} (Luot {current_job_num}/{self.ROTATION_LIMIT})...")
                    else:
                        print(Fore.CYAN + f"  [⚡ WebSocket Local] Dang xu ly tren Tai khoan #{global_acc_num} (Luot {current_job_num}/{self.ROTATION_LIMIT})...")
                else:
                    print(Fore.MAGENTA + Style.BRIGHT + f"  [🔄 Auto-Failover] Chuyen sang Tai khoan #{global_acc_num}/{len(all_clients)} (con Quota) de tiep tuc...")

                res = self._execute_job_on_socket(client_sock, prompt, target_ai=target_ai, attachments=attachments, timeout=timeout, cancel_event=cancel_event)

                if res and res.get("cancelled"):
                    return None

                if res and res.get("success") and res.get("result"):
                    with self.lock:
                        if cand_idx == self.active_account_index:
                            self.account_job_counter += 1
                            if self.account_job_counter >= self.ROTATION_LIMIT and len(usable_clients) > 1:
                                next_index = (self.active_account_index + 1) % len(usable_clients)
                                self.active_account_index = next_index
                                self.account_job_counter = 0
                                print(Fore.CYAN + Style.BRIGHT + f"  [🔄 Xoay Vong {self.ROTATION_LIMIT} Luot] Chuyen sang Tai khoan #{next_index + 1} de nghi ngoi...")
                        else:
                            self.active_account_index = cand_idx
                            self.account_job_counter = 1
                    return res
                else:
                    if cancel_event and cancel_event.is_set():
                        return None
                    err_msg = str(res.get("error", "Timeout / Khong co phan hoi")) if isinstance(res, dict) else "Timeout / Khong co phan hoi"

                    # XỬ LÝ LỖI HẾT HẠN MỨC (QUOTA EXCEEDED)
                    if "QUOTA_EXCEEDED" in err_msg or "giới hạn của bạn" in err_msg.lower():
                        reset_str = ""
                        m_reset = re.search(r'QUOTA_EXCEEDED:(\d{1,2}:\d{2})?', err_msg)
                        if m_reset and m_reset.group(1):
                            reset_str = m_reset.group(1)
                        if not reset_str:
                            # Mặc định lấy mốc 17:03 nếu từ screenshot hoặc tính toán
                            reset_str = "17:03"

                        resume_ts, final_reset_str = self._parse_reset_time_to_timestamp(reset_str)
                        with self.lock:
                            self.account_status[client_sock] = {
                                "exhausted": True,
                                "reset_str": final_reset_str,
                                "resume_ts": resume_ts
                            }
                        print(Fore.RED + Style.BRIGHT + f"  [🛑 HẾT QUOTA TẠO ẢNH - TÀI KHOẢN #{global_acc_num}] Google thông báo: Đặt lại lúc {final_reset_str}!")
                        # Tiếp tục vòng lặp để thử tài khoản tiếp theo
                        continue
                    else:
                        print(Fore.YELLOW + f"  [⚠️ Su co Tai khoan #{global_acc_num}] {err_msg}.")

            # Nếu không tài khoản nào thành công và tất cả đều đã exhausted, vòng while True sẽ tự động kích hoạt countdown
            with self.lock:
                usable_remaining = [s for s in all_clients if not self._is_account_exhausted(s)]
            if not usable_remaining:
                continue
            else:
                return None

# ---------------------------------------------------------
# TIỆN ÍCH FILE & ẢNH
# ---------------------------------------------------------
def is_image_already_redesigned(jpg_path):
    """
    Kiểm tra xem ảnh đã được Gemini Imagen 3 vẽ lại và tối ưu 720p chuẩn hay chưa.
    Ảnh chuẩn Ai2Hero 3D có kích thước 720x958 hoặc 720x986.
    """
    if not jpg_path or not os.path.exists(jpg_path):
        return False
    try:
        if os.path.getsize(jpg_path) < 1000:
            return False
        with Image.open(jpg_path) as img:
            w, h = img.size
            if (w == 720 and h == 958) or (w == 720 and h == 986):
                return True
    except Exception:
        return False
    return False

def extract_frame_from_video(mp4_path, output_jpg_path):
    """
    Trích xuất 1 khung hình đẹp từ video MP4 nếu video bị thiếu hoặc hỏng file ảnh thumbnail.
    """
    if not mp4_path or not os.path.exists(mp4_path):
        return None
    try:
        cmd = [
            "ffmpeg", "-y", "-ss", "00:00:10",
            "-i", mp4_path,
            "-vframes", "1",
            "-q:v", "2",
            output_jpg_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=20)
        if os.path.exists(output_jpg_path) and os.path.getsize(output_jpg_path) > 1000:
            print(Fore.GREEN + f"  [✓] Da trich xuat khung hinh tu video thanh cong: {os.path.basename(output_jpg_path)}")
            return output_jpg_path
    except Exception as e:
        print(Fore.YELLOW + f"  [!] Trich xuat frame tu video that bai: {e}")
    return None

def get_latest_download_image(start_time, timeout=5):
    downloads_path = os.path.join(os.path.expanduser("~"), "Downloads")
    if not os.path.exists(downloads_path):
        return None

    end_time = time.time() + timeout
    while time.time() <= end_time:
        try:
            candidates = []
            for f in os.listdir(downloads_path):
                if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    full_p = os.path.join(downloads_path, f)
                    try:
                        mtime = os.path.getmtime(full_p)
                        if mtime >= start_time:
                            candidates.append((full_p, mtime))
                    except Exception:
                        pass
            if candidates:
                candidates.sort(key=lambda x: x[1], reverse=True)
                return candidates[0][0]
        except Exception:
            pass
        if timeout == 0:
            break
        time.sleep(1.0)
    return None

def optimize_thumbnail(image_path, target_width=720, target_height=958, max_kb=300):
    if not image_path or not os.path.exists(image_path):
        return image_path
    try:
        with Image.open(image_path) as img:
            if img.mode != 'RGB':
                img = img.convert('RGB')
            orig_w, orig_h = img.size
            if (orig_w == target_width and orig_h == target_height) and os.path.getsize(image_path) <= max_kb * 1024:
                return image_path

            aspect = target_width / target_height
            orig_aspect = orig_w / orig_h

            if orig_aspect > aspect:
                new_w = int(orig_h * aspect)
                left = (orig_w - new_w) // 2
                img = img.crop((left, 0, left + new_w, orig_h))
            else:
                new_h = int(orig_w / aspect)
                top = (orig_h - new_h) // 2
                img = img.crop((0, top, orig_w, top + new_h))

            img = img.resize((target_width, target_height), Image.LANCZOS)
            quality = 90
            temp_path = image_path + ".opt.jpg"
            while quality >= 60:
                img.save(temp_path, "JPEG", quality=quality, optimize=True)
                if os.path.getsize(temp_path) <= max_kb * 1024:
                    break
                quality -= 5

            if os.path.exists(temp_path):
                os.replace(temp_path, image_path)
                return image_path
    except Exception as e:
        print(Fore.YELLOW + f"  [!] Toi uu anh that bai: {e}")
    return image_path

def extract_sample_subtitles(srt_path, sample_count=15):
    if not os.path.exists(srt_path):
        return []
    try:
        with open(srt_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        lines = content.split('\n')
        subs = []
        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue
            if line_str.isdigit():
                continue
            if '-->' in line_str:
                continue
            subs.append(line_str)

        if not subs:
            return []

        step = max(1, len(subs) // sample_count)
        sampled = [subs[i] for i in range(0, len(subs), step)][:sample_count]
        return sampled
    except Exception:
        return []

def smart_truncate(text, max_len=45):
    if len(text) <= max_len:
        return text
    cut = text[:max_len]
    last_space = cut.rfind(' ')
    if last_space > int(max_len * 0.5):
        return cut[:last_space].strip()
    return cut.strip()

# ---------------------------------------------------------
# GEMINI AI PROCESSING (TEXT & IMAGE)
# ---------------------------------------------------------
def generate_copywriting(clean_source_title, prefix_num, sample_subs, bridge_server):
    subs_text = "\n".join([f"- {s}" for s in sample_subs if s]) if sample_subs else "(Không có phụ đề)"

    prompt = f"""[HỆ THỐNG: BẮT BUỘC CHỈ TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON THUẦN TÚY. KHÔNG CHÀO HỎI, KHÔNG GIẢI THÍCH]

Hãy đóng vai Chuyên viên Biên tập Nội dung Video Sinh Tồn / Chế Tác. Dưới đây là thông tin video:
- Tiêu đề gốc video: {clean_source_title}
- Các câu thoại phụ đề thực tế trong video:
{subs_text}

QUY TẮC BẮT BUỘC:
1. "new_title": Đặt Tiêu đề Tiếng Việt chuẩn xác 100% với nội dung và bối cảnh video (dưới 65 ký tự, trọn vẹn câu, hấp dẫn):
   - ĐẶC BIỆT LƯU Ý: Phải đúng chất liệu nơi trú ẩn (Nếu gốc là Hốc cây/Cây rỗng 树洞 -> ghi Hốc Cây/Cây Rỗng; Nếu là Nhà đá/Hang đá 石屋/岩洞 -> ghi Nhà Đá/Hang Đá; Nếu là Nhà gỗ 木屋 -> ghi Nhà Gỗ). TUYỆT ĐỐI KHÔNG tự bịa sai chất liệu.
2. "description": Viết đoạn mô tả ngắn 3-4 câu tóm tắt chính xác diễn biến của video.
3. "hashtags": Tạo bộ 6-8 hashtag chuẩn theo chủ đề video.

CẤU TRÚC JSON MẪU:
{{
  "new_title": "Tiêu đề tiếng Việt chuẩn nội dung tại đây",
  "description": "Đoạn mô tả ngắn 3-4 câu tại đây...",
  "hashtags": "#sinhton #hoangda #ruinho #bushcraft #chetao"
}}"""

    result = {
        "new_title": clean_source_title,
        "description": f"Video thuyết minh: {clean_source_title}. Theo dõi hành trình sinh tồn và chế tác tự nhiên hấp dẫn!",
        "hashtags": "#sinhton #hoangda #ruinho #bushcraft #chetao",
    }

    if bridge_server and bridge_server.is_connected():
        print(Fore.CYAN + f"  [⚡ Gemini Copywriting] Dang yeu cau tao Tieu de + Mo ta sang Gemini...")
        ws_res = bridge_server.execute_job(prompt, attachments=[], target_ai="gemini", timeout=120, allow_failover=False)
        if ws_res and ws_res.get("success") and ws_res.get("result"):
            raw_out = str(ws_res.get("result", "")).strip()
            raw_out = re.sub(r"^```(?:json)?\s*", "", raw_out, flags=re.IGNORECASE)
            raw_out = re.sub(r"\s*```$", "", raw_out, flags=re.IGNORECASE).strip()

            parsed_success = False
            try:
                json_match = re.search(r'(\{[\s\S]*\})', raw_out)
                if json_match:
                    clean_j = re.sub(r',\s*([\}\]])', r'\1', json_match.group(1))
                    parsed = json.loads(clean_j)
                    if isinstance(parsed, dict):
                        if parsed.get("new_title"):
                            t_val = str(parsed.get("new_title")).strip()
                            clean_t = re.sub(r'[\\/:*?"<>|]', ' ', t_val).strip()
                            result["new_title"] = f"{prefix_num}{clean_t}" if prefix_num and not clean_t.startswith(prefix_num) else clean_t
                        if parsed.get("description"):
                            result["description"] = str(parsed.get("description")).strip()
                        if parsed.get("hashtags"):
                            result["hashtags"] = str(parsed.get("hashtags")).strip()
                        print(Fore.GREEN + Style.BRIGHT + f"  [⚡ Gemini Copywriting] Da tao Tieu de moi chuan xac: {result['new_title']}")
                        parsed_success = True
            except Exception:
                pass

            if not parsed_success:
                title_m = re.search(r'"new_title"\s*:\s*"([^"]+)"', raw_out)
                if title_m:
                    t_val = title_m.group(1).strip()
                    clean_t = re.sub(r'[\\/:*?"<>|]', ' ', t_val).strip()
                    result["new_title"] = f"{prefix_num}{clean_t}" if prefix_num and not clean_t.startswith(prefix_num) else clean_t
                    print(Fore.GREEN + Style.BRIGHT + f"  [⚡ Gemini Copywriting] Da trich xuat Tieu de moi: {result['new_title']}")

    # Loại bỏ ký tự cấm trong tên file
    result["new_title"] = re.sub(r'[\\/:*?"<>|]', ' ', result["new_title"]).strip()
    return result

def redesign_thumbnail(thumb_src, new_title, bridge_server):
    if not thumb_src or not os.path.exists(thumb_src):
        return None

    if not bridge_server or not bridge_server.is_connected():
        return None

    try:
        with open(thumb_src, "rb") as img_f:
            b64_data = base64.b64encode(img_f.read()).decode('utf-8')
            img_b64 = f"data:image/jpeg;base64,{b64_data}"
    except Exception as e:
        print(Fore.YELLOW + f"  [!] Khong the doc anh thumbnail: {e}")
        return None

    clean_title = re.sub(r'^\d+_', '', new_title).strip()
    clean_title = re.sub(r'[\\/:*?"<>|]', ' ', clean_title).strip()
    clean_title = smart_truncate(clean_title, max_len=45)

    print(Fore.CYAN + f"  [⚡ Gemini Image 3D] Dang gui anh sang Gemini Imagen 3 de ve chu: '{clean_title}'...")
    image_prompt = f"""Tạo hình ảnh (Generate image): Hãy chỉnh sửa và tạo lại một bức ảnh thumbnail hoàn chỉnh dựa trên bức ảnh đính kèm này.
Yêu cầu chỉnh sửa:
1. XÓA SẠCH toàn bộ chữ tiếng Trung Quốc có trên ảnh gốc.
2. VẼ VÀ THAY THẾ bằng dòng chữ tiêu đề tiếng Việt 3D nghệ thuật màu vàng kim viền đen phát sáng nổi bật: "{clean_title}".
3. BẮT BUỘC giữ nguyên 100% tỷ lệ khung hình gốc (Aspect Ratio), bố cục, nhân vật và bối cảnh thiên nhiên của ảnh gốc.
4. BẮT BUỘC xuất ra hình ảnh mới đã chỉnh sửa, không trả lời bằng văn bản giải thích."""

    attachments_payload = [{"name": f"{os.path.basename(thumb_src)}", "type": "image/jpeg", "data": img_b64}]
    start_t = time.time()

    ws_holder = {"res": None}
    cancel_ws_event = threading.Event()

    def _run_ws():
        ws_holder["res"] = bridge_server.execute_job(
            image_prompt,
            attachments=attachments_payload,
            target_ai="gemini",
            timeout=75,
            cancel_event=cancel_ws_event,
            allow_failover=True  # Tự động nhảy sang tài khoản còn lại nếu tài khoản hiện tại hết Quota
        )

    t_ws = threading.Thread(target=_run_ws, daemon=True)
    t_ws.start()

    last_log_t = time.time()
    while t_ws.is_alive() or ws_holder["res"] is not None:
        dl_img = get_latest_download_image(start_t - 2, timeout=0)
        if dl_img:
            cancel_ws_event.set()
            print(Fore.GREEN + Style.BRIGHT + f"  [⚡ Downloads Watcher] Da phat hien anh 3D moi tai ve may: {os.path.basename(dl_img)}!")
            return dl_img

        if ws_holder["res"] is not None:
            ws_res = ws_holder["res"]
            if ws_res and ws_res.get("success") and ws_res.get("result"):
                raw_out = str(ws_res.get("result", "")).strip()
                img_match = re.search(r'!\[.*?\]\((data:image/[^)]+|https?://[^\s\)]+)\)', raw_out)
                if img_match:
                    cancel_ws_event.set()
                    new_thumb_url = img_match.group(1)
                    if new_thumb_url.startswith("data:image/"):
                        try:
                            header, encoded = new_thumb_url.split(",", 1)
                            img_bytes = base64.b64decode(encoded)
                            save_p = thumb_src + ".new3d.jpg"
                            with open(save_p, "wb") as f_out:
                                f_out.write(img_bytes)
                            print(Fore.GREEN + Style.BRIGHT + f"  [⚡ Gemini Image 3D] Da nhan duoc anh 3D Base64 tu Gemini!")
                            return save_p
                        except Exception:
                            pass
            break

        # In thông báo nhịp tim mỗi 5 giây
        elapsed = int(time.time() - start_t)
        if time.time() - last_log_t >= 5:
            last_log_t = time.time()
            print(Fore.CYAN + f"  [⚡ Gemini Image 3D] Dang cho Gemini tao anh 3D ({elapsed}s)...")

        time.sleep(1.2)

    dl_img = get_latest_download_image(start_t - 2, timeout=3)
    if dl_img:
        cancel_ws_event.set()
        print(Fore.GREEN + Style.BRIGHT + f"  [⚡ Downloads Watcher] Da nhat duoc anh 3D tu Downloads: {os.path.basename(dl_img)}!")
        return dl_img

    cancel_ws_event.set()
    print(Fore.YELLOW + "  [!] Khong the tao anh 3D moi, giu nguyen anh goc...")
    return None

def write_copywriting_txt(target_dir, new_title, description, hashtags, duration_sec, sub_count, new_mp4_name, new_srt_name, new_jpg_name):
    txt_path = os.path.join(target_dir, f"{new_title}.txt")
    txt_content = f"""================================================================================
🎬 TƯ LIỆU ĐĂNG BÀI VIDEO (AI2HERO PUBLISHING SUITE)
================================================================================

📌 TIÊU ĐỀ VIDEO (TITLE):
{new_title}

📝 MÔ TẢ NỘI DUNG (DESCRIPTION):
{description}

🏷️ HASHTAGS:
{hashtags}

⏱️ THÔNG SỐ VIDEO:
- Thời lượng: {duration_sec:.2f}s
- Số câu thoại phụ đề: {sub_count} câu
- Tạo bởi: HeroDub Studio (Ai2Hero Publishing Suite - Repair Tool v2.0)

📁 TẬP TIN TRONG THƯ MỤC:
- Video: {new_mp4_name}
- Phụ đề: {new_srt_name}
- Ảnh bìa: {new_jpg_name}
================================================================================
"""
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(txt_content)
    print(Fore.GREEN + f"  [✓] Da xuat file TXT dang bai: {os.path.basename(txt_path)}")

# ---------------------------------------------------------
# MAIN RUNNER
# ---------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Tool sửa lỗi metadata, thiết kế lại toàn bộ ảnh 3D và tạo file TXT cho video đã dịch.")
    parser.add_argument("--dir", type=str, default=DEFAULT_TARGET_DIR, help="Đường dẫn thư mục chứa video cần sửa")
    args = parser.parse_args()

    target_dir = args.dir
    if not os.path.exists(target_dir):
        print(Fore.RED + f"[!] Thư mục không tồn tại: {target_dir}")
        sys.exit(1)

    print(Fore.CYAN + Style.BRIGHT + "=" * 70)
    print(Fore.CYAN + Style.BRIGHT + "   HERODUB PUBLISHING SUITE - TOOL QUÉT & SỬA TOÀN DIỆN ẢNH 3D (v2.0)")
    print(Fore.CYAN + Style.BRIGHT + "=" * 70)
    print(Fore.WHITE + f"[*] Thư mục quét: {target_dir}")

    # Khởi động WebSocket server
    bridge = LocalWebSocketBridgeServer(WS_HOST, WS_PORT)
    if not bridge.start():
        sys.exit(1)

    print(Fore.YELLOW + "[*] Vui lòng đảm bảo Chrome Profile (Gemini Web) đang mở và Extension bật kết nối...")
    print(Fore.YELLOW + "    Đang chờ Chrome Extension kết nối (hoặc ấn Ctrl+C để thoát)...")

    wait_sec = 0
    while not bridge.is_connected():
        time.sleep(1)
        wait_sec += 1
        if wait_sec % 5 == 0:
            print(Fore.YELLOW + f"  ... Dang cho Chrome Extension ket noi ({wait_sec}s)...")

    print(Fore.GREEN + Style.BRIGHT + "\n[✓] ĐÃ KẾT NỐI VỚI CHROME EXTENSION! BẮT ĐẦU QUÉT TOÀN BỘ FILE...")

    # Quét toàn bộ video .mp4
    all_files = os.listdir(target_dir)
    mp4_files = [f for f in all_files if f.lower().endswith('.mp4')]

    chinese_regex = re.compile(r'[\u4e00-\u9fff]')
    needs_repair = []
    stats = {
        "full_chinese_rename": 0,
        "image_redesign_only": 0,
        "missing_image_extracted": 0,
        "already_perfect": 0
    }

    for mp4 in mp4_files:
        base_name = os.path.splitext(mp4)[0]
        full_mp4 = os.path.join(target_dir, mp4)
        full_srt = os.path.join(target_dir, f"{base_name}.srt")
        full_txt = os.path.join(target_dir, f"{base_name}.txt")
        full_jpg = os.path.join(target_dir, f"{base_name}.jpg")
        if not os.path.exists(full_jpg):
            full_jpg = os.path.join(target_dir, f"{base_name}.jpeg")

        has_chinese_name = bool(chinese_regex.search(mp4))
        missing_jpg = not os.path.exists(full_jpg) or os.path.getsize(full_jpg) < 100
        is_3d_img = is_image_already_redesigned(full_jpg) if not missing_jpg else False
        missing_txt = not os.path.exists(full_txt)

        # CẦN XỬ LÝ NẾU:
        # 1. Tên MP4 còn tiếng Trung
        # 2. Hoặc ảnh chưa phải là ảnh 3D (kích thước gốc Douyin còn chữ Trung)
        # 3. Hoặc thiếu file ảnh / ảnh hỏng
        # 4. Hoặc thiếu file txt
        if has_chinese_name or not is_3d_img or missing_jpg or missing_txt:
            task_type = "image_only"
            if has_chinese_name:
                stats["full_chinese_rename"] += 1
                task_type = "full_rename"
            elif missing_jpg:
                stats["missing_image_extracted"] += 1
                task_type = "extract_and_redesign"
            else:
                stats["image_redesign_only"] += 1
                task_type = "image_redesign_only"

            needs_repair.append({
                "mp4": full_mp4,
                "srt": full_srt if os.path.exists(full_srt) else None,
                "jpg": full_jpg if (os.path.exists(full_jpg) and os.path.getsize(full_jpg) >= 100) else None,
                "txt": full_txt if os.path.exists(full_txt) else None,
                "raw_name": base_name,
                "has_chinese_name": has_chinese_name,
                "needs_copywriting": has_chinese_name or missing_txt,
                "needs_image_redesign": not is_3d_img or missing_jpg,
                "task_type": task_type
            })
        else:
            stats["already_perfect"] += 1

    # Sắp xếp theo mã số tập
    def get_num(item):
        m = re.match(r'^(\d+)', item["raw_name"])
        return int(m.group(1)) if m else 999999
    needs_repair.sort(key=get_num)

    total_tasks = len(needs_repair)
    print(Fore.WHITE + f"\n[*] Thống kê phân loại {len(mp4_files)} video:")
    print(Fore.GREEN + f"  - Đã hoàn hảo (Đã có ảnh 3D 720p & Tên Việt): {stats['already_perfect']} video (Bỏ qua)")
    print(Fore.YELLOW + f"  - Video cần dịch tên & vẽ ảnh 3D toàn diện: {stats['full_chinese_rename']} video")
    print(Fore.CYAN + f"  - Video đã có tên Việt, chỉ cần vẽ lại ảnh 3D: {stats['image_redesign_only']} video")
    print(Fore.MAGENTA + f"  - Video bị thiếu/hỏng ảnh (Tự chụp từ MP4): {stats['missing_image_extracted']} video")
    print(Fore.MAGENTA + Style.BRIGHT + f"\n[*] TỔNG CỘNG CẦN XỬ LÝ: {total_tasks} VIDEO!")

    if total_tasks == 0:
        print(Fore.GREEN + Style.BRIGHT + "\n[✓] CHÚC MỪNG: 100% video trong thư mục đều đã có ảnh 3D Vàng Kim và Tên Việt hoàn hảo!")
        sys.exit(0)

    for idx, item in enumerate(needs_repair, 1):
        raw_name = item["raw_name"]
        pct = round((idx / total_tasks) * 100, 1)
        print(Fore.CYAN + Style.BRIGHT + f"\n" + "=" * 65)
        print(Fore.CYAN + Style.BRIGHT + f"[{idx}/{total_tasks}] ({pct}%) ĐANG XỬ LÝ: {raw_name[:50]}...")
        print(Fore.CYAN + Style.BRIGHT + "=" * 65)

        # Trích xuất mã số tập nếu có
        prefix_num = ""
        m_num = re.match(r'^(\d+)_', raw_name)
        if m_num:
            prefix_num = m_num.group(1) + "_"

        # 1. Đọc mẫu phụ đề tiếng Việt từ .srt
        sample_subs = []
        sub_count = 0
        if item["srt"]:
            sample_subs = extract_sample_subtitles(item["srt"], sample_count=15)
            try:
                with open(item["srt"], "r", encoding="utf-8", errors="ignore") as f_s:
                    sub_count = len(re.findall(r'-->', f_s.read()))
            except Exception:
                sub_count = 100

        # 2. Xác định Tiêu đề, Mô tả và Hashtags
        new_title = raw_name
        description = f"Video thuyết minh: {raw_name}. Theo dõi hành trình sinh tồn và chế tác tự nhiên hấp dẫn!"
        hashtags = "#sinhton #hoangda #ruinho #bushcraft #chetao"

        if item["needs_copywriting"]:
            clean_src = re.sub(r'^\d+_', '', raw_name).strip()
            copywriting = generate_copywriting(clean_src, prefix_num, sample_subs, bridge)
            new_title = copywriting["new_title"]
            description = copywriting["description"]
            hashtags = copywriting["hashtags"]
        else:
            # Tên đã là tiếng Việt chuẩn -> Đọc lại description/hashtags nếu có trong .txt
            if item["txt"] and os.path.exists(item["txt"]):
                try:
                    with open(item["txt"], "r", encoding="utf-8", errors="ignore") as f_txt:
                        t_content = f_txt.read()
                        d_m = re.search(r'MÔ TẢ NỘI DUNG.*?\n(.*?)\n\n', t_content, re.DOTALL)
                        if d_m: description = d_m.group(1).strip()
                        h_m = re.search(r'HASHTAGS:\n(.*?)\n\n', t_content, re.DOTALL)
                        if h_m: hashtags = h_m.group(1).strip()
                except Exception:
                    pass
            print(Fore.GREEN + f"  [✓] Giữ nguyên tiêu đề tiếng Việt có sẵn: {new_title}")

        new_title = re.sub(r'[\\/:*?"<>|]', ' ', new_title).strip()
        if not new_title:
            new_title = f"{prefix_num}Video_Thuyet_Minh_Sinh_Ton"

        new_mp4_path = os.path.join(target_dir, f"{new_title}.mp4")
        new_srt_path = os.path.join(target_dir, f"{new_title}.srt")
        new_jpg_path = os.path.join(target_dir, f"{new_title}.jpg")

        # 3. Chuẩn bị ảnh đầu vào (Nếu thiếu hoặc hỏng -> Tự chụp từ video)
        source_thumb = item["jpg"]
        if not source_thumb or not os.path.exists(source_thumb):
            temp_extracted_jpg = os.path.join(target_dir, f"_temp_frame_{idx}.jpg")
            extracted = extract_frame_from_video(item["mp4"], temp_extracted_jpg)
            if extracted:
                source_thumb = extracted

        # 4. Vẽ lại ảnh bìa 3D tiếng Việt qua Gemini Imagen 3
        new_3d_img = None
        if source_thumb and os.path.exists(source_thumb):
            new_3d_img = redesign_thumbnail(source_thumb, new_title, bridge)

        if new_3d_img and os.path.exists(new_3d_img):
            optimize_thumbnail(new_3d_img)
            try:
                if os.path.abspath(new_3d_img) != os.path.abspath(new_jpg_path):
                    shutil.copy2(new_3d_img, new_jpg_path)
                print(Fore.GREEN + Style.BRIGHT + f"  [✓] ĐÃ CẬP NHẬT ẢNH BÌA 3D VÀNG KIM THÀNH CÔNG: {os.path.basename(new_jpg_path)}")
                # Dọn dẹp ảnh tạm nếu có
                if source_thumb and source_thumb.startswith(os.path.join(target_dir, "_temp_frame_")):
                    try: os.remove(source_thumb)
                    except Exception: pass
            except Exception as img_err:
                print(Fore.YELLOW + f"  [!] Lỗi lưu ảnh 3D: {img_err}")
        elif source_thumb and os.path.exists(source_thumb):
            if os.path.abspath(source_thumb) != os.path.abspath(new_jpg_path):
                try: os.replace(source_thumb, new_jpg_path)
                except Exception: pass

        # 5. Đổi tên file .mp4 và .srt (nếu tên thay đổi)
        if os.path.abspath(item["mp4"]) != os.path.abspath(new_mp4_path):
            try:
                os.replace(item["mp4"], new_mp4_path)
                print(Fore.GREEN + f"  [✓] Đã đổi tên video: {os.path.basename(new_mp4_path)}")
            except Exception as ren_e:
                print(Fore.RED + f"  [!] Không thể đổi tên MP4: {ren_e}")

        if item["srt"] and os.path.exists(item["srt"]):
            if os.path.abspath(item["srt"]) != os.path.abspath(new_srt_path):
                try:
                    os.replace(item["srt"], new_srt_path)
                    print(Fore.GREEN + f"  [✓] Đã đổi tên phụ đề: {os.path.basename(new_srt_path)}")
                except Exception as ren_e:
                    print(Fore.RED + f"  [!] Không thể đổi tên SRT: {ren_e}")

        if item["txt"] and os.path.exists(item["txt"]):
            if os.path.abspath(item["txt"]) != os.path.abspath(os.path.join(target_dir, f"{new_title}.txt")):
                try: os.remove(item["txt"])
                except Exception: pass

        # 6. Xuất file TXT đăng bài chuẩn
        write_copywriting_txt(
            target_dir=target_dir,
            new_title=new_title,
            description=description,
            hashtags=hashtags,
            duration_sec=300.0,
            sub_count=sub_count,
            new_mp4_name=f"{new_title}.mp4",
            new_srt_name=f"{new_title}.srt",
            new_jpg_name=f"{new_title}.jpg"
        )

        print(Fore.GREEN + Style.BRIGHT + f"[✓] HOÀN TẤT VIDEO #{idx}/{total_tasks}: {new_title}\n")
        time.sleep(1.2)

    print(Fore.GREEN + Style.BRIGHT + "\n" + "=" * 70)
    print(Fore.GREEN + Style.BRIGHT + f"   🎉 CHÚC MỪNG: ĐÃ SỬA VÀ ĐÓNG GÓI XONG 100% ({total_tasks} VIDEO)!")
    print(Fore.GREEN + Style.BRIGHT + "=" * 70)

if __name__ == "__main__":
    main()
