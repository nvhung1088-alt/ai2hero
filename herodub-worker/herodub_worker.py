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
STOP_WORDS = {'vlog', 'clip', 'video', 'ai', 'mp4', 'full', 'hd', 'hot', 'part', 'tap', 'phim', 'short', 'shorts', 'ep', 'episode', 'goc', 'raw', 'douyin', 'tiktok', 'task', 'thuyet', 'minh'}

def is_meaningful_title(title):
    """
    Kiểm tra xem tiêu đề tiếng Việt có thực sự có nghĩa hay không:
    - Không chứa chữ tiếng Trung Quốc.
    - Không chứa toàn từ rác vô nghĩa như Vlog_AI____, 2493_Vlog___ai___AI, video_123, clip_ai.
    - Phải có ít nhất 2 từ tiếng Việt có nghĩa (nằm ngoài danh sách STOP_WORDS) và tổng độ dài >= 6 ký tự.
    """
    if not title:
        return False
    str_t = str(title).strip()
    # Chứa chữ Hán -> Không phải tiếng Việt
    if re.search(r'[\u4e00-\u9fff]', str_t):
        return False
    # Loại bỏ tiền tố số (ví dụ 2493_, 1202 - )
    clean = re.sub(r'^\d+[\s_–-]+', '', str_t).strip()
    # Chỉ giữ lại chữ và số
    clean = re.sub(r'[^a-zA-Z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ\s]', ' ', clean).strip()
    words = [w.lower() for w in clean.split() if not w.isdigit()]
    if not words:
        return False
    # Lọc các từ có nghĩa thực tế
    meaningful_words = [w for w in words if w not in STOP_WORDS]
    if len(meaningful_words) < 2:
        return False
    meaningful_len = sum(len(w) for w in meaningful_words)
    if meaningful_len < 6:
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
    Tự động biến đổi theo ĐÚNG THỂ LOẠI: Hoạt hình 3D, Phim drama, Ẩm thực, Khoa học, Sinh tồn, Đời sống...
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

