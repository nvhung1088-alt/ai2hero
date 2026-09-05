import os
import sys
import io
import time
import json
import re
import glob
import platform
import socket
import requests
import subprocess
from pathlib import Path
from datetime import datetime
from colorama import init, Fore, Style

# Đảm bảo in UTF-8 không bị lỗi charmap trên Windows Console
if sys.platform == "win32":
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    except Exception:
        pass

init(autoreset=True)

# ---------------------------------------------------------
# LOCAL WEBSOCKET BRIDGE SERVER (PORT 8765)
# ---------------------------------------------------------
import hashlib
import base64
import struct
import threading

class LocalWebSocketBridgeServer:
    """
    Lightweight zero-dependency WebSocket Server for Chrome Extension Local Bridge (Port 8765)
    Supports Multi-Account Pool, 30-Job Auto-Rotation & Auto-Failover.
    """
    ROTATION_LIMIT = 10  # Ngưỡng xoay vòng 10 thao tác / tài khoản

    def __init__(self, host="127.0.0.1", port=8765):
        self.host = host
        self.port = port
        self.clients = []  # Danh sách client socket có thứ tự
        self.lock = threading.Lock()
        self.pending_jobs = {}
        self.server_socket = None
        self.is_running = False
        self.active_account_index = 0
        self.account_job_counter = 0

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        thread = threading.Thread(target=self._run_server, daemon=True)
        thread.start()
        print(Fore.CYAN + f"[*] Local WebSocket Bridge Server dang chay tai ws://{self.host}:{self.port}")

    def _run_server(self):
        try:
            self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.server_socket.bind((self.host, self.port))
            self.server_socket.listen(5)
            while self.is_running:
                client_sock, addr = self.server_socket.accept()
                threading.Thread(target=self._handle_client, args=(client_sock,), daemon=True).start()
        except Exception:
            pass

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
                total_clients = len(self.clients)
                curr_idx = self.clients.index(sock) + 1

            if total_clients == 1:
                print(Fore.GREEN + Style.BRIGHT + f"[*] Chrome Extension ket noi thanh cong (Tai khoan #{curr_idx})!")
            else:
                print(Fore.GREEN + Style.BRIGHT + f"[*] 🎯 Phat hien them Chrome Profile moi ket noi! Pool hien tai: {total_clients} Tai khoan (Tai khoan #{curr_idx}).")

            while self.is_running:
                head = self._recv_exact(sock, 2)
                if not head:
                    break
                opcode = head[0] & 0x0F
                if opcode == 0x8: # Close frame
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

                if opcode == 0x1: # Text frame
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
                if self.clients:
                    self.active_account_index = self.active_account_index % len(self.clients)
                else:
                    self.active_account_index = 0
                    self.account_job_counter = 0
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

    def get_connected_count(self):
        with self.lock:
            return len(self.clients)

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
        with self.lock:
            available_clients = list(self.clients)
            if not available_clients:
                return None
            start_index = self.active_account_index % len(available_clients)

        total_accounts = len(available_clients) if allow_failover else 1
        
        # Thử lần lượt các tài khoản trong pool bắt đầu từ tài khoản đang kích hoạt
        for attempt_offset in range(total_accounts):
            if cancel_event and cancel_event.is_set():
                return None

            candidate_index = (start_index + attempt_offset) % total_accounts
            client_sock = available_clients[candidate_index]
            account_num = candidate_index + 1

            if attempt_offset == 0:
                current_job_num = self.account_job_counter + 1
                if total_accounts > 1:
                    print(Fore.CYAN + f"  [⚡ WebSocket Local] Dang xu ly tren Tai khoan #{account_num}/{total_accounts} (Luot {current_job_num}/{self.ROTATION_LIMIT})...")
                else:
                    print(Fore.CYAN + f"  [⚡ WebSocket Local] Dang xu ly tren Tai khoan #{account_num} (Luot {current_job_num}/{self.ROTATION_LIMIT})...")
            else:
                print(Fore.MAGENTA + Style.BRIGHT + f"  [🔄 Auto-Failover] Chuyen sang Tai khoan #{account_num}/{total_accounts} de thuc hien lai...")

            res = self._execute_job_on_socket(client_sock, prompt, target_ai=target_ai, attachments=attachments, timeout=timeout, cancel_event=cancel_event)
            
            if res and res.get("cancelled"):
                return None

            if res and res.get("success") and res.get("result"):
                with self.lock:
                    # Cập nhật số lượt và kiểm tra xoay vòng sau 30 lượt
                    if candidate_index == self.active_account_index:
                        self.account_job_counter += 1
                        if self.account_job_counter >= self.ROTATION_LIMIT and len(self.clients) > 1:
                            next_index = (self.active_account_index + 1) % len(self.clients)
                            self.active_account_index = next_index
                            self.account_job_counter = 0
                            print(Fore.CYAN + Style.BRIGHT + f"  [🔄 Xoay Vong {self.ROTATION_LIMIT} Luot] Da hoan tat {self.ROTATION_LIMIT} luot tren Tai khoan #{account_num}! Chuyen sang Tai khoan #{next_index + 1} de nghi ngoi...")
                    else:
                        # Nếu hoàn thành bằng tài khoản cứu hộ -> chuyển con trỏ sang tài khoản cứu hộ
                        self.active_account_index = candidate_index
                        self.account_job_counter = 1
                return res
            else:
                if cancel_event and cancel_event.is_set():
                    return None
                err_msg = res.get("error", "Timeout / Khong co phan hoi") if isinstance(res, dict) else "Timeout / Khong co phan hoi"
                if "1095" in err_msg or "Stream Aborted" in err_msg or "Mất kết nối" in err_msg:
                    print(Fore.RED + Style.BRIGHT + f"  [⚡ Gemini Pro Alert] Tai khoan #{account_num} bi ngat Stream (1095). Extension da tu dong F5 tab.")
                else:
                    print(Fore.YELLOW + f"  [⚠️ Su co Tai khoan #{account_num}] {err_msg}.")

        if cancel_event and cancel_event.is_set():
            return None
        print(Fore.RED + "  [!] Tat ca cac tai khoan trong Pool WebSocket deu that bai!")
        return None

bridge_server = LocalWebSocketBridgeServer()

# ---------------------------------------------------------
# TU DONG CAI DAT THU VIEN NEU THIEU
# ---------------------------------------------------------
try:
    import faster_whisper
    import edge_tts
    import PIL
except ImportError:
    print(Fore.YELLOW + "[-] Dang cai dat cac thu vien con thieu (Whisper, Edge-TTS, Pillow)...")
    subprocess.run([sys.executable, "-m", "pip", "install", "legacy-cgi", "faster-whisper", "edge-tts", "Pillow"], check=True)
    print(Fore.GREEN + "[-] Cai dat thanh cong. Vui long chay lai lenh khoi dong Worker!")
    sys.exit(0)

# ---------------------------------------------------------
# CAU HINH MVP WORKER
# ---------------------------------------------------------
API_BASE_URL = "https://ai2hero-flax.vercel.app/api/hero-dub"
CONFIG_FILE = "config.json"
WORKSPACE_DIR = "workspace"

def smart_truncate(text, max_len=45):
    """Cắt ngắn chuỗi văn bản theo ranh giới từ (Word Boundary) để không bao giờ bị cụt từ."""
    text = str(text).strip()
    if len(text) <= max_len:
        return text
    cut = text[:max_len]
    last_space = cut.rfind(' ')
    if last_space > int(max_len * 0.5):
        return cut[:last_space].strip()
    return cut.strip()

