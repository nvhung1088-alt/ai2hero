@echo off
chcp 65001 >nul
title Hero Downloader Worker - AI2Hero
color 0A
echo ========================================================
echo        KHOI DONG HERO DOWNLOADER LOCAL WORKER
echo ========================================================
echo.
echo Dang khoi dong Worker...
python worker.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Worker da dung hoac gap su co.
    pause
)