def generate_video_copywriting(task, translated_segments, duration_sec, bridge_server, headers, API_BASE_URL, thumb_src=None):
    """
    LUỒNG 1: Tạo Tiêu đề, Mô tả và Hashtags chuẩn xác 100% theo nội dung video.
    ĐẶC BIỆT: Hỗ trợ Multimodal - Gửi kèm Ảnh Bìa Gốc (nếu có) + Tên file + Phụ đề sang Gemini Web
    giúp AI quan sát chữ trên ảnh bìa, nhân vật và bối cảnh để đặt tiêu đề cực hay và chuẩn xác!
    """
    task_id = task.get("id")
    raw_source = task.get("sourceTitle") or task.get("sourceUrl") or f"video_{task_id}"
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

    # Chuẩn bị ảnh đính kèm (Multimodal) nếu có ảnh bìa gốc
    attachments = []
    has_thumb_attachment = False
    if thumb_src and os.path.exists(thumb_src):
        try:
            with open(thumb_src, "rb") as f_img:
                b64_data = base64.b64encode(f_img.read()).decode("utf-8")
                attachments.append({
                    "name": os.path.basename(thumb_src),
                    "type": "image/jpeg",
                    "data": f"data:image/jpeg;base64,{b64_data}"
                })
                has_thumb_attachment = True
                print(Fore.CYAN + f"  [📸 Vision Ready] Da nạp ảnh bìa gốc ({os.path.basename(thumb_src)}) để gửi kèm cho AI quan sát nội dung!")
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

    # Tự động dịch tiêu đề gốc sang Tiếng Việt ngay từ đầu làm phương án nền móng an toàn
    init_vi_title = clean_source_title
    if re.search(r'[\u4e00-\u9fff]', clean_source_title):
        pure_ch = re.sub(r'^\d+[\s_–-]+', '', clean_source_title).strip()
        pure_ch = os.path.splitext(pure_ch)[0]
        main_part = pure_ch.split('_')[0].strip() if '_' in pure_ch else pure_ch
        if len(main_part) < 6:
            main_part = pure_ch
        tr = google_translate(main_part, dest='vi')
        if not tr or not is_meaningful_title(tr):
            tr = google_translate(pure_ch, dest='vi')
        if tr and is_meaningful_title(tr):
            clean_tr = re.sub(r'[\\/:*?"<>|]', ' ', tr).strip()
            init_vi_title = f"{prefix_num}{clean_tr}"

    init_genre = detect_video_genre(init_vi_title, clean_source_title, sample_subs)
    result = {
        "new_title": init_vi_title,
        "description": build_rich_vietnamese_description(init_vi_title, clean_source_title, sample_subs),
        "hashtags": get_default_hashtags_by_genre(init_genre),
    }

    copywriting_success = False

    # ƯU TIÊN 1: GỌI GEMINI WEB PRO QUA EXTENSION (Đặc biệt khi có ảnh bìa đính kèm - Multimodal Vision)
    if bridge_server and bridge_server.is_connected():
        print(Fore.CYAN + f"  [🌐 Gemini Multimodal Copywriting] Dang gui anh bia + ten file + sub sang Gemini Web...")
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
                            if is_meaningful_title(t_val):
                                result["new_title"] = f"{prefix_num}{t_val}" if prefix_num and not t_val.startswith(prefix_num) else t_val
                                parsed_success = True
                        if parsed.get("description"):
                            d_val = str(parsed.get("description")).strip()
                            if not re.search(r'[\u4e00-\u9fff]', d_val) and len(d_val) >= 50:
                                result["description"] = d_val
                        if parsed.get("hashtags"):
                            h_val = str(parsed.get("hashtags")).strip()
                            if not re.search(r'[\u4e00-\u9fff]', h_val) and h_val:
                                result["hashtags"] = h_val
                        if parsed_success:
                            print(Fore.GREEN + Style.BRIGHT + f"  [✓ Gemini Copywriting] Da tao Tieu de & Mo ta chuan tu Anh + Sub: {result['new_title']}")
                            copywriting_success = True
            except Exception:
                pass

            if not parsed_success:
                title_m = re.search(r'"new_title"\s*:\s*"([^"]+)"', raw_out)
                if title_m:
                    t_val = title_m.group(1).strip()
                    if is_meaningful_title(t_val):
                        result["new_title"] = f"{prefix_num}{t_val}" if prefix_num and not t_val.startswith(prefix_num) else t_val
                        copywriting_success = True
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

    # ƯU TIÊN 2: GỌI DEEPSEEK OFFICIAL AI QUA SERVER (Nếu Gemini chưa tạo được)
    if not copywriting_success:
        try:
            print(Fore.CYAN + Style.BRIGHT + f"  [⚡ DeepSeek Copywriting] Dang chuyen tiep sang DeepSeek Cloud AI...")
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
                    if is_meaningful_title(t_val):
                        result["new_title"] = f"{prefix_num}{t_val}" if prefix_num and not t_val.startswith(prefix_num) else t_val
                        copywriting_success = True
                    else:
                        print(Fore.YELLOW + f"  [!] DeepSeek trả về tiêu đề chưa đạt chuẩn nghĩa ('{t_val}'). Bỏ qua để kích hoạt cứu hộ...")
                    if resp_data.get("description"):
                        d_val = str(resp_data.get("description")).strip()
                        if not re.search(r'[\u4e00-\u9fff]', d_val) and len(d_val) >= 50:
                            result["description"] = d_val
                    if resp_data.get("hashtags"):
                        h_val = str(resp_data.get("hashtags")).strip()
                        if not re.search(r'[\u4e00-\u9fff]', h_val) and h_val:
                            result["hashtags"] = h_val
                    if copywriting_success:
                        print(Fore.GREEN + Style.BRIGHT + f"  [✓ DeepSeek Ready] Da tao Tieu de & Mo ta chuan SEO: {result['new_title']}")
        except Exception as ds_err:
            print(Fore.YELLOW + f"  [!] Loi DeepSeek Copywriting: {ds_err}")

    # RÀO CHẮN BẢO VỆ CỨU HỘ ĐẶC BIỆT: Chặn đứng 100% tiêu đề rác cụt ngủn như 'Vlog_AI____' hoặc 'Vlog___ai___AI'
    if not is_meaningful_title(result["new_title"]):
        print(Fore.YELLOW + f"  [!] Phát hiện tiêu đề chưa hợp lệ hoặc cụt ngủn ('{result['new_title']}'). Kích hoạt cứu hộ...")
        pure_ch_title = re.sub(r'^\d+[\s_–-]+', '', clean_source_title).strip()
        pure_ch_title = os.path.splitext(pure_ch_title)[0]
        # Lấy phần tiêu đề chính trước các hashtag Douyin
        main_ch_part = pure_ch_title.split('_')[0].strip() if '_' in pure_ch_title else pure_ch_title
        if len(main_ch_part) < 6:
            main_ch_part = pure_ch_title

        trans_title = google_translate(main_ch_part, dest='vi')
        if not trans_title or not is_meaningful_title(trans_title):
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
            print(Fore.CYAN + Style.BRIGHT + f"  [-] Đã đặt tiêu đề theo thể loại video: {result['new_title']}")

    # Đảm bảo description không còn ký tự Trung Quốc và có cấu trúc bài bản
    if re.search(r'[\u4e00-\u9fff]', result.get("description", "")) or len(result.get("description", "")) < 60:
        result["description"] = build_rich_vietnamese_description(result["new_title"], clean_source_title, sample_subs)

    return result