def generate_video_copywriting(task, translated_segments, duration_sec, bridge_server, headers, API_BASE_URL):
    """
    LUỒNG 1: Tạo Tiêu đề, Mô tả và Hashtags (TEXT-ONLY) chuẩn xác 100% theo nội dung video.
    """
    task_id = task.get("id")
    raw_source = task.get("sourceTitle") or task.get("sourceUrl") or f"video_{task_id}"
    # Đảm bảo chỉ lấy tên file gốc, loại bỏ hoàn toàn đường dẫn thư mục (cả / và \)
    clean_source_title = os.path.basename(str(raw_source).replace('\\', '/'))
    for ext in ['.mp4', '.mkv', '.mov', '.avi', '.flv', '.wmv']:
        if clean_source_title.lower().endswith(ext):
            clean_source_title = clean_source_title[:-len(ext)]
    clean_source_title = clean_source_title.strip()

    # Trích xuất mã số tập nếu có (ví dụ 1815_)
    prefix_num = ""
    num_match = re.match(r'^(\d+)_', clean_source_title)
    if num_match:
        prefix_num = num_match.group(1) + "_"

    # 1. Trích xuất 10-15 câu thoại phụ đề tiếng Việt tiêu biểu
    sample_subs = []
    if translated_segments:
        total = len(translated_segments)
        step = max(1, total // 12)
        sample_subs = [seg.get('text', '') for idx, seg in enumerate(translated_segments) if idx % step == 0][:15]
    
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

    publishing_engine = (task.get("publishingAiEngine") or "deepseek").lower()
    copywriting_success = False

    # LUỒNG A: GỌI DEEPSEEK OFFICIAL AI QUA SERVER (Khuyến nghị - 1-2s, Ổn định ngầm 100%)
    if publishing_engine == "deepseek" or not (bridge_server and bridge_server.is_connected()):
        try:
            print(Fore.CYAN + Style.BRIGHT + f"  [⚡ DeepSeek Copywriting] Dang gui yeu cau viet Tieu de + Mo ta sang DeepSeek AI...")
            copywriting_api_url = f"{API_BASE_URL}/copywriting"
            api_payload = {
                "taskId": task_id,
                "sourceTitle": clean_source_title,
                "sampleSubs": sample_subs,
                "engine": "deepseek"
            }
            resp = requests.post(copywriting_api_url, json=api_payload, headers=headers, timeout=45)
            if resp.status_code == 200:
                resp_data = resp.json()
                if resp_data.get("success"):
                    t_val = str(resp_data.get("new_title", "")).strip()
                    if t_val:
                        result["new_title"] = f"{prefix_num}{t_val}" if prefix_num and not t_val.startswith(prefix_num) else t_val
                    if resp_data.get("description"):
                        result["description"] = str(resp_data.get("description")).strip()
                    if resp_data.get("hashtags"):
                        result["hashtags"] = str(resp_data.get("hashtags")).strip()
                    copywriting_success = True
                    print(Fore.GREEN + Style.BRIGHT + f"  [✓ DeepSeek Ready] Da tao Tieu de chuan SEO: {result['new_title']}")
                else:
                    print(Fore.YELLOW + f"  [!] DeepSeek tra ve loi: {resp_data.get('error')}")
            else:
                print(Fore.YELLOW + f"  [!] Server tra ve HTTP {resp.status_code} cho DeepSeek Copywriting: {resp.text[:120]}")
        except Exception as ds_err:
            print(Fore.YELLOW + f"  [!] Loi khi goi DeepSeek Copywriting qua Server: {str(ds_err)}")

    # LUỒNG B: GỌI BROWSER AI BRIDGE (Chrome Extension điều khiển Web Chat miễn phí)
    if not copywriting_success and bridge_server and bridge_server.is_connected():
        print(Fore.CYAN + f"  [🌐 WebSocket Copywriting] Dang gui yeu cau viet Tieu de + Mo ta sang Gemini qua Extension...")
        ws_res = bridge_server.execute_job(prompt, attachments=[], target_ai="gemini", timeout=120, allow_failover=False)
        if ws_res and ws_res.get("success") and ws_res.get("result"):
            raw_out = str(ws_res.get("result", "")).strip()
            raw_out = re.sub(r"^```(?:json)?\s*", "", raw_out, flags=re.IGNORECASE)
            raw_out = re.sub(r"\s*```$", "", raw_out, flags=re.IGNORECASE).strip()
            
            parsed_success = False
            # Dùng regex bóc tách JSON siêu bền
            try:
                json_match = re.search(r'(\{[\s\S]*\})', raw_out)
                if json_match:
                    clean_j = re.sub(r',\s*([\}\]])', r'\1', json_match.group(1))
                    parsed = json.loads(clean_j)
                    if isinstance(parsed, dict):
                        if parsed.get("new_title"):
                            t_val = str(parsed.get("new_title")).strip()
                            result["new_title"] = f"{prefix_num}{t_val}" if prefix_num and not t_val.startswith(prefix_num) else t_val
                        if parsed.get("description"):
                            result["description"] = str(parsed.get("description")).strip()
                        if parsed.get("hashtags"):
                            result["hashtags"] = str(parsed.get("hashtags")).strip()
                        print(Fore.GREEN + Style.BRIGHT + f"  [✓ WebSocket Copywriting] Da tao Tieu de moi chuan xac: {result['new_title']}")
                        parsed_success = True
                        copywriting_success = True
            except Exception:
                pass

            if not parsed_success:
                title_m = re.search(r'"new_title"\s*:\s*"([^"]+)"', raw_out)
                if title_m:
                    t_val = title_m.group(1).strip()
                    result["new_title"] = f"{prefix_num}{t_val}" if prefix_num and not t_val.startswith(prefix_num) else t_val
                    parsed_success = True
                    copywriting_success = True
                    print(Fore.GREEN + Style.BRIGHT + f"  [✓ WebSocket Copywriting] Da trich xuat Tieu de moi: {result['new_title']}")

    # Rào chắn an toàn: Nếu vẫn còn chữ tiếng Trung, tự động dịch trực tiếp tiêu đề gốc hoặc lấy câu phụ đề đầu tiên
    if re.search(r'[\u4e00-\u9fff]', result["new_title"]):
        pure_ch_title = re.sub(r'^\d+_', '', clean_source_title).strip()
        trans_title = google_translate(pure_ch_title, dest='vi')
        if trans_title and not re.search(r'[\u4e00-\u9fff]', trans_title):
            clean_t = re.sub(r'[\\/:*?"<>|]', ' ', trans_title).strip()
            result["new_title"] = f"{prefix_num}{clean_t}"
            print(Fore.CYAN + f"  [-] Da tu dong dich Tieu de goc chuan xac: {result['new_title']}")
        elif translated_segments and len(translated_segments) > 0:
            for seg in translated_segments[:3]:
                t = seg.get('text', '').strip()
                if t and not re.search(r'[\u4e00-\u9fff]', t) and len(t) > 8:
                    result["new_title"] = f"{prefix_num}{t[:65]}"
                    break

    return result

def create_local_3d_gold_thumbnail(src_path, title_text, out_path, tag_text="THUYẾT MINH"):
    """
    LOCAL 3D GOLD THUMBNAIL ENGINE (0đ, KHÔNG CẦN API):
    - Tự động resize ảnh gốc về chuẩn 720p sắc nét.
    - Phủ Badge đỏ ruby góc trên trái che sạch logo/badge Trung Quốc cũ.
    - Tạo Khung biển hiệu Charcoal viền Vàng Kim bo góc che 100% chữ tiếng Trung ở nửa dưới.
    - Vẽ tiêu đề Tiếng Việt Typography 3D Vàng Kim (Extrusion Shadow + Black Stroke + Gold Sheen).
    - Tự động căn chỉnh font size và ngắt dòng nghệ thuật.
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
        import re
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
        
        # 1. TOP-LEFT BADGE (Che logo / watermark tiếng Trung góc trên trái)
        if tag_text:
            badge_layer = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
            d_badge = ImageDraw.Draw(badge_layer)
            tag_font = ImageFont.truetype(font_path, 26)
            tb_box = tag_font.getbbox(tag_text)
            tw = tb_box[2] - tb_box[0]
            th = tb_box[3] - tb_box[1]
            
            bx, by = 16, 16
            bw = max(tw + 40, 205)
            bh = max(th + 24, 125)
            
            d_badge.rounded_rectangle([bx + 4, by + 4, bx + bw + 4, by + bh + 4], radius=14, fill=(0, 0, 0, 200))
            d_badge.rounded_rectangle([bx, by, bx + bw, by + bh], radius=14, fill=(210, 25, 35, 255), outline=(255, 220, 100, 240), width=2)
            tx = bx + (bw - tw) // 2
            ty = by + (bh - th) // 2 - 2
            d_badge.text((tx + 1, ty + 1), tag_text, font=tag_font, fill=(0, 0, 0, 180))
            d_badge.text((tx, ty), tag_text, font=tag_font, fill=(255, 255, 255))
            im = Image.alpha_composite(im, badge_layer)
            
        # 2. BOTTOM PLATE (Khung biển hiệu sang trọng che 100% chữ Trung Quốc gốc)
        plate_w = target_w - 36
        plate_h = max(int(target_h * 0.32), total_text_h + 50)
        plate_x = 18
        plate_y = int(target_h * 0.63)
        
        plate_layer = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
        d_plate = ImageDraw.Draw(plate_layer)
        
        d_plate.rounded_rectangle([plate_x + 8, plate_y + 10, plate_x + plate_w + 8, plate_y + plate_h + 10], radius=22, fill=(0, 0, 0, 230))
        d_plate.rounded_rectangle([plate_x, plate_y, plate_x + plate_w, plate_y + plate_h], radius=22, fill=(12, 15, 22, 255), outline=(255, 215, 0, 255), width=4)
        d_plate.rounded_rectangle([plate_x + 7, plate_y + 7, plate_x + plate_w - 7, plate_y + plate_h - 7], radius=17, outline=(210, 165, 30, 150), width=1)
        im = Image.alpha_composite(im, plate_layer)
        
        # 3. TYPOGRAPHY 3D VÀNG KIM
        text_start_y = plate_y + (plate_h - total_text_h) // 2 - 2
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

def clean_image_with_gemini_flash(thumb_src, out_clean_path, api_key=None, bridge_server=None):
    """
    BƯỚC 1: Xóa sạch toàn bộ chữ tiếng Trung Quốc và Watermark trên ảnh bằng Gemini Flash Image (3 giây).
    Giữ nguyên 100% nhân vật, bối cảnh, tỷ lệ khung hình và hiệu ứng hình ảnh.
    """
    if not thumb_src or not os.path.exists(thumb_src):
        return None

    key = api_key or get_gemini_api_key()
    if key:
        try:
            print(Fore.CYAN + f"  [⚡ Gemini Flash Image] Dang gui anh sang Gemini Flash de xoa sach chu tieng Trung (3s)...")
            with open(thumb_src, "rb") as f:
                b64_img = base64.b64encode(f.read()).decode("utf-8")

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={key}"
            prompt = "Edit this image: restore and clean the background scene and road without any text, subtitles or typography overlays. Keep the characters, lighting and ruined city completely intact. Output only the clean edited image."

            payload = {
                "contents": [{
                    "parts": [
                        {"text": prompt},
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

                            # Tẩy sạch nốt tem logo ở góc dưới phải bằng PIL patch nếu còn
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
            print(Fore.YELLOW + f"  [!] Gemini Flash API: {e}, thu qua Extension Bridge...")

    # Fallback qua Browser Bridge nếu có
    if bridge_server and bridge_server.is_connected():
        try:
            with open(thumb_src, "rb") as img_f:
                b64_data = base64.b64encode(img_f.read()).decode('utf-8')
                img_b64 = f"data:image/jpeg;base64,{b64_data}"
            prompt = "Hãy chỉnh sửa bức ảnh này: XÓA SẠCH toàn bộ chữ tiếng Trung Quốc và watermark trên ảnh, giữ nguyên 100% nhân vật, hiệu ứng và bối cảnh. BẮT BUỘC xuất ra ảnh sạch KHÔNG CÓ BẤT KỲ CHỮ NÀO (clean background image)."
            payload = [{"name": os.path.basename(thumb_src), "type": "image/jpeg", "data": img_b64}]
            res = bridge_server.execute_job(prompt, attachments=payload, target_ai="gemini", timeout=60)
            if res and res.get("success") and res.get("result"):
                m = re.search(r'!\[.*?\]\((data:image/[^)]+|https?://[^\s\)]+)\)', str(res.get("result")))
                if m:
                    u = m.group(1)
                    if u.startswith("data:image/"):
                        raw_b64 = u.split(",", 1)[1]
                        os.makedirs(os.path.dirname(out_clean_path), exist_ok=True)
                        with open(out_clean_path, "wb") as out_f:
                            out_f.write(base64.b64decode(raw_b64))
                        return out_clean_path
        except Exception as bridge_err:
            print(Fore.YELLOW + f"  [!] Bridge Error: {bridge_err}")

    # Fallback cục bộ: Xóa watermark góc phải
    try:
        from PIL import Image, ImageFilter
        im = Image.open(thumb_src).convert("RGBA")
        w, h = im.size
        wm_w = int(w * 0.12)
        wm_h = int(h * 0.08)
        wm_patch = im.crop((w - wm_w, h - wm_h * 2, w, h - wm_h)).filter(ImageFilter.GaussianBlur(2))
        im.paste(wm_patch, (w - wm_w, h - wm_h))
        os.makedirs(os.path.dirname(out_clean_path), exist_ok=True)
        im.convert("RGB").save(out_clean_path, quality=92)
        return out_clean_path
    except Exception:
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

        # Lọc sạch tiêu đề
        clean_title = re.sub(r'^\d+_', '', title_text).strip()
        clean_title = re.sub(r'[\\/:*?"<>|]', ' ', clean_title).strip()

        # Font path
        font_dir = os.path.join(os.path.dirname(__file__), "fonts")
        charm_path = os.path.join(font_dir, "Charm-Bold.ttf")
        arial_path = "C:/Windows/Fonts/arialbd.ttf"
        if not os.path.exists(arial_path):
            arial_path = "C:/Windows/Fonts/tahomabd.ttf"

        is_landscape = ratio >= 1.15

        chosen_style = style
        if chosen_style == "auto":
            chosen_style = "calligraphy" if (is_landscape and os.path.exists(charm_path)) else "gold_3d"

        # ----------------------------------------------------
        # TRƯỜNG HỢP 1: ẢNH NGANG 16:9 (ANIME / PHIM / TRUYỆN TRANH)
        # ----------------------------------------------------
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

            # Hào quang phát sáng (Glow)
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

            # Lớp chữ chính
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

        # ----------------------------------------------------
        # TRƯỜNG HỢP 2: ẢNH DỌC 9:16 (VLOG / SINH TỒN / SHORTS / TIKTOK)
        # ----------------------------------------------------
        else:
            final_path = create_local_3d_gold_thumbnail(bg_image_path, clean_title, out_path, tag_text=tag_text)
            return final_path

        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        final_img.save(out_path, quality=92, optimize=True)
        return out_path
    except Exception as e:
        print(Fore.YELLOW + f"  [!] Loi render Adaptive Thumbnail: {e}")
        return None

def redesign_thumbnail_image(task, thumb_src, new_title, translated_segments, bridge_server):
    """
    QUY TRÌNH 2 BƯỚC THIẾT KẾ THUMBNAIL (Gemini Flash + Worker Typography):
    - Bước 1: Gọi Gemini Flash xóa sạch 100% chữ tiếng Trung & watermark (3 giây).
    - Bước 2: Worker chèn tiêu đề tiếng Việt chuẩn Typography vào đúng vị trí chữ gốc.
    """
    if not task.get("redesignThumbnailEnabled"):
        return None

    if not thumb_src or not os.path.exists(thumb_src):
        return None

    # Lọc tiêu đề tiếng Việt sạch
    clean_viet_title = new_title
    if re.search(r'[\u4e00-\u9fff]', clean_viet_title) or clean_viet_title.startswith("video_"):
        if translated_segments and len(translated_segments) > 0:
            for seg in translated_segments[:3]:
                t = seg.get('text', '').strip()
                if t and not re.search(r'[\u4e00-\u9fff]', t) and len(t) > 8:
                    clean_viet_title = t
                    break
        if re.search(r'[\u4e00-\u9fff]', clean_viet_title):
            clean_viet_title = "Sinh Tồn Nơi Hoang Dã"

    clean_title = re.sub(r'^\d+_', '', clean_viet_title).strip()
    clean_title = re.sub(r'[\\/:*?"<>|]', ' ', clean_title).strip()
    clean_title = smart_truncate(clean_title, max_len=45)

    thumbnail_app = (task.get("thumbnailAiAppSlug") or "gemini").lower()
    font_style = task.get("thumbnailFontStyle", "auto")
    dest_dir = os.path.dirname(thumb_src)
    clean_bg = os.path.join(dest_dir, f"_clean_bg_{os.path.basename(thumb_src)}")
    final_thumb = os.path.join(dest_dir, f"_final_thumb_{os.path.basename(thumb_src)}")

    # PHƯƠNG ÁN 1: LOCAL WORKER 3D GOLD (Offline 100% - Không cần API)
    if thumbnail_app == "local-engine":
        print(Fore.CYAN + Style.BRIGHT + f"  [🏆 Local Engine] Dang ve anh bia 3D Vang Kim tieng Viet offline...")
        res = create_local_3d_gold_thumbnail(thumb_src, clean_title, final_thumb, tag_text="THUYẾT MINH")
        if res and os.path.exists(res):
            print(Fore.GREEN + Style.BRIGHT + f"  [✓ Thumbnail Ready] Hoan tat anh bia Local 3D: {os.path.basename(res)}!")
            return res

    # PHƯƠNG ÁN 2: BROWSER AI BRIDGE (Chrome Extension điều khiển Web Chat vẽ lại ảnh)
    if thumbnail_app == "browser-ai-bridge":
        print(Fore.CYAN + Style.BRIGHT + f"  [🌐 Browser AI Bridge] Dang gui anh goc sang Web Chat qua Extension de ve lai toan dien...")
        if bridge_server and bridge_server.is_connected():
            try:
                with open(thumb_src, "rb") as f:
                    b64_img = base64.b64encode(f.read()).decode("utf-8")
                bridge_payload = [{"type": "image", "base64": f"data:image/jpeg;base64,{b64_img}"}]
                bridge_prompt = f"Hãy tạo lại một ảnh bìa thumbnail điện ảnh đẹp mắt dựa trên bức ảnh này. Tiêu đề tiếng Việt là '{clean_title}'. Phong cách sắc nét, ấn tượng, phù hợp YouTube."
                target_ai = task.get("thumbnailAiModel") or "gemini"
                ws_res = bridge_server.execute_job(bridge_prompt, attachments=bridge_payload, target_ai=target_ai, timeout=60)
                if ws_res and ws_res.get("image_url"):
                    return ws_res["image_url"]
            except Exception as b_err:
                print(Fore.YELLOW + f"  [!] Browser Bridge loi: {b_err}. Fallback sang Gemini Flash...")

    # PHƯƠNG ÁN 3: GEMINI FLASH API + WORKER TYPOGRAPHY (Mặc định & Khuyến nghị - 3s)
    # BƯỚC 1: Xóa chữ TQ bằng Gemini Flash (3s)
    clean_path = clean_image_with_gemini_flash(thumb_src, clean_bg, bridge_server=bridge_server)
    effective_bg = clean_path if (clean_path and os.path.exists(clean_path)) else thumb_src

    # BƯỚC 2: Ghép chữ tiếng Việt vào đúng vị trí cũ
    print(Fore.CYAN + Style.BRIGHT + f"  [⚡ Adaptive Typography] Dang ghep chu tieng Viet '{clean_title}' (Style: {font_style}) vao vi tri goc...")
    res = render_adaptive_vietnamese_thumbnail(effective_bg, clean_title, final_thumb, style=font_style, tag_text="THUYẾT MINH")
    if res and os.path.exists(res):
        print(Fore.GREEN + Style.BRIGHT + f"  [✓ Thumbnail Ready] Hoan tat anh bia moi: {os.path.basename(res)}!")
        return res

    # Fallback cuối cùng
    local_thumb = os.path.join(dest_dir, f"_local_3d_{os.path.basename(thumb_src)}")
    return create_local_3d_gold_thumbnail(thumb_src, clean_title, local_thumb, tag_text="THUYẾT MINH")


def get_latest_download_image(start_time, timeout=5):
    """Quét thư mục Downloads của máy tính tìm file ảnh mới tải về trong khoảng thời gian vừa qua."""
    downloads_path = os.path.join(os.path.expanduser("~"), "Downloads")
    if not os.path.exists(downloads_path):
        return None
    patterns = ["*.jpg", "*.jpeg", "*.png", "*.webp"]
    end_time = time.time() + max(0, timeout)
    while True:
        all_imgs = []
        for pat in patterns:
            all_imgs.extend(glob.glob(os.path.join(downloads_path, pat)))
        for img_p in all_imgs:
            try:
                mtime = os.path.getmtime(img_p)
                if mtime >= start_time:
                    size = os.path.getsize(img_p)
                    if size > 15000:
                        return img_p
            except Exception:
                pass
        if time.time() >= end_time:
            break
        time.sleep(1)
    return None

def optimize_and_save_thumbnail(img_data, dest_thumb_path, target_res=720, quality=85):
    """
    Tối ưu hóa ảnh bìa Thumbnail:
    - Resize về chuẩn 720p (1280x720 cho ngang, 720x1280 cho dọc/Shorts) giữ nguyên 100% tỷ lệ khung hình.
    - Nén JPEG cao cấp (quality=85, optimize=True, progressive=True) giảm dung lượng siêu nhẹ.
    """
    try:
        from PIL import Image
        import io

        if isinstance(img_data, (bytes, bytearray)):
            img = Image.open(io.BytesIO(img_data))
        elif isinstance(img_data, str) and os.path.exists(img_data):
            img = Image.open(img_data)
        else:
            return False

        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        orig_w, orig_h = img.size

        # Nếu là ảnh thumbnail User Query preview nhỏ (323x430), từ chối để tránh lưu nhầm ảnh preview
        if (orig_w == 323 and orig_h == 430) or orig_w < 200 or orig_h < 200:
            print(Fore.YELLOW + f"  [!] Anh nhan ve co kich thuoc khong hop le ({orig_w}x{orig_h}). Tu choi luu.")
            return False
        
        # Resize về chuẩn 720p giữ nguyên Aspect Ratio
        if orig_w >= orig_h:
            # Ảnh ngang: Chiều cao = 720
            if orig_h > target_res:
                new_h = target_res
                new_w = int(orig_w * (target_res / orig_h))
                if new_w > 1280:
                    new_w = 1280
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        else:
            # Ảnh dọc: Chiều rộng = 720
            if orig_w > target_res:
                new_w = target_res
                new_h = int(orig_h * (target_res / orig_w))
                if new_h > 1280:
                    new_h = 1280
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

        # Lưu file JPEG tối ưu
        os.makedirs(os.path.dirname(os.path.abspath(dest_thumb_path)), exist_ok=True)
        img.save(dest_thumb_path, "JPEG", quality=quality, optimize=True, progressive=True)
        final_size = os.path.getsize(dest_thumb_path)
        print(Fore.GREEN + f"[✓] Da toi uu anh Thumbnail 720p ({img.size[0]}x{img.size[1]}, {final_size//1024} KB): {os.path.basename(dest_thumb_path)}")
        return True
    except Exception as err:
        print(Fore.YELLOW + f"[!] Loi toi uu anh Pillow ({err}). Luu truc tiep...")
        try:
            if isinstance(img_data, (bytes, bytearray)):
                with open(dest_thumb_path, "wb") as f:
                    f.write(img_data)
            elif isinstance(img_data, str) and os.path.exists(img_data):
                shutil.copy2(img_data, dest_thumb_path)
            return True
        except Exception:
            return False

def get_device_info():
    return {
        "deviceName": socket.gethostname(),
        "platform": platform.system().lower(),
        "version": "1.0.0-mvp"
    }

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    return {}

def save_config(config):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=4)

def print_banner():
    print(Fore.CYAN + Style.BRIGHT + "="*50)
    print(Fore.CYAN + Style.BRIGHT + "   HERODUB LOCAL WORKER - PHASE 1 MVP")
    print(Fore.CYAN + Style.BRIGHT + "="*50)

def pair_device():
    print_banner()
    print(Fore.YELLOW + "Chua co thong tin ket noi. Vui long ghep noi thiet bi.")
    while True:
        code = input(Fore.WHITE + "Nhap MA LIEN KET (tu Dashboard): ").strip().upper()
        if not code or len(code) != 6:
            print(Fore.RED + "Ma lien ket phai gom 6 ky tu. Vui long thu lai.")
            continue

        try:
            device_info = get_device_info()
            print(Fore.CYAN + f"\nDang ket noi voi Server ({API_BASE_URL})...")
            
            payload = {"action": "pair", "code": code, **device_info}
            res = requests.post(f"{API_BASE_URL}/workers", json=payload)
            data = res.json()

            if res.status_code == 200 and data.get("success"):
                token = data.get("accessToken")
                team_name = data.get("teamName")
                save_config({"accessToken": token})
                print(Fore.GREEN + Style.BRIGHT + f"[\u2713] Ghep noi thanh cong voi Workspace: {team_name}")
                return token
            else:
                print(Fore.RED + f"[\u2717] Loi: {data.get('error', 'Khong xac dinh')}")
        except Exception as e:
            print(Fore.RED + f"[\u2717] Loi ket noi mang: {str(e)}")

def format_timestamp(seconds: float):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{millis:03}"

def acquire_resource_lock(token, task_id, resource_key, label=""):
    headers = {'Authorization': f'Bearer {token}'}
    first_wait = True
    while True:
        try:
            res = requests.post(
                f"{API_BASE_URL}/resource-lock",
                json={"action": "acquire", "taskId": task_id, "resourceKey": resource_key},
                headers=headers,
                timeout=15
            )
            if res.status_code == 200:
                data = res.json()
                if data.get("acquired"):
                    if not first_wait:
                        print(Fore.GREEN + f"[{label}] -> Da lay duoc Lock '{resource_key}'. Tiep tuc xu ly.")
                    return True
                else:
                    holder = data.get("holderTaskId")
                    print(Fore.YELLOW + f"[{label}] Tai nguyen '{resource_key}' dang duoc dung boi Task #{holder}. Dang cho...")
                    first_wait = False
        except Exception as e:
            print(Fore.RED + f"[Lock] Loi khi xin lock {resource_key}: {e}")
        time.sleep(10)

def release_resource_lock(token, task_id, resource_key):
    headers = {'Authorization': f'Bearer {token}'}
    try:
        requests.post(
            f"{API_BASE_URL}/resource-lock",
            json={"action": "release", "taskId": task_id, "resourceKey": resource_key},
            headers=headers,
            timeout=15
        )
    except Exception:
        pass

def get_audio_duration(ffmpeg_exe, file_path):
    try:
        cmd = [ffmpeg_exe, "-i", file_path]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8', errors='ignore')
        output = result.stderr
        import re
        match = re.search(r"Duration:\s*(\d+):(\d+):(\d+)\.(\d+)", output)
        if match:
            hours = int(match.group(1))
            minutes = int(match.group(2))
            seconds = int(match.group(3))
            ms = int(match.group(4))
            if len(match.group(4)) == 2:
                ms_val = ms / 100.0
            else:
                ms_val = ms / 1000.0
            return hours * 3600 + minutes * 60 + seconds + ms_val
    except Exception as e:
        print(f"Loi doc duration file {file_path}: {str(e)}")
    return 0.0

def google_translate(text, dest='vi'):
    """Dich van ban don le bang nhieu endpoint du phong, dam bao 100% khong bi loi 429"""
    if not text or not text.strip():
        return text
    clean_text = text.strip()
    
    import urllib.parse
    import re
    
    # 1. Endpoint Chrome Extension (clients5.google.com - cuc ky on dinh, khong bao gio chan 429)
    try:
        url = f"https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl={dest}&q={urllib.parse.quote(clean_text)}"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200:
            data = r.json()
            if isinstance(data, list) and len(data) > 0:
                item = data[0]
                if isinstance(item, list) and len(item) > 0 and item[0]:
                    return str(item[0]).strip()
                elif isinstance(item, str) and item:
                    return item.strip()
    except Exception:
        pass

    # 2. Endpoint Mobile Web (translate.google.com/m)
    try:
        url = f"https://translate.google.com/m?sl=auto&tl={dest}&q={urllib.parse.quote(clean_text)}"
        headers = {"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"}
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200:
            match = re.search(r'<div[^>]*class="result-container"[^>]*>(.*?)</div>', r.text)
            if match and match.group(1):
                import html
                return html.unescape(match.group(1)).strip()
    except Exception:
        pass

    # 3. Endpoint Fallback GTX (translate.googleapis.com)
    try:
        url = "https://translate.googleapis.com/translate_a/single"
        params = {"client": "gtx", "sl": "auto", "tl": dest, "dt": "t", "q": clean_text}
        r = requests.get(url, params=params, timeout=10)
        if r.status_code == 200:
            data = r.json()
            res = "".join([item[0] for item in data[0] if item and item[0]])
            if res.strip():
                return res.strip()
    except Exception:
        pass

    # 4. Endpoint MyMemory Translate Backup
    try:
        url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(clean_text)}&langpair=zh|{dest}"
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            data = r.json()
            res = data.get('responseData', {}).get('translatedText')
            if res and res.strip():
                return res.strip()
    except Exception:
        pass

    return clean_text

def google_translate_batch(texts, dest='vi'):
    """Dich danh sach nhieu cau bang 1 request duy nhat (Batching chong 429)"""
    if not texts:
        return []
    
    import urllib.parse
    cleaned_texts = [t.replace("\n", " ").strip() for t in texts]
    joined_text = "\n".join(cleaned_texts)
    
    # Su dung clients5.google.com voi multi-line
    try:
        url = f"https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl={dest}&q={urllib.parse.quote(joined_text)}"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        r = requests.get(url, headers=headers, timeout=20)
        if r.status_code == 200:
            data = r.json()
            if isinstance(data, list) and len(data) > 0:
                item = data[0]
                translated_str = item[0] if isinstance(item, list) and len(item) > 0 else (item if isinstance(item, str) else "")
                if translated_str:
                    lines = translated_str.split("\n")
                    if len(lines) == len(texts):
                        return [l.strip() for l in lines]
                    elif len(lines) > 0:
                        res = []
                        for idx, original_t in enumerate(texts):
                            if idx < len(lines) and lines[idx].strip():
                                res.append(lines[idx].strip())
                            else:
                                res.append(google_translate(original_t, dest=dest))
                        return res
    except Exception as e:
        print(Fore.YELLOW + f"    [!] Google Translate Batch gap loi ({str(e)}), fallback sang dich tung cau...")

    # Fallback tung cau an toan
    results = []
    for t in texts:
        results.append(google_translate(t, dest=dest))
        time.sleep(0.05)
    return results

def merge_tts_segments(ffmpeg_exe, tts_dir, segments, workspace):
    """Ghep cac file TTS thanh 1 audio track dong bo chinh xac tuyet doi voi subtitle timing"""
    print(Fore.CYAN + "[-] Dang dong bo hoa am thanh luyen giong (Absolute Sync)...")
    import soundfile as sf
    import numpy as np
    
    dubbed_audio = os.path.join(workspace, "dubbed_audio.wav")
    
    valid_segments = []
    max_end_time = 0.0
    
    for i, seg in enumerate(segments):
        seg_file = os.path.join(tts_dir, f"seg_{i:04d}.wav")
        if os.path.exists(seg_file) and os.path.getsize(seg_file) > 100:
            data, samplerate = sf.read(seg_file)
            if len(data.shape) > 1:
                data = data.mean(axis=1) # Chuyen ve mono neu bi stereo
            
            duration = len(data) / samplerate
            start_time = seg['start']
            end_time = start_time + duration
            
            if end_time > max_end_time:
                max_end_time = end_time
                
            valid_segments.append((start_time, data, samplerate))
            
    if not valid_segments:
        return None
        
    # Tao mang chua audio tong, chuan 16000Hz mono
    target_sr = 16000
    total_samples = int(max_end_time * target_sr) + target_sr # Du phong 1 giay chong tran
    mixed_audio = np.zeros(total_samples, dtype=np.float32)
    
    for start_time, data, samplerate in valid_segments:
        if samplerate != target_sr:
            # Resample bang numpy interpolation neu khong phai 16kHz
            num_samples = int(len(data) * target_sr / samplerate)
            data = np.interp(
                np.linspace(0.0, 1.0, num_samples),
                np.linspace(0.0, 1.0, len(data)),
                data
            )
            
        start_sample = int(start_time * target_sr)
        end_sample = min(start_sample + len(data), len(mixed_audio))
        clipped_data = data[:end_sample - start_sample]
        
        # Phep cong (+) dam bao am thanh chong lan van tu nhien, thay vi bi day lui timing
        mixed_audio[start_sample:end_sample] += clipped_data
        
    # Normalize neu co vi tri 2 giong noi chong nhau lam am luong vuot nguong
    max_val = np.max(np.abs(mixed_audio))
    if max_val > 1.0:
        mixed_audio = mixed_audio / max_val
        
    sf.write(dubbed_audio, mixed_audio, target_sr)
    
    return dubbed_audio

def extract_vocals_demucs(workspace, audio_path, ffmpeg_exe):
    """
    Su dung demucs de tach giong noi khoi nhac nen (Vocal Isolation)
    Tra ve duong dan den file nhac nen da tach (no_vocals.wav)
    """
    print(Fore.CYAN + "[-] Dang thuc hien tach giong noi khoi nhac nen (Vocal Isolation)...")
    try:
        import subprocess
        # Workspace lam viec tuyet doi de tranh nham lan duong dan
        abs_workspace = os.path.abspath(workspace)
        abs_audio_path = os.path.abspath(audio_path)
        demucs_out = os.path.join(abs_workspace, "demucs_out")
        os.makedirs(demucs_out, exist_ok=True)
        
        vocals_path = os.path.join(demucs_out, "htdemucs", "audio", "vocals.wav")
        instrumental_path = os.path.join(demucs_out, "htdemucs", "audio", "no_vocals.wav")
        
        if os.path.exists(instrumental_path) and os.path.exists(vocals_path) and os.path.getsize(instrumental_path) > 100:
            print(Fore.GREEN + "    [✓] Giong noi va nhac nen da duoc tach tu truoc.")
            return {"vocals": vocals_path, "instrumental": instrumental_path}
            
        print(Fore.YELLOW + "    -> Dang chay Demucs tren CPU (Se mat tu 1-3 phut)...")
        # Ghi code monkey-patch ra file tam de tranh loi parsing ky tu xuong dong cua Windows Shell
        patch_file = os.path.join(abs_workspace, "demucs_patch.py")
        patch_code = (
            "import sys\n"
            "import torchaudio\n"
            "import soundfile as sf\n"
            "def patched_save(filepath, src, sample_rate, **kwargs):\n"
            "    sf.write(filepath, src.transpose(0, 1).cpu().numpy(), sample_rate)\n"
            "torchaudio.save = patched_save\n"
            "from demucs.separate import main\n"
            "sys.exit(main())\n"
        )
        try:
            with open(patch_file, "w", encoding="utf-8") as pf:
                pf.write(patch_code)
        except Exception as write_err:
            print(Fore.RED + f"    [!] Khong the tao file patch demucs: {str(write_err)}")
            return None
            
        cmd = [sys.executable, patch_file, "--two-stems=vocals", "-d", "cpu", "-o", demucs_out, abs_audio_path]
        
        import time
        start_time = time.time()
        print(Fore.WHITE + "    Lenh: [Demucs Monkey-Patch Torchaudio]")
        
        # Chay demucs, bo capture de hien thi truc tiep process bar ra terminal cho nguoi dung
        result = subprocess.run(cmd)
        
        # Xoa file patch tam thoi ngay sau khi chay xong
        if os.path.exists(patch_file):
            try:
                os.remove(patch_file)
            except:
                pass
                
        duration = time.time() - start_time
        
        if result.returncode == 0 and os.path.exists(instrumental_path) and os.path.exists(vocals_path):
            print(Fore.GREEN + f"    [✓] Tach nhac nen va giong noi (Vocal Isolation) thanh cong!")
            print(Fore.YELLOW + Style.BRIGHT + f"\n[!] THOI GIAN TACH NHAC NEN (DEMUCS): {duration:.2f} giay.\n")
            return {"vocals": vocals_path, "instrumental": instrumental_path}
        else:
            print(Fore.RED + f"    [!] Loi demucs (Return code {result.returncode})")
    except FileNotFoundError:
        print(Fore.YELLOW + "    [!] Khong tim thay lenh 'demucs' trong he thong. Vui long cai dat bang 'pip install demucs'.")
    except Exception as e:
        print(Fore.RED + f"    [!] Gap loi khi chay demucs: {str(e)}")
        
    return None



def get_video_props(video_path):
    import subprocess, json
    cmd = ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate,bit_rate:format=bit_rate", "-of", "json", video_path]
    out = subprocess.check_output(cmd).decode('utf-8')
    data = json.loads(out)
    stream = data['streams'][0]
    
    bitrate_kbps = None
    if 'bit_rate' in stream and stream['bit_rate']:
        try:
            bitrate_kbps = int(int(stream['bit_rate']) / 1000)
        except:
            pass
    if not bitrate_kbps and 'format' in data and 'bit_rate' in data['format'] and data['format']['bit_rate']:
        try:
            bitrate_kbps = int(int(data['format']['bit_rate']) / 1000)
        except:
            pass
            
    return stream['width'], stream['height'], stream['r_frame_rate'], bitrate_kbps

def standardize_and_cache_video(video_path, target_width, target_height, target_fps):
    import hashlib, os, subprocess
    cache_dir = os.path.join(os.getcwd(), "cache", "branding")
    os.makedirs(cache_dir, exist_ok=True)
    
    path_hash = hashlib.md5(video_path.encode('utf-8')).hexdigest()
    cache_filename = f"vid_{path_hash}_{target_width}x{target_height}_{target_fps.replace('/','_')}.mp4"
    cache_filepath = os.path.join(cache_dir, cache_filename)
    
    if os.path.exists(cache_filepath):
        os.utime(cache_filepath, None)
        return cache_filepath
        
    existing_versions = [f for f in os.listdir(cache_dir) if f.startswith(f"vid_{path_hash}_")]
    if len(existing_versions) >= 5:
        full_paths = [os.path.join(cache_dir, f) for f in existing_versions]
        full_paths.sort(key=os.path.getatime)
        os.remove(full_paths[0])
        
    scale_pad_filter = f"scale={target_width}:{target_height}:force_original_aspect_ratio=decrease,pad={target_width}:{target_height}:(ow-iw)/2:(oh-ih)/2:color=black"
    
    cmd = [
        "ffmpeg", "-y", "-i", video_path,
        "-vf", scale_pad_filter,
        "-r", str(target_fps),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
        cache_filepath
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return cache_filepath

def detect_best_encoder(target_kbps=2000):
    """Auto-detect GPU encoder kha dung, tra ve (vcodec, extra_args) voi Rate Control VBR toi uu dung luong triet de"""
    import subprocess
    
    target_str = f"{target_kbps}k"
    maxrate_str = f"{target_kbps}k"
    bufsize_str = f"{target_kbps * 2}k"
    
    candidates = [
        ("h264_nvenc", {
            "preset": "p4",
            "rc": "vbr",
            "b:v": target_str,
            "maxrate": maxrate_str,
            "bufsize": bufsize_str,
            "cq": "26"
        }),
        ("h264_amf", {
            "rc": "vbr_latency",
            "b:v": target_str,
            "maxrate": maxrate_str,
            "bufsize": bufsize_str,
            "quality": "speed"
        }),
        ("h264_qsv", {
            "preset": "fast",
            "b:v": target_str,
            "maxrate": maxrate_str,
            "global_quality": "26"
        }),
    ]
    for codec, extra in candidates:
        try:
            r = subprocess.run(
                ["ffmpeg", "-f", "lavfi", "-i", "color=c=black:s=320x240:d=0.1",
                 "-c:v", codec, "-f", "null", "NUL"],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10
            )
            if r.returncode == 0:
                print(Fore.GREEN + f"  [GPU] Su dung encoder phan cung: {codec} (Target Bitrate: {target_kbps} kbps, Maxrate: {maxrate_str})")
                return codec, extra
        except:
            pass
    print(Fore.YELLOW + f"  [CPU] Su dung libx264 veryfast (CRF 25, Target Bitrate: {target_kbps} kbps)")
    return "libx264", {
        "preset": "veryfast",
        "crf": "25",
        "b:v": target_str,
        "maxrate": maxrate_str,
        "bufsize": bufsize_str
    }

def process_task(token, task):
    global API_BASE_URL
    import shutil
    
    task_id = task.get("id")
    source_url = task.get("sourceUrl", "")
    # Remove surrounding quotes if user copied path with quotes
    if source_url.startswith('"') and source_url.endswith('"'):
        source_url = source_url[1:-1]
    elif source_url.startswith("'") and source_url.endswith("'"):
        source_url = source_url[1:-1]
        
    source_lang = task.get("sourceLang", "zh")
    branding_enabled = task.get("brandingEnabled", False)
    logo_url = task.get("logoUrl", "")
    intro_url = task.get("introVideoUrl", "")
    outro_url = task.get("outroVideoUrl", "")
    print(Fore.MAGENTA + Style.BRIGHT + f"\n>>> BAT DAU XU LY TASK #{task_id}")
    print(Fore.MAGENTA + f"    Duong dan File (Local): {source_url}")

    headers = {"Authorization": f"Bearer {token}"}
    
    workspace = f"workspace/task_{task_id}"
    os.makedirs(workspace, exist_ok=True)
    
    # Copy/Download video vao workspace de tien xu ly
    print(Fore.CYAN + "[-] Chuan bi video vao thu muc lam viec...")
    requests.patch(f"{API_BASE_URL}/tasks", json={"action": "update", "taskId": task_id, "status": "downloading", "progress": 10}, headers=headers)

    local_input = os.path.join(workspace, "input.mp4")
    video_slowdown_str = task.get("videoSlowdown") or task.get("video_slowdown") or "1.0"
    try:
        video_slowdown = float(video_slowdown_str)
    except:
        video_slowdown = 1.0

    slowdown_tag = f"spd{int(video_slowdown*100)}" if video_slowdown < 0.999 else "spd100"
    speed_marker = os.path.join(workspace, f"speed_{slowdown_tag}.done")

    if not os.path.exists(local_input) or not os.path.exists(speed_marker):
        if not os.path.exists(source_url):
            print(Fore.RED + f"[-] Loi: Khong tim thay file {source_url} tren may tinh!")
            requests.patch(f"{API_BASE_URL}/tasks", json={"action": "update", "taskId": task_id, "status": "failed", "error": f"Khong tim thay file tren o cung: {source_url}"}, headers=headers)
            return
        
        # Xóa các file trung gian cũ nếu tốc độ đã thay đổi
        import glob
        for old_file in ["input.mp4", "audio.wav", "vocals.wav", "no_vocals.wav"]:
            fpath = os.path.join(workspace, old_file)
            if os.path.exists(fpath):
                try: os.remove(fpath)
                except: pass
        for marker in glob.glob(os.path.join(workspace, "speed_*.done")):
            try: os.remove(marker)
            except: pass

        # Tiền xử lý giảm tốc độ video gốc nếu cấu hình < 1.0 (ví dụ 0.90x = giảm 10%)
        if video_slowdown < 0.999:
            print(Fore.CYAN + f"[-] Dang tien xu ly giam toc do video goc xuong {int(video_slowdown * 100)}% ({video_slowdown:.2f}x) de toi uu long tieng...")
            raw_temp = os.path.join(workspace, "input_raw.mp4")
            shutil.copy2(source_url, raw_temp)
            speed = video_slowdown
            setpts_val = 1.0 / speed
            cmd = [
                "ffmpeg", "-y", "-i", raw_temp,
                "-vf", f"setpts={setpts_val:.6f}*PTS",
                "-af", f"atempo={speed:.4f}",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
                "-c:a", "aac", "-b:a", "192k",
                local_input
            ]
            import subprocess
            res_slow = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            if res_slow.returncode != 0:
                err_text = res_slow.stderr.decode('utf-8', errors='ignore') if res_slow.stderr else 'Unknown error'
                print(Fore.YELLOW + f"[!] Giam toc video that bai, fallback sang video goc: {err_text[:200]}")
                shutil.copy2(raw_temp, local_input)
            else:
                print(Fore.GREEN + f"  [✓] Da giam toc do video thanh cong ({video_slowdown:.2f}x)!")
            try:
                if os.path.exists(raw_temp):
                    os.remove(raw_temp)
            except:
                pass
        else:
            shutil.copy2(source_url, local_input)
        
        try:
            with open(speed_marker, "w") as f:
                f.write(slowdown_tag)
        except:
            pass

    # 1. TRANSCRIBING
    duration_sec = 0
    ffmpeg_exe = "ffmpeg"
    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        duration_sec = get_audio_duration(ffmpeg_exe, local_input)
    except Exception as e:
        print(Fore.YELLOW + f"[!] Khong the lay thoi luong video: {e}")

    print(Fore.CYAN + "[-] Dang nhan dang giong noi (Whisper AI) - Se mat vai phut tuy do dai video...")
    requests.patch(f"{API_BASE_URL}/tasks", json={"action": "update", "taskId": task_id, "status": "transcribing", "progress": 30, "durationSec": int(duration_sec)}, headers=headers)
    
    asr_engine = task.get("asrEngine", "faster-whisper")
    stt_preset = "balanced"
    noise_level = "normal"
    if ":" in asr_engine:
        parts = asr_engine.split(":")
        if len(parts) > 1:
            stt_preset = parts[1]
        if len(parts) > 2:
            noise_level = parts[2]

    safe_engine = asr_engine.replace(":", "_").replace("/", "_")
    slowdown_tag = f"spd{int(video_slowdown*100)}" if video_slowdown < 0.999 else "spd100"
    extracted_segments_file = os.path.join(workspace, f"extracted_segments_{safe_engine}_{source_lang}_{slowdown_tag}.json")
    
    try:
        import json
        stt_was_run = False
        if os.path.exists(extracted_segments_file):
            print(Fore.GREEN + "[-] Phat hien du lieu STT cu, bo qua STT va chay tiep...")
            with open(extracted_segments_file, "r", encoding="utf-8") as f:
                extracted_segments = json.load(f)
        else:
            stt_was_run = True
            is_bcut = "bcut" in asr_engine.lower()
            if not is_bcut:
                acquire_resource_lock(token, task_id, "whisper_cpu", "Whisper CPU")
            audio_path = os.path.join(workspace, "audio.wav")
            if not os.path.exists(audio_path):
                print(Fore.CYAN + "[-] Dang trich xuat am thanh (WAV 16kHz) tu Video de tranh loi ASR...")
                import subprocess
                result = subprocess.run([
                    "ffmpeg", "-y", "-i", local_input, 
                    "-vn", "-acodec", "pcm_s16le", 
                    "-ar", "16000", "-ac", "1", 
                    audio_path
                ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

                if result.returncode != 0:
                    err_str = result.stderr.decode('utf-8', errors='ignore').lower()
                    if "does not contain any stream" in err_str or "no streams to output" in err_str:
                        raise Exception("Video KHONG CO AM THANH! Xin kiem tra lai file goc.")
                    else:
                        raise Exception(f"Loi FFMPEG khi trich xuat am thanh: {err_str[-150:]}")

            STT_PRESETS = {
                "fast":     {"model_size": "base",  "beam_size": 2, "vad_params": {"min_silence_duration_ms": 500}},
                "balanced": {"model_size": "small", "beam_size": 3, "vad_params": {"min_silence_duration_ms": 500}},
                "quality":  {"model_size": "small", "beam_size": 5, "vad_params": {"min_silence_duration_ms": 1000}},
            }
            preset = STT_PRESETS.get(stt_preset, STT_PRESETS["balanced"])
            model_size = preset["model_size"]
            beam_size = preset["beam_size"]
            
            # Map noise level to VAD threshold, speech_pad_ms, and condition_on_previous_text
            NOISE_PROFILES = {
                "clean":  {"threshold": 0.5,  "speech_pad_ms": 200, "condition_on_previous_text": True},
                "normal": {"threshold": 0.35, "speech_pad_ms": 300, "condition_on_previous_text": False},
                "noisy":  {"threshold": 0.2,  "speech_pad_ms": 500, "condition_on_previous_text": False},
            }
            profile = NOISE_PROFILES.get(noise_level, NOISE_PROFILES["normal"])
            
            # Combine preset's default vad_params with noise profile settings
            vad_params = preset["vad_params"].copy() if preset["vad_params"] is not None else {}
            vad_params["threshold"] = profile["threshold"]
            vad_params["speech_pad_ms"] = profile["speech_pad_ms"]

            print(Fore.CYAN + f"[-] Che do STT: {stt_preset.upper()} | Tap am: {noise_level.upper()} (Model: {model_size}, Beam: {beam_size}, VAD: {vad_params}, PrevTextCond: {profile['condition_on_previous_text']})")
            
            whisper_input_audio = audio_path
            if noise_level == "noisy":
                print(Fore.CYAN + "[-] Dang chay Demucs AI de tach giong noi khoi nhac nen (Vocal Isolation)...")
                try:
                    requests.patch(f"{API_BASE_URL}/tasks", json={"action": "update", "taskId": task_id, "status": "transcribing", "progress": 25}, headers=headers)
                except:
                    pass
                
                try:
                    demucs_res = extract_vocals_demucs(workspace, audio_path, ffmpeg_exe)
                    if demucs_res and isinstance(demucs_res, dict) and demucs_res.get("vocals"):
                        vocals_path = demucs_res["vocals"]
                        vocals_16k = os.path.join(workspace, "vocals_16k.wav")
                        print(Fore.CYAN + "[-] Dang resample giong noi da tach sang 16kHz Mono...")
                        resample_cmd = [
                            ffmpeg_exe, "-y", "-i", vocals_path,
                            "-vn", "-acodec", "pcm_s16le",
                            "-ar", "16000", "-ac", "1",
                            vocals_16k
                        ]
                        res = subprocess.run(resample_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                        if res.returncode == 0 and os.path.exists(vocals_16k):
                            whisper_input_audio = vocals_16k
                            vad_params["threshold"] = 0.35
                            vad_params["speech_pad_ms"] = 300
                            print(Fore.GREEN + "  [✓] Su dung file giong noi da loc sach tap am de chay STT.")
                        else:
                            print(Fore.YELLOW + "  [!] Resample that bai, fallback dung audio goc.")
                    else:
                        print(Fore.YELLOW + "  [!] Demucs that bai hoac chua duoc cai, fallback dung audio goc.")
                except Exception as demucs_err:
                    print(Fore.YELLOW + f"  [!] Gap loi khi chay Demucs: {str(demucs_err)}. Fallback dung audio goc.")

            if model_size == "base":
                print(Fore.YELLOW + "  [!] Dang tai model Whisper 'base' neu chua co tren o dia (~150MB). Vui long cho...")

            from faster_whisper import WhisperModel
            try:
                model = WhisperModel(model_size, device="auto", compute_type="int8")
            except Exception as model_err:
                print(Fore.YELLOW + f"  [!] Loi nap model Whisper GPU ({model_size}): {model_err}. Dang thu fallback sang CPU...")
                model = WhisperModel(model_size, device="cpu", compute_type="int8")
            
            asr_start_time = time.time()
            
            # --- Tích hợp AI Pipeline: Trích xuất initial_prompt từ translateContext ---
            initial_prompt = None
            translate_ctx = task.get("translateContext", "")
            if translate_ctx:
                import re
                # Bắt các từ Hán tự trước dấu '=' trong bảng từ điển (Ví dụ: 燕琼 = Yến Quỳnh)
                matches = re.findall(r'([一-龥]+)\s*=', translate_ctx)
                if matches:
                    # Whisper initial_prompt giới hạn ở ~224 tokens, nên ta chỉ lấy max 30 từ
                    initial_prompt = ", ".join(matches[:30])
                    print(Fore.CYAN + f"[-] Đã tiêm {len(matches[:30])} từ vựng chuyên ngành vào Whisper initial_prompt.")

            transcribe_kwargs = {
                "beam_size": beam_size,
                "vad_filter": True,
                "condition_on_previous_text": profile["condition_on_previous_text"]
            }
            if vad_params:
                transcribe_kwargs["vad_parameters"] = vad_params
            if initial_prompt:
                transcribe_kwargs["initial_prompt"] = initial_prompt

            try:
                segments, info = model.transcribe(whisper_input_audio, **transcribe_kwargs)
            except Exception as trans_err:
                print(Fore.YELLOW + f"  [!] Loi chay Whisper GPU ({model_size}): {trans_err}. Dang thu fallback sang CPU...")
                model = WhisperModel(model_size, device="cpu", compute_type="int8")
                segments, info = model.transcribe(whisper_input_audio, **transcribe_kwargs)
            
            extracted_segments = []
            prev_end = 0.0
            
            for segment in segments:
                s_start = segment.start
                s_end = segment.end
                s_text = segment.text.strip()
                
                if duration_sec > 0 and len(extracted_segments) % 5 == 0:
                    current_prog = int(30 + (s_end / duration_sec) * 30)
                    current_prog = min(59, current_prog)
                    try:
                        requests.patch(f"{API_BASE_URL}/tasks", json={"action": "update", "taskId": task_id, "status": "transcribing", "progress": current_prog}, headers=headers)
                    except:
                        pass
                
                
                if s_start < prev_end:
                    s_start = prev_end + 0.1
                
                if duration_sec > 0 and s_end > duration_sec:
                    s_end = duration_sec
                    
                if s_end - s_start > 15.0 and len(s_text) < 10:
                    continue
                    
                if s_start >= s_end or not s_text:
                    continue
                    
                prev_end = s_end
                
                extracted_segments.append({
                    "start": s_start,
                    "end": s_end,
                    "text": s_text
                })
                print(Fore.WHITE + f"  [{format_timestamp(segment.start)} -> {format_timestamp(segment.end)}] {segment.text}")
                
            if len(extracted_segments) == 0:
                raise Exception("Video khong co giong noi (Empty Speech). Vui long chon video co tieng nguoi.")
                
            with open(extracted_segments_file, "w", encoding="utf-8") as f:
                json.dump(extracted_segments, f, ensure_ascii=False, indent=2)
                
            asr_end_time = time.time()
            asr_duration = asr_end_time - asr_start_time
            print(Fore.YELLOW + Style.BRIGHT + f"\n[!] THOI GIAN HOAN THANH NHAN DANG (STT): {asr_duration:.2f} giay.\n")
            if not is_bcut:
                release_resource_lock(token, task_id, "whisper_cpu")
            
    except Exception as e:
         is_bcut = "bcut" in asr_engine.lower()
         if not is_bcut:
             release_resource_lock(token, task_id, "whisper_cpu")
         print(Fore.RED + f"[-] Loi Nhan dang (ASR): {str(e)}")
         requests.patch(f"{API_BASE_URL}/tasks", json={"action": "update", "taskId": task_id, "status": "failed", "error": f"Loi Whisper ASR: {str(e)}"}, headers=headers)
         return

    # 2. TRANSLATING
    print(Fore.CYAN + "[-] Dang dich phu de sang Tieng Viet...")
    requests.patch(f"{API_BASE_URL}/tasks", json={"action": "update", "taskId": task_id, "status": "translating", "progress": 60}, headers=headers)
    
    translate_engine = task.get("translateEngine", "google")
    cache_suffix = translate_engine
    if translate_engine == "connect-hub" and task.get("llmModel"):
        safe_model = task.get("llmModel").replace("|", "_").replace(":", "_").replace("/", "_")
        cache_suffix = f"{translate_engine}_{safe_model}"
    translated_segments_file = os.path.join(workspace, f"translated_segments_{cache_suffix}.json")
    
    if stt_was_run and os.path.exists(translated_segments_file):
        try:
            os.remove(translated_segments_file)
            print(Fore.YELLOW + "[-] STT vua chay lai, xoa ban dich cu.")
        except:
            pass
    
    translate_start_time = time.time()
    try:
        import json
        if os.path.exists(translated_segments_file):
            print(Fore.GREEN + "[-] Phat hien du lieu Dich thuat cu, chay tiep tu phan chua dich...")
            with open(translated_segments_file, "r", encoding="utf-8") as f:
                translated_segments = json.load(f)
        else:
            translated_segments = []
        
        translated_count = len(translated_segments)
        
        if translated_count >= len(extracted_segments):
            print(Fore.GREEN + "  [✓] Da dich xong toan bo video tu truoc.")
        else:
            if translated_count > 0:
                print(Fore.CYAN + f"  -> Da dich {translated_count}/{len(extracted_segments)} cau. Dang dich tiep...")
                
            segments_to_translate = extracted_segments[translated_count:]
            
            def save_translation_progress():
                with open(translated_segments_file, "w", encoding="utf-8") as f:
                    json.dump(translated_segments, f, ensure_ascii=False, indent=2)
            
            if task.get("translateEngine") == "connect-hub":
                import re
                
                # 1. Phân loại chiến lược dịch thuật (Translation Strategy Routing)
                is_browser_bridge = (
                    "browser-ai-bridge" in str(task.get("aiAppSlug", "")).lower() or
                    "browser-ai-bridge" in str(task.get("llmModel", "")).lower() or
                    "browser-ai-bridge" in str(task.get("appSlug", "")).lower() or
                    task.get("aiAppSlug") == "browser-ai-bridge" or
                    task.get("translateAiAppSlug") == "browser-ai-bridge" or
                    str(task.get("llmModel", "")).lower() in ["gemini", "chatgpt"]
                )

                # Quy tắc Batch Size động:
                # - Browser AI Bridge (Gemini Pro/ChatGPT Web): Gom nhóm BATCH VÀNG 80 câu/lần siêu tốc chống lỗi 1095
                # - DeepSeek / OpenAI API: Gom nhóm 40 câu/lần + 5 câu Sliding Window Context
                if is_browser_bridge:
                    BATCH_SIZE = 80
                    print(Fore.CYAN + f"  -> Chế độ: Browser AI Bridge (Gemini Pro Web) - Gom nhóm BATCH VÀNG {BATCH_SIZE} câu/lần (Tốc độ 6-10s)")
                else:
                    BATCH_SIZE = 40
                    selected_model = task.get("aiModel") or task.get("llmModel") or "DeepSeek / Cloud LLM"
                    print(Fore.CYAN + f"  -> Chế độ: Cloud API ({selected_model}) - Gom nhóm BATCH {BATCH_SIZE} câu + 5 câu Ngữ cảnh")

                target_ai = "chatgpt" if "chatgpt" in str(task.get("aiModel") or task.get("llmModel") or "").lower() else "gemini"

                for i in range(0, len(segments_to_translate), BATCH_SIZE):
                    batch_segs = segments_to_translate[i:i+BATCH_SIZE]
                    texts = [seg['text'] for seg in batch_segs]
                    
                    # Trích xuất Sliding Window Context (5 câu cuối của đoạn trước)
                    prev_context = []
                    if translated_count > 0 and i == 0:
                        prev_context = [seg['text'] for seg in translated_segments[-5:]]
                    elif i > 0:
                        prev_context = [seg['text'] for seg in segments_to_translate[max(0, i-5):i]]

                    translated_array = None
                    
                    # NHÁNH 1: Bắn qua Local WebSocket Bridge nếu chọn Browser AI Bridge (80 câu/lần)
                    if is_browser_bridge and bridge_server.is_connected():
                        print(Fore.CYAN + f"  [⚡ WebSocket Local] Dang ban truc tiep {len(texts)} cau sang Chrome Extension ({target_ai.upper()})...")
                        ws_input = {str(k): t for k, t in enumerate(texts)}
                        context_str = f"\nBối cảnh phim: {task.get('translateContext', '')}" if task.get('translateContext') else ""
                        ws_prompt = f"""Bạn là một biên dịch viên phụ đề phim và video chuyên nghiệp (Senior Subtitle Translator). Hãy dịch toàn bộ {len(texts)} câu thoại tiếng Trung sau sang tiếng Việt tự nhiên, thoát ý, cô đọng chuẩn phụ đề:{context_str}

QUY TẮC BẮT BUỘC:
1. TỰ ĐỘNG PHÁT HIỆN THỂ LOẠI & ÁP DỤNG VĂN PHONG PHÙ HỢP:
   - 🌿 Sinh tồn hoang dã / Chế tác / Thiên nhiên: Văn phong mộc mạc, gần gũi, cuốn hút chuẩn vlog sinh tồn ("tôi/mình", nơi trú ẩn, bão tuyết, bẫy đá...).
   - 🔬 Khoa học / Khám phá / Tài liệu: Văn phong chuẩn xác, hiện đại, logic, dễ hiểu.
   - 🏢 Đô thị / Hiện đại / Drama: Văn phong tự nhiên, đời thường, bắt trend ("tôi - bạn / anh - em").
   - ⚔️ Cổ trang / Tiên hiệp: Văn phong Hán Việt cổ phong ("Trẫm, Bệ hạ, Thần, Huynh, Đệ...").
2. Tuyệt đối KHÔNG dịch thô word-by-word. Tự động sửa lỗi nghe nhầm đồng âm ASR tiếng Trung. Dịch ngắn gọn, súc tích, khớp khẩu hình/nhịp video.
3. ĐÚNG ĐỦ {len(texts)} CÂU: Bắt buộc trả về đúng định dạng JSON gốc với đủ tất cả các key từ "0" đến "{len(texts)-1}". Tuyệt đối KHÔNG bỏ sót câu nào ở cuối!
4. KHÔNG giải thích, KHÔNG thêm lời chào, KHÔNG bọc trong markdown code block (```json). Chỉ trả về mã JSON thuần túy để máy đọc.

Dữ liệu:
{json.dumps(ws_input, ensure_ascii=False)}"""

                        # Timeout 150s cho batch 80 câu (Gemini Web gõ 80 câu mất ~45-80s)
                        ws_timeout = 150
                        ws_res = bridge_server.execute_job(ws_prompt, target_ai=target_ai, timeout=ws_timeout)
                        if ws_res and ws_res.get("success") and ws_res.get("result"):
                            res_val = ws_res.get("result")
                            
                            def parse_translation_json(val, total_count, orig_texts=None):
                                if not val:
                                    return None
                                if isinstance(val, list):
                                    return {str(i): str(x).strip() for i, x in enumerate(val) if str(x).strip()}
                                if isinstance(val, dict):
                                    if '0' not in val and 0 not in val and ('1' in val or 1 in val):
                                        return {str(int(k) - 1 if str(k).isdigit() else k): v for k, v in val.items()}
                                    if any(str(k) in val for k in range(min(total_count, 5))):
                                        return val
                                    if "result" in val:
                                        return parse_translation_json(val["result"], total_count, orig_texts)
                                    vals = [str(v).strip() for v in val.values() if str(v).strip()]
                                    if len(vals) >= min(total_count // 2, 5):
                                        return {str(i): vals[i] for i in range(len(vals))}
                                if not isinstance(val, str):
                                    val = str(val)

                                clean_str = re.sub(r"^```(?:json)?\s*", "", val.strip(), flags=re.IGNORECASE)
                                clean_str = re.sub(r"\s*```$", "", clean_str, flags=re.IGNORECASE).strip()
                                clean_str = re.sub(r"^json\s*\n\s*copy\s*\n", "", clean_str, flags=re.IGNORECASE).strip()

                                # Chiến lược 1A: Thử parse JSON Array trực tiếp [...]
                                arr_m = re.search(r'(\[[\s\S]*\])', clean_str)
                                if arr_m:
                                    try:
                                        arr = json.loads(arr_m.group(1))
                                        if isinstance(arr, list) and len(arr) > 0:
                                            return {str(i): str(x).strip() for i, x in enumerate(arr) if str(x).strip()}
                                    except Exception:
                                        pass

                                # Chiến lược 1B: Thử parse JSON Object chuẩn và sửa trailing comma
                                json_m = re.search(r'(\{[\s\S]*\})', clean_str)
                                if json_m:
                                    raw_json = json_m.group(1)
                                    try:
                                        p = json.loads(raw_json)
                                        if isinstance(p, dict):
                                            if '0' not in p and 0 not in p and ('1' in p or 1 in p):
                                                return {str(int(k) - 1 if str(k).isdigit() else k): v for k, v in p.items()}
                                            if any(str(k) in p for k in range(min(total_count, 5))):
                                                return p
                                    except Exception:
                                        try:
                                            fixed_j = re.sub(r',\s*([\}\]])', r'\1', raw_json)
                                            p = json.loads(fixed_j)
                                            if isinstance(p, dict):
                                                if '0' not in p and 0 not in p and ('1' in p or 1 in p):
                                                    return {str(int(k) - 1 if str(k).isdigit() else k): v for k, v in p.items()}
                                                if any(str(k) in p for k in range(min(total_count, 5))):
                                                    return p
                                        except Exception:
                                            pass

                                # Chiến lược 2: Regex từng dòng key-value chịu lỗi siêu cao (chống unescaped quotes)
                                res_map = {}
                                lines = clean_str.split('\n')
                                for line in lines:
                                    line_clean = line.strip().rstrip(',').strip()
                                    m = re.match(r'^["\']?(\d+)["\']?\s*:\s*["\']?(.*?)["\']?$', line_clean)
                                    if m:
                                        k_str, v_str = m.group(1), m.group(2).strip()
                                        if v_str.startswith('"') and v_str.endswith('"') and len(v_str) > 1:
                                            v_str = v_str[1:-1]
                                        elif v_str.startswith("'") and v_str.endswith("'") and len(v_str) > 1:
                                            v_str = v_str[1:-1]
                                        if v_str:
                                            res_map[k_str] = v_str

                                if len(res_map) >= min(total_count // 2, 5):
                                    if '0' not in res_map and '1' in res_map:
                                        res_map = {str(int(k) - 1 if str(k).isdigit() else k): v for k, v in res_map.items()}
                                    return res_map

                                # Chiến lược 3: Regex multi-line bóc tách key-value
                                pattern = r'["\']?(\d+)["\']?\s*:\s*["\']([\s\S]*?)(?=["\']\s*,\s*["\']?\d+["\']?\s*:|["\']?\s*\}|$)'
                                matches = re.findall(pattern, clean_str)
                                if matches:
                                    for k_str, v_str in matches:
                                        clean_v = v_str.strip().rstrip('",\'').strip()
                                        if clean_v and k_str not in res_map:
                                            res_map[k_str] = clean_v
                                    if len(res_map) >= min(total_count // 2, 5):
                                        if '0' not in res_map and '1' in res_map:
                                            res_map = {str(int(k) - 1 if str(k).isdigit() else k): v for k, v in res_map.items()}
                                        return res_map

                                # Chiến lược 4: Danh sách đánh số 1. Text hoặc [0] Text
                                num_matches = re.findall(r'(?:^|\n)\s*(?:\[?(\d+)\]?[\.\:\-\s]+)(.+)', clean_str)
                                if num_matches and len(num_matches) >= min(total_count // 2, 5):
                                    num_map = {}
                                    for num_s, text_s in num_matches:
                                        num_map[str(int(num_s))] = text_s.strip().strip('"\'')
                                    if "0" not in num_map and "1" in num_map:
                                        return {str(int(k) - 1): v for k, v in num_map.items()}
                                    return num_map

                                # Chiến lược 5: Từng dòng text thuần túy
                                if orig_texts:
                                    clean_lines = [l.strip() for l in clean_str.split('\n') if l.strip() and not l.strip().startswith('{') and not l.strip().startswith('}') and not l.strip().startswith('```') and not any(kw in l.lower() for kw in ['dưới đây', 'bản dịch', 'tiếng việt', 'here is'])]
                                    if len(clean_lines) >= len(orig_texts) * 0.7:
                                        return {str(idx): clean_lines[idx] for idx in range(min(len(clean_lines), len(orig_texts)))}

                                return None

                            trans_map = parse_translation_json(res_val, len(texts), texts)
                            if trans_map:
                                # Chống nuốt câu & Tự động map chuẩn mảng
                                if '0' not in trans_map and '1' in trans_map:
                                    trans_map = {str(int(k) - 1 if str(k).isdigit() else k): v for k, v in trans_map.items()}

                                # Lấy danh sách values theo thứ tự để bọc lót nếu bị lệch key
                                ordered_vals = [str(v).strip() for k, v in sorted(trans_map.items(), key=lambda x: int(x[0]) if x[0].isdigit() else 9999) if str(v).strip()]

                                # Kiểm tra nếu Gemini trả về thiếu quá 5 câu trên 80 câu -> Kích hoạt Cứu hộ
                                if len(ordered_vals) < len(texts) - 5:
                                    print(Fore.YELLOW + f"  [⚠️ Cảnh báo] Gemini trả về thiếu {len(texts) - len(ordered_vals)}/{len(texts)} câu (Chỉ được {len(ordered_vals)} câu). Chuyển sang Cứu hộ Cloud API...")
                                    translated_array = None
                                else:
                                    translated_array = []
                                    for k in range(len(texts)):
                                        t_val = trans_map.get(str(k)) or trans_map.get(k)
                                        if t_val and str(t_val).strip():
                                            translated_array.append(str(t_val).strip())
                                        elif k < len(ordered_vals):
                                            translated_array.append(ordered_vals[k])
                                        else:
                                            # Tuyệt đối KHÔNG nhân bản câu trước nếu bị thiếu ở cuối batch
                                            translated_array.append(texts[k])
                                    print(Fore.GREEN + Style.BRIGHT + f"  [⚡ WebSocket Local] Da trich xuat thanh cong {len(translated_array)} cau dich muot ma tu {target_ai.upper()}!")
                            else:
                                preview = str(res_val)[:100].replace('\n', ' ')
                                print(Fore.YELLOW + f"  [!] Khong the parse JSON tu {target_ai.upper()} (Output: '{preview}...'). Kich hoat Cuu ho...")
                    elif is_browser_bridge:
                        print(Fore.YELLOW + "  [!] Browser AI Bridge duoc chon nhung Extension chua bat. Chuyen sang Cuu ho...")

                    # NHÁNH 2: TẦNG 2 - Cứu hộ bằng DeepSeek Cloud API qua Connect Hub
                    if not translated_array:
                        print(Fore.MAGENTA + f"  [🔄 Cứu hộ Tầng 2: DeepSeek Cloud API] Dang chuyen {len(texts)} cau sang Cloud API...")
                        
                        sub_batch_size = 25
                        cloud_success = True
                        cloud_translated_all = []
                        
                        for sub_idx in range(0, len(texts), sub_batch_size):
                            sub_texts = texts[sub_idx:sub_idx + sub_batch_size]
                            sub_prev = prev_context if sub_idx == 0 else texts[max(0, sub_idx - 5):sub_idx]
                            
                            sub_translated = None
                            for hub_attempt in range(2):
                                try:
                                    payload = {
                                        "taskId": task_id, 
                                        "texts": sub_texts, 
                                        "previousContext": sub_prev,
                                        "fallbackModel": "deepseek|deepseek-chat"
                                    }
                                    res = requests.post(f"{API_BASE_URL}/translate", json=payload, headers=headers, timeout=75)
                                    
                                    if res.status_code == 200:
                                        data = res.json()
                                        if data.get("success") and data.get("translatedTexts"):
                                            sub_translated = data.get("translatedTexts")
                                            break
                                        else:
                                            err_msg = str(data.get('error', ''))
                                            print(Fore.YELLOW + f"    [!] Cloud AI tra ve loi: {err_msg}")
                                            if "NO_CLOUD_LLM" in err_msg or "not found" in err_msg.lower():
                                                break
                                    elif res.status_code == 402 and "ai2hero.com" in API_BASE_URL:
                                        print(Fore.YELLOW + "    [!] Domain ai2hero.com bi Vercel khoa (402). Tu dong chuyen sang https://ai2hero-flax.vercel.app...")
                                        API_BASE_URL = "https://ai2hero-flax.vercel.app/api/hero-dub"
                                    elif res.status_code in [400, 404]:
                                        err_info = res.json().get('error', '') if res.headers.get('content-type', '').startswith('application/json') else res.text[:100]
                                        print(Fore.YELLOW + f"    [!] Cloud API HTTP {res.status_code}: {err_info}")
                                        break
                                    else:
                                        print(Fore.YELLOW + f"    [!] Cloud API HTTP {res.status_code} (Attempt {hub_attempt+1}/2)")
                                except Exception as req_err:
                                    print(Fore.YELLOW + f"    [!] Loi ket noi Cloud API (Attempt {hub_attempt+1}/2): {req_err}")
                                    if "ai2hero.com" in API_BASE_URL:
                                        API_BASE_URL = "https://ai2hero-flax.vercel.app/api/hero-dub"
                                time.sleep(1.5)
                            
                            if sub_translated and len(sub_translated) == len(sub_texts):
                                cloud_translated_all.extend(sub_translated)
                            elif sub_translated and len(sub_translated) > 0:
                                for s_i in range(len(sub_texts)):
                                    if s_i < len(sub_translated) and sub_translated[s_i]:
                                        cloud_translated_all.append(sub_translated[s_i])
                                    else:
                                        cloud_translated_all.append(sub_texts[s_i])
                            else:
                                cloud_success = False
                                break
                        
                        if cloud_success and len(cloud_translated_all) == len(texts):
                            translated_array = cloud_translated_all
                            print(Fore.GREEN + Style.BRIGHT + f"  [☁️ Connect Hub DeepSeek] Nhan ket qua cuu ho DeepSeek thanh cong ({len(translated_array)} cau)!")
                        else:
                            print(Fore.YELLOW + "  [!] DeepSeek Cloud API khong kha dung hoac gap su co mang. Chuyen sang Tang 3...")
                        
                    # NHÁNH 3: TẦNG 3 - Áp dụng kết quả hoặc Cứu hộ khẩn cấp bằng Google Translate Direct
                    if translated_array and len(translated_array) > 0:
                        for j, seg in enumerate(batch_segs):
                            translated = translated_array[j] if j < len(translated_array) else seg['text']
                            translated = str(translated).strip()
                            
                            # CẤM GOOGLE NHẢY VÀO: Bảo toàn 100% văn phong tiếng Việt của AI (DeepSeek / Gemini Web)
                            # Nếu câu có dính kèm chữ Hán thừa trong ngoặc, làm sạch chữ Hán nhưng GIỮ NGUYÊN câu dịch AI
                            ch_chars = len(re.findall(r'[\u4e00-\u9fff]', translated))
                            vn_chars = len(re.findall(r'[a-zA-ZÀ-ỹ]', translated))
                            if ch_chars > 0 and vn_chars > 0:
                                cleaned = re.sub(r'[\u4e00-\u9fff]', '', translated).strip()
                                cleaned = re.sub(r'\s*[\(\（]\s*[\)\）]', '', cleaned).strip() # Xóa ngoặc rỗng
                                cleaned = re.sub(r'\s+', ' ', cleaned).strip()
                                if len(cleaned) > 1:
                                    translated = cleaned
                            
                            print(Fore.WHITE + f"  [Dịch] {translated}")
                                
                            translated_segments.append({
                                "start": seg['start'],
                                "end": seg['end'],
                                "text": translated
                            })
                        save_translation_progress()
                    else:
                        # Fallback Tầng 3: Google Translate Batch Direct Rescue (Siêu tốc 3s, chống 429)
                        print(Fore.YELLOW + Style.BRIGHT + f"  [⚡ Cứu hộ Tầng 3: Google Translate Direct] Dịch siêu tốc batch ({len(texts)} câu)...")
                        batch_translated = google_translate_batch(texts, dest='vi')
                        for j, seg in enumerate(batch_segs):
                            trans = batch_translated[j] if j < len(batch_translated) and batch_translated[j] else google_translate(seg['text'], dest='vi')
                            translated_segments.append({"start": seg['start'], "end": seg['end'], "text": trans})
                            print(Fore.WHITE + f"  [Google] {trans}")
                        save_translation_progress()
            else:
                print(Fore.CYAN + "  -> Su dung Google Translate (Mien phi)")
                batch_texts = [seg['text'] for seg in segments_to_translate]
                batch_res = google_translate_batch(batch_texts, dest='vi')
                for j, seg in enumerate(segments_to_translate):
                    trans = batch_res[j] if j < len(batch_res) and batch_res[j] else google_translate(seg['text'], dest='vi')
                    translated_segments.append({
                        "start": seg['start'],
                        "end": seg['end'],
                        "text": trans
                    })
                    print(Fore.WHITE + f"  [Google] {trans}")
                save_translation_progress()

            # QUALITY GATE: Kiem duyet chat luong phu de tieng Viet
            print(Fore.CYAN + "[-] Kiem tra chat luong phu de tieng Viet (Translation Quality Gate)...")
            fixed_count = 0
            import re
            for seg_idx, seg in enumerate(translated_segments):
                orig_text = extracted_segments[seg_idx]['text'] if seg_idx < len(extracted_segments) else ""
                curr_text = seg.get("text", "")
                
                ch_chars = len(re.findall(r'[\u4e00-\u9fff]', curr_text))
                vn_chars = len(re.findall(r'[a-zA-ZÀ-ỹ]', curr_text))
                
                # Lam sach chu Han sot lai ma KHONG goi Google de len DeepSeek
                if ch_chars > 0 and vn_chars > 0:
                    cleaned = re.sub(r'[\u4e00-\u9fff]', '', curr_text).strip()
                    cleaned = re.sub(r'\s*[\(\（]\s*[\)\）]', '', cleaned).strip()
                    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
                    if len(cleaned) > 1:
                        seg["text"] = cleaned
                        fixed_count += 1
                elif (ch_chars > 1 and vn_chars == 0) or (orig_text and curr_text.strip() == orig_text.strip() and len(orig_text) > 3):
                    # BẢO VỆ TUYỆT ĐỐI: Câu hoàn toàn là 100% tiếng Trung chưa được dịch
                    # BẮT BUỘC sửa ngay bằng Google Translate để cam kết 100% phụ đề sạch sẽ trước khi sang TTS!
                    fixed = google_translate(orig_text if orig_text else curr_text, dest='vi')
                    if fixed and fixed.strip() != curr_text.strip():
                        print(Fore.YELLOW + f"  [Quality Gate Fix #{seg_idx+1}] Phát hiện câu chữ Hán sót lại: {curr_text} -> {fixed}")
                        seg["text"] = fixed
                        fixed_count += 1
            
            if fixed_count > 0:
                print(Fore.GREEN + f"  [✓] Quality Gate da tinh chinh lam sach {fixed_count} cau phu de!")
                save_translation_progress()
            else:
                print(Fore.GREEN + "  [✓] Quality Gate xac nhan: 100% phu de da la Tieng Viet sach se.")

        vi_srt_path = os.path.join(workspace, "vi.srt")
        with open(vi_srt_path, "w", encoding="utf-8") as f:
            for i, seg in enumerate(translated_segments, 1):
                f.write(f"{i}\n")
                f.write(f"{format_timestamp(seg['start'])} --> {format_timestamp(seg['end'])}\n")
                f.write(f"{seg['text']}\n\n")
                
        translate_duration = time.time() - translate_start_time
        print(Fore.YELLOW + Style.BRIGHT + f"\n[!] THOI GIAN HOAN THANH DICH THUAT: {translate_duration:.2f} giay.\n")
    except Exception as e:
         print(Fore.RED + f"[-] Loi Dich thuat: {str(e)}")
         requests.patch(f"{API_BASE_URL}/tasks", json={"action": "update", "taskId": task_id, "status": "failed", "error": f"Loi Google Translate: {str(e)}"}, headers=headers)
         return

    # 3. TTS (Long tieng AI)
    dubbed_audio_path = None
    if task.get("ttsEnabled"):
        print(Fore.CYAN + "[-] Dang thuc hien long tieng AI (TTS)...")
        requests.patch(f"{API_BASE_URL}/tasks", json={"action": "update", "taskId": task_id, "status": "tts", "progress": 75}, headers=headers)
        tts_start_time = time.time()
        
        try:
            import imageio_ffmpeg
            ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
            
            # Giai doan 2: Vocal Isolation (Bo qua theo yeu cau de giu giong goc)
            # try:
            #     extract_vocals_demucs(workspace, audio_path, ffmpeg_exe)
            # except Exception as demucs_err:
            #     pass
            
            tts_engine = task.get("ttsEngine", "edge-tts")
            tts_voice = task.get("ttsVoice") or ("vi-VN-HoaiMyNeural" if tts_engine == "edge-tts" else "nova")
            
            try:
                tts_speed = float(task.get("ttsSpeed", "1.3"))
            except (ValueError, TypeError):
                tts_speed = 1.3
                
            try:
                db_bg_volume = float(task.get("bgVolume", "1.0"))
            except (ValueError, TypeError):
                db_bg_volume = 1.0
                
            try:
                db_tts_volume = float(task.get("ttsVolume", "1.5"))
            except (ValueError, TypeError):
                db_tts_volume = 1.5
                
            rate_percent = int(round((tts_speed - 1) * 100))
            rate_str = f"+{rate_percent}%" if rate_percent >= 0 else f"{rate_percent}%"
            
            safe_tts_voice = tts_voice.replace(":", "_").replace("/", "_")
            tts_dir = os.path.join(workspace, f"tts_segments_{tts_engine}_{safe_tts_voice}_{rate_percent}")
            os.makedirs(tts_dir, exist_ok=True)
            
            print(Fore.CYAN + f"  -> Engine: {tts_engine} | Voice: {tts_voice} | Speed: {tts_speed}x ({rate_str})")
            
            total_segs = len(translated_segments)
            failed_tts_count = 0
            
            # --- PHAN BATCH EDGE-TTS DE TRANH SPAM WEBSOCKET & TIMEOUT (Voi Batch Retry) ---
            if tts_engine == "edge-tts":
                for attempt_run in range(3): # Cho phep chay lai batch download toi da 3 lan neu con sot segment
                    batch_items = []
                    for i, seg in enumerate(translated_segments):
                        seg_text = seg['text'].strip()
                        if not seg_text:
                            continue
                        output_file = os.path.join(tts_dir, f"seg_{i:04d}.mp3")
                        if not os.path.exists(output_file) or os.path.getsize(output_file) < 100:
                            # Lớp phòng thủ dự phòng: Nếu phát hiện câu còn chữ Hán sót lại, dịch khẩn cấp sang tiếng Việt
                            ch_chars = len(re.findall(r'[\u4e00-\u9fff]', seg_text))
                            vn_chars = len(re.findall(r'[a-zA-ZÀ-ỹ]', seg_text))
                            if ch_chars > 1 and vn_chars == 0:
                                fallback_vi = google_translate(seg_text, dest='vi')
                                if fallback_vi:
                                    seg_text = fallback_vi
                                    seg['text'] = fallback_vi
                            batch_items.append({
                                "index": i,
                                "text": seg_text,
                                "output_file": output_file
                            })
                    
                    if not batch_items:
                        break
                    
                    print(Fore.CYAN + f"  [-] Phat hien {len(batch_items)} phan doan can sinh Edge-TTS. Dang tai hang loat (Batch, Lan {attempt_run+1})...")
                    batch_json_path = os.path.join(workspace, "tts_batch.json")
                    with open(batch_json_path, "w", encoding="utf-8") as f:
                        json.dump(batch_items, f, ensure_ascii=False, indent=4)
                        
                    batch_script_path = os.path.join(workspace, "run_edge_tts_batch.py")
                    script_content = """# -*- coding: utf-8 -*-
import asyncio
import json
import os
import sys
import edge_tts

async def download_seg(sem, voice, text, rate, output_file, index):
    async with sem:
        for attempt in range(4):
            try:
                communicate = edge_tts.Communicate(text, voice, rate=rate)
                await asyncio.wait_for(communicate.save(output_file), timeout=30.0)
                if os.path.exists(output_file) and os.path.getsize(output_file) > 100:
                    print(f"SUCCESS:{index}")
                    sys.stdout.flush()
                    return True
            except asyncio.TimeoutError:
                print(f"ERROR:{index} - Timeout - Attempt {attempt+1}")
                sys.stdout.flush()
            except Exception as e:
                print(f"ERROR:{index} - {str(e)} - Attempt {attempt+1}")
                sys.stdout.flush()
                if attempt < 3:
                    await asyncio.sleep(1.5 + attempt * 1.5)
        print(f"FAILED:{index}")
        sys.stdout.flush()
        return False

async def main():
    json_path = sys.argv[1]
    voice = sys.argv[2]
    rate = sys.argv[3]
    concurrency = 6
    with open(json_path, "r", encoding="utf-8") as f:
        batch = json.load(f)
    if not batch:
        print("BATCH_DONE:0/0")
        sys.stdout.flush()
        return
    sem = asyncio.Semaphore(concurrency)
    tasks = []
    for item in batch:
        tasks.append(download_seg(sem, voice, item["text"], rate, item["output_file"], item["index"]))
    results = await asyncio.gather(*tasks)
    success_count = sum(1 for r in results if r)
    print(f"BATCH_DONE:{success_count}/{len(batch)}")
    sys.stdout.flush()

if __name__ == '__main__':
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
"""
                    with open(batch_script_path, "w", encoding="utf-8") as f:
                        f.write(script_content)
                        
                    cmd = [sys.executable, "-u", batch_script_path, batch_json_path, tts_voice, rate_str]
                    timeout_val = max(120, len(batch_items) * 10)
                    try:
                        print(Fore.CYAN + "  -> Dang tai cac phan doan song song qua Edge-TTS batch engine...")
                        import subprocess
                        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='ignore')
                        
                        success_count = 0
                        total_batch = len(batch_items)
                        
                        while True:
                            line = process.stdout.readline()
                            if not line and process.poll() is not None:
                                break
                            if line:
                                line = line.strip()
                                if line.startswith("SUCCESS:"):
                                    success_count += 1
                                    if success_count % 10 == 0 or success_count == total_batch:
                                        print(Fore.GREEN + f"    [Progress] Da tai {success_count}/{total_batch} phan doan Edge-TTS.")
                                elif line.startswith("FAILED:"):
                                    print(Fore.RED + f"    [!] Khong the tai phan doan: {line}")
                                elif line.startswith("BATCH_DONE:"):
                                    print(Fore.GREEN + f"  [+] Edge-TTS batch engine hoan thanh: {line}")
                        
                        rc = process.poll()
                        if rc != 0:
                            print(Fore.RED + f"  [!] Edge-TTS batch engine gap loi (code {rc}).")
                    except Exception as batch_err:
                        print(Fore.RED + f"  [!] Loi thuc thi batch download: {str(batch_err)}")
            # --- KET THUC PHAN BATCH EDGE-TTS ---

            # --- THIET LAP THREADPOOL VA GOP FFMPEG FILTER CHAIN DE XU LY SONG SONG ---
            from concurrent.futures import ThreadPoolExecutor
            import threading
            
            processed_count = 0
            count_lock = threading.Lock()
            
            def process_single_segment(i, seg):
                nonlocal failed_tts_count, processed_count
                if not seg['text'].strip():
                    return True
                    
                output_file = os.path.join(tts_dir, f"seg_{i:04d}.mp3")
                output_wav = os.path.join(tts_dir, f"seg_{i:04d}.wav")
                
                # Chi sinh lai file mp3 neu chua co hoac bi loi
                if not os.path.exists(output_file) or os.path.getsize(output_file) < 100:
                    success = False
                    
                    if tts_engine == "edge-tts":
                        tmp_txt = os.path.join(workspace, f"tmp_tts_{i}.txt")
                        tmp_py = os.path.join(workspace, f"tmp_tts_script_{i}.py")
                        try:
                            with open(tmp_txt, "w", encoding="utf-8") as f:
                                f.write(seg['text'])
                            script_code = f"import edge_tts, asyncio\nwith open(r'{tmp_txt}', 'r', encoding='utf-8') as f:\n    text = f.read()\nasyncio.run(edge_tts.Communicate(text, '{tts_voice}', rate='{rate_str}').save(r'{output_file}'))"
                            with open(tmp_py, "w", encoding="utf-8") as f:
                                f.write(script_code)
                            cmd = [sys.executable, tmp_py]
                            for attempt in range(3):
                                result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
                                if result.returncode == 0 and os.path.exists(output_file) and os.path.getsize(output_file) > 100:
                                    success = True
                                    break
                        except:
                            pass
                        finally:
                            if os.path.exists(tmp_txt):
                                try: os.remove(tmp_txt)
                                except: pass
                            if os.path.exists(tmp_py):
                                try: os.remove(tmp_py)
                                except: pass
                    else:
                        # Goi Connect Hub qua Server API
                        for attempt in range(3):
                            try:
                                resp = requests.post(f"{API_BASE_URL}/tts",
                                    json={"taskId": task_id, "text": seg['text'], "voice": tts_voice},
                                    headers=headers, timeout=30)
                                if resp.status_code == 200:
                                    with open(output_file, "wb") as f:
                                        f.write(resp.content)
                                    success = True
                                    break
                            except:
                                pass
                                
                    if not success:
                        with count_lock:
                            failed_tts_count += 1
                        return False
                
                # Convert WAV & Trim & Speed Alignment
                if not os.path.exists(output_wav):
                    temp_wav_trimmed = os.path.join(tts_dir, f"seg_{i:04d}_temp_trimmed.wav")
                    try:
                        # 1. Trim & Convert sang WAV 16kHz mono (Gop filter chain de giam subprocess)
                        # Sửa lỗi âm thanh bị "giật" bằng cách giảm ngưỡng cắt (-55dB) và thêm fade-in/out 20ms để làm mượt
                        trim_filter = "silenceremove=start_periods=1:start_duration=0.01:start_threshold=-55dB,afade=t=in:st=0:d=0.02,areverse,silenceremove=start_periods=1:start_duration=0.01:start_threshold=-55dB,afade=t=in:st=0:d=0.02,areverse"
                        subprocess.run([
                            ffmpeg_exe, "-y", "-i", output_file,
                            "-af", trim_filter,
                            "-ar", "16000", "-ac", "1", temp_wav_trimmed
                        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
                        
                        if os.path.exists(temp_wav_trimmed) and os.path.getsize(temp_wav_trimmed) > 100:
                            duration_tts = get_audio_duration(ffmpeg_exe, temp_wav_trimmed)
                            duration_slot = seg['end'] - seg['start']
                            
                            if duration_slot > 0:
                                speed_ratio = duration_tts / duration_slot
                                if speed_ratio > 1.15:
                                    clamped_ratio = min(2.0, speed_ratio)
                                    
                                    rubberband_exe = None
                                    import shutil
                                    if shutil.which("rubberband"):
                                        rubberband_exe = "rubberband"
                                    elif shutil.which("rubberband.exe"):
                                        rubberband_exe = "rubberband.exe"
                                    else:
                                        local_rb = os.path.abspath("rubberband.exe")
                                        if os.path.exists(local_rb):
                                            rubberband_exe = local_rb
                                            
                                    rb_success = False
                                    if rubberband_exe:
                                        rb_res = subprocess.run([
                                            rubberband_exe, "-T", str(clamped_ratio), temp_wav_trimmed, output_wav
                                        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
                                        if rb_res.returncode == 0 and os.path.exists(output_wav):
                                            rb_success = True
                                            
                                    if not rb_success:
                                        subprocess.run([
                                            ffmpeg_exe, "-y", "-i", temp_wav_trimmed, 
                                            "-filter:a", f"atempo={clamped_ratio}", 
                                            "-ar", "16000", "-ac", "1", 
                                            output_wav
                                        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
                                else:
                                    os.rename(temp_wav_trimmed, output_wav)
                            else:
                                os.rename(temp_wav_trimmed, output_wav)
                        else:
                            return False
                    except:
                        return False
                    finally:
                        if os.path.exists(temp_wav_trimmed):
                            try: os.remove(temp_wav_trimmed)
                            except: pass
                
                # Cap nhat log tien do gon gang
                with count_lock:
                    processed_count += 1
                    if processed_count % 10 == 0 or processed_count == total_segs:
                        print(Fore.GREEN + f"    [Progress] Da xu ly xong: {processed_count}/{total_segs} phan doan.")
                return True

            print(Fore.CYAN + f"  [-] Dang bat dau xu ly song song trim & alignment cho {total_segs} segments...")
            
            # Xu ly da luong voi ThreadPoolExecutor
            with ThreadPoolExecutor(max_workers=6) as executor:
                futures = [executor.submit(process_single_segment, i, seg) for i, seg in enumerate(translated_segments)]
                for f in futures:
                    try:
                        f.result()
                    except Exception as e:
                        print(Fore.RED + f"  [!] Loi khi thuc thi thread segment: {e}")
            
            if total_segs > 0 and (failed_tts_count / total_segs) > 0.3:
                raise Exception(f"Loi ket noi mang: {failed_tts_count}/{total_segs} cau thoai khong the tao giong doc AI (Loi qua 30%). Vui long kiem tra mang va thu lai sau.")

            # Ghep am thanh
            dubbed_audio_path = merge_tts_segments(ffmpeg_exe, tts_dir, translated_segments, workspace)
            
            tts_duration = time.time() - tts_start_time
            print(Fore.YELLOW + Style.BRIGHT + f"\n[!] THOI GIAN HOAN THANH LONG TIENG AI (TTS): {tts_duration:.2f} giay.\n")
            
        except Exception as tts_err:
            print(Fore.RED + f"[-] Loi long tieng AI (TTS): {str(tts_err)}")
            # Tiep tuc xu ly burn sub ke ca khi long tieng loi

    # 4. BURNING
    print(Fore.CYAN + "[-] Dang burn phu de vao video (Render)...")
    requests.patch(f"{API_BASE_URL}/tasks", json={"action": "update", "taskId": task_id, "status": "burning", "progress": 85}, headers=headers)
    burn_start_time = time.time()
    
    acquire_resource_lock(token, task_id, "gpu_render", "GPU Render")
    cwd = os.getcwd()
    try:
        import imageio_ffmpeg
        import ffmpeg
        os.environ["PATH"] += os.pathsep + os.path.dirname(imageio_ffmpeg.get_ffmpeg_exe())
 
        os.chdir(workspace)
        
        has_dubbed = dubbed_audio_path is not None and os.path.exists("dubbed_audio.wav")
        
        video = ffmpeg.input("input.mp4")
        video_sub = video.video.filter('subtitles', 'vi.srt', force_style="FontSize=20,PrimaryColour=&HFFFFFF,BackColour=&H00000000,BorderStyle=3,Outline=2,Shadow=0,MarginV=10")
        
        # Trich xuat thong tin video goc va tinh toan target bitrate thong minh
        try:
            tw, th, tfps, orig_bitrate = get_video_props("input.mp4")
        except Exception:
            tw, th, tfps, orig_bitrate = 1920, 1080, "30", None

        # Tinh toan target bitrate khong vuot qua 1.15x bitrate goc
        if orig_bitrate and orig_bitrate > 300:
            target_kbps = min(int(orig_bitrate * 1.15), 3500)
            target_kbps = max(target_kbps, 800)
        else:
            if th >= 1080 or tw >= 1080:
                target_kbps = 2500
            elif th >= 720 or tw >= 720:
                target_kbps = 1600
            else:
                target_kbps = 900

        if branding_enabled and logo_url and os.path.exists(logo_url):
            print(Fore.CYAN + "  -> Dang ap dung Logo (Watermark)...")
            try:
                logo_w = max(50, int(tw * 0.15)) # 15% width
            except:
                logo_w = 150 # fallback
            
            logo = ffmpeg.input(logo_url).filter('scale', logo_w, -1)
            if logo_pos == 'top-left':
                video_sub = ffmpeg.overlay(video_sub, logo, x=20, y=20)
            elif logo_pos == 'top-right':
                video_sub = ffmpeg.overlay(video_sub, logo, x='main_w-overlay_w-20', y=20)
            elif logo_pos == 'bottom-left':
                video_sub = ffmpeg.overlay(video_sub, logo, x=20, y='main_h-overlay_h-20')
            elif logo_pos == 'bottom-right':
                video_sub = ffmpeg.overlay(video_sub, logo, x='main_w-overlay_w-20', y='main_h-overlay_h-20')

        vcodec_val, encoder_extra = detect_best_encoder(target_kbps)

        # Kiểm tra trước xem có thực sự cần gộp Intro / Outro không
        has_intro_outro = branding_enabled and (
            (bool(intro_url) and os.path.exists(str(intro_url))) or 
            (bool(outro_url) and os.path.exists(str(outro_url)))
        )

        # Dọn dẹp sạch sẽ các file video cũ nếu còn sót lại trong workspace để tránh xung đột file handle
        for old_f in ["temp_output.mp4", "output.mp4"]:
            if os.path.exists(old_f):
                try:
                    os.remove(old_f)
                except Exception:
                    pass

        # Nếu có Intro/Outro: Render vào temp_output.mp4 để nối tiếp
        # Nếu KHÔNG có Intro/Outro (99% trường hợp): Render TRỰC TIẾP vào output.mp4 để triệt tiêu 100% WinError 32!
        render_target_file = "temp_output.mp4" if has_intro_outro else "output.mp4"

        def build_and_run_render(vc, extra_args):
            if has_dubbed:
                bg_audio_file = "audio.wav"
                bg_volume = db_bg_volume
                demucs_bg = os.path.join("demucs_out", "htdemucs", "audio", "no_vocals.wav")
                if os.path.exists(demucs_bg) and os.path.getsize(demucs_bg) > 0:
                    bg_audio_file = demucs_bg
                    
                if os.path.exists(bg_audio_file) and os.path.getsize(bg_audio_file) > 0:
                    a_bg = ffmpeg.input(bg_audio_file).audio.filter('volume', bg_volume)
                    a_fg = ffmpeg.input("dubbed_audio.wav").audio.filter('volume', db_tts_volume)
                    mixed_audio = ffmpeg.filter([a_bg, a_fg], 'amix', inputs=2, duration='first').filter('volume', 2.0)
                    st = ffmpeg.output(video_sub, mixed_audio, render_target_file, vcodec=vc, acodec="aac", audio_bitrate="128k", **extra_args)
                else:
                    audio_dub = ffmpeg.input("dubbed_audio.wav").audio
                    st = ffmpeg.output(video_sub, audio_dub, render_target_file, vcodec=vc, acodec="aac", audio_bitrate="128k", **extra_args)
            else:
                st = ffmpeg.output(video_sub, video.audio, render_target_file, vcodec=vc, acodec="aac", audio_bitrate="128k", **extra_args)
            ffmpeg.run(st, overwrite_output=True, quiet=True)

        if has_dubbed:
            print(Fore.CYAN + f"  -> Dang render voi phu de va am thanh long tieng AI (Dung luong muc tieu: ~{target_kbps} kbps)...")
            demucs_bg = os.path.join("demucs_out", "htdemucs", "audio", "no_vocals.wav")
            if os.path.exists(demucs_bg) and os.path.getsize(demucs_bg) > 0:
                print(Fore.GREEN + "  -> Su dung nhac nen da duoc tach giong noi (Demucs)!")
        else:
            print(Fore.CYAN + f"  -> Dang render phu de vao video (Giu nguyen am thanh goc, Dung luong muc tieu: ~{target_kbps} kbps)...")

        try:
            build_and_run_render(vcodec_val, encoder_extra)
        except Exception as render_err:
            if vcodec_val != "libx264":
                print(Fore.YELLOW + f"  [!] Fallback sang CPU veryfast do GPU render gap loi: {render_err}")
                cpu_fallback_args = {
                    "preset": "veryfast",
                    "crf": "24",
                    "maxrate": f"{target_kbps}k",
                    "bufsize": f"{target_kbps * 2}k"
                }
                build_and_run_render("libx264", cpu_fallback_args)
            else:
                raise render_err
        
        # --- KET NOI INTRO / OUTRO (NEU CO) ---
        final_output = render_target_file
        if has_intro_outro:
            print(Fore.CYAN + "  -> Dang gop Video Intro/Outro...")
            try:
                tw, th, tfps, _ = get_video_props("temp_output.mp4")
                inputs = []
                filter_chains = []
                idx = 0
                
                # Intro
                if intro_url and os.path.exists(intro_url):
                    intro_cached = standardize_and_cache_video(intro_url, tw, th, tfps)
                    inputs.append(ffmpeg.input(intro_cached))
                    filter_chains.extend([inputs[-1].video, inputs[-1].audio])
                    idx += 1
                
                # Main
                inputs.append(ffmpeg.input("temp_output.mp4"))
                filter_chains.extend([inputs[-1].video, inputs[-1].audio])
                idx += 1
                
                # Outro
                if outro_url and os.path.exists(outro_url):
                    outro_cached = standardize_and_cache_video(outro_url, tw, th, tfps)
                    inputs.append(ffmpeg.input(outro_cached))
                    filter_chains.extend([inputs[-1].video, inputs[-1].audio])
                    idx += 1
                
                joined = ffmpeg.concat(*filter_chains, v=1, a=1).node
                out_stream = ffmpeg.output(joined[0], joined[1], "output.mp4", vcodec=vcodec_val, acodec="aac", audio_bitrate="128k", **encoder_extra)
                try:
                    ffmpeg.run(out_stream, overwrite_output=True, quiet=True)
                except Exception:
                    if vcodec_val != "libx264":
                        out_stream = ffmpeg.output(
                            joined[0], joined[1], "output.mp4",
                            vcodec="libx264", acodec="aac", audio_bitrate="128k",
                            preset="veryfast", crf="24",
                            maxrate=f"{target_kbps}k", bufsize=f"{target_kbps * 2}k"
                        )
                        ffmpeg.run(out_stream, overwrite_output=True, quiet=True)
                    else:
                        raise
                final_output = "output.mp4"
                
                # Xoa file temp an toan
                if os.path.exists("temp_output.mp4"):
                    for _ in range(5):
                        try:
                            os.remove("temp_output.mp4")
                            break
                        except Exception:
                            time.sleep(0.5)
            except Exception as concat_err:
                print(Fore.RED + f"  [!] Loi khi gop Intro/Outro (bo qua): {str(concat_err)}")
                final_output = "temp_output.mp4"
        
        # Helper di chuyen file an toan tren Windows (co retry va fallback copy)
        if final_output == "temp_output.mp4" and os.path.exists("temp_output.mp4"):
            import shutil
            move_ok = False
            for attempt in range(5):
                try:
                    if os.path.exists("output.mp4"):
                        try:
                            os.remove("output.mp4")
                        except Exception:
                            pass
                    shutil.move("temp_output.mp4", "output.mp4")
                    move_ok = True
                    break
                except OSError:
                    time.sleep(0.6)
            
            if not move_ok and os.path.exists("temp_output.mp4"):
                try:
                    shutil.copy2("temp_output.mp4", "output.mp4")
                    try:
                        os.remove("temp_output.mp4")
                    except Exception:
                        pass
                except Exception as copy_err:
                    raise OSError(f"Khong the di chuyen hoac sao chep temp_output.mp4 sang output.mp4: {copy_err}")

        
        burn_duration = time.time() - burn_start_time
        print(Fore.YELLOW + Style.BRIGHT + f"\n[!] THOI GIAN HOAN THANH RENDER VIDEO (BURNING): {burn_duration:.2f} giay.\n")
        
        release_resource_lock(token, task_id, "gpu_render")
        os.chdir(cwd)
    except Exception as e:
         release_resource_lock(token, task_id, "gpu_render")
         print(Fore.RED + f"[-] Loi FFMPEG Render Video: {str(e)}")
         requests.patch(f"{API_BASE_URL}/tasks", json={"action": "update", "taskId": task_id, "status": "failed", "error": f"Loi FFMPEG: {str(e)}"}, headers=headers)
         os.chdir(cwd)
         return

    # 4. COMPLETED 
    # 4. AI PUBLISHING SUITE (Tự động tạo Tiêu đề mới, Mô tả, Hashtags, Thumbnail & File TXT)
    print(Fore.CYAN + "[-] Dang kich hoat AI Publishing Suite de dong goi tu lieu dang bai...")
    
    # Tìm ảnh thumbnail gốc trong thư mục video (nếu có)
    thumb_src = None
    if source_url and not (source_url.startswith("http://") or source_url.startswith("https://")):
        source_dir = os.path.dirname(source_url)
        if os.path.isdir(source_dir):
            raw_base = os.path.splitext(os.path.basename(source_url))[0]
            for ext in ['.jpg', '.jpeg', '.png', '.webp', '.bmp']:
                candidate = os.path.join(source_dir, f"{raw_base}{ext}")
                if os.path.exists(candidate):
                    thumb_src = candidate
                    break

    # Luồng 1: Viết Tiêu đề, Mô tả, Hashtags (Text-Only)
    copy_pack = generate_video_copywriting(task, translated_segments, duration_sec, bridge_server, headers, API_BASE_URL)
    raw_source = task.get("sourceTitle") or task.get("sourceUrl") or f"video_{task_id}"
    clean_fallback_title = os.path.basename(str(raw_source).replace('\\', '/'))
    for ext in ['.mp4', '.mkv', '.mov', '.avi', '.flv', '.wmv']:
        if clean_fallback_title.lower().endswith(ext):
            clean_fallback_title = clean_fallback_title[:-len(ext)]
    new_title = copy_pack.get("new_title") or clean_fallback_title or f"video_{task_id}"
    new_title = os.path.basename(str(new_title).replace('\\', '/')).strip()

    # Độ trễ nghỉ 2s để Gemini hoàn tất phiên chat trước khi sang Luồng 2
    if task.get("redesignThumbnailEnabled"):
        time.sleep(2.0)

    # Luồng 2: Thiết kế lại Thumbnail (Image-Only, nếu được bật)
    new_thumb_url = redesign_thumbnail_image(task, thumb_src, new_title, translated_segments, bridge_server)
    pub_pack = {
        "new_title": new_title,
        "description": copy_pack.get("description", ""),
        "hashtags": copy_pack.get("hashtags", ""),
        "new_thumbnail_url": new_thumb_url
    }

    final_output_path = os.path.abspath(os.path.join(workspace, "output.mp4"))
    vi_srt_abs_path = os.path.abspath(os.path.join(workspace, "vi.srt"))
    
    # Copy to output folder if specified
    output_folder = task.get("outputFolder")
    if output_folder and os.path.isdir(output_folder):
        try:
            # Tên file mới dựa trên Tiêu đề tiếng Việt đã được tối ưu SEO
            import re
            base_name = os.path.basename(str(new_title).replace('\\', '/')).strip()
            base_name = re.sub(r'[\\/:*?"<>|]', '_', base_name).strip()
            if len(base_name) > 150:
                base_name = base_name[:150]
                
            if not base_name or base_name.strip() == "":
                base_name = f"video_{task_id}"

            dest_video = os.path.join(output_folder, f"{base_name}.mp4")
            dest_srt = os.path.join(output_folder, f"{base_name}.srt")
            dest_txt = os.path.join(output_folder, f"{base_name}.txt")
            dest_thumb = os.path.join(output_folder, f"{base_name}.jpg")
            
            shutil.copy2(final_output_path, dest_video)
            shutil.copy2(vi_srt_abs_path, dest_srt)
            
            # Xuất file .txt tư liệu đăng bài chuẩn chỉnh
            txt_body = f"""================================================================================
🎬 TƯ LIỆU ĐĂNG BÀI VIDEO (AI2HERO PUBLISHING SUITE)
================================================================================

📌 TIÊU ĐỀ VIDEO (TITLE):
{pub_pack.get('new_title', new_title)}

📝 MÔ TẢ NỘI DUNG (DESCRIPTION):
{pub_pack.get('description', '')}

🏷️ HASHTAGS:
{pub_pack.get('hashtags', '')}

⏱️ THÔNG SỐ VIDEO:
- Thời lượng: {duration_sec}s
- Số câu thoại phụ đề: {len(translated_segments)} câu
- Tạo bởi: HeroDub Studio (Ai2Hero Publishing Suite)

📁 TẬP TIN TRONG THƯ MỤC:
- Video: {base_name}.mp4
- Phụ đề: {base_name}.srt
- Ảnh bìa: {base_name}.jpg
================================================================================
"""
            with open(dest_txt, 'w', encoding='utf-8') as f:
                f.write(txt_body)
            print(Fore.GREEN + f"[✓] Da xuat file TXT dang bai: {os.path.basename(dest_txt)}")

            # Lưu ảnh Thumbnail (đã thiết kế lại hoặc ảnh gốc) - Tự động tối ưu về chuẩn 720p dung lượng siêu nhẹ
            saved_thumb_success = False
            if pub_pack.get("new_thumbnail_url"):
                thumb_url = pub_pack["new_thumbnail_url"]
                # 0. Nếu là đường dẫn file ảnh cục bộ (do Local 3D Gold Engine tạo ra)
                if isinstance(thumb_url, str) and os.path.exists(thumb_url):
                    saved_thumb_success = optimize_and_save_thumbnail(thumb_url, dest_thumb, target_res=720, quality=85)
                    if saved_thumb_success:
                        print(Fore.GREEN + Style.BRIGHT + f"[✓] Da luu thanh cong anh bia 3D Vang Kim tieng Viet: {os.path.basename(dest_thumb)}")
                # 1. Nếu là Base64 Data URL (Do Extension trích xuất canvas không bị chặn 403)
                elif thumb_url.startswith("data:image/"):
                    try:
                        b64_str = thumb_url.split(",", 1)[1] if "," in thumb_url else thumb_url
                        img_bytes = base64.b64decode(b64_str)
                        if len(img_bytes) > 5000:
                            saved_thumb_success = optimize_and_save_thumbnail(img_bytes, dest_thumb, target_res=720, quality=85)
                            if saved_thumb_success:
                                print(Fore.GREEN + Style.BRIGHT + f"[✓] Da luu thanh cong anh bia tieng Viet thiet ke moi tu Gemini (Base64): {os.path.basename(dest_thumb)}")
                    except Exception as b64_err:
                        print(Fore.YELLOW + f"[!] Loi decode Base64 thumbnail: {b64_err}")
                elif thumb_url.startswith("http://") or thumb_url.startswith("https://"):
                    try:
                        headers_img = {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Referer": "https://gemini.google.com/"
                        }
                        resp = requests.get(thumb_url, headers=headers_img, timeout=30)
                        if resp.status_code == 200 and len(resp.content) > 10000 and not resp.content.startswith(b"<!DOCTYPE"):
                            saved_thumb_success = optimize_and_save_thumbnail(resp.content, dest_thumb, target_res=720, quality=85)
                        else:
                            print(Fore.YELLOW + f"[!] Anh online bi chan 403 hoac loi (Size: {len(resp.content)} bytes). Dang quet thu muc Downloads...")
                    except Exception as dl_err:
                        print(Fore.YELLOW + f"[!] Khong the tai anh thumbnail moi: {dl_err}")

            # Fallback 2: Quét thư mục Downloads của máy tính (do Extension Chrome Downloads API tải về)
            if not saved_thumb_success and task.get("redesignThumbnailEnabled"):
                dl_img = get_latest_download_image(time.time() - 120, timeout=5)
                if dl_img:
                    saved_thumb_success = optimize_and_save_thumbnail(dl_img, dest_thumb, target_res=720, quality=85)
                    if saved_thumb_success:
                        print(Fore.GREEN + Style.BRIGHT + f"[✓] Da nhat thanh cong anh bia tieng Viet tu thu muc Downloads: {os.path.basename(dest_thumb)}")

            # Fallback 3: TỰ ĐỘNG VẼ ẢNH BÌA 3D VÀNG KIM TIẾNG VIỆT (Local 0đ) NẾU CHƯA CÓ ẢNH BÌA MỚI
            if not saved_thumb_success and task.get("redesignThumbnailEnabled") and thumb_src and os.path.exists(thumb_src):
                print(Fore.CYAN + Style.BRIGHT + f"  [⚡ Local 3D Gold Engine] Dang tu dong ghep chu 3D Vang Kim tieng Viet len anh goc...")
                local_thumb_res = create_local_3d_gold_thumbnail(thumb_src, new_title, dest_thumb, tag_text="THUYẾT MINH")
                if local_thumb_res and os.path.exists(dest_thumb):
                    saved_thumb_success = True
                    print(Fore.GREEN + Style.BRIGHT + f"[✓] Da tao anh bia 3D Vang Kim tieng Viet cuc bo thanh cong: {os.path.basename(dest_thumb)}")

            # Fallback 4: Copy ảnh gốc chỉ khi không bật redesignThumbnailEnabled
            if not saved_thumb_success and thumb_src and os.path.exists(thumb_src):
                optimize_and_save_thumbnail(thumb_src, dest_thumb, target_res=720, quality=85)
                print(Fore.CYAN + f"[-] Da copy va toi uu anh thumbnail goc: {os.path.basename(dest_thumb)}")
            
            final_output_path = dest_video
            vi_srt_abs_path = dest_srt
            print(Fore.CYAN + f"[-] Da luu toan bo tu lieu vao: {output_folder}")

            # Tự động dọn dẹp xóa các file tiếng Trung cũ trong thư mục output (nếu có)
            raw_src_base = os.path.splitext(os.path.basename(source_url))[0] if source_url else ""
            if raw_src_base and raw_src_base != base_name:
                for ext in ['.mp4', '.mkv', '.avi', '.mov', '.flv', '.webm', '.srt', '.jpg', '.jpeg', '.png', '.webp', '.txt']:
                    old_file_in_output = os.path.join(output_folder, f"{raw_src_base}{ext}")
                    if os.path.exists(old_file_in_output) and os.path.abspath(old_file_in_output) not in [os.path.abspath(dest_video), os.path.abspath(dest_srt), os.path.abspath(dest_thumb), os.path.abspath(dest_txt)]:
                        try:
                            os.remove(old_file_in_output)
                            print(Fore.CYAN + f"[-] Da xoa file tieng Trung cu trong thu muc dich: {os.path.basename(old_file_in_output)}")
                        except Exception as rm_err:
                            pass
        except Exception as e:
            print(Fore.YELLOW + f"[!] Khong the luu vao thu muc dich {output_folder}: {e}")

    print(Fore.GREEN + Style.BRIGHT + f"[✓] HOAN THANH TASK #{task_id}!")
    
    requests.patch(f"{API_BASE_URL}/tasks", json={
        "action": "complete", 
        "taskId": task_id,
        "status": "completed",
        "resultVideoUrl": final_output_path,
        "resultSrtUrl": vi_srt_abs_path,
        "translatedTitle": pub_pack.get("new_title"),
        "videoDescription": pub_pack.get("description"),
        "videoHashtags": pub_pack.get("hashtags"),
        "resultThumbnailUrl": pub_pack.get("new_thumbnail_url")
    }, headers=headers)

    # 5. AUTO CLEANUP WORKSPACE (Tự động xóa dọn dẹp giải phóng ổ đĩa)
    try:
        abs_workspace = os.path.abspath(workspace)
        if os.path.exists(abs_workspace) and "workspace" in abs_workspace:
            shutil.rmtree(abs_workspace, ignore_errors=True)
            print(Fore.CYAN + f"[-] Da tu dong don dep giai phong dung luong o dia: {abs_workspace}")
    except Exception as clean_err:
        print(Fore.YELLOW + f"[!] Khong the xoa thu muc tam: {clean_err}")


import threading

SCAN_CACHE_FILE = 'scan_cache.json'
VIDEO_EXTENSIONS = {'.mp4', '.mov', '.avi', '.mkv', '.webm'}
GLOBAL_TOKEN = None
scan_cache_lock = threading.Lock()

def load_scan_cache():
    if os.path.exists(SCAN_CACHE_FILE):
        try:
            with open(SCAN_CACHE_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_scan_cache(cache):
    with open(SCAN_CACHE_FILE, 'w') as f:
        json.dump(cache, f)

LAST_SCANNED_DICT = {}

def scan_single_config(config, token):
    if not config.get('isActive', True):
        return
        
    interval_minutes = int(config.get('intervalMinutes', config.get('interval_minutes', 0)))
    config_id = config.get('id')
    
    # Kiem tra thoi gian quet cuc bo (tranh loi timezone tu server)
    if interval_minutes > 0 and config_id:
        last_local_scan = LAST_SCANNED_DICT.get(config_id)
        if last_local_scan:
            now = datetime.now()
            delta = now - last_local_scan
            if delta.total_seconds() < interval_minutes * 60:
                return # Chua den gio quet
                
    # Ghi nhan thoi gian quet cuc bo hien tai
    if config_id:
        LAST_SCANNED_DICT[config_id] = datetime.now()
        
    last_scan_str = config.get('lastScanAt')
    if interval_minutes == 0 and last_scan_str:
        return # Chay 1 lan va da chay roi
        
    headers = {'Authorization': f'Bearer {token}'}
    folder_path = config.get('folderPath')
    if not folder_path or not os.path.isdir(folder_path):
        return
    with scan_cache_lock:
        scan_cache = load_scan_cache()
    new_files = []
    for file in os.listdir(folder_path):
        ext = os.path.splitext(file)[1].lower()
        if ext in VIDEO_EXTENSIONS:
            full_path = os.path.join(folder_path, file)
            file_stat = os.stat(full_path)
            cache_key = f'{file_stat.st_size}_{file_stat.st_mtime}'
            if scan_cache.get(full_path) != cache_key:
                # Kiem tra xem file co dang duoc tai ve hay dang bi khoa boi tien trinh khac khong
                is_locked = False
                try:
                    os.rename(full_path, full_path)
                except OSError:
                    is_locked = True
                    
                if is_locked:
                    print(Fore.YELLOW + f"  [!] File {file} dang bi khoa (dang tai xuong hoac dang mo). Bo qua.")
                else:
                    new_files.append(full_path)
    if True: # Always send payload so server updates lastScanAt
        payload = {
            'videoPaths': new_files,
            'config': config
        }
        try:
            post_res = requests.post(f'{API_BASE_URL}/tasks/create-from-worker', json=payload, headers=headers)
            if post_res.status_code == 200:
                post_data = post_res.json()
                if post_data.get('success'):
                    if new_files:
                        with scan_cache_lock:
                            scan_cache = load_scan_cache()
                            for nf in new_files:
                                fs = os.stat(nf)
                                scan_cache[nf] = f'{fs.st_size}_{fs.st_mtime}'
                            save_scan_cache(scan_cache)
                        print(Fore.CYAN + f"\n[Auto-Scan] Phat hien {len(new_files)} video moi o {folder_path} - Da nop len server.")
                    else:
                        print(Fore.GREEN + f"\n[Auto-Scan] Da quet {folder_path} - Khong co video moi.")
        except Exception as e:
            pass

def poll_scan_folders_thread(token):
    headers = {'Authorization': f'Bearer {token}'}
    while True:
        try:
            res = requests.get(f'{API_BASE_URL}/scan-configs', headers=headers)
            if res.status_code == 200:
                data = res.json()
                if data.get('success') and data.get('configs'):
                    configs = data.get('configs')
                    for config in configs:
                        scan_single_config(config, token)

        except Exception as e:
            pass # Ignore errors in background thread
        
        time.sleep(120) # Kiem tra moi 120 giay


def poll_tasks(token):
    print_banner()
    print(Fore.GREEN + "Worker (Phase 2) dang chay ngam, san sang nhan nhiem vu...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    while True:
        try:
            res = requests.get(f"{API_BASE_URL}/tasks?action=poll", headers=headers)
            
            if res.status_code == 401:
                print(Fore.RED + "Token da het han hoac khong hop le. Vui long ghep noi lai.")
                if os.path.exists(CONFIG_FILE):
                    os.remove(CONFIG_FILE)
                return False
                
            try:
                data = res.json()
            except Exception as json_err:
                print(Fore.RED + f"Loi parse JSON tu Server. HTTP {res.status_code}: {res.text[:500]}")
                time.sleep(15)
                continue

            if data.get("success") and data.get("task"):
                task = data.get("task")
                process_task(token, task)
                print(Fore.GREEN + "\nWorker dang chay ngam, san sang nhan nhiem vu tiep theo...")
            else:
                poll_interval = 15.0
                if isinstance(data, dict) and data.get("pollIntervalMs"):
                    poll_interval = float(data.get("pollIntervalMs")) / 1000.0
                time.sleep(poll_interval)
                
        except requests.exceptions.ConnectionError:
            print(Fore.YELLOW + "Khong the ket noi toi Server. Dang thu lai sau 15s...")
            time.sleep(15)
        except Exception as e:
            print(Fore.RED + f"Loi vong lap poll: {str(e)}")
            time.sleep(15)

import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
import mimetypes

class LocalWorkerHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Private-Network', 'true')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Range')
        self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/upload':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                file_data = self.rfile.read(content_length)
                
                import uuid
                temp_id = str(uuid.uuid4())
                save_dir = os.path.abspath(os.path.join(WORKSPACE_DIR, f"temp_upload_{temp_id}"))
                os.makedirs(save_dir, exist_ok=True)
                
                # Cố định tên file là input.mp4 để tránh mọi lỗi ký tự đặc biệt tiếng Trung
                save_path = os.path.join(save_dir, "input.mp4")
                
                with open(save_path, 'wb') as f:
                    f.write(file_data)
                    
                self.send_response(200)
                self.send_cors_headers()
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                
                import json
                self.wfile.write(json.dumps({"status": "ok", "path": save_path}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_cors_headers()
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                import json
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
            return
            
        elif parsed.path == '/scan':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                import json
                data = json.loads(body)
                if GLOBAL_TOKEN:
                    scan_single_config(data, GLOBAL_TOKEN)
                self.send_response(200)
                self.send_cors_headers()
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status": "ok"}')
            except Exception as e:
                import traceback
                traceback.print_exc()
                self.send_response(500)
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(f'{{"error": "{str(e)}"}}\n'.encode())
            return

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        
        if parsed.path == '/ping':
            self.send_response(200)
            self.send_cors_headers()
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status": "ok"}')
            return
            
        if parsed.path == '/open':
            path_arg = qs.get('path', [''])[0].strip('"\' ')
            if path_arg and os.path.exists(path_arg):
                import subprocess
                if sys.platform == 'win32':
                    win_path = path_arg.replace('/', '\\\\')
                    subprocess.Popen(['explorer.exe', '/select,', win_path], shell=True)
            self.send_response(200)
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(b'ok')
            return
            
        if parsed.path == '/stream' or parsed.path == '/srt':
            path_arg = qs.get('path', [''])[0].strip('"\' ')
            if not path_arg or not os.path.exists(path_arg):
                self.send_response(404)
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(b'Not found')
                return
                
            file_size = os.path.getsize(path_arg)
            range_header = self.headers.get('Range')
            
            content_type = 'video/mp4'
            if path_arg.endswith('.srt'):
                content_type = 'text/plain'
                
            if range_header:
                try:
                    parts = range_header.replace("bytes=", "").split("-")
                    start = int(parts[0])
                    end = int(parts[1]) if parts[1] else file_size - 1
                    
                    self.send_response(206)
                    self.send_header('Content-Type', content_type)
                    self.send_header('Accept-Ranges', 'bytes')
                    self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
                    self.send_header('Content-Length', str((end - start) + 1))
                    self.send_cors_headers()
                    self.end_headers()
                    
                    with open(path_arg, 'rb') as f:
                        f.seek(start)
                        chunk_size = 8192
                        bytes_to_read = (end - start) + 1
                        while bytes_to_read > 0:
                            read_size = min(chunk_size, bytes_to_read)
                            chunk = f.read(read_size)
                            if not chunk:
                                break
                            self.wfile.write(chunk)
                            bytes_to_read -= len(chunk)
                except Exception as e:
                    pass
            else:
                self.send_response(200)
                self.send_header('Content-Type', content_type)
                if parsed.path == '/srt':
                    filename = os.path.basename(path_arg)
                    self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
                self.send_header('Content-Length', str(file_size))
                self.send_cors_headers()
                self.end_headers()
                
                with open(path_arg, 'rb') as f:
                    try:
                        import shutil
                        shutil.copyfileobj(f, self.wfile)
                    except Exception:
                        pass
            return
            
        self.send_response(404)
        self.send_cors_headers()
        self.end_headers()

def start_local_server(port=3001):
    try:
        server = HTTPServer(('127.0.0.1', port), LocalWorkerHandler)
        print(Fore.GREEN + f"[v] Local Server dang chay tai http://127.0.0.1:{port}")
        server.serve_forever()
    except Exception as e:
        print(Fore.RED + f"Khong the khoi dong Local Server tren port {port}: {str(e)}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="HeroDub Worker")
    parser.add_argument("--port", type=int, default=3001, help="Port cho Local Server")
    parser.add_argument("--server", type=str, default=None, help="Base URL cho Server API (vd: https://ai2hero-flax.vercel.app)")
    args, _ = parser.parse_known_args()
    worker_port = args.port
    
    if args.server:
        server_url = args.server.rstrip('/')
        API_BASE_URL = f"{server_url}/api/hero-dub"
        print(Fore.CYAN + f"[-] Su dung Server API tu bien --server: {API_BASE_URL}")

    scan_thread_started = False
    server_thread_started = False
    
    while True:
        config = load_config()
        token = config.get("accessToken")
        
        if not token:
            token = pair_device()
            
        if token:
            GLOBAL_TOKEN = token
            # Khoi dong WebSocket Bridge Server (Port 8765) cho Chrome Extension
            bridge_server.start()

            if not scan_thread_started:
                # Khoi dong luong quet thu muc
                t = threading.Thread(target=poll_scan_folders_thread, args=(token,), daemon=True)
                t.start()
                scan_thread_started = True
                
            if not server_thread_started:
                # Khoi dong Local Server
                t_server = threading.Thread(target=start_local_server, args=(worker_port,), daemon=True)
                t_server.start()
                server_thread_started = True
                
            # Neu token bi loi (401), poll_tasks tra ve False, vong lap se chay lai va hoi ma lien ket
            success = poll_tasks(token)
            if success is False:
                continue
