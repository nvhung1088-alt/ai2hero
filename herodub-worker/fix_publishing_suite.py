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

def is_meaningful_title(title):
    """
    Kiểm tra xem tiêu đề tiếng Việt có thực sự có nghĩa hay không:
    - Không chứa chữ tiếng Trung Quốc.
    - Không bị cụt ngủn hoặc vô nghĩa như Vlog_AI____, video_123, ___.
    - Có ít nhất 2 từ và độ dài chữ có nghĩa >= 7 ký tự.
    """
    if not title:
        return False
    str_t = str(title).strip()
    if re.search(r'[\u4e00-\u9fff]', str_t):
        return False
    clean_words = re.sub(r'^\d+_', '', str_t).strip()
    clean_words = re.sub(r'[^a-zA-Z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ\s]', ' ', clean_words).strip()
    words = clean_words.split()
    if len(words) < 2 or len(clean_words) < 7:
        return False
    lower_t = clean_words.lower()
    if lower_t in ["vlog ai", "video ai", "clip ai", "video", "clip", "vlog", "tap phim", "thuyet minh", "video goc"]:
        return False
    if re.match(r'^(vlog|clip|video)[\s_]*ai[\s_]*$', lower_t):
        return False
    if re.match(r'^(video|clip|vlog|task)[\s_]*\d+$', lower_t):
        return False
    return True

def detect_video_genre(title_vi, raw_title="", sample_subs=None):
    """
    Tự động nhận diện thể loại video dựa trên phân tích đa tầng:
    - Tiêu đề tiếng Việt
    - Tên file / Tiêu đề gốc (tiếng Trung / tiếng Anh)
    - Nội dung các câu thoại phụ đề mẫu
    Trả về một trong các nhóm:
    'anime_donghua', 'movie_drama', 'survival_bushcraft', 'food_cooking', 'science_discovery', 'general_lifestyle'
    """
    subs_text = " ".join(sample_subs or []).lower() if sample_subs else ""
    full_text = f"{title_vi} {raw_title} {subs_text}".lower()

    # 1. Hoạt hình 3D / Anime / Donghua / Tiên hiệp / Tu chân
    anime_keywords = [
        "anime", "3d", "donghua", "hoạt hình", "tu tiên", "tu chân", "đấu la", "thôn phệ", 
        "huyền huyễn", "tiên hiệp", "võ hiệp", "kiếm hiệp", "ma pháp", "trùng sinh", "dị năng",
        "hệ thống", "tông môn", "thần vương", "chiến thần", "chí tôn", "linh thú",
        "动漫", "动画", "修仙", "玄幻", "斗罗", "吞噬", "修真", "仙侠", "武侠", "重生", "系统", "神魔"
    ]
    if any(k in full_text for k in anime_keywords):
        return "anime_donghua"

    # 2. Ẩm thực / Nấu ăn / Food / Mukbang
    food_keywords = [
        "ẩm thực", "món ăn", "nấu ăn", "món ngon", "nướng", "chiên", "xào", "hầm", "lẩu",
        "bếp", "mukbang", "quán ăn", "đặc sản", "bánh", "gà nướng", "thịt nướng", "cá nướng",
        "hải sản", "bữa ăn", "ăn uống", "mỹ thực", "gourmet", "cooking", "food",
        "美食", "做饭", "吃播", "炒菜", "小吃", "街头美食", "烹饪", "烧烤", "海鲜"
    ]
    if any(k in full_text for k in food_keywords):
        return "food_cooking"

    # 3. Sinh tồn / Chế tác / Nơi trú ẩn / Hoang dã (Bushcraft)
    survival_keywords = [
        "sinh tồn", "hoang dã", "chế tác", "nơi trú ẩn", "hốc cây", "nhà gỗ", "hang đá",
        "nhà đất", "chòi gỗ", "cây cổ thụ", "bão tuyết", "rừng rậm", "bẫy thú", "cắm trại",
        "bushcraft", "survival", "camping", "shelter",
        "荒野", "求生", "庇护所", "木屋", "树洞", "石屋", "荒野建造", "庇护所建造", "露营"
    ]
    if any(k in full_text for k in survival_keywords):
        return "survival_bushcraft"

    # 4. Phim ngắn / Drama / Đô thị / Tình cảm / Review phim
    movie_keywords = [
        "phim", "tập", "drama", "tổng tài", "hôn nhân", "mẹ chồng", "nàng dâu", "ngược tâm",
        "trả thù", "đô thị", "tình yêu", "ngoại tình", "tiểu tam", "review phim", "tóm tắt phim",
        "short film", "movie",
        "短剧", "电视剧", "电影", "剧情", "霸总", "逆袭", "爱情", "都市", "婆媳", "复仇"
    ]
    if any(k in full_text for k in movie_keywords):
        return "movie_drama"

    # 5. Khoa học / Khám phá / Bí ẩn / Tài liệu
    science_keywords = [
        "khoa học", "khám phá", "vũ trụ", "bí ẩn", "lịch sử", "công nghệ", "động vật",
        "thiên nhiên", "kỳ lạ", "tại sao", "giải mã", "tri thức", "khoa kỹ",
        "科普", "科学", "探索", "宇宙", "未解之谜", "动物", "纪录片", "黑科技"
    ]
    if any(k in full_text for k in science_keywords):
        return "science_discovery"

    return "general_lifestyle"

def get_default_hashtags_by_genre(genre):
    mapping = {
        "anime_donghua": "#hoathinh3d #donghua #anime #reviewphim #phimhay #xuhuong #tutien #huyenhuyen",
        "movie_drama": "#phimngan #drama #tomtatphim #reviewphim #phimhay #xuhuong #phimmoi #tinhcam",
        "food_cooking": "#amthuc #monngon #nauan #cooking #food #mukbang #asmr #monanngon #xuhuong",
        "survival_bushcraft": "#sinhton #hoangda #ruinho #bushcraft #chetao #asmr #nhago #kynangsinhton",
        "science_discovery": "#khoahoc #khampha #bian #vutru #kienthuc #tailieu #thegioidongvat #xuhuong",
        "general_lifestyle": "#video #cuocsong #thugian #khampha #xuhuong #hot #giaitri"
    }
    return mapping.get(genre, mapping["general_lifestyle"])

