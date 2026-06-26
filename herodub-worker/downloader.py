import os
import yt_dlp

def download_video(url, output_dir):
    """
    Tải video từ URL (Douyin, Bilibili, YouTube) về output_dir.
    Trả về đường dẫn file mp4 tải về và tiêu đề video.
    """
    # Phát hiện đường dẫn tệp tin cục bộ trên Windows hoặc Unix
    is_local = os.path.exists(url) or (len(url) > 2 and url[1] == ':') or url.startswith('/')
    if is_local:
        if not os.path.exists(url):
            raise FileNotFoundError(f"Không tìm thấy file local: {url}")
        title = os.path.splitext(os.path.basename(url))[0]
        print(f"[Downloader] File local, bỏ qua tải: {url}")
        return url, title

    os.makedirs(output_dir, exist_ok=True)
    
    # Cấu hình yt-dlp tải chất lượng tốt nhất có định dạng mp4/m4a, lưu tên theo id video
    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': os.path.join(output_dir, '%(id)s.%(ext)s'),
        'quiet': True,
        'no_warnings': True,
    }
    
    print(f"[Downloader] Đang kết nối tải video từ: {url}")
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        video_id = info.get('id')
        title = info.get('title', 'Untitled Video')
        ext = info.get('ext', 'mp4')
        
        # Đường dẫn file đã tải
        video_path = os.path.join(output_dir, f"{video_id}.{ext}")
        
        # Nếu download dạng khác, ta rename hoặc convert
        if not os.path.exists(video_path):
            # Fallback tìm file nào có đuôi video trong thư mục có prefix video_id
            for f in os.listdir(output_dir):
                if f.startswith(video_id):
                    video_path = os.path.join(output_dir, f)
                    break
                    
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Không thể tìm thấy video tải về của ID: {video_id}")
            
        print(f"[Downloader] Tải thành công: '{title}' -> {video_path}")
        return video_path, title
