@echo off
setlocal EnableDelayedExpansion
echo ==============================================
echo   HERODUB LOCAL WORKER INSTALLER
echo   Version: 1.1 (Python-based)
echo ==============================================

:: Setup Folder
set WORKER_DIR=%USERPROFILE%\HeroDubWorker
if not exist "%WORKER_DIR%" mkdir "%WORKER_DIR%"
cd /d "%WORKER_DIR%"

:: Kiem tra Python
echo [INFO] Kiem tra Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python chua duoc cai dat!
    echo [INFO]  Vui long tai Python tai: https://www.python.org/downloads/
    echo [INFO]  Nho tich chon "Add Python to PATH" khi cai dat.
    start https://www.python.org/downloads/
    pause >nul
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo [OK] Phat hien: %%v

:: Tai Worker Script moi nhat
echo [INFO] Dang tai herodub_worker.py tu ai2hero.com...
curl -s -L -o herodub_worker.py "https://www.ai2hero.com/uploads/herodub_worker.py?v=5"

if not exist herodub_worker.py (
    echo [ERROR] Khong the tai script. Kiem tra ket noi Internet.
    pause >nul
    exit /b 1
)
echo [OK] Tai script thanh cong!

:: Cai dat thu vien Python can thiet
echo [INFO] Kiem tra va cai dat thu vien...
pip install -q requests colorama

:: Khoi dong Worker
echo ==============================================
echo [OK] Dang khoi dong HeroDub Worker...
echo [!]  Vui long de cua so nay mo de Worker hoat dong.
echo ==============================================
python herodub_worker.py
