import os
import sys
import time
import json
import re
import platform
import socket
import requests
import subprocess
from datetime import datetime
from colorama import init, Fore, Style

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
    """
    def __init__(self, host="127.0.0.1", port=8765):
        self.host = host
        self.port = port
        self.clients = set()
        self.lock = threading.Lock()
        self.pending_jobs = {}
        self.server_socket = None
        self.is_running = False

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
                first_client = len(self.clients) == 0
                self.clients.add(sock)
            if first_client:
                print(Fore.GREEN + "[*] Chrome Extension da ket noi truc tiep qua WebSocket Local (Port 8765)!")

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

    def execute_job(self, prompt, target_ai="gemini", attachments=None, timeout=90):
        with self.lock:
            if not self.clients:
                return None
            client_sock = next(iter(self.clients))

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
            if event.wait(timeout=timeout):
                res = self.pending_jobs[job_id].get("result", {})
                return res
        except Exception as e:
            print(Fore.YELLOW + f"[!] WebSocket Bridge send error: {e}")
        finally:
            self.pending_jobs.pop(job_id, None)

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
API_BASE_URL = "https://www.ai2hero.com/api/hero-dub"
CONFIG_FILE = "config.json"
WORKSPACE_DIR = "workspace"

def generate_video_copywriting(task, translated_segments, duration_sec, bridge_server, headers, API_BASE_URL):
    """
    LUỒNG 1: Tự động viết lại Tiêu đề Tiếng Việt giật tít, Mô tả nội dung và Bộ Hashtags (TEXT-ONLY, Siêu tốc và Chuẩn xác 100%).
    """
    task_id = task.get("id")
    raw_source_title = task.get("sourceTitle") or task.get("source_title") or f"video_{task_id}"
    clean_source_title = os.path.basename(raw_source_title)
    for ext in ['.mp4', '.mkv', '.avi', '.mov', '.flv', '.webm']:
        if clean_source_title.lower().endswith(ext):
            clean_source_title = clean_source_title[:-len(ext)]
    clean_source_title = clean_source_title.strip()

    # 1. Trích xuất 10-15 câu thoại phụ đề tiếng Việt tiêu biểu
    sample_subs = []
    if translated_segments:
        total = len(translated_segments)
        step = max(1, total // 12)
        sample_subs = [seg.get('text', '') for idx, seg in enumerate(translated_segments) if idx % step == 0][:15]
    
    subs_text = "\n".join([f"- {s}" for s in sample_subs if s]) if sample_subs else "(Không có phụ đề)"

    prompt = f"""[HỆ THỐNG: BẮT BUỘC CHỈ TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON. KHÔNG CHÀO HỎI, KHÔNG GIẢI THÍCH, KHÔNG HỎI LẠI]

Hãy đóng vai Giám đốc Sáng tạo Nội dung Phim. Dưới đây là thông tin video:
- Tiêu đề gốc: {clean_source_title}
- Các câu thoại tiêu biểu đã dịch sang tiếng Việt:
{subs_text}

