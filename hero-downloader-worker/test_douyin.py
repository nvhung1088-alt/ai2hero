import sys
from downloader import download_video

def mock_callback(video_id, status, **kwargs):
    print(f"[Callback] ID: {video_id} | Status: {status} | Kwargs: {kwargs}")

video_mock = {
    "id": 9999,
    "videoUrl": "https://www.douyin.com/jingxuan?modal_id=7660496304543452416"
}

download_video(video_mock, mock_callback)