def build_rich_vietnamese_description(title_vi, raw_title="", sample_subs=None):
    """
    Tự động xây dựng bài mô tả video chuẩn SEO 100% Tiếng Việt, chuyên nghiệp và giàu cảm xúc.
    Tự động thích ứng theo ĐÚNG THỂ LOẠI: Hoạt hình 3D, Phim drama, Ẩm thực, Khoa học, Sinh tồn, Đời sống...
    Tuyệt đối không chứa ký tự tiếng Trung nào!
    """
    clean_t = re.sub(r'[\u4e00-\u9fff]', '', str(title_vi or '')).strip()
    clean_t = re.sub(r'^\d+_', '', clean_t).strip()
    if not clean_t:
        clean_t = "Tác Phẩm Đặc Sắc Tuyển Chọn"

    genre = detect_video_genre(clean_t, raw_title, sample_subs)
    t_lower = (clean_t + " " + str(raw_title or "")).lower()

    # Nhánh 1: Hoạt hình 3D / Anime / Donghua / Tiên hiệp
    if genre == "anime_donghua":
        p1 = f"Chào mừng các bạn đến với tập phim mới nhất: \"{clean_t}\"!\nBước vào thế giới hoạt hình 3D huyền ảo với chất lượng đồ họa đỉnh cao, mở ra hành trình phiêu lưu kỳ thú và những trận chiến mãn nhãn không thể rời mắt."
        p2 = "Trong tập này: Diễn biến câu chuyện được đẩy lên cao trào kịch tính với những màn chạm trán nảy lửa giữa các thế lực, sự đột phá công pháp và mưu lược quyết đoán của nhân vật chính khi đối mặt với hiểm nguy trùng trùng."
        if sample_subs and len(sample_subs) >= 2:
            sub_samples = [s.strip() for s in sample_subs if s and len(s) > 8 and not re.search(r'[\u4e00-\u9fff]', s)][:2]
            if sub_samples:
                p2 += f" Điểm nhấn ấn tượng với những câu thoại đắt giá: \"{'; '.join(sub_samples)}\"."
        p3 = "Kỹ xảo 3D sắc nét từng khung hình kết hợp cùng âm thanh hào hùng chắc chắn sẽ mang đến cho bạn trải nghiệm thị giác tuyệt vời nhất.\n\n🔔 Hãy bấm LIKE, CHIA SẺ và ĐĂNG KÝ KÊNH để cùng đồng hành trong những tập phim bom tấn tiếp theo nhé!"

    # Nhánh 2: Ẩm thực / Nấu ăn / Food / Mukbang
    elif genre == "food_cooking":
        p1 = f"Chào mừng các bạn đến với không gian ẩm thực hấp dẫn và ấm cúng cùng \"{clean_t}\"!\nCùng khám phá những nét tinh hoa ẩm thực độc đáo và tận hưởng niềm vui nấu nướng mỗi ngày."
        p2 = "Tập hôm nay mang đến trải nghiệm vị giác bùng nổ: Từng bước lựa chọn nguyên liệu tươi ngon, công thức tẩm ướp đậm đà và kỹ thuật chế biến công phu để tạo nên món ăn thơm nức mũi, chuẩn vị và đẹp mắt."
        if sample_subs and len(sample_subs) >= 2:
            sub_samples = [s.strip() for s in sample_subs if s and len(s) > 8 and not re.search(r'[\u4e00-\u9fff]', s)][:2]
            if sub_samples:
                p2 += f" Đặc biệt cùng những chia sẻ bí quyết nấu nướng: \"{'; '.join(sub_samples)}\"."
        p3 = "Âm thanh xèo xèo sôi sục trên bếp lửa hòa quyện cùng màu sắc bắt mắt mang lại cảm giác thư thái, kích thích trọn vẹn mọi giác quan (ASMR Cooking).\n\n🔔 Đừng quên bấm LIKE, LƯU LẠI công thức và ĐĂNG KÝ KÊNH để cùng học thêm nhiều món ngon mỗi ngày nhé!"

    # Nhánh 3: Phim ngắn / Drama / Đô thị / Review tóm tắt phim
    elif genre == "movie_drama":
        p1 = f"Chào mừng các bạn đến với tập phim đặc sắc: \"{clean_t}\"!\nMột câu chuyện lôi cuốn chứa đựng nhiều cung bậc cảm xúc, dẫn dắt khán giả qua những tình huống bất ngờ và kịch tính."
        p2 = "Diễn biến tập phim mở ra với những xung đột gay cấn, sự giằng xé nội tâm và những quyết định mang tính bước ngoặt của các tuyến nhân vật. Từng bí mật dần được hé lộ, đẩy cao trào câu chuyện lên đỉnh điểm."
        if sample_subs and len(sample_subs) >= 2:
            sub_samples = [s.strip() for s in sample_subs if s and len(s) > 8 and not re.search(r'[\u4e00-\u9fff]', s)][:2]
            if sub_samples:
                p2 += f" Những câu thoại giàu ý nghĩa: \"{'; '.join(sub_samples)}\"."
        p3 = "Tập phim để lại nhiều suy ngẫm sâu sắc về cuộc sống, tình người và những giá trị nhân văn lắng đọng.\n\n🔔 Hãy nhấn LIKE, BÌNH LUẬN cảm nghĩ của bạn và ĐĂNG KÝ KÊNH để không bỏ lỡ tập phim hấp dẫn tiếp theo!"

    # Nhánh 4: Khoa học / Khám phá / Bí ẩn / Tài liệu
    elif genre == "science_discovery":
        p1 = f"Chào mừng các bạn đến với hành trình khám phá thế giới tri thức kỳ thú qua video \"{clean_t}\"!\nMở rộng tầm nhìn với những điều kỳ diệu của tự nhiên, khoa học và cuộc sống xung quanh ta."
        p2 = "Video phân tích chi tiết và giải mã những hiện tượng thú vị, cung cấp góc nhìn khoa học trực quan, dễ hiểu cùng những dẫn chứng sống động giúp bạn giải đáp những thắc mắc bất ngờ nhất."
        p3 = "Mỗi kiến thức mới là một bước tiến mở rộng hiểu biết và khơi dậy niềm say mê học hỏi không ngừng.\n\n🔔 Đừng quên bấm LIKE, CHIA SẺ và ĐĂNG KÝ KÊNH để đồng hành cùng chúng mình trong những hành trình khám phá tiếp theo!"

    # Nhánh 5: Sinh tồn / Chế tác / Hoang dã (Bushcraft)
    elif genre == "survival_bushcraft":
        p1 = f"Chào mừng các bạn đã quay trở lại với hành trình sinh tồn và chế tác tự nhiên hoang dã!\nTrong tập hôm nay: Cùng theo dõi hành trình đầy cảm hứng \"{clean_t}\", khi con người hòa mình trọn vẹn vào thiên nhiên đại ngàn để tạo nên những điều kỳ diệu từ đôi bàn tay khéo léo."
        details = []
        if any(k in t_lower for k in ["cổ thụ", "gốc cây", "hốc cây", "cây rỗng", "thụ động"]):
            details.append("tận dụng gốc cây cổ thụ vững chãi làm điểm tựa kiên cố để kiến tạo không gian sống ấm cúng")
        elif any(k in t_lower for k in ["nhà đá", "hang đá", "vách đá", "thạch ốc"]):
            details.append("chọn vách đá tự nhiên hiểm trở làm nơi trú ngụ kiên cố, xếp từng viên đá tạo dựng nên căn nhà vững như bàn thạch")
        elif any(k in t_lower for k in ["nhà gỗ", "mộc ốc", "gỗ", "chòi gỗ"]):
            details.append("từng bước đốn hạ, đo đạc và lắp ghép các thân gỗ tự nhiên thành bộ khung nhà gỗ chắc chắn và thoáng mát")
        else:
            details.append("lựa chọn địa thế phong thủy lý tưởng giữa rừng già để xây dựng nơi trú ẩn an toàn, chống chọi mưa gió thú dữ")

        if any(k in t_lower for k in ["ẩm thực", "món ăn", "nấu ăn", "nướng", "thịt", "cá", "gà", "mỹ thực", "bữa ăn"]):
            details.append("sau những giờ lao động hăng say là khoảnh khắc quây quần tự tay chế biến và thưởng thức những món ăn dã ngoại nóng hổi, thơm lừng giữa tiết trời se lạnh")
        else:
            details.append("hoàn thiện từng chi tiết nội thất mộc mạc bên trong, mang đến sự tiện nghi và cảm giác bình yên đến lạ kỳ")

        p2 = f"Quá trình thực hiện đòi hỏi sự kiên trì, tỉ mỉ và kỹ năng sinh tồn đỉnh cao — từ khâu {'; '.join(details)}."
        p3 = "Từng nhịp búa đẽo gọt, tiếng gió xào xạc hòa cùng âm thanh thiên nhiên hoang sơ mang lại cảm giác thư thái, giải tỏa mọi áp lực cuộc sống (ASMR).\n\n🔔 Đừng quên bấm LIKE, CHIA SẺ và ĐĂNG KÝ KÊNH để tiếp thêm động lực cho chúng mình ra mắt những tập chế tác đỉnh cao tiếp theo nhé!"

    # Nhánh 6: Mặc định / Đời sống / Vlog / Thư giãn
    else:
        p1 = f"Chào mừng các bạn đến với video \"{clean_t}\"!\nCùng đón xem những khoảnh khắc thú vị, câu chuyện thường nhật ý nghĩa và những trải nghiệm đặc sắc nhất được chia sẻ trọn vẹn trong tập này."
        p2 = "Nội dung video mang đến những diễn biến lôi cuốn, góc nhìn chân thực và những tình huống thú vị giúp người xem có những phút giây giải trí trọn vẹn."
        if sample_subs and len(sample_subs) >= 2:
            sub_samples = [s.strip() for s in sample_subs if s and len(s) > 8 and not re.search(r'[\u4e00-\u9fff]', s)][:2]
            if sub_samples:
                p2 += f" Điểm nhấn với những chia sẻ mộc mạc: \"{'; '.join(sub_samples)}\"."
        p3 = "Hy vọng video sẽ mang lại cho bạn những phút giây thư giãn thoải mái và nguồn năng lượng tích cực.\n\n🔔 Đừng quên bấm LIKE, CHIA SẺ và ĐĂNG KÝ KÊNH để theo dõi những video mới nhất tiếp theo nhé!"

    full_desc = f"{p1}\n\n{p2}\n\n{p3}"
    full_desc = re.sub(r'[\u4e00-\u9fff]', '', full_desc).strip()
    return full_desc

