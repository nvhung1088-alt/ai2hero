@echo off
chcp 65001 >nul
title HERODUB WORKER (LOCAL ENGINE v24) - AI2HERO
color 0B

echo ================================================================================
echo   AI2HERO - HERODUB WORKER LOCAL ENGINE v24
echo ================================================================================
echo [*] Server: https://ai2hero-flax.vercel.app
echo [*] Thu muc: c:\Users\ADMIN\OneDrive\Desktop\Ai2Hero\herodub-worker
echo ================================================================================
echo.

cd /d "c:\Users\ADMIN\OneDrive\Desktop\Ai2Hero\herodub-worker"

python herodub_worker.py --server https://ai2hero-flax.vercel.app

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Worker da dung hoac gap su co.
    pause
)
