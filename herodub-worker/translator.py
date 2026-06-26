import os
import sys
import subprocess
import re
from pathlib import Path

def map_asr_engine(engine_name):
    # 0 = faster-whisper, 1 = openai-whisper, 2 = bcut
    if engine_name == 'bcut':
        return '2'
    return '0' # Mặc định faster-whisper

def map_translate_engine(engine_name):
    # 0 = Google Translate
    return '0'

def run_pyvideotrans(pyvideotrans_dir, video_path, task_data, progress_callback):
    """
    Khởi chạy pyVideoTrans CLI dưới dạng subprocess.
    progress_callback: Hàm nhận (status, progress_percent) để cập nhật tiến trình lên Server.
    """
    cli_script = os.path.join(pyvideotrans_dir, "cli.py")
    if not os.path.exists(cli_script):
        raise FileNotFoundError(f"Không tìm thấy cli.py tại {pyvideotrans_dir}. Vui lòng kiểm tra lại đường dẫn cài đặt pyVideoTrans.")

    # Tên video gốc (không đuôi) để pyvideotrans tạo folder output tương ứng
    video_filename = os.path.basename(video_path)
    video_basename = os.path.splitext(video_filename)[0]
    
    # Chuẩn hóa tên folder output giống như regex của cli.py
    nospace_basename = re.sub(r'[\s. #*?!:"]', '-', video_basename)
    expected_output_dir = os.path.join(pyvideotrans_dir, "output", nospace_basename)

    # Map các tham số
    asr_type = map_asr_engine(task_data.get('asrEngine'))
    trans_type = map_translate_engine(task_data.get('translateEngine'))
    sub_type = '1' if task_data.get('subtitleMode') == 'burn_subtitle' else '0' # 1 = Hard embed, 0 = No embed (chỉ srt)
    
    # Xử lý an toàn các tham số TTS
    tts_enabled = task_data.get('ttsEnabled', False)
    tts_voice = task_data.get('ttsVoice')
    voice_role = tts_voice if (tts_enabled and tts_voice) else "No"
    
    # Map ttsEngine sang tts_type của pyVideoTrans
    # 0 = edge-tts, 1 = openai, 2 = elevenlabs
    engine_map = {'edge-tts': '0', 'openai': '1', 'openai-tts': '1', 'elevenlabs': '2'}
    tts_engine_name = task_data.get('ttsEngine', 'edge-tts')
    tts_type_val = engine_map.get(tts_engine_name, '0')

    # CMD command
    # Sử dụng python chạy cli.py của pyVideoTrans
    python_exe = sys.executable
    cmd = [
        python_exe,
        cli_script,
        "--task", "vtv",
        "--name", os.path.abspath(video_path),
        "--source_language_code", task_data.get('sourceLang', 'zh-cn'), # zh-cn
        "--target_language_code", task_data.get('targetLang', 'vi'), # vi
        "--voice_role", voice_role,
        "--recogn_type", asr_type,
        "--translate_type", trans_type,
        "--subtitle_type", sub_type,
        "--model_name", "small", # Dùng model small cho nhanh và nhẹ local
    ]

    # Cập nhật cấu hình nâng cao trực tiếp vào set.ini của pyVideoTrans
    ini_path = os.path.join(pyvideotrans_dir, "set.ini")
    try:
        if os.path.exists(ini_path):
            with open(ini_path, 'r', encoding='utf-8') as f:
                ini_content = f.read()
        else:
            ini_content = ""
        
        bg_vol = str(task_data.get('bgVolume') or '1.0')
        tts_vol = str(task_data.get('ttsVolume') or '1.0')
        
        try:
            speed_val = float(task_data.get('ttsSpeed') or 1.0)
        except ValueError:
            speed_val = 1.0
        v_rate = f"+{int((speed_val - 1.0) * 100)}%"
        
        # Hàm thay thế hoặc append cấu hình (Bug 3)
        def update_ini_val(content, key, val):
            pattern = rf'^{re.escape(key)}=.*'
            if re.search(pattern, content, flags=re.MULTILINE):
                return re.sub(pattern, f'{key}={val}', content, flags=re.MULTILINE)
            # Nếu không tìm thấy và content không kết thúc bằng newline, thêm newline trước khi append
            prefix = "" if not content or content.endswith('\n') else "\n"
            return content + f'{prefix}{key}={val}\n'
            
        ini_content = update_ini_val(ini_content, 'video_volume', bg_vol)
        ini_content = update_ini_val(ini_content, 'audio_volume', tts_vol)
        ini_content = update_ini_val(ini_content, 'voice_rate', v_rate)
        ini_content = update_ini_val(ini_content, 'tts_type', tts_type_val)
            
        with open(ini_path, 'w', encoding='utf-8') as f:
            f.write(ini_content)
        print(f"[Translator] Đã cập nhật set.ini: video_volume={bg_vol}, audio_volume={tts_vol}, voice_rate={v_rate}, tts_type={tts_type_val}")
    except Exception as e:
        print(f"[Translator] Lỗi ghi set.ini: {e}")

    print(f"[Translator] Đang chạy pyVideoTrans CLI...")
    print(f"[Translator] Lệnh: {' '.join(cmd)}")
    
    # Thiết lập environment PATH cho ffmpeg bên trong pyvideotrans nếu có
    env = os.environ.copy()
    
    # Chạy process
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        cwd=pyvideotrans_dir,
        env=env
    )

    # Khai báo cấu trúc trọng số của các Phase
    # Transcribing: 30% -> 60% (base=30, weight=30)
    # Translating: 60% -> 80% (base=60, weight=20)
    # Burning: 80% -> 95% (base=80, weight=15)
    phase_ranges = {
        'transcribing': {'base': 30, 'weight': 30},
        'translating': {'base': 60, 'weight': 20},
        'burning': {'base': 80, 'weight': 15}
    }
    
    current_status = 'transcribing'
    last_reported_progress = 30
    progress_callback(current_status, last_reported_progress)

    while True:
        line = process.stdout.readline()
        if not line and process.poll() is not None:
            break
            
        if line:
            line_str = line.strip()
            print(f"[pyVideoTrans Console] {line_str}")
            
            # Chuyển phase dựa trên từ khóa
            if "Speech Transcription" in line_str or "语音转录" in line_str:
                current_status = 'transcribing'
            elif "Subtitle Translation" in line_str or "字幕翻译" in line_str:
                current_status = 'translating'
            elif "novoice.mp4" in line_str:
                current_status = 'burning'
                
            # Phân tích phần trăm từ output log bằng Regex
            # Bắt mẫu như "10%", "[15%]", "Progress: 20%"
            match = re.search(r'(?:\[|\b|progress:?\s*)?(\d{1,3})\s*%', line_str, re.IGNORECASE)
            
            current_base = phase_ranges[current_status]['base']
            current_weight = phase_ranges[current_status]['weight']
            
            if match:
                try:
                    percent_val = int(match.group(1))
                    if 0 <= percent_val <= 100:
                        calculated_progress = current_base + int((percent_val / 100.0) * current_weight)
                        # Đảm bảo "Tiến lên không lùi" để UI mượt mà
                        if calculated_progress > last_reported_progress:
                            last_reported_progress = calculated_progress
                            progress_callback(current_status, last_reported_progress)
                except ValueError:
                    pass
            else:
                # Nếu không có % trong dòng này, ta check xem việc chuyển phase (từ khóa) có khiến progress nhảy vọt lên không
                if current_base > last_reported_progress:
                    last_reported_progress = current_base
                    progress_callback(current_status, last_reported_progress)
                
    rc = process.poll()
    if rc != 0:
        raise Exception(f"pyVideoTrans CLI gặp lỗi, mã thoát: {rc}")

    # Tìm file video kết quả và file phụ đề srt trong thư mục output
    print(f"[Translator] Quét thư mục kết quả: {expected_output_dir}")
    if not os.path.exists(expected_output_dir):
        # Fallback quét trong thư mục output chung
        expected_output_dir = os.path.join(pyvideotrans_dir, "output")
        
    result_video = None
    result_srt = None

    # Quét đệ quy tìm file
    for root, dirs, files in os.walk(expected_output_dir):
        for file in files:
            if file.endswith(".mp4") and nospace_basename in file:
                result_video = os.path.join(root, file)
            elif file.endswith(".srt") and nospace_basename in file:
                result_srt = os.path.join(root, file)

    # Fallback nếu không có tên trùng, lấy file mp4 và srt duy nhất hoặc có size lớn nhất
    if not result_video or not result_srt:
        for root, dirs, files in os.walk(expected_output_dir):
            for file in files:
                if file.endswith(".mp4") and not result_video:
                    result_video = os.path.join(root, file)
                elif file.endswith(".srt") and not result_srt:
                    result_srt = os.path.join(root, file)

    if not result_srt:
        raise FileNotFoundError("Không tìm thấy file phụ đề SRT kết quả sau khi dịch.")
        
    # Với mode burn_subtitle, nếu không tìm thấy video có sub thì trả về video gốc để bypass crash
    if task_data.get('subtitleMode') == 'burn_subtitle' and not result_video:
        result_video = video_path

    print(f"[Translator] Thành phẩm: Video={result_video}, SRT={result_srt}")
    return result_video, result_srt
