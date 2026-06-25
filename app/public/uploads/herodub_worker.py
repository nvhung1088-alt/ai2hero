import os
import sys
import time
import json
import platform
import socket
import requests
import subprocess
from datetime import datetime
from colorama import init, Fore, Style

init(autoreset=True)

# ---------------------------------------------------------
# TU DONG CAI DAT THU VIEN NEU THIEU
# ---------------------------------------------------------
try:
    import faster_whisper
    import googletrans
    import edge_tts
except ImportError:
    print(Fore.YELLOW + "[-] Dang cai dat cac thu vien con thieu (Whisper, GoogleTrans, Edge-TTS)...")
    subprocess.run([sys.executable, "-m", "pip", "install", "legacy-cgi", "faster-whisper", "googletrans==4.0.0-rc1", "edge-tts"], check=True)
    print(Fore.GREEN + "[-] Cai dat thanh cong. Vui long chay lai lenh khoi dong Worker!")
    sys.exit(0)

# ---------------------------------------------------------
# CAU HINH MVP WORKER
# ---------------------------------------------------------
API_BASE_URL = "https://www.ai2hero.com/api/hero-dub"
CONFIG_FILE = "config.json"
WORKSPACE_DIR = "workspace"

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
            continue
            
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
        
        # Demucs version 4 (htdemucs) sinh ra file theo ten file input
        # Neu input la audio.wav -> output la: <demucs_out>/htdemucs/audio/no_vocals.wav
        instrumental_path = os.path.join(demucs_out, "htdemucs", "audio", "no_vocals.wav")
        
        if os.path.exists(instrumental_path) and os.path.getsize(instrumental_path) > 100:
            print(Fore.GREEN + "    [✓] Nhac nen da duoc tach tu truoc.")
            return instrumental_path
            
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
        
        if result.returncode == 0 and os.path.exists(instrumental_path):
            print(Fore.GREEN + f"    [✓] Tach nhac nen (Vocal Isolation) thanh cong!")
            print(Fore.YELLOW + Style.BRIGHT + f"\n[!] THOI GIAN TACH NHAC NEN (DEMUCS): {duration:.2f} giay.\n")
            return instrumental_path
        else:
            print(Fore.RED + f"    [!] Loi demucs (Return code {result.returncode})")
    except FileNotFoundError:
        print(Fore.YELLOW + "    [!] Khong tim thay lenh 'demucs' trong he thong. Vui long cai dat bang 'pip install demucs'.")
    except Exception as e:
        print(Fore.RED + f"    [!] Gap loi khi chay demucs: {str(e)}")
        
    return None