# ---------------------------------------------------------
# GEMINI AI PROCESSING (TEXT & IMAGE)
# ---------------------------------------------------------
def generate_copywriting(clean_source_title, prefix_num, sample_subs, bridge_server, thumb_src=None):
    subs_text = "\n".join([f"- {s}" for s in sample_subs if s]) if sample_subs else "(Không có phụ đề)"

    # Chuẩn bị ảnh đính kèm (Multimodal) nếu có ảnh bìa gốc
    attachments = []
    if thumb_src and os.path.exists(thumb_src):
        try:
            with open(thumb_src, "rb") as f_img:
                b64_data = base64.b64encode(f_img.read()).decode("utf-8")
                attachments.append({
                    "name": os.path.basename(thumb_src),
                    "type": "image/jpeg",
                    "data": f"data:image/jpeg;base64,{b64_data}"
                })
                print(Fore.CYAN + f"  [📸 Vision Ready] Da nạp ảnh bìa gốc để gửi kèm cho Gemini quan sát!")
        except Exception:
            pass

    prompt = f"""[HỆ THỐNG: BẮT BUỘC CHỈ TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON THUẦN TÚY. KHÔNG CHÀO HỎI, KHÔNG GIẢI THÍCH]

Hãy đóng vai Giám đốc Sáng tạo & Biên tập Nội dung Video Đa Thể Loại chuyên nghiệp (YouTube Shorts, TikTok, Facebook Reels).
Dưới đây là thông tin video:
- Ảnh bìa thumbnail gốc của video: (Xem ảnh đính kèm - hãy quan sát kỹ nhân vật, biểu cảm, bối cảnh và ĐẶC BIỆT LÀ DÒNG CHỮ TIÊU ĐỀ TRÊN ẢNH BÌA GỐC để nắm bắt trọn vẹn chủ đề)
- Tên file gốc video: {clean_source_title}
- Các câu thoại phụ đề thực tế trong video:
{subs_text}

QUY TẮC BẮT BUỘC TUYỆT ĐỐI (100% TIẾNG VIỆT - TUYỆT ĐỐI KHÔNG CÓ KÝ TỰ TIẾNG TRUNG):
1. TỰ ĐỘNG NHẬN DIỆN THỂ LOẠI & NỘI DUNG CHÍNH XÁC TỪ ẢNH BÌA VÀ PHỤ ĐỀ:
   - Đọc chữ trên ảnh bìa kết hợp với hình ảnh nhân vật và phụ đề để hiểu câu chuyện (Ví dụ: Chú heo bông đi khám bệnh viện bị từ chối xem vlog, Chế tác nhà gỗ trong rừng, Hoạt hình 3D tu tiên, v.v.).
2. "new_title": Đặt Tiêu đề Tiếng Việt cực kỳ cuốn hút, giật tít câu view chuẩn SEO (dưới 65 ký tự, trọn vẹn câu, sát với nội dung và thể loại video).
   - TUYỆT ĐỐI KHÔNG để chữ tiếng Trung, TUYỆT ĐỐI KHÔNG để tiêu đề cụt ngủn hoặc vô nghĩa như "Vlog_AI____".
   - Phải là một câu trọn nghĩa, hấp dẫn, khơi gợi tò mò mạnh mẽ.
3. "description": Viết đoạn mô tả chi tiết, bài bản và lôi cuốn (120-200 từ), chia thành 3 đoạn văn rõ ràng:
   - Đoạn 1: Mở màn hấp dẫn về nhân vật, bối cảnh hoặc tình huống mở đầu video.
   - Đoạn 2: Tóm tắt chi tiết các diễn biến then chốt, tình tiết bất ngờ hoặc điểm cao trào kịch tính.
   - Đoạn 3: Cảm xúc đọng lại hoặc năng lượng tích cực, kèm lời kêu gọi Like, Chia sẻ và Đăng ký kênh.
4. "hashtags": Tạo bộ 8-10 hashtag chuẩn SEO theo đúng thể loại video.

CẤU TRÚC JSON MẪU:
{{
  "new_title": "Tiêu đề tiếng Việt chuẩn nội dung tại đây",
  "description": "Đoạn 1 mở màn...\\n\\nĐoạn 2 chi tiết các công đoạn/diễn biến...\\n\\nĐoạn 3 cảm xúc và lời kêu gọi đăng ký kênh...",
  "hashtags": "#theloai1 #theloai2 #hashtag3 #xuhuong #phimhay"
}}"""

    init_vi_title = clean_source_title
    if re.search(r'[\u4e00-\u9fff]', clean_source_title):
        pure_ch = re.sub(r'^\d+_', '', clean_source_title).strip()
        tr = google_translate(pure_ch, dest='vi')
        if tr and not re.search(r'[\u4e00-\u9fff]', tr):
            clean_tr = re.sub(r'[\\/:*?"<>|]', ' ', tr).strip()
            init_vi_title = f"{prefix_num}{clean_tr}"

    init_genre = detect_video_genre(init_vi_title, clean_source_title, sample_subs)
    result = {
        "new_title": init_vi_title,
        "description": build_rich_vietnamese_description(init_vi_title, clean_source_title, sample_subs),
        "hashtags": get_default_hashtags_by_genre(init_genre),
    }

    if bridge_server and bridge_server.is_connected():
        print(Fore.CYAN + f"  [⚡ Gemini Multimodal Copywriting] Dang gui anh bia + ten file + sub sang Gemini Web...")
        ws_res = bridge_server.execute_job(prompt, attachments=attachments, target_ai="gemini", timeout=120, allow_failover=False)
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
                            t_val = re.sub(r'[\u4e00-\u9fff]', '', t_val).strip()
                            clean_t = re.sub(r'[\\/:*?"<>|]', ' ', t_val).strip()
                            if is_meaningful_title(clean_t):
                                result["new_title"] = f"{prefix_num}{clean_t}" if prefix_num and not clean_t.startswith(prefix_num) else clean_t
                                parsed_success = True
                        if parsed.get("description"):
                            d_val = str(parsed.get("description")).strip()
                            d_val = re.sub(r'[\u4e00-\u9fff]', '', d_val).strip()
                            if len(d_val) >= 50:
                                result["description"] = d_val
                        if parsed.get("hashtags"):
                            h_val = str(parsed.get("hashtags")).strip()
                            h_val = re.sub(r'[\u4e00-\u9fff]', '', h_val).strip()
                            if h_val:
                                result["hashtags"] = h_val
                        if parsed_success:
                            print(Fore.GREEN + Style.BRIGHT + f"  [⚡ Gemini Copywriting] Da tao Tieu de & Mo ta moi: {result['new_title']}")
            except Exception:
                pass

            if not parsed_success:
                title_m = re.search(r'"new_title"\s*:\s*"([^"]+)"', raw_out)
                if title_m:
                    t_val = title_m.group(1).strip()
                    t_val = re.sub(r'[\u4e00-\u9fff]', '', t_val).strip()
                    clean_t = re.sub(r'[\\/:*?"<>|]', ' ', t_val).strip()
                    if is_meaningful_title(clean_t):
                        result["new_title"] = f"{prefix_num}{clean_t}" if prefix_num and not clean_t.startswith(prefix_num) else clean_t
                        print(Fore.GREEN + Style.BRIGHT + f"  [⚡ Gemini Copywriting] Da trich xuat Tieu de moi: {result['new_title']}")
                desc_m = re.search(r'"description"\s*:\s*"([^"]+)"', raw_out)
                if desc_m:
                    d_val = desc_m.group(1).strip()
                    d_val = re.sub(r'[\u4e00-\u9fff]', '', d_val).strip()
                    if len(d_val) >= 50:
                        result["description"] = d_val
                hash_m = re.search(r'"hashtags"\s*:\s*"([^"]+)"', raw_out)
                if hash_m:
                    h_val = hash_m.group(1).strip()
                    h_val = re.sub(r'[\u4e00-\u9fff]', '', h_val).strip()
                    if h_val:
                        result["hashtags"] = h_val

    # RÀO CHẮN BẢO VỆ CỨU HỘ ĐẶC BIỆT: Chặn đứng 100% tiêu đề rác cụt ngủn như 'Vlog_AI____'
    if not is_meaningful_title(result["new_title"]):
        print(Fore.YELLOW + f"  [!] Phát hiện tiêu đề chưa hợp lệ hoặc cụt ngủn ('{result['new_title']}'). Kích hoạt cứu hộ...")
        pure_ch_title = re.sub(r'^\d+_', '', clean_source_title).strip()
        trans_title = google_translate(pure_ch_title, dest='vi')
        if trans_title and is_meaningful_title(trans_title):
            clean_t = re.sub(r'[\\/:*?"<>|]', ' ', trans_title).strip()
            result["new_title"] = f"{prefix_num}{clean_t}"
            print(Fore.CYAN + Style.BRIGHT + f"  [-] Đã tự động dịch tiêu đề gốc thành công: {result['new_title']}")
        elif sample_subs and len(sample_subs) > 0:
            for seg_text in sample_subs:
                t = str(seg_text).strip()
                if is_meaningful_title(t):
                    result["new_title"] = f"{prefix_num}{t[:60]}"
                    print(Fore.CYAN + Style.BRIGHT + f"  [-] Đã lấy câu phụ đề tiêu biểu làm tiêu đề: {result['new_title']}")
                    break
        if not is_meaningful_title(result["new_title"]):
            genre_name_map = {
                "anime_donghua": "Tập Phim Hoạt Hình 3D Đặc Sắc",
                "movie_drama": "Tập Phim Ngắn Kịch Tính",
                "food_cooking": "Hành Trình Khám Phá Ẩm Thực Hấp Dẫn",
                "survival_bushcraft": "Hành Trình Sinh Tồn Và Chế Tác",
                "science_discovery": "Khám Phá Thế Giới Tri Thức Bí Ẩn",
                "general_lifestyle": "Những Khoảnh Khắc Cuộc Sống Đáng Xem"
            }
            result["new_title"] = f"{prefix_num}{genre_name_map.get(init_genre, 'Tác Phẩm Đặc Sắc')}"

    # Đảm bảo description sạch tiếng Trung và có cấu trúc bài bản
    if re.search(r'[\u4e00-\u9fff]', result.get("description", "")) or len(result.get("description", "")) < 60:
        result["description"] = build_rich_vietnamese_description(result["new_title"], clean_source_title, sample_subs)

    return result

