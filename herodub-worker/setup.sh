#!/bin/bash
echo "============================================================"
echo "           HERODUB WORKER AUTOMATIC SETUP SYSTEM"
echo "============================================================"
echo

# 1. Kiểm tra Python
if ! command -v python3 &> /dev/null
then
    echo "[-] Khong tim thay Python3. Vui long cai dat Python truoc qua Homebrew hoac tai tren trang chu."
    exit 1
fi
echo "[+] Python da san sang."

# 2. Kiểm tra và tải pyVideoTrans
if [ ! -f "../pyvideotrans/cli.py" ]; then
    echo "[*] Dang tai pyVideoTrans..."
    curl -L https://github.com/jianchang512/pyvideotrans/archive/refs/heads/main.zip -o pyvideotrans.zip
    unzip pyvideotrans.zip -d ..
    mv ../pyvideotrans-main ../pyvideotrans
    rm pyvideotrans.zip
    echo "[+] Tai pyVideoTrans thanh cong."
fi

# 3. Cài đặt các thư viện Python
echo "[*] Dang cai dat dependencies..."
pip3 install -r requirements.txt

# 4. Chạy worker
echo "[+] Cai dat hoan tat! Chay worker..."
python3 worker.py