def is_top_title_layout(title_text="", path_or_name="", genre=None):
    """
    Tự động nhận diện bố cục vị trí tiêu đề:
    - TOP (14% chiều cao): Thể loại Hoạt hình 3D, Chú heo, Thú cưng, Vlog đời sống, Hài hước, Drama ngắn.
    - BOTTOM (68% chiều cao): Thể loại Sinh tồn hoang dã, Chế tác, Nấu ăn, Khám phá thiên nhiên.
    """
    if genre in ["anime_donghua", "general_lifestyle", "movie_drama"]:
        return True
    
    check_str = f"{title_text} {path_or_name} {genre or ''}".lower()
    top_keywords = [
        "vlog", "heo", "pig", "chu heo", "anime", "hoat hinh", "3d", "donghua",
        "hai huoc", "drama", "pet", "meo", "cho", "thu cung", "con heo", "be heo",
        "tieu da", "tieu do", "sa ba", "chibi", "bac si", "phong kham"
    ]
    if any(k in check_str for k in top_keywords):
        return True
        
    bottom_keywords = [
        "sinh ton", "hoang da", "che tac", "rui nho", "nau an", "am thuc",
        "bushcraft", "survival", "trai", "be ca", "ho ca", "xay dung", "cau ca"
    ]
    if any(k in check_str for k in bottom_keywords):
        return False
        
    return False

