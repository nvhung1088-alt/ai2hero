import os
import json

# URL backend của AI2Hero (Mặc định dev local là http://localhost:3000)
SERVER_URL = "http://localhost:3000"

# Thư mục làm việc tạm thời để tải và xử lý video
TEMP_DIR = os.path.abspath("./temp")
OUTPUT_DIR = os.path.abspath("./output")

# File lưu session liên kết
SESSION_FILE = "session.json"

def get_session():
    if os.path.exists(SESSION_FILE):
        try:
            with open(SESSION_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return None
    return None

def save_session(session_data):
    with open(SESSION_FILE, 'w', encoding='utf-8') as f:
        json.dump(session_data, f, ensure_ascii=False, indent=2)

def clear_session():
    if os.path.exists(SESSION_FILE):
        try:
            os.remove(SESSION_FILE)
        except Exception:
            pass

# Tự động tìm thư mục pyVideoTrans ở thư mục cha nếu có
def detect_pyvideotrans_dir():
    possible_paths = [
        os.path.abspath("../pyvideotrans"),
        os.path.abspath("./pyvideotrans"),
        "C:/pyvideotrans",
        "D:/pyvideotrans"
    ]
    for path in possible_paths:
        if os.path.exists(path) and os.path.exists(os.path.join(path, "cli.py")):
            return path
    return ""

PYVIDEOTRANS_DIR = detect_pyvideotrans_dir()
