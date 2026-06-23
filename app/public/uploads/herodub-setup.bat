@echo off
setlocal
echo ==============================================
echo   HERODUB LOCAL WORKER INSTALLER
echo ==============================================

:: Setup Folder
set WORKER_DIR=%USERPROFILE%\HeroDubWorker
if not exist "%WORKER_DIR%" mkdir "%WORKER_DIR%"
cd /d "%WORKER_DIR%"

:: Download worker exe from GitHub Releases
echo [INFO] Dang tai ung dung HeroDubWorker.exe...
curl -s -L -o HeroDubWorker.exe "https://github.com/nvhung1088-alt/ai2hero/releases/latest/download/HeroDubWorker.exe"

if not exist HeroDubWorker.exe (
    echo [ERROR] Khong the tai ung dung. Vui long kiem tra ket noi Internet.
    pause >nul
    exit /b 1
)

echo [OK] Tai xong! Dang khoi dong Worker...
echo ==============================================
start HeroDubWorker.exe
echo [OK] Ung dung da khoi dong. Ban co the dong cua so nay.
pause >nul
