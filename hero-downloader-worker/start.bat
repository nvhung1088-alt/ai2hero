@echo off
title Hero Downloader Worker
echo ========================================================
echo        KHOI DONG HERO DOWNLOADER LOCAL WORKER
echo ========================================================
echo.
echo Dang cai dat thu vien neu thieu...
pip install -r requirements.txt
echo.
echo Dang khoi dong Worker...
python worker.py
pause