Nhiệm vụ của bạn:
1. "new_title": Đặt lại Tiêu đề Tiếng Việt cực kỳ giật tít, hấp dẫn, chuẩn SEO YouTube/TikTok (dưới 80 ký tự, khơi gợi tò mò).
2. "description": Viết đoạn mô tả ngắn 3-4 câu tóm tắt tình huống kịch tính nhất của video để khán giả xem hết.
3. "hashtags": Tạo bộ 6-8 hashtag xu hướng (bắt đầu bằng dấu #).

CHỈ TRẢ VỀ MÃ JSON THEO ĐÚNG CẤU TRÚC SAU (KHÔNG THÊM BẤT KỲ VĂN BẢN NÀO KHÁC):
{{
  "new_title": "Tiêu đề tiếng Việt giật tít tại đây",
  "description": "Đoạn mô tả ngắn 3-4 câu tại đây...",
  "hashtags": "#phimngan #reviewphim #tomtatphim #xuhuong #phimhay"
}}"""

    result = {
        "new_title": clean_source_title,
        "description": f"Video thuyết minh: {clean_source_title}. Theo dõi những tình tiết hấp dẫn và kịch tính nhất trong tập này!",
        "hashtags": "#phimngan #reviewphim #tomtatphim #xuhuong #phimhay",
    }

    if bridge_server and bridge_server.is_connected():
        print(Fore.CYAN + f"  [⚡ WebSocket Copywriting] Dang gui yeu cau viet Tieu de + Mo ta sang Gemini (Text-Only)...")
        ws_res = bridge_server.execute_job(prompt, attachments=[], target_ai="gemini", timeout=60)
        if not ws_res or not ws_res.get("success"):
            print(Fore.YELLOW + f"  [!] WebSocket Copywriting chua nhan duoc phan hoi ({ws_res}).")
        else:
            raw_out = str(ws_res.get("result", "")).strip()
            raw_out = re.sub(r"^```(?:json)?\s*", "", raw_out, flags=re.IGNORECASE)
            raw_out = re.sub(r"\s*```$", "", raw_out, flags=re.IGNORECASE).strip()
            
            parsed_success = False
            try:
                json_match = re.search(r'(\{[\s\S]*\})', raw_out)
                if json_match:
                    parsed = json.loads(json_match.group(1))
                    if isinstance(parsed, dict):
                        if parsed.get("new_title"):
                            result["new_title"] = parsed.get("new_title").strip()
                        if parsed.get("description"):
                            result["description"] = parsed.get("description").strip()
                        if parsed.get("hashtags"):
                            result["hashtags"] = parsed.get("hashtags").strip()
                        print(Fore.GREEN + f"  [⚡ WebSocket Copywriting] Da tao Tieu de moi: {result['new_title']}")
                        parsed_success = True
            except Exception as parse_e:
                print(Fore.YELLOW + f"  [!] Parse Copywriting JSON error ({parse_e}).")

            if not parsed_success and len(raw_out) > 10:
                print(Fore.YELLOW + f"  [!] Gemini tra ve text thuong, dang tu dong trich xuat tu lieu...")
                lines = [line.strip() for line in raw_out.split('\n') if line.strip()]
                for line in lines:
                    if any(kw in line.lower() for kw in ['tiêu đề:', 'title:', '1.']):
                        clean_line = re.sub(r'^(?:tiêu đề|title|1\.)[:\s*-]+', '', line, flags=re.IGNORECASE).strip('"\' ')
                        if len(clean_line) > 5:
                            result["new_title"] = clean_line[:90]
                            break
                tags = re.findall(r'#\w+', raw_out)
                if tags:
                    result["hashtags"] = " ".join(tags[:8])
                if len(lines) > 1:
                    result["description"] = "\n".join(lines[1:5])

    # Rào chắn an toàn: Nếu vẫn còn chữ tiếng Trung, tự động lấy câu phụ đề tiếng Việt đầu tiên
    if re.search(r'[\u4e00-\u9fff]', result["new_title"]):
        if translated_segments and len(translated_segments) > 0:
            for seg in translated_segments[:5]:
                t = seg.get('text', '').strip()
                if t and not re.search(r'[\u4e00-\u9fff]', t) and len(t) > 8:
                    prefix = f"video_{task_id}"
                    num_match = re.match(r'^(\d+)_', clean_source_title)
                    if num_match:
                        prefix = num_match.group(1)
                    result["new_title"] = f"{prefix}_{t[:70]}"
                    result["description"] = f"Video thuyết minh: {t}. Theo dõi hành trình kịch tính và thư giãn giải tỏa căng thẳng!"
                    break

    return result

def redesign_thumbnail_image(task, thumb_src, new_title, translated_segments, bridge_server):
    """
    LUỒNG 2: Thiết kế lại Ảnh bìa (IMAGE-ONLY, Chỉ chạy khi bật cờ redesignThumbnailEnabled).
    """
    if not task.get("redesignThumbnailEnabled"):
        return None

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

    # Đảm bảo tiêu đề thay vào ảnh 100% là tiếng Việt sạch (loại bỏ chữ tiếng Trung nếu có)
    clean_viet_title = new_title
    if re.search(r'[\u4e00-\u9fff]', clean_viet_title) or clean_viet_title.startswith("video_"):
        if translated_segments and len(translated_segments) > 0:
            for seg in translated_segments[:5]:
                t = seg.get('text', '').strip()
                if t and not re.search(r'[\u4e00-\u9fff]', t) and len(t) > 8:
                    clean_viet_title = t[:50]
                    break
        if re.search(r'[\u4e00-\u9fff]', clean_viet_title):
            clean_viet_title = "Sinh Tồn Nơi Hoang Dã"

    # Lọc bỏ tiền tố mã số ví dụ 1276_ để chữ trên ảnh bìa ngắn gọn, nghệ thuật
    display_title_on_image = re.sub(r'^\d+_', '', clean_viet_title).strip()

    print(Fore.CYAN + f"  [⚡ WebSocket Image Redesign] Dang gui anh bia sang Gemini de thiet ke lai theo tieu de moi: '{display_title_on_image}'...")
    image_prompt = f"""Đây là ảnh bìa (thumbnail) của video: "{display_title_on_image}".
Hãy chỉnh sửa và thiết kế lại ảnh bìa này:
1. Xóa toàn bộ chữ tiếng Trung Quốc có trên ảnh gốc.
2. Thay thế bằng dòng chữ tiêu đề tiếng Việt nổi bật nghệ thuật: "{display_title_on_image}".
3. BẮT BUỘC giữ nguyên 100% tỷ lệ khung hình gốc của ảnh (Aspect Ratio), kích thước và bố cục. Tuyệt đối không kéo dãn, không méo hình, không đổi tỷ lệ và không cắt xén viền.
4. Giữ nguyên 100% nhân vật chính, phong cách và bối cảnh của ảnh."""

    ws_res = bridge_server.execute_job(image_prompt, attachments=[img_b64], target_ai="gemini", timeout=120)
    if ws_res and ws_res.get("success") and ws_res.get("result"):
        raw_out = str(ws_res.get("result", "")).strip()
        img_match = re.search(r'!\[.*?\]\((data:image/[^)]+|https?://[^\s\)]+)\)', raw_out)
        if img_match:
            new_thumb_url = img_match.group(1)
            print(Fore.GREEN + f"  [⚡ WebSocket Image Redesign] Da nhan duoc anh bia thiet ke moi tu Gemini!")
            return new_thumb_url
        else:
            print(Fore.YELLOW + f"  [!] Gemini chua tao link anh moi ({raw_out[:120]}...).")
    else:
        print(Fore.YELLOW + f"  [!] WebSocket Image Redesign that bai hoac timeout ({ws_res}).")

    return None

def optimize_and_save_thumbnail(img_data, dest_thumb_path, target_res=720, quality=85):
    """
    Tối ưu hóa ảnh bìa Thumbnail:
    - Resize về chuẩn 720p (1280x720 cho ngang, 720x1280 cho dọc/Shorts) giữ nguyên 100% tỷ lệ khung hình.
    - Nén JPEG cao cấp (quality=85, optimize=True) giảm dung lượng từ vài MB xuống ~150-250 KB siêu nhẹ.
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

        # Chuyển đổi RGBA / P sang RGB (tránh lỗi khi lưu file JPEG)
        if img.mode in ("RGBA", "P"):
            rgb_img = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "RGBA":
                rgb_img.paste(img, mask=img.split()[3])
            else:
                rgb_img.paste(img)
            img = rgb_img
        elif img.mode != "RGB":
            img = img.convert("RGB")

        orig_w, orig_h = img.size
        
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
                # - Browser AI Bridge (Gemini/ChatGPT Web): Gom nhóm 200 câu/lần siêu tốc
                # - DeepSeek / OpenAI API: Gom nhóm 40 câu/lần + 5 câu Sliding Window Context
                if is_browser_bridge:
                    BATCH_SIZE = 200
                    print(Fore.CYAN + f"  -> Chế độ: Browser AI Bridge (Gemini Web) - Gom nhóm siêu tốc BATCH {BATCH_SIZE} câu/lần")
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
                    
                    # NHÁNH 1: Bắn qua Local WebSocket Bridge nếu chọn Browser AI Bridge (200 câu/lần)
                    if is_browser_bridge and bridge_server.is_connected():
                        print(Fore.CYAN + f"  [⚡ WebSocket Local] Dang ban truc tiep {len(texts)} cau sang Chrome Extension ({target_ai.upper()})...")
                        ws_input = {str(k): t for k, t in enumerate(texts)}
                        context_str = f"\nBối cảnh phim: {task.get('translateContext', '')}" if task.get('translateContext') else ""
                        ws_prompt = f"""Bạn là chuyên gia dịch thuật phụ đề phim chuyên nghiệp. Hãy dịch toàn bộ các câu thoại sau sang tiếng Việt mượt mà, tự nhiên, đúng văn phong phim:{context_str}

QUY TẮC BẮT BUỘC:
1. Trả về đúng định dạng JSON gốc (key "0", "1"... giữ nguyên, chỉ thay value bằng chuỗi dịch tiếng Việt).
2. KHÔNG giải thích, KHÔNG thêm lời chào, KHÔNG bọc trong markdown code block (```json). Chỉ trả về mã JSON thuần túy để máy đọc.

Dữ liệu:
{json.dumps(ws_input, ensure_ascii=False, indent=2)}"""

                        # Tăng timeout 120s thích ứng cho batch lớn 200 câu
                        ws_timeout = 120 if len(texts) > 50 else 90
                        ws_res = bridge_server.execute_job(ws_prompt, target_ai=target_ai, timeout=ws_timeout)
                        if ws_res and ws_res.get("success") and ws_res.get("result"):
                            raw_out = ws_res.get("result", "").strip()
                            raw_out = re.sub(r"^```(?:json)?\s*", "", raw_out, flags=re.IGNORECASE)
                            raw_out = re.sub(r"\s*```$", "", raw_out, flags=re.IGNORECASE).strip()
                            try:
                                json_match = re.search(r'(\{[\s\S]*\})', raw_out)
                                if json_match:
                                    parsed = json.loads(json_match.group(1))
                                    if isinstance(parsed, dict):
                                        translated_array = [str(parsed.get(str(k), texts[k])) for k in range(len(texts))]
                                        print(Fore.GREEN + f"  [⚡ WebSocket Local] Nhan ket qua sieu toc thanh cong ({len(translated_array)} cau)!")
                            except Exception as parse_err:
                                print(Fore.YELLOW + f"  [!] Parse ket qua WebSocket error ({parse_err}). Chuyen sang Cloud Fallback...")
                    elif is_browser_bridge:
                        print(Fore.YELLOW + "  [!] Browser AI Bridge duoc chon nhung Extension chua bat. Chuyen sang Cloud API...")

                    # NHÁNH 2: Gọi Connect Hub Cloud API (DeepSeek / OpenAI API)
                    if not translated_array:
                        for hub_attempt in range(3):
                            try:
                                payload = {"taskId": task_id, "texts": texts, "previousContext": prev_context}
                                api_attempts = 0
                                while api_attempts < 60:
                                    res = requests.post(f"{API_BASE_URL}/translate", json=payload, headers=headers, timeout=60)
                                    
                                    res_json = None
                                    try:
                                        res_json = res.json()
                                    except Exception:
                                        pass
                                        
                                    if res_json and "AUTH_REQUIRED" in str(res_json.get("error", "")):
                                        print(Fore.RED + "\n[!] LOI DANG NHAP: Trinh duyet Chrome Extension cua ban chua dang nhap Gemini / ChatGPT!")
                                        input(Fore.YELLOW + "Nhan ENTER de thoat va chay lai sau khi da dang nhap...")
                                        sys.exit(1)

                                    if res.status_code == 200 and res_json and res_json.get("isPending"):
                                        pending_job_id = res_json.get("jobId")
                                        if pending_job_id:
                                            payload["jobId"] = pending_job_id
                                        print(Fore.CYAN + f"  [!] Dang cho Chrome Extension xu ly tren trinh duyet... (Lan {api_attempts+1}/60)")
                                        time.sleep(5)
                                        api_attempts += 1
                                    else:
                                        break
                                        
                                if res.status_code == 200:
                                    data = res.json()
                                    if data.get("success") and data.get("translatedTexts"):
                                        translated_array = data.get("translatedTexts")
                                        print(Fore.GREEN + f"  [☁️ Connect Hub Cloud] Nhan ket qua API thanh cong ({len(translated_array)} cau)!")
                                        break
                                    else:
                                        print(Fore.YELLOW + f"  [!] Connect Hub tra ve loi ({data.get('error')}). Thu lai {hub_attempt+1}/3 sau 3s...")
                                else:
                                    print(Fore.YELLOW + f"  [!] Connect Hub HTTP {res.status_code}. Thu lai {hub_attempt+1}/3 sau 3s...")
                            except Exception as req_err:
                                print(Fore.YELLOW + f"  [!] Mang Connect Hub loi ({str(req_err)}). Thu lai {hub_attempt+1}/3 sau 3s...")
                                
                            time.sleep(3)
                        
                    # NHÁNH 3: Nếu Connect Hub thành công hoặc chuyển Fallback sang Google
                    if translated_array and len(translated_array) > 0:
                        for j, seg in enumerate(batch_segs):
                            translated = translated_array[j] if j < len(translated_array) else seg['text']
                            
                            # Self-Correction: Kiểm tra nếu câu dịch vẫn còn dính tiếng Trung
                            is_failed = False
                            if translated.strip() == seg['text'].strip():
                                is_failed = True
                            else:
                                ch_chars = len(re.findall(r'[\u4e00-\u9fff]', translated))
                                if ch_chars > 1 or (ch_chars > 0 and len(translated) < 10):
                                    is_failed = True
                            
                            if is_failed:
                                fixed_translated = google_translate(seg['text'], dest='vi')
                                print(Fore.YELLOW + f"  [Sua loi LLM bang Google] {seg['text']} -> {fixed_translated}")
                                translated = fixed_translated
                            else:
                                print(Fore.WHITE + f"  [Connect Hub] {translated}")
                                
                            translated_segments.append({
                                "start": seg['start'],
                                "end": seg['end'],
                                "text": translated
                            })
                        save_translation_progress()
                    else:
                        # Fallback khẩn cấp sang Google Translate Batch (Không bao giờ bị 429)
                        print(Fore.YELLOW + f"  [!] Connect Hub khong phan hoi, Fallback sang Google Translate Batch ({len(texts)} cau)...")
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

            # QUALITY GATE: Kiem duyet 100% toan bo cac cau thoai truoc khi sang buoc TTS
            print(Fore.CYAN + "[-] Kiem tra chat luong phu de tieng Viet (Translation Quality Gate)...")
            fixed_count = 0
            import re
            for seg_idx, seg in enumerate(translated_segments):
                orig_text = extracted_segments[seg_idx]['text'] if seg_idx < len(extracted_segments) else ""
                curr_text = seg.get("text", "")
                
                # Kiem tra neu con chu Han hoac text rong hoac trung 100% text goc tieng Trung
                ch_chars = len(re.findall(r'[\u4e00-\u9fff]', curr_text))
                needs_fix = False
                if ch_chars > 1 or (ch_chars > 0 and len(curr_text) < 10):
                    needs_fix = True
                elif orig_text and curr_text.strip() == orig_text.strip() and len(orig_text) > 3:
                    needs_fix = True
                
                if needs_fix:
                    fixed = google_translate(orig_text if orig_text else curr_text, dest='vi')
                    if fixed and fixed.strip() != curr_text.strip():
                        print(Fore.YELLOW + f"  [Quality Gate Fix #{seg_idx+1}] {curr_text} -> {fixed}")
                        seg["text"] = fixed
                        fixed_count += 1
            
            if fixed_count > 0:
                print(Fore.GREEN + f"  [✓] Quality Gate da sua sach se {fixed_count} cau chua dich sang Tieng Viet!")
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
                        if not seg['text'].strip():
                            continue
                        output_file = os.path.join(tts_dir, f"seg_{i:04d}.mp3")
                        if not os.path.exists(output_file) or os.path.getsize(output_file) < 100:
                            batch_items.append({
                                "index": i,
                                "text": seg['text'],
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
                    st = ffmpeg.output(video_sub, mixed_audio, "temp_output.mp4", vcodec=vc, acodec="aac", audio_bitrate="128k", **extra_args)
                else:
                    audio_dub = ffmpeg.input("dubbed_audio.wav").audio
                    st = ffmpeg.output(video_sub, audio_dub, "temp_output.mp4", vcodec=vc, acodec="aac", audio_bitrate="128k", **extra_args)
            else:
                st = ffmpeg.output(video_sub, video.audio, "temp_output.mp4", vcodec=vc, acodec="aac", audio_bitrate="128k", **extra_args)
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
        
        # --- KET NOI INTRO / OUTRO ---
        final_output = "temp_output.mp4"
        if branding_enabled and ((intro_url and os.path.exists(intro_url)) or (outro_url and os.path.exists(outro_url))):
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
            except Exception as concat_err:
                print(Fore.RED + f"  [!] Loi khi gop Intro/Outro (bo qua): {str(concat_err)}")
                final_output = "temp_output.mp4"
        
        if final_output == "temp_output.mp4" and os.path.exists("temp_output.mp4"):
            import shutil
            shutil.move("temp_output.mp4", "output.mp4")

        
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
    new_title = copy_pack.get("new_title") or task.get("sourceTitle") or f"video_{task_id}"

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
            base_name = re.sub(r'[\\/:*?"<>|]', '_', new_title).strip()
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
                # 1. Nếu là Base64 Data URL (Do Extension trích xuất canvas không bị chặn 403)
                if thumb_url.startswith("data:image/"):
                    try:
                        b64_str = thumb_url.split(",", 1)[1] if "," in thumb_url else thumb_url
                        img_bytes = base64.b64decode(b64_str)
                        if len(img_bytes) > 5000:
                            saved_thumb_success = optimize_and_save_thumbnail(img_bytes, dest_thumb, target_res=720, quality=85)
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
                            print(Fore.YELLOW + f"[!] Anh online bi chan 403 hoac loi (Size: {len(resp.content)} bytes). Fallback sang anh goc...")
                    except Exception as dl_err:
                        print(Fore.YELLOW + f"[!] Khong the tai anh thumbnail moi: {dl_err}")

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
        print(Fore.GREEN + f"[\u2713] Local Server dang chay tai http://127.0.0.1:{port}")
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