def create_local_3d_gold_thumbnail(src_path, title_text, out_path, tag_text="THUYẾT MINH", position="auto", genre=None):
    """
    LOCAL 3D GOLD THUMBNAIL ENGINE (0đ, KHÔNG CẦN API):
    - Tự động resize ảnh gốc về chuẩn 720p sắc nét.
    - Phủ Badge đỏ ruby góc trên trái che sạch logo/badge Trung Quốc cũ.
    - Bố cục thông minh: Nửa trên (14% chiều cao) cho Hoạt hình/Vlog/Chú heo, hoặc Nửa dưới (68%) cho Sinh tồn/Nấu ăn.
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
        
        # 1. TOP-LEFT BADGE (Nhỏ gọn tinh tế, không chiếm dụng góc ảnh)
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
            
        # 2. TYPOGRAPHY 3D VÀNG KIM TRỰC TIẾP (TUYỆT ĐỐI KHÔNG CÓ BẢNG ĐEN CHE BỨC ẢNH)
        is_top = False
        if position == "top":
            is_top = True
        elif position == "bottom":
            is_top = False
        else:
            is_top = is_top_title_layout(title, src_path, genre)

        if is_top:
            text_start_y = int(target_h * 0.14)
        else:
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
    BƯỚC 1: XÓA SẠCH TOÀN BỘ CHỮ TIẾNG TRUNG QUỐC & WATERMARK BẰNG GEMINI.
    - Ưu tiên 1: Gọi thẳng Gemini Flash Image Direct API (Free Tier) siêu tốc trong 3 giây.
    - Ưu tiên 2: Fallback sang Browser AI Bridge (Gemini Web) nếu không có API Key.
    - Giữ nguyên 100% nhân vật, nét mặt, trang phục, bối cảnh, ánh sáng và màu sắc.
    - TUYỆT ĐỐI KHÔNG VIẾT CHỮ TIẾNG VIỆT TẠI BƯỚC NÀY (Để Worker viết ở Bước 2).
    - Xuất ra file ảnh nền hoàn toàn sạch chữ (Clean Background).
    """
    if not thumb_src or not os.path.exists(thumb_src):
        return None

    import shutil

    clean_prompt = """Hãy chỉnh sửa bức ảnh đính kèm này (Image Inpainting / Text Removal):
1. XÓA BỎ HOÀN TOÀN tất cả các dòng chữ tiếng Trung Quốc và watermark/logo trên ảnh.
2. Phục hồi chi tiết bối cảnh tự nhiên bị chữ che khuất.
3. BẮT BUỘC GIỮ NGUYÊN 100% nhân vật, biểu cảm, nét mặt, trang phục, ánh sáng, màu sắc và tỷ lệ khung hình gốc.
4. TUYỆT ĐỐI KHÔNG VIẾT BẤT KỲ CHỮ NÀO LÊN ẢNH, KHÔNG VẼ THÊM KHUNG ĐEN.
5. Xuất ra hình ảnh nền hoàn toàn sạch chữ (clean edited image without any text)."""

    # 1. ƯU TIÊN 1 TUYỆT ĐỐI: GEMINI FLASH IMAGE DIRECT API (Free Tier, 3s xong ngay, không phụ thuộc trình duyệt)
    key = api_key or get_gemini_api_key()
    if key:
        try:
            print(Fore.CYAN + Style.BRIGHT + f"  [⚡ Gemini Flash Image API] Dang gui anh sang Gemini Flash de xoa chu tieng Trung (3s)...")
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
            print(Fore.YELLOW + f"  [!] Gemini Flash API loi: {e}, chuyen sang Browser AI Bridge...")

    # 2. ƯU TIÊN 2 (DỰ PHÒNG): BROWSER AI BRIDGE (Gemini Web qua Chrome Extension nếu API lỗi)
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

            # Watcher thu muc Downloads neu Chrome Extension tu tai anh ve
            dl_img = get_latest_download_image(start_t - 2, timeout=4)
            if dl_img:
                shutil.copy2(dl_img, out_clean_path)
                print(Fore.GREEN + Style.BRIGHT + f"  [✓ Downloads Watcher] Da phat hien anh nen sach tai ve may: {os.path.basename(dl_img)}!")
                return out_clean_path
        except Exception as bridge_err:
            print(Fore.YELLOW + f"  [!] Gemini Bridge Clean loi: {bridge_err}")

    # 3. FALLBACK CỤC BỘ: Tay mo watermark goc phai neu co
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