def get_video_props(video_path):
    import subprocess, json
    cmd = ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate", "-of", "json", video_path]
    out = subprocess.check_output(cmd).decode('utf-8')
    data = json.loads(out)
    stream = data['streams'][0]
    return stream['width'], stream['height'], stream['r_frame_rate']

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
        "-c:v", "libx264", "-preset", "fast",
        "-c:a", "aac", "-ar", "48000",
        cache_filepath
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return cache_filepath

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
    if not os.path.exists(local_input):
        if source_url.startswith("http://") or source_url.startswith("https://"):
            print(Fore.CYAN + "[-] Dang tai video tu Mang ve may...")
            try:
                res = requests.get(source_url, stream=True)
                res.raise_for_status()
                with open(local_input, 'wb') as f:
                    for chunk in res.iter_content(chunk_size=8192):
                        f.write(chunk)
            except Exception as e:
                print(Fore.RED + f"[-] Loi: Khong the tai file tu {source_url}: {str(e)}")
                requests.patch(f"{API_BASE_URL}/tasks", json={"action": "update", "taskId": task_id, "status": "failed", "error": f"Loi Download: {str(e)}"}, headers=headers)
                return
        else:
            if not os.path.exists(source_url):
                print(Fore.RED + f"[-] Loi: Khong tim thay file {source_url} tren may tinh!")
                requests.patch(f"{API_BASE_URL}/tasks", json={"action": "update", "taskId": task_id, "status": "failed", "error": f"Khong tim thay file tren o cung: {source_url}"}, headers=headers)
                return
            shutil.copy2(source_url, local_input)

    # 1. TRANSCRIBING
    duration_sec = 0
    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        duration_sec = get_audio_duration(ffmpeg_exe, local_input)
    except Exception as e:
        print(Fore.YELLOW + f"[!] Khong the lay thoi luong video: {e}")

    print(Fore.CYAN + "[-] Dang nhan dang giong noi (Whisper AI) - Se mat vai phut tuy do dai video...")
    requests.patch(f"{API_BASE_URL}/tasks", json={"action": "update", "taskId": task_id, "status": "transcribing", "progress": 30, "durationSec": int(duration_sec)}, headers=headers)
    
    extracted_segments_file = os.path.join(workspace, "extracted_segments.json")
    
    try:
        import json
        if os.path.exists(extracted_segments_file):
            print(Fore.GREEN + "[-] Phat hien du lieu STT cu, bo qua STT va chay tiep...")
            with open(extracted_segments_file, "r", encoding="utf-8") as f:
                extracted_segments = json.load(f)
        else:
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

            from faster_whisper import WhisperModel
            model = WhisperModel("small", device="auto", compute_type="default")
            
            import time
            asr_start_time = time.time()
            
            segments, info = model.transcribe(audio_path, beam_size=5, vad_filter=True)
            
            extracted_segments = []
            for segment in segments:
                extracted_segments.append({
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text
                })
                print(Fore.WHITE + f"  [{format_timestamp(segment.start)} -> {format_timestamp(segment.end)}] {segment.text}")
                
            with open(extracted_segments_file, "w", encoding="utf-8") as f:
                json.dump(extracted_segments, f, ensure_ascii=False, indent=2)
                
            asr_end_time = time.time()
            asr_duration = asr_end_time - asr_start_time
            print(Fore.YELLOW + Style.BRIGHT + f"\n[!] THOI GIAN HOAN THANH NHAN DANG (STT): {asr_duration:.2f} giay.\n")
            
    except Exception as e:
         print(Fore.RED + f"[-] Loi Nhan dang (ASR): {str(e)}")
         requests.patch(f"{API_BASE_URL}/tasks", json={"action": "update", "taskId": task_id, "status": "failed", "error": f"Loi Whisper ASR: {str(e)}"}, headers=headers)
         return

    # 2. TRANSLATING
    print(Fore.CYAN + "[-] Dang dich phu de sang Tieng Viet...")
    requests.patch(f"{API_BASE_URL}/tasks", json={"action": "update", "taskId": task_id, "status": "translating", "progress": 60}, headers=headers)
    
    translated_segments_file = os.path.join(workspace, "translated_segments.json")
    
    translate_start_time = time.time()
    try:
        import json
        if os.path.exists(translated_segments_file):
            print(Fore.GREEN + "[-] Phat hien du lieu Dich thuat cu, bo qua Dich thuat va chay tiep...")
            with open(translated_segments_file, "r", encoding="utf-8") as f:
                translated_segments = json.load(f)
        else:
            translated_segments = []
        
        if task.get("translateEngine") == "connect-hub":
            print(Fore.CYAN + "  -> Su dung Connect Hub (Server-side LLM) de dich thuat (Batching 50 cau/lan)")
            BATCH_SIZE = 50
            for i in range(0, len(extracted_segments), BATCH_SIZE):
                batch_segs = extracted_segments[i:i+BATCH_SIZE]
                texts = [seg['text'] for seg in batch_segs]
                
                try:
                    payload = {"taskId": task_id, "texts": texts}
                    res = requests.post(f"{API_BASE_URL}/translate", json=payload, headers=headers, timeout=90)
                    if res.status_code == 200:
                        data = res.json()
                        if data.get("success") and data.get("translatedTexts"):
                            translated_array = data.get("translatedTexts")
                            from googletrans import Translator
                            translator = None
                            import re
                            
                            for j, seg in enumerate(batch_segs):
                                translated = translated_array[j] if j < len(translated_array) else seg['text']
                                
                                # Co che nhan dien loi (Self-Correction): Kiem tra neu LLM luoi bieng hoac tra ve tieng Trung
                                is_failed = False
                                if translated.strip() == seg['text'].strip():
                                    is_failed = True
                                else:
                                    ch_chars = len(re.findall(r'[\u4e00-\u9fff]', translated))
                                    if ch_chars > 2 or (ch_chars > 0 and ch_chars > len(translated) * 0.15):
                                        is_failed = True
                                
                                if is_failed:
                                    if translator is None:
                                        translator = Translator()
                                    try:
                                        fixed_translated = translator.translate(seg['text'], dest='vi').text
                                        print(Fore.YELLOW + f"  [Sua loi LLM bang Google] {seg['text']} -> {fixed_translated}")
                                        translated = fixed_translated
                                    except:
                                        print(Fore.WHITE + f"  [Connect Hub] {translated}")
                                else:
                                    print(Fore.WHITE + f"  [Connect Hub] {translated}")
                                    
                                translated_segments.append({
                                    "start": seg['start'],
                                    "end": seg['end'],
                                    "text": translated
                                })
                        else:
                            print(Fore.RED + f"  [Loi AI] {data.get('error')}")
                            # fallback Google Translate cho batch nay
                            print(Fore.YELLOW + "  [!] Fallback sang Google Translate cho batch bi loi...")
                            from googletrans import Translator
                            translator = Translator()
                            for seg in batch_segs:
                                translated = translator.translate(seg['text'], dest='vi').text
                                translated_segments.append({"start": seg['start'], "end": seg['end'], "text": translated})
                                print(Fore.WHITE + f"  [Google] {translated}")
                    else:
                        print(Fore.RED + f"  [Loi HTTP] {res.status_code}")
                        print(Fore.YELLOW + "  [!] Fallback sang Google Translate cho batch bi loi...")
                        from googletrans import Translator
                        import time
                        translator = Translator()
                        for seg in batch_segs:
                            translated = ""
                            for attempt in range(3):
                                try:
                                    translated = translator.translate(seg['text'], dest='vi').text
                                    break
                                except Exception as e:
                                    if attempt == 2: raise e
                                    time.sleep(2)
                                    translator = Translator()
                            translated_segments.append({"start": seg['start'], "end": seg['end'], "text": translated})
                            print(Fore.WHITE + f"  [Google] {translated}")
                except Exception as api_err:
                    print(Fore.RED + f"  [Loi Mang] {str(api_err)}")
                    print(Fore.YELLOW + "  [!] Fallback sang Google Translate cho batch bi loi...")
                    from googletrans import Translator
                    import time
                    translator = Translator()
                    for seg in batch_segs:
                        translated = ""
                        for attempt in range(3):
                            try:
                                translated = translator.translate(seg['text'], dest='vi').text
                                break
                            except Exception as e:
                                if attempt == 2: raise e
                                time.sleep(2)
                                translator = Translator()
                        translated_segments.append({"start": seg['start'], "end": seg['end'], "text": translated})
                        print(Fore.WHITE + f"  [Google] {translated}")
        else:
            print(Fore.CYAN + "  -> Su dung Google Translate (Mien phi)")
            from googletrans import Translator
            import time
            translator = Translator()
            
            for seg in extracted_segments:
                translated = ""
                for attempt in range(3):
                    try:
                        translated = translator.translate(seg['text'], dest='vi').text
                        break
                    except Exception as e:
                        if attempt == 2:
                            raise e
                        print(Fore.YELLOW + f"  [!] Google Translate Timeout. Dang thu lai sau 2s...")
                        time.sleep(2)
                        translator = Translator() # Reconnect
                
                translated_segments.append({
                    "start": seg['start'],
                    "end": seg['end'],
                    "text": translated
                })
                print(Fore.WHITE + f"  [Google] {translated}")

            with open(translated_segments_file, "w", encoding="utf-8") as f:
                json.dump(translated_segments, f, ensure_ascii=False, indent=2)

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
            
            tts_dir = os.path.join(workspace, "tts_segments")
            os.makedirs(tts_dir, exist_ok=True)
            
            print(Fore.CYAN + f"  -> Engine: {tts_engine} | Voice: {tts_voice} | Speed: {tts_speed}x ({rate_str})")
            
            total_segs = len(translated_segments)
            for i, seg in enumerate(translated_segments):
                output_file = os.path.join(tts_dir, f"seg_{i:04d}.mp3")
                
                # In tien do
                text_short = (seg['text'][:30] + '...') if len(seg['text']) > 30 else seg['text']
                print(Fore.WHITE + f"    [{i+1}/{total_segs}] TTS: {text_short}")
                
                # Chi sinh lai file neu chua co
                if not os.path.exists(output_file):
                    if tts_engine == "edge-tts":
                        import subprocess
                        import sys
                        
                        # Ghi text vao file de tranh loi Encoding Command Line tren Windows
                        tmp_txt = os.path.join(workspace, "tmp_tts.txt")
                        with open(tmp_txt, "w", encoding="utf-8") as f:
                            f.write(seg['text'])
                            
                        script = f"import edge_tts, asyncio\nwith open(r'{tmp_txt}', 'r', encoding='utf-8') as f:\n    text = f.read()\nasyncio.run(edge_tts.Communicate(text, '{tts_voice}', rate='{rate_str}').save(r'{output_file}'))"
                        cmd = [sys.executable, "-c", script]
                        
                        try:
                            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=45)
                        except subprocess.TimeoutExpired:
                            print(Fore.RED + f"  [!] Timeout khi sinh TTS cho segment {i}, bo qua.")
                    else:
                        # Goi Connect Hub qua Server API
                        try:
                            resp = requests.post(f"{API_BASE_URL}/tts",
                                json={"taskId": task_id, "text": seg['text'], "voice": tts_voice},
                                headers=headers, timeout=45)
                            if resp.status_code == 200:
                                with open(output_file, "wb") as f:
                                    f.write(resp.content)
                            else:
                                # Neu loi Connect Hub, fallback sang edge-tts giong Viet mac dinh
                                print(Fore.YELLOW + f"  [!] Connect Hub TTS loi (HTTP {resp.status_code}), fallback sang edge-tts...")
                                import subprocess
                                import sys
                                
                                tmp_txt = os.path.join(workspace, "tmp_tts.txt")
                                with open(tmp_txt, "w", encoding="utf-8") as f:
                                    f.write(seg['text'])
                                    
                                script = f"import edge_tts, asyncio\nwith open(r'{tmp_txt}', 'r', encoding='utf-8') as f:\n    text = f.read()\nasyncio.run(edge_tts.Communicate(text, 'vi-VN-HoaiMyNeural', rate='{rate_str}').save(r'{output_file}'))"
                                cmd = [sys.executable, "-c", script]
                                
                                try:
                                    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=45)
                                except subprocess.TimeoutExpired:
                                    pass
                        except Exception as req_err:
                            print(Fore.RED + f"  [!] Loi ket noi Connect Hub TTS: {str(req_err)}")
                            
                # Convert sang WAV 16000Hz mono ngay sau khi sinh va ap dung Speed Alignment (Giai doan 1)
                output_wav = os.path.join(tts_dir, f"seg_{i:04d}.wav")
                if os.path.exists(output_file) and os.path.getsize(output_file) > 100 and not os.path.exists(output_wav):
                    temp_wav_raw = os.path.join(tts_dir, f"seg_{i:04d}_temp_raw.wav")
                    temp_wav = os.path.join(tts_dir, f"seg_{i:04d}_temp.wav")
                    # 1. Convert MP3 sang WAV tho
                    subprocess.run([ffmpeg_exe, "-y", "-i", output_file, "-ar", "16000", "-ac", "1", temp_wav_raw], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                    
                    if os.path.exists(temp_wav_raw):
                        duration_before_trim = get_audio_duration(ffmpeg_exe, temp_wav_raw)
                        
                        # 2. Ap dung silence trimming (areverse doi de got ca dau va cuoi)
                        subprocess.run([
                            ffmpeg_exe, "-y", "-i", temp_wav_raw,
                            "-af", "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-40dB,areverse,silenceremove=start_periods=1:start_duration=0.02:start_threshold=-40dB,areverse",
                            "-ar", "16000", "-ac", "1", temp_wav
                        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                        
                        if os.path.exists(temp_wav):
                            duration_after_trim = get_audio_duration(ffmpeg_exe, temp_wav)
                            if abs(duration_before_trim - duration_after_trim) > 0.05:
                                print(Fore.GREEN + f"      [Trim] Giam {duration_before_trim:.2f}s -> {duration_after_trim:.2f}s (Got {duration_before_trim - duration_after_trim:.2f}s im lang)")
                                
                            duration_tts = duration_after_trim
                            duration_slot = seg['end'] - seg['start']
                            
                            if duration_slot > 0:
                                speed_ratio = duration_tts / duration_slot
                                
                                # Chi tang toc do neu giong doc bi cham hon slot qua nhieu (Ratio > 1.15)
                                # Khong lam cham giong doc lai neu cau dich ngan hon slot goc (giu nguyen toc do tu nhien 1.0)
                                if speed_ratio > 1.15:
                                    clamped_ratio = min(2.0, speed_ratio)
                                    print(Fore.YELLOW + f"      [Speed Alignment] Dieu chinh toc do: {duration_tts:.2f}s -> {duration_slot:.2f}s (Ratio: {clamped_ratio:.2f})")
                                    subprocess.run([
                                        ffmpeg_exe, "-y", "-i", temp_wav, 
                                        "-filter:a", f"atempo={clamped_ratio}", 
                                        "-ar", "16000", "-ac", "1", 
                                        output_wav
                                    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                                else:
                                    os.rename(temp_wav, output_wav)
                            else:
                                os.rename(temp_wav, output_wav)
                                
                        # Xoa file tam thoi
                        for path in [temp_wav_raw, temp_wav]:
                            if os.path.exists(path):
                                try:
                                    os.remove(path)
                                except:
                                    pass
            
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
    
    cwd = os.getcwd()
    try:
        import imageio_ffmpeg
        import ffmpeg
        os.environ["PATH"] += os.pathsep + os.path.dirname(imageio_ffmpeg.get_ffmpeg_exe())
 
        os.chdir(workspace)
        
        has_dubbed = dubbed_audio_path is not None and os.path.exists("dubbed_audio.wav")
        
        video = ffmpeg.input("input.mp4")
        video_sub = video.video.filter('subtitles', 'vi.srt', force_style="FontSize=20,PrimaryColour=&HFFFFFF,BackColour=&H00000000,BorderStyle=3,Outline=2,Shadow=0,MarginV=10")
        
        if branding_enabled and logo_url and os.path.exists(logo_url):
            print(Fore.CYAN + "  -> Dang ap dung Logo (Watermark)...")
            try:
                tw, th, tfps = get_video_props("input.mp4")
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

        
        if has_dubbed:
            print(Fore.CYAN + "  -> Dang render voi phu de va am thanh long tieng AI...")
            
            # Giai doan 2: Vocal Isolation (Su dung nhac nen goc)
            bg_audio_file = "audio.wav"
            bg_volume = db_bg_volume
            
            # Kiem tra xem co file nhac nen da duoc tach khong (no_vocals.wav)
            demucs_bg = os.path.join("demucs_out", "htdemucs", "audio", "no_vocals.wav")
            if os.path.exists(demucs_bg) and os.path.getsize(demucs_bg) > 0:
                bg_audio_file = demucs_bg
                print(Fore.GREEN + "  -> Su dung nhac nen da duoc tach giong noi (Demucs)!")
                
            if os.path.exists(bg_audio_file) and os.path.getsize(bg_audio_file) > 0:
                a_bg = ffmpeg.input(bg_audio_file).audio.filter('volume', bg_volume)
                a_fg = ffmpeg.input("dubbed_audio.wav").audio.filter('volume', db_tts_volume)
                mixed_audio = ffmpeg.filter([a_bg, a_fg], 'amix', inputs=2, duration='first').filter('volume', 2.0)
                stream = ffmpeg.output(video_sub, mixed_audio, "temp_output.mp4", vcodec="libx264", acodec="aac")
            else:
                audio_dub = ffmpeg.input("dubbed_audio.wav").audio
                stream = ffmpeg.output(video_sub, audio_dub, "temp_output.mp4", vcodec="libx264", acodec="aac")
        else:
            print(Fore.CYAN + "  -> Dang render phu de vao video (Giu nguyen am thanh goc)...")
            stream = ffmpeg.output(video_sub, video.audio, "temp_output.mp4", vcodec="libx264", acodec="aac")
            
        ffmpeg.run(stream, overwrite_output=True, quiet=True)
        
        # --- KET NOI INTRO / OUTRO ---
        final_output = "temp_output.mp4"
        if branding_enabled and ((intro_url and os.path.exists(intro_url)) or (outro_url and os.path.exists(outro_url))):
            print(Fore.CYAN + "  -> Dang gop Video Intro/Outro...")
            try:
                tw, th, tfps = get_video_props("temp_output.mp4")
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
                out_stream = ffmpeg.output(joined[0], joined[1], "output.mp4", vcodec="libx264", acodec="aac")
                ffmpeg.run(out_stream, overwrite_output=True, quiet=True)
                final_output = "output.mp4"
            except Exception as concat_err:
                print(Fore.RED + f"  [!] Loi khi gop Intro/Outro (bo qua): {str(concat_err)}")
                final_output = "temp_output.mp4"
        
        if final_output == "temp_output.mp4" and os.path.exists("temp_output.mp4"):
            import shutil
            shutil.move("temp_output.mp4", "output.mp4")

        
        burn_duration = time.time() - burn_start_time
        print(Fore.YELLOW + Style.BRIGHT + f"\n[!] THOI GIAN HOAN THANH RENDER VIDEO (BURNING): {burn_duration:.2f} giay.\n")
        
        os.chdir(cwd)
    except Exception as e:
         print(Fore.RED + f"[-] Loi FFMPEG Render Video: {str(e)}")
         requests.patch(f"{API_BASE_URL}/tasks", json={"action": "update", "taskId": task_id, "status": "failed", "error": f"Loi FFMPEG: {str(e)}"}, headers=headers)
         os.chdir(cwd)
         return

    # 4. COMPLETED 
    print(Fore.CYAN + "[-] Dang luu ket qua Local...")
    requests.patch(f"{API_BASE_URL}/tasks", json={"action": "update", "taskId": task_id, "status": "uploading", "progress": 100}, headers=headers)
    
    final_output_path = os.path.abspath(os.path.join(workspace, "output.mp4"))
    vi_srt_abs_path = os.path.abspath(os.path.join(workspace, "vi.srt"))
    
    # Copy to output folder if specified
    output_folder = task.get("outputFolder")
    if output_folder and os.path.isdir(output_folder):
        try:
            import time
            timestamp = int(time.time())
            base_name = f"dubbed_{task_id}_{timestamp}"
            
            dest_video = os.path.join(output_folder, f"{base_name}.mp4")
            dest_srt = os.path.join(output_folder, f"{base_name}.srt")
            
            shutil.copy2(final_output_path, dest_video)
            shutil.copy2(vi_srt_abs_path, dest_srt)
            
            final_output_path = dest_video
            vi_srt_abs_path = dest_srt
            print(Fore.CYAN + f"[-] Da luu ket qua vao: {output_folder}")
        except Exception as e:
            print(Fore.YELLOW + f"[!] Khong the luu vao thu muc dich {output_folder}: {e}")

    print(Fore.GREEN + Style.BRIGHT + f"[\u2713] HOAN THANH TASK #{task_id}!")
    
    requests.patch(f"{API_BASE_URL}/tasks", json={
        "action": "complete", 
        "taskId": task_id,
        "status": "completed",
        "resultVideoUrl": final_output_path,
        "resultSrtUrl": vi_srt_abs_path
    }, headers=headers)


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
            if full_path not in scan_cache:
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
                                scan_cache[nf] = True
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
        
        time.sleep(60) # Kiem tra moi 60 giay


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

            data = res.json()
            if data.get("success") and data.get("task"):
                task = data.get("task")
                process_task(token, task)
                print(Fore.GREEN + "\nWorker dang chay ngam, san sang nhan nhiem vu tiep theo...")
            else:
                time.sleep(4)
                
        except requests.exceptions.ConnectionError:
            print(Fore.YELLOW + "Khong the ket noi toi Server. Dang thu lai sau 10s...")
            time.sleep(10)
        except Exception as e:
            print(Fore.RED + f"Loi vong lap poll: {str(e)}")
            time.sleep(5)

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

def start_local_server():
    try:
        server = HTTPServer(('127.0.0.1', 3001), LocalWorkerHandler)
        server.serve_forever()
    except Exception as e:
        print(Fore.RED + f"Khong the khoi dong Local Server: {str(e)}")


if __name__ == "__main__":
    scan_thread_started = False
    server_thread_started = False
    
    while True:
        config = load_config()
        token = config.get("accessToken")
        
        if not token:
            token = pair_device()
            
        if token:
            GLOBAL_TOKEN = token
            if not scan_thread_started:
                # Khoi dong luong quet thu muc
                t = threading.Thread(target=poll_scan_folders_thread, args=(token,), daemon=True)
                t.start()
                scan_thread_started = True
                
            if not server_thread_started:
                # Khoi dong Local Server
                t_server = threading.Thread(target=start_local_server, daemon=True)
                t_server.start()
                server_thread_started = True
                
            # Neu token bi loi (401), poll_tasks tra ve False, vong lap se chay lai va hoi ma lien ket
            success = poll_tasks(token)
            if success is False:
                continue
