#!/bin/bash
echo "=============================================="
echo "  HERODUB LOCAL WORKER INSTALLER (PHASE 1)"
echo "=============================================="

# Check for Python
if ! command -v python3 &> /dev/null
then
    echo "[ERROR] Khong tim thay Python3 tren he thong!"
    echo "Vui long cai dat Python 3.10 tro len."
    exit 1
fi

echo "[OK] Python3 da duoc cai dat."

# Setup Folder
WORKER_DIR="$HOME/HeroDubWorker"
mkdir -p "$WORKER_DIR"
cd "$WORKER_DIR" || exit

# Download worker script
echo "[INFO] Dang tai ma nguon Worker..."
curl -s -L -o worker.py "https://www.ai2hero.com/uploads/herodub_worker.py?v=6"

if [ ! -f worker.py ]; then
    echo "[ERROR] Khong the tai ma nguon tu Server."
    exit 1
fi

# Create Virtual Environment
if [ ! -d "venv" ]; then
    echo "[INFO] Dang tao moi truong Python ao (venv)..."
    python3 -m venv venv
fi

# Install Dependencies
echo "[INFO] Dang tai cac thu vien AI. Chu y: Thu vien tach nhac nen (PyTorch & Demucs) co the nang khoang 200-300MB, tien trinh tai se duoc hien thi ben duoi..."
source venv/bin/activate
pip install requests colorama faster-whisper ffmpeg-python imageio-ffmpeg edge-tts demucs soundfile

# Cai dat Rubberband neu co package manager (giup am thanh luyen giong khong bi giat cuc)
if command -v brew &> /dev/null; then
    echo "[INFO] Phat hien Homebrew. Dang cai dat rubberband de toi uu am thanh..."
    brew install rubberband
elif command -v apt-get &> /dev/null; then
    echo "[INFO] Phat hien apt. Dang cai dat rubberband-cli de toi uu am thanh..."
    sudo apt-get update -y && sudo apt-get install -y rubberband-cli
fi

# Run
echo "[INFO] Dang khoi dong HeroDub Worker (Phase 2)..."
python worker.py "$@"
