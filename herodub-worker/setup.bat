@echo off
title HeroDub Worker Auto Setup
echo ============================================================
echo            HERODUB WORKER AUTOMATIC SETUP SYSTEM
echo ============================================================
echo.

:: 1. Kiểm tra Python
echo [*] Dang kiem tra Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [-] Khong tim thay Python tren he thong.
    echo [*] Dang tu dong tai va cai dat Python 3.10...
    powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.10.11/python-3.10.11-amd64.exe' -OutFile 'python_installer.exe'"
    echo [*] Vui lau cho cai dat Python (Se hien cua so cai dat)...
    python_installer.exe /quiet InstallAllUsers=1 PrependPath=1
    del python_installer.exe
    echo [+] Da cai dat Python! Vui long khoi dong lai file setup.bat nay.
    pause
    exit
)
echo [+] Python da duoc cai dat!

:: 2. Kiểm tra và tải pyVideoTrans nếu chưa có
if not exist "..\pyvideotrans\cli.py" (
    echo [*] Khong tim thay pyVideoTrans o thu muc cha.
    echo [*] Dang tu dong tai pyVideoTrans (ban rut gon nhe)...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/jianchang512/pyvideotrans/archive/refs/heads/main.zip' -OutFile 'pyvideotrans.zip'"
    echo [*] Dang giai nen pyVideoTrans...
    powershell -Command "Expand-Archive -Path 'pyvideotrans.zip' -DestinationPath '..'"
    ren "..\pyvideotrans-main" "pyvideotrans"
    del pyvideotrans.zip
    echo [+] Tai pyVideoTrans thanh cong!
) else (
    echo [+] Da tim thay pyVideoTrans!
)

:: 3. Cài đặt các thư viện Python
echo [*] Dang cai dat cac thu vien phu thuoc...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [-] Gap loi khi pip install. Dang thu lai voi mirror nhanh...
    pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
)

:: 4. Chạy worker
echo.
echo ============================================================
echo   CAI DAT HOAN THANH! DANG KHOI CHAY HERODUB WORKER...
echo ============================================================
echo.
python worker.py
pause