def render_adaptive_vietnamese_thumbnail(bg_image_path, title_text, out_path, style="auto", tag_text="THUYẾT MINH", position="auto", genre=None):
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
            final_path = create_local_3d_gold_thumbnail(bg_image_path, clean_title, out_path, tag_text=tag_text, position=position, genre=genre)
            return final_path

        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        final_img.save(out_path, quality=92, optimize=True)
        return out_path
    except Exception as e:
        print(Fore.YELLOW + f"  [!] Loi render Adaptive Thumbnail: {e}")
        return None

def redesign_thumbnail_image(task, thumb_src, new_title, translated_segments, bridge_server, genre=None, position="auto"):
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

    # =========================================================================
    # QUY TRÌNH THIẾT KẾ THUMBNAIL 2 BƯỚC CHUẨN HÓA (GEMINI + WORKER):
    # - BƯỚC 1: Gemini (Bridge hoặc Flash API) CHỈ LÀM DUY NHẤT 1 VIỆC LÀ XÓA CHỮ TQ
    # - BƯỚC 2: Worker dùng Pillow viết chữ tiếng Việt chuẩn Typography vào đúng vị trí chữ cũ
    # =========================================================================
    print(Fore.CYAN + Style.BRIGHT + f"\n  ==================================================")
    print(Fore.CYAN + Style.BRIGHT + f"  🎨 THIẾT KẾ THUMBNAIL (PIPELINE 2 BƯỚC CHUẨN HÓA)")
    print(Fore.CYAN + Style.BRIGHT + f"  ==================================================")
    print(Fore.WHITE + f"  -> Tiêu đề tiếng Việt: '{clean_title}'")

    # BƯỚC 1: XÓA SẠCH CHỮ TIẾNG TRUNG BẰNG GEMINI
    clean_path = clean_image_with_gemini_flash(thumb_src, clean_bg, api_key=get_gemini_api_key(), bridge_server=bridge_server)
    effective_bg = clean_path if (clean_path and os.path.exists(clean_path)) else thumb_src

    # BƯỚC 2: WORKER VIẾT TIÊU ĐỀ TIẾNG VIỆT CHUẨN TYPOGRAPHY 3D VÀO ĐÚNG VỊ TRÍ CHỮ CŨ
    print(Fore.CYAN + f"  [Bước 2: Worker Typography Engine] Dang ve chu tieng Viet co dau 3D len anh...")
    res = render_adaptive_vietnamese_thumbnail(effective_bg, clean_title, final_thumb, style=font_style, tag_text="THUYẾT MINH", position=position, genre=genre)
    if res and os.path.exists(res):
        print(Fore.GREEN + Style.BRIGHT + f"  [✓ Hoàn Tất 100%] Da tao anh bia tieng Viet thanh cong: {os.path.basename(res)}!")
        return res

    # Fallback cục bộ nếu render_adaptive gặp sự cố
    local_thumb = os.path.join(dest_dir, f"_local_3d_{os.path.basename(thumb_src)}")
    return create_local_3d_gold_thumbnail(effective_bg, clean_title, local_thumb, tag_text="THUYẾT MINH", position=position, genre=genre)


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
    
    has_audio = True
    has_speech = True
    stt_was_run = False
    try:
        import json
        if os.path.exists(extracted_segments_file):
            print(Fore.GREEN + "[-] Phat hien du lieu STT cu, bo qua STT va chay tiep...")
            with open(extracted_segments_file, "r", encoding="utf-8") as f:
                extracted_segments = json.load(f)
            if len(extracted_segments) == 0:
                has_speech = False
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
                    if "does not contain any stream" in err_str or "no streams to output" in err_str or "output file is empty" in err_str:
                        print(Fore.YELLOW + "  [i] Video KHONG CO LUONG AM THANH (Silent Video). Bo qua buoc nhan dang giong noi...")
                        has_audio = False
                        has_speech = False
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
            if has_speech and noise_level == "noisy":
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
                    print(Fore.YELLOW + f"  [!] Demucs that bai, tiep tuc voi am thanh goc: {demucs_err}")

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

            extracted_segments = []
            if has_speech and os.path.exists(whisper_input_audio):
                asr_start_time = time.time()
                from faster_whisper import WhisperModel
                
                model = None
                try:
                    model = WhisperModel(model_size, device="cuda", compute_type="float16")
                except Exception as cuda_err:
                    print(Fore.YELLOW + f"  [!] Khong the tai Whisper CUDA ({model_size}): {cuda_err}. Dang su dung CPU...")
                    model = WhisperModel(model_size, device="cpu", compute_type="int8")
                
                transcribe_kwargs = {
                    "language": source_lang,
                    "beam_size": beam_size,
                    "word_timestamps": False,
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
                    print(Fore.YELLOW + "  [i] Video khong co giong noi (Empty Speech / Nhac nen / Khong loi).")
                    print(Fore.YELLOW + "  [i] Tu dong bo qua STT & TTS de tiep tuc hoan thien Video va AI Publishing Suite...")
                    has_speech = False
                    
                with open(extracted_segments_file, "w", encoding="utf-8") as f:
                    json.dump(extracted_segments, f, ensure_ascii=False, indent=2)
                    
                asr_end_time = time.time()
                asr_duration = asr_end_time - asr_start_time
                print(Fore.YELLOW + Style.BRIGHT + f"\n[!] THOI GIAN HOAN THANH NHAN DANG (STT): {asr_duration:.2f} giay.\n")
                if not is_bcut:
                    release_resource_lock(token, task_id, "whisper_cpu")
            else:
                has_speech = False
                with open(extracted_segments_file, "w", encoding="utf-8") as f:
                    json.dump([], f, ensure_ascii=False, indent=2)
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
                                        err_detail = ""
                                        try:
                                            err_json = res.json()
                                            err_detail = err_json.get('error', '') or err_json.get('detail', '')
                                        except Exception:
                                            err_detail = res.text[:120] if res.text else ""
                                        print(Fore.YELLOW + f"    [!] Cloud API HTTP {res.status_code} (Attempt {hub_attempt+1}/2): {err_detail}")
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
    if task.get("ttsEnabled") and len(translated_segments) > 0:
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
        has_subtitles = len(translated_segments) > 0 and os.path.exists("vi.srt") and os.path.getsize("vi.srt") > 10
        
        video = ffmpeg.input("input.mp4")
        if has_subtitles:
            video_sub = video.video.filter('subtitles', 'vi.srt', force_style="FontSize=20,PrimaryColour=&HFFFFFF,BackColour=&H00000000,BorderStyle=3,Outline=2,Shadow=0,MarginV=10")
        else:
            video_sub = video.video
        
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
                if has_audio:
                    st = ffmpeg.output(video_sub, video.audio, render_target_file, vcodec=vc, acodec="aac", audio_bitrate="128k", **extra_args)
                else:
                    st = ffmpeg.output(video_sub, render_target_file, vcodec=vc, **extra_args)
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

    # Luồng 1: Viết Tiêu đề, Mô tả, Hashtags (Multimodal Vision: Truyền kèm Ảnh bìa gốc nếu có)
    copy_pack = generate_video_copywriting(task, translated_segments, duration_sec, bridge_server, headers, API_BASE_URL, thumb_src=thumb_src)
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
    sample_texts = [s.get('text', '') for s in translated_segments[:10]] if translated_segments else []
    detected_genre = copy_pack.get("genre") or detect_video_genre(new_title, raw_source, sample_subs=sample_texts)
    new_thumb_url = redesign_thumbnail_image(task, thumb_src, new_title, translated_segments, bridge_server, genre=detected_genre, position="auto")
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
                local_thumb_res = create_local_3d_gold_thumbnail(thumb_src, new_title, dest_thumb, tag_text="THUYẾT MINH", position="auto", genre=detected_genre)
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