def get_gemini_api_key():
    """Lấy Gemini API Key từ biến môi trường hoặc file .env của app."""
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key.strip()
    env_paths = [
        os.path.join(os.path.dirname(__file__), "..", "app", ".env"),
        os.path.join(os.path.dirname(__file__), ".env"),
        r"c:\Users\ADMIN\OneDrive\Desktop\Ai2Hero\app\.env"
    ]
    for ep in env_paths:
        if os.path.exists(ep):
            try:
                with open(ep, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        if line.startswith("GEMINI_API_KEY="):
                            k = line.split("=", 1)[1].replace("'", "").replace('"', '').strip()
                            if k:
                                return k
            except Exception:
                pass
    return None

def create_local_3d_gold_thumbnail(src_path, title_text, out_path, tag_text="THUYẾT MINH"):
    """
    LOCAL 3D GOLD THUMBNAIL ENGINE CHO FIX SUITE:
    - Bố cục chữ ở 60%-72% chiều cao ảnh dọc 9:16 (vị trí vàng chữ cũ).
    - Typography 3D Vàng Kim (Extrusion Shadow 7 lớp + Black Stroke + Gold Sheen).
    - Badge đỏ ruby nhỏ gọn góc trên trái.
    - TUYỆT ĐỐI KHÔNG CÓ BẢNG ĐEN CHE BỨC ẢNH.
    """
    try:
        from PIL import Image, ImageDraw, ImageFont
        if not src_path or not os.path.exists(src_path):
            return None

        im = Image.open(src_path).convert('RGBA')
        w, h = im.size
        
        target_w = 720
        target_h = int(h * (target_w / w))
        im = im.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
        font_path = 'C:/Windows/Fonts/arialbd.ttf'
        if not os.path.exists(font_path):
            font_path = 'C:/Windows/Fonts/tahomabd.ttf'
        if not os.path.exists(font_path):
            font_path = 'C:/Windows/Fonts/arial.ttf'
            
        title = title_text.upper().strip()
        title = re.sub(r'^\d+_', '', title).strip()
        title = re.sub(r'[\\/:*?"<>|]', ' ', title).strip()
        
        words = title.split()
        lines = []
        if len(title) > 16 and len(words) >= 3:
            mid = len(words) // 2
            lines.append(' '.join(words[:mid]))
            lines.append(' '.join(words[mid:]))
        else:
            lines.append(title)
            
        font_size = 50 if len(lines) == 1 else 44
        font = ImageFont.truetype(font_path, font_size)
        
        max_text_w = max(font.getbbox(l)[2] - font.getbbox(l)[0] for l in lines)
        while max_text_w > (target_w * 0.84) and font_size > 22:
            font_size -= 2
            font = ImageFont.truetype(font_path, font_size)
            max_text_w = max(font.getbbox(l)[2] - font.getbbox(l)[0] for l in lines)
            
        line_h = int(font_size * 1.32)
        total_text_h = len(lines) * line_h
        
        # 1. TOP-LEFT BADGE
        if tag_text:
            badge_layer = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
            d_badge = ImageDraw.Draw(badge_layer)
            tag_font = ImageFont.truetype(font_path, 18)
            tb_box = tag_font.getbbox(tag_text)
            tw = tb_box[2] - tb_box[0]
            th = tb_box[3] - tb_box[1]
            
            bx, by = 14, 14
            bw = tw + 20
            bh = th + 12
            
            d_badge.rounded_rectangle([bx + 2, by + 2, bx + bw + 2, by + bh + 2], radius=8, fill=(0, 0, 0, 160))
            d_badge.rounded_rectangle([bx, by, bx + bw, by + bh], radius=8, fill=(210, 25, 35, 240), outline=(255, 220, 100, 220), width=1)
            tx = bx + (bw - tw) // 2
            ty = by + (bh - th) // 2 - 1
            d_badge.text((tx, ty), tag_text, font=tag_font, fill=(255, 255, 255))
            im = Image.alpha_composite(im, badge_layer)
            
        # 2. TYPOGRAPHY 3D VÀNG KIM TRỰC TIẾP
        text_start_y = max(int(target_h * 0.72) - (total_text_h // 2), int(target_h * 0.55))
        text_layer = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
        d_text = ImageDraw.Draw(text_layer)
        
        for idx, line in enumerate(lines):
            bbox = font.getbbox(line)
            lw = bbox[2] - bbox[0]
            lx = (target_w - lw) // 2
            ly = text_start_y + idx * line_h
            
            # Shadow 3D sâu
            for offset in range(7, 0, -1):
                d_text.text((lx + offset, ly + offset), line, font=font, fill=(0, 0, 0, 240))
            # Viền đen dày
            stroke_w = max(4, font_size // 9)
            d_text.text((lx, ly), line, font=font, fill=(255, 205, 0), stroke_width=stroke_w, stroke_fill=(0, 0, 0, 255))
            # Ánh kim phản chiếu
            d_text.text((lx, ly), line, font=font, fill=(255, 245, 140), stroke_width=1, stroke_fill=(210, 150, 0, 180))
            
        final_img = Image.alpha_composite(im, text_layer).convert('RGB')
        dest_dir = os.path.dirname(out_path)
        if dest_dir and not os.path.exists(dest_dir):
            os.makedirs(dest_dir, exist_ok=True)
        final_img.save(out_path, quality=92, optimize=True)
        return out_path
    except Exception as e:
        print(Fore.YELLOW + f"  [!] Loi render 3D Gold Thumbnail: {e}")
        return None

def clean_image_with_gemini_flash(thumb_src, out_clean_path, api_key=None, bridge_server=None):
    """
    BƯỚC 1: XÓA SẠCH TOÀN BỘ CHỮ TIẾNG TRUNG QUỐC & WATERMARK BẰNG GEMINI.
    - Giữ nguyên 100% nhân vật, nét mặt, bối cảnh, tỷ lệ và màu sắc.
    - TUYỆT ĐỐI KHÔNG VIẾT CHỮ TIẾNG VIỆT TẠI BƯỚC NÀY.
    - Xuất ra file ảnh nền hoàn toàn sạch chữ (Clean Background).
    """
    if not thumb_src or not os.path.exists(thumb_src):
        return None

    clean_prompt = """Hãy chỉnh sửa bức ảnh đính kèm này (Image Inpainting / Text Removal):
1. XÓA BỎ HOÀN TOÀN tất cả các dòng chữ tiếng Trung Quốc và watermark/logo trên ảnh.
2. Phục hồi chi tiết bối cảnh tự nhiên bị chữ che khuất.
3. BẮT BUỘC GIỮ NGUYÊN 100% nhân vật, biểu cảm, nét mặt, trang phục, ánh sáng, màu sắc và tỷ lệ khung hình gốc.
4. TUYỆT ĐỐI KHÔNG VIẾT BẤT KỲ CHỮ NÀO LÊN ẢNH, KHÔNG VẼ THÊM KHUNG ĐEN.
5. Xuất ra hình ảnh nền hoàn toàn sạch chữ (clean edited image without any text)."""

    # 1. ƯU TIÊN 1: BROWSER AI BRIDGE (Gemini Web Free qua Chrome Extension - 0đ)
    if bridge_server and bridge_server.is_connected():
        try:
            print(Fore.CYAN + Style.BRIGHT + f"  [🌐 Gemini Web Clean] Dang gui anh sang Gemini Web de xoa sach chu tieng Trung...")
            with open(thumb_src, "rb") as img_f:
                b64_data = base64.b64encode(img_f.read()).decode('utf-8')
                img_b64 = f"data:image/jpeg;base64,{b64_data}"

            payload = [{"name": os.path.basename(thumb_src), "type": "image/jpeg", "data": img_b64}]
            start_t = time.time()
            res = bridge_server.execute_job(clean_prompt, attachments=payload, target_ai="gemini", timeout=75, allow_failover=True)
            if res and res.get("success") and res.get("result"):
                m = re.search(r'!\[.*?\]\((data:image/[^)]+|https?://[^\s\)]+)\)', str(res.get("result")))
                if m:
                    u = m.group(1)
                    if u.startswith("data:image/"):
                        raw_b64 = u.split(",", 1)[1]
                        os.makedirs(os.path.dirname(out_clean_path), exist_ok=True)
                        with open(out_clean_path, "wb") as out_f:
                            out_f.write(base64.b64decode(raw_b64))
                        print(Fore.GREEN + Style.BRIGHT + f"  [✓ Gemini Web Clean] Da xoa sach chu TQ va nhan anh nen thanh cong (Base64)!")
                        return out_clean_path
                    elif u.startswith("http"):
                        req_dl = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
                        with urllib.request.urlopen(req_dl, timeout=20) as dl_resp:
                            os.makedirs(os.path.dirname(out_clean_path), exist_ok=True)
                            with open(out_clean_path, "wb") as out_f:
                                out_f.write(dl_resp.read())
                        print(Fore.GREEN + Style.BRIGHT + f"  [✓ Gemini Web Clean] Da tai anh nen sach tu Gemini Web URL!")
                        return out_clean_path

            # Watcher Downloads folder neu Extension tai ve may
            dl_img = get_latest_download_image(start_t - 2, timeout=4)
            if dl_img:
                shutil.copy2(dl_img, out_clean_path)
                print(Fore.GREEN + Style.BRIGHT + f"  [✓ Downloads Watcher] Da phat hien anh nen sach tai ve may: {os.path.basename(dl_img)}!")
                return out_clean_path
        except Exception as bridge_err:
            print(Fore.YELLOW + f"  [!] Gemini Bridge Clean loi: {bridge_err}, chuyen sang Flash API...")

    # 2. ƯU TIÊN 2: GEMINI FLASH IMAGE DIRECT API
    key = api_key or get_gemini_api_key()
    if key:
        try:
            print(Fore.CYAN + f"  [⚡ Gemini Flash Image] Dang gui anh sang Gemini Flash API de xoa chu tieng Trung (3s)...")
            with open(thumb_src, "rb") as f:
                b64_img = base64.b64encode(f.read()).decode("utf-8")

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={key}"
            payload = {
                "contents": [{
                    "parts": [
                        {"text": clean_prompt},
                        {"inline_data": {"mime_type": "image/jpeg", "data": b64_img}}
                    ]
                }]
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=45) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                candidates = res_data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    for p in parts:
                        inline = p.get("inlineData") or p.get("inline_data")
                        if inline and inline.get("data"):
                            img_bytes = base64.b64decode(inline["data"])
                            os.makedirs(os.path.dirname(out_clean_path), exist_ok=True)
                            with open(out_clean_path, "wb") as out_f:
                                out_f.write(img_bytes)

                            try:
                                from PIL import Image, ImageFilter
                                c_im = Image.open(out_clean_path).convert("RGBA")
                                cw, ch = c_im.size
                                wm_w = int(cw * 0.12)
                                wm_h = int(ch * 0.08)
                                wm_patch = c_im.crop((cw - wm_w, ch - wm_h * 2, cw, ch - wm_h)).filter(ImageFilter.GaussianBlur(2))
                                c_im.paste(wm_patch, (cw - wm_w, ch - wm_h))
                                c_im.convert("RGB").save(out_clean_path, quality=95)
                            except Exception:
                                pass

                            print(Fore.GREEN + Style.BRIGHT + f"  [✓ Gemini Flash Image] Da xoa sach chu TQ thanh cong (3s, {len(img_bytes)//1024} KB)!")
                            return out_clean_path
        except Exception as e:
            print(Fore.YELLOW + f"  [!] Gemini Flash API: {e}")

    # 3. FALLBACK CỤC BỘ: Tra ve anh goc
    return thumb_src

def render_adaptive_vietnamese_thumbnail(bg_image_path, title_text, out_path, style="auto", tag_text="THUYẾT MINH"):
    """
    BƯỚC 2: Ghép tiêu đề tiếng Việt chuẩn Typography vào ĐÚNG VỊ TRÍ CHỮ CŨ:
    - Nhận diện Aspect Ratio (Ngang 16:9 vs Dọc 9:16).
    - Hỗ trợ Font Thư pháp Việt (Charm-Bold.ttf) + 3D Vàng kim (Arial Bold).
    - Tự động căn chỉnh hào quang, bóng đổ 3D và tối ưu 720p.
    """
    try:
        from PIL import Image, ImageDraw, ImageFont, ImageFilter
        if not bg_image_path or not os.path.exists(bg_image_path):
            return None

        im = Image.open(bg_image_path).convert("RGBA")
        orig_w, orig_h = im.size
        ratio = orig_w / float(orig_h)

        if ratio >= 1.15:
            target_w = 1280
            target_h = int(target_w / ratio)
        else:
            target_w = 720
            target_h = int(target_w / ratio)
        im = im.resize((target_w, target_h), Image.Resampling.LANCZOS)
        w, h = target_w, target_h

        clean_title = re.sub(r'^\d+_', '', title_text).strip()
        clean_title = re.sub(r'[\\/:*?"<>|]', ' ', clean_title).strip()

        font_dir = os.path.join(os.path.dirname(__file__), "fonts")
        charm_path = os.path.join(font_dir, "Charm-Bold.ttf")
        arial_path = "C:/Windows/Fonts/arialbd.ttf"
        if not os.path.exists(arial_path):
            arial_path = "C:/Windows/Fonts/tahomabd.ttf"

        is_landscape = ratio >= 1.15

        chosen_style = style
        if chosen_style == "auto":
            chosen_style = "calligraphy" if (is_landscape and os.path.exists(charm_path)) else "gold_3d"

        # ẢNH NGANG 16:9
        if is_landscape:
            font_file = charm_path if (chosen_style in ["calligraphy", "neon_glow"] and os.path.exists(charm_path)) else arial_path
            
            words = clean_title.split()
            lines = []
            if len(words) >= 6:
                mid = len(words) // 2
                lines.append(' '.join(words[:mid]))
                lines.append(' '.join(words[mid:]))
            else:
                lines.append(clean_title)

            scale = w / 1024.0
            base_size = int((56 if len(lines) == 1 else 46) * scale)
            font = ImageFont.truetype(font_file, base_size)

            while max(font.getbbox(l)[2] - font.getbbox(l)[0] for l in lines) > (w * 0.82) and base_size > 22:
                base_size -= 2
                font = ImageFont.truetype(font_file, base_size)

            line_h = int(base_size * 1.28)
            total_text_h = len(lines) * line_h
            start_y = int(h * 0.68) if total_text_h < int(h * 0.22) else int(h * 0.63)

            # Glow
            glow_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            d_glow = ImageDraw.Draw(glow_layer)
            glow_color = (0, 210, 255, 120) if chosen_style in ["calligraphy", "neon_glow"] else (255, 200, 30, 110)
            glow_r = int(6 * scale)

            for idx, line in enumerate(lines):
                bbox = font.getbbox(line)
                lw = bbox[2] - bbox[0]
                lx = (w - lw) // 2
                ly = start_y + idx * line_h
                for dx in range(-glow_r*2, glow_r*2 + 1, 3):
                    for dy in range(-glow_r*2, glow_r*2 + 1, 3):
                        if dx*dx + dy*dy <= (glow_r*2)**2:
                            d_glow.text((lx + dx, ly + dy), line, font=font, fill=glow_color)
            glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(int(7 * scale)))
            im = Image.alpha_composite(im, glow_layer)

            # Chữ chính
            text_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            d_text = ImageDraw.Draw(text_layer)
            for idx, line in enumerate(lines):
                bbox = font.getbbox(line)
                lw = bbox[2] - bbox[0]
                lx = (w - lw) // 2
                ly = start_y + idx * line_h

                for s_off in range(int(5 * scale), 0, -1):
                    d_text.text((lx + s_off, ly + s_off), line, font=font, fill=(0, 0, 0, 230))
                stroke_w = max(4, int(4 * scale))
                d_text.text((lx, ly), line, font=font, fill=(255, 255, 255), stroke_width=stroke_w, stroke_fill=(5, 12, 20, 255))
                text_fill = (245, 252, 255) if chosen_style in ["calligraphy", "neon_glow"] else (255, 245, 140)
                d_text.text((lx, ly), line, font=font, fill=text_fill)

            final_img = Image.alpha_composite(im, text_layer).convert("RGB")
        else:
            final_path = create_local_3d_gold_thumbnail(bg_image_path, clean_title, out_path, tag_text=tag_text)
            return final_path

        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        final_img.save(out_path, quality=92, optimize=True)
        return out_path
    except Exception as e:
        print(Fore.YELLOW + f"  [!] Loi render Adaptive Thumbnail: {e}")
        return None

def redesign_thumbnail(thumb_src, new_title, bridge_server):
    """
    QUY TRÌNH THIẾT KẾ THUMBNAIL 2 BƯỚC CHUẨN HÓA (CHO FIX PUBLISHING SUITE):
    - Bước 1: Gemini (Bridge hoặc Flash API) CHỈ xóa sạch chữ TQ & watermark, lấy ảnh nền sạch (Clean Background).
    - Bước 2: Worker dùng Pillow viết chữ tiếng Việt chuẩn Typography 3D vào đúng vị trí chữ cũ.
    """
    if not thumb_src or not os.path.exists(thumb_src):
        return None

    clean_title = re.sub(r'^\d+_', '', new_title).strip()
    clean_title = re.sub(r'[\\/:*?"<>|]', ' ', clean_title).strip()
    short_title = smart_truncate(clean_title, max_len=45)

    dest_dir = os.path.dirname(thumb_src)
    clean_bg = os.path.join(dest_dir, f"_clean_bg_{os.path.basename(thumb_src)}")
    final_thumb = thumb_src + ".new3d.jpg"

    print(Fore.CYAN + Style.BRIGHT + f"\n  ==================================================")
    print(Fore.CYAN + Style.BRIGHT + f"  🎨 THIẾT KẾ THUMBNAIL (PIPELINE 2 BƯỚC CHUẨN HÓA)")
    print(Fore.CYAN + Style.BRIGHT + f"  ==================================================")
    print(Fore.WHITE + f"  -> Tiêu đề tiếng Việt: '{short_title}'")

    # BƯỚC 1: XÓA SẠCH CHỮ TIẾNG TRUNG BẰNG GEMINI
    clean_path = clean_image_with_gemini_flash(thumb_src, clean_bg, api_key=get_gemini_api_key(), bridge_server=bridge_server)
    effective_bg = clean_path if (clean_path and os.path.exists(clean_path)) else thumb_src

    # BƯỚC 2: WORKER VIẾT TIÊU ĐỀ TIẾNG VIỆT CHUẨN TYPOGRAPHY 3D VÀO ĐÚNG VỊ TRÍ CHỮ CŨ
    print(Fore.CYAN + f"  [Bước 2: Worker Typography Engine] Dang ve chu tieng Viet co dau 3D len anh...")
    res = render_adaptive_vietnamese_thumbnail(effective_bg, short_title, final_thumb, style="auto", tag_text="THUYẾT MINH")
    if res and os.path.exists(res):
        print(Fore.GREEN + Style.BRIGHT + f"  [✓ Hoàn Tất 100%] Da tao anh bia tieng Viet thanh cong: {os.path.basename(res)}!")
        return res

    # Fallback cục bộ
    return create_local_3d_gold_thumbnail(effective_bg, short_title, final_thumb, tag_text="THUYẾT MINH")

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
        description = build_rich_vietnamese_description(raw_name, raw_name, sample_subs)
        init_genre = detect_video_genre(raw_name, raw_name, sample_subs)
        hashtags = get_default_hashtags_by_genre(init_genre)

        if item["needs_copywriting"]:
            clean_src = re.sub(r'^\d+_', '', raw_name).strip()
            copywriting = generate_copywriting(clean_src, prefix_num, sample_subs, bridge, thumb_src=item.get("jpg"))
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
                        if d_m:
                            loaded_d = d_m.group(1).strip()
                            if not re.search(r'[\u4e00-\u9fff]', loaded_d) and len(loaded_d) >= 60:
                                description = loaded_d
                        h_m = re.search(r'HASHTAGS:\n(.*?)\n\n', t_content, re.DOTALL)
                        if h_m:
                            loaded_h = h_m.group(1).strip()
                            if not re.search(r'[\u4e00-\u9fff]', loaded_h):
                                hashtags = loaded_h
                except Exception:
                    pass
            print(Fore.GREEN + f"  [✓] Giữ nguyên tiêu đề tiếng Việt có sẵn: {new_title}")

        # Rào chắn cứu hộ nếu tiêu đề bị cụt ngủn hoặc vô nghĩa
        if not is_meaningful_title(new_title):
            pure_ch = re.sub(r'^\d+_', '', raw_name).strip()
            tr_t = google_translate(pure_ch, dest='vi')
            if tr_t and is_meaningful_title(tr_t):
                new_title = f"{prefix_num}{re.sub(r'[\\/:*?\"<>|]', ' ', tr_t).strip()}"
            elif sample_subs and len(sample_subs) > 0:
                for seg_t in sample_subs:
                    if is_meaningful_title(str(seg_t)):
                        new_title = f"{prefix_num}{str(seg_t).strip()[:60]}"
                        break

        if re.search(r'[\u4e00-\u9fff]', description) or len(description) < 60:
            description = build_rich_vietnamese_description(new_title, raw_name, sample_subs)

        new_title = re.sub(r'[\\/:*?"<>|]', ' ', new_title).strip()
        if not new_title or not is_meaningful_title(new_title):
            new_title = f"{prefix_num}Video_Thuyet_Minh_Moi"

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
