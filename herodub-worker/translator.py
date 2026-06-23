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
        "--voice_role", "No", # TẮT DUBBING (Phase 1)
        "--recogn_type", asr_type,
        "--translate_type", trans_type,
        "--subtitle_type", sub_type,
        "--model_name", "small", # Dùng model small cho nhanh và nhẹ local
    ]

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

    # Theo dõi log đầu ra để update progress thô
    # Vì pyVideoTrans in log dạng text tiếng Trung/Anh, ta có thể parse cơ bản
    current_status = 'transcribing'
    progress_callback(current_status, 30)

    while True:
        line = process.stdout.readline()
        if not line and process.poll() is not None:
            break
            
        if line:
            line_str = line.strip()
            print(f"[pyVideoTrans Console] {line_str}")
            
            # Phân tích một số trạng thái log mẫu để báo cáo tiến trình lên UI web
            if "Speech Transcription" in line_str or "语音转录" in line_str:
                current_status = 'transcribing'
                progress_callback(current_status, 40)
            elif "Subtitle Translation" in line_str or "字幕翻译" in line_str:
                current_status = 'translating'
                progress_callback(current_status, 65)
            elif "novoice.mp4" in line_str:
                current_status = 'burning'
                progress_callback(current_status, 80)
                
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
