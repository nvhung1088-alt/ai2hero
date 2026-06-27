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
    import edge_tts
except ImportError:
    print(Fore.YELLOW + "[-] Dang cai dat cac thu vien con thieu (Whisper, Edge-TTS)...")
    subprocess.run([sys.executable, "-m", "pip", "install", "legacy-cgi", "faster-whisper", "edge-tts"], check=True)
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

def google_translate(text, dest='vi'):
    try:
        url = "https://translate.googleapis.com/translate_a/single"
        params = {
            "client": "gtx",
            "sl": "auto",
            "tl": dest,
            "dt": "t",
            "q": text
        }
        r = requests.get(url, params=params, timeout=15)
        if r.status_code == 200:
            data = r.json()
            res = ""
            for item in data[0]:
                if item[0]:
                    res += item[0]
            return res.strip()
    except Exception as e:
        print(f"    [!] Loi goi Google Translate API qua HTTP requests: {str(e)}")
    return text

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
    extracted_segments_file = os.path.join(workspace, f"extracted_segments_{safe_engine}_{source_lang}.json")
    
    try:
        import json
        stt_was_run = False
        if os.path.exists(extracted_segments_file):
            print(Fore.GREEN + "[-] Phat hien du lieu STT cu, bo qua STT va chay tiep...")
            with open(extracted_segments_file, "r", encoding="utf-8") as f:
                extracted_segments = json.load(f)
        else:
            stt_was_run = True
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
            
            transcribe_kwargs = {
                "beam_size": beam_size,
                "vad_filter": True,
                "condition_on_previous_text": profile["condition_on_previous_text"]
            }
            if vad_params:
                transcribe_kwargs["vad_parameters"] = vad_params

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
            
    except Exception as e:
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
            print(Fore.GREEN + "[-] Phat hien du lieu Dich thuat cu, bo qua Dich thuat va chay tiep...")
            with open(translated_segments_file, "r", encoding="utf-8") as f:
                translated_segments = json.load(f)
        else:
            translated_segments = []
        
        if len(translated_segments) > 0:
            pass # Da co cache, khong can dich nua
        elif task.get("translateEngine") == "connect-hub":
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
                                    try:
                                        fixed_translated = google_translate(seg['text'], dest='vi')
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
                            for seg in batch_segs:
                                translated = google_translate(seg['text'], dest='vi')
                                translated_segments.append({"start": seg['start'], "end": seg['end'], "text": translated})
                                print(Fore.WHITE + f"  [Google] {translated}")
                    else:
                        print(Fore.RED + f"  [Loi HTTP] {res.status_code}")
                        print(Fore.YELLOW + "  [!] Fallback sang Google Translate cho batch bi loi...")
                        for seg in batch_segs:
                            translated = ""
                            for attempt in range(3):
                                try:
                                    translated = google_translate(seg['text'], dest='vi')
                                    break
                                except Exception as e:
                                    if attempt == 2: raise e
                                    time.sleep(2)
                            translated_segments.append({"start": seg['start'], "end": seg['end'], "text": translated})
                            print(Fore.WHITE + f"  [Google] {translated}")
                except Exception as api_err:
                    print(Fore.RED + f"  [Loi Mang] {str(api_err)}")
                    print(Fore.YELLOW + "  [!] Fallback sang Google Translate cho batch bi loi...")
                    for seg in batch_segs:
                        translated = ""
                        for attempt in range(3):
                            try:
                                translated = google_translate(seg['text'], dest='vi')
                                break
                            except Exception as e:
                                if attempt == 2: raise e
                                time.sleep(2)
                        translated_segments.append({"start": seg['start'], "end": seg['end'], "text": translated})
                        print(Fore.WHITE + f"  [Google] {translated}")
        else:
            print(Fore.CYAN + "  -> Su dung Google Translate (Mien phi)")
            
            for seg in extracted_segments:
                translated = ""
                for attempt in range(3):
                    try:
                        translated = google_translate(seg['text'], dest='vi')
                        break
                    except Exception as e:
                        if attempt == 2:
                            raise e
                        print(Fore.YELLOW + f"  [!] Google Translate Timeout. Dang thu lai sau 2s...")
                        time.sleep(2)
                
                translated_segments.append({
                    "start": seg['start'],
                    "end": seg['end'],
                    "text": translated
                })
                print(Fore.WHITE + f"  [Google] {translated}")

        if len(translated_segments) > 0 and not os.path.exists(translated_segments_file):
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
                        try:
                            with open(tmp_txt, "w", encoding="utf-8") as f:
                                f.write(seg['text'])
                            script = f"import edge_tts, asyncio\\nwith open(r'{tmp_txt}', 'r', encoding='utf-8') as f:\\n    text = f.read()\\nasyncio.run(edge_tts.Communicate(text, '{tts_voice}', rate='{rate_str}').save(r'{output_file}'))"
                            cmd = [sys.executable, "-c", script]
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
