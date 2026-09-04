from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import subprocess
import platform

app = Flask(__name__)
CORS(app)

@app.route('/open', methods=['GET'])
def open_path():
    path = request.args.get('path')
    if not path:
        return jsonify({"error": "Path not provided"}), 400
        
    if path == 'downloads' and not os.path.exists(path):
        os.makedirs(path, exist_ok=True)
        
    if not os.path.exists(path):
        return jsonify({"error": "Path not found"}), 404
        
    try:
        if platform.system() == 'Windows':
            # Use explorer /select, path to highlight the file, or just os.startfile to open it
            if os.path.isfile(path):
                # Highlight in explorer
                subprocess.Popen(['explorer.exe', '/select,', os.path.normpath(path)], shell=True)
            else:
                os.startfile(path)
        elif platform.system() == 'Darwin':
            subprocess.Popen(['open', '-R', path])
        else:
            subprocess.Popen(['xdg-open', os.path.dirname(path)])
            
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Bộ nhớ dùng chung giữa Local API và Worker (downloader.py)
extension_tasks = {}    # {video_id: url}
extension_results = {}  # {video_id: mp4_url}

@app.route('/extension/tasks', methods=['GET'])
def get_extension_tasks():
    # Trả về các task đang cần extension cào
    return jsonify({"success": True, "tasks": extension_tasks})

@app.route('/extension/submit', methods=['POST', 'OPTIONS'])
def submit_extension_task():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    try:
        data = request.json
        video_id = data.get('videoId')
        mp4_url = data.get('mp4Url')
        
        if video_id and mp4_url:
            video_id = int(video_id) if str(video_id).isdigit() else video_id
            extension_results[video_id] = mp4_url
            if video_id in extension_tasks:
                del extension_tasks[video_id]
            return jsonify({"success": True})
            
        if data.get('error'):
            video_id = int(video_id) if video_id and str(video_id).isdigit() else video_id
            print(f"\n[Extension Error] Video {video_id}: {data.get('error')}")
            if video_id:
                extension_results[video_id] = "ERROR:" + str(data.get('error'))
            return jsonify({"success": True})
            
        return jsonify({"success": False, "error": "Missing videoId or mp4Url"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/update_thumbnail', methods=['POST', 'OPTIONS'])
def update_thumbnail():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    try:
        data = request.json or {}
        local_path = data.get('localPath')
        thumbnail_data = data.get('thumbnailData')
        
        if not local_path or not thumbnail_data:
            return jsonify({"success": False, "error": "Thiếu localPath hoặc thumbnailData"}), 400
            
        base_no_ext = os.path.splitext(local_path)[0]
        thumb_path = base_no_ext + ".jpg"
        
        import base64
        from downloader import optimize_and_save_thumbnail
        
        if thumbnail_data.startswith("data:image/"):
            b64_str = thumbnail_data.split(",", 1)[1] if "," in thumbnail_data else thumbnail_data
            img_bytes = base64.b64decode(b64_str)
            ok = optimize_and_save_thumbnail(img_bytes, thumb_path)
            return jsonify({"success": ok, "thumbPath": thumb_path})
        elif thumbnail_data.startswith("http"):
            import requests
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.douyin.com/'
            }
            res = requests.get(thumbnail_data, headers=headers, timeout=15)
            if res.ok:
                ok = optimize_and_save_thumbnail(res.content, thumb_path)
                return jsonify({"success": ok, "thumbPath": thumb_path})
            return jsonify({"success": False, "error": f"HTTP {res.status_code}"}), 400
            
        return jsonify({"success": False, "error": "Định dạng thumbnail không hợp lệ"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/batch_update_thumbnails', methods=['POST', 'OPTIONS'])
def batch_update_thumbnails():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
        
    try:
        data = request.json or {}
        items = data.get('items', [])
        
        if not items:
            return jsonify({"success": False, "error": "Danh sách items rỗng"}), 400
            
        import base64
        from downloader import optimize_and_save_thumbnail
        
        success_count = 0
        for item in items:
            local_path = item.get('localPath')
            thumbnail_data = item.get('thumbnailData')
            if not local_path or not thumbnail_data:
                continue
                
            base_no_ext = os.path.splitext(local_path)[0]
            thumb_path = base_no_ext + ".jpg"
            
            if thumbnail_data.startswith("data:image/"):
                try:
                    b64_str = thumbnail_data.split(",", 1)[1] if "," in thumbnail_data else thumbnail_data
                    img_bytes = base64.b64decode(b64_str)
                    if optimize_and_save_thumbnail(img_bytes, thumb_path):
                        success_count += 1
                except Exception as e:
                    print(f"[!] Lỗi ghi đè ảnh {thumb_path}: {e}")
            elif thumbnail_data.startswith("http"):
                try:
                    import requests
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Referer': 'https://www.douyin.com/'
                    }
                    res = requests.get(thumbnail_data, headers=headers, timeout=10)
                    if res.ok and optimize_and_save_thumbnail(res.content, thumb_path):
                        success_count += 1
                except Exception:
                    pass
                    
        return jsonify({"success": True, "count": success_count, "total": len(items)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ============================================================
# COOKIE MANAGEMENT & AUTO SYNC ENDPOINTS
# ============================================================
latest_cookies = {}  # {domain: cookieData}
pending_cookie_requests = set()  # Các domain đang cần Extension cấp cứu cookie

@app.route('/cookies/request_refresh', methods=['POST', 'GET'])
def request_cookie_refresh():
    domain = request.args.get('domain') or (request.json or {}).get('domain', 'douyin.com')
    clean_domain = domain.lower().replace('https://', '').replace('http://', '').split('/')[0]
    if 'douyin' in clean_domain: clean_domain = 'douyin.com'
    elif 'bilibili' in clean_domain: clean_domain = 'bilibili.com'
    elif 'tiktok' in clean_domain: clean_domain = 'tiktok.com'
    elif 'youtube' in clean_domain: clean_domain = 'youtube.com'
    
    pending_cookie_requests.add(clean_domain)
    print(f"\n[🔄 Dispatcher] Worker yeu cau cap cuu Cookie moi cho domain: {clean_domain}")
    return jsonify({"success": True, "domain": clean_domain, "pending": list(pending_cookie_requests)})

@app.route('/cookies/poll_requests', methods=['GET', 'OPTIONS'])
def poll_cookie_requests():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    return jsonify({
        "success": True,
        "requests": list(pending_cookie_requests),
        "hasRequests": len(pending_cookie_requests) > 0
    })

@app.route('/cookies/submit', methods=['POST', 'OPTIONS'])
def submit_cookies():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        data = request.json or {}
        domain = data.get('domain', 'global').lower()
        cookie_data = data.get('cookieData', '')
        count = data.get('count', 0)

        if not cookie_data:
            return jsonify({"success": False, "error": "cookieData is empty"}), 400

        latest_cookies[domain] = cookie_data
        pending_cookie_requests.discard(domain)
        
        # Ghi đè vào file cookies.txt trong thư mục worker để yt-dlp dùng ngay
        base_dir = os.path.dirname(os.path.abspath(__file__))
        cookie_file_path = os.path.join(base_dir, "cookies.txt")
        
        # Hợp nhất tất cả cookie đang có
        combined_cookies = "\n\n".join(latest_cookies.values())
        with open(cookie_file_path, "w", encoding="utf-8") as f:
            if not combined_cookies.strip().startswith("# Netscape"):
                f.write("# Netscape HTTP Cookie File\n")
            f.write(combined_cookies)

        print(f"\n[🔄 Auto Cookie Sync] Đã nhận và nạp {count} cookies cho domain '{domain}' thành công!")
        return jsonify({"success": True, "domain": domain, "count": count, "savedPath": cookie_file_path})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/cookies/get', methods=['GET'])
def get_cookies():
    domain = request.args.get('domain', '').lower()
    if domain and domain in latest_cookies:
        return jsonify({"success": True, "cookieData": latest_cookies[domain]})
    
    # Trả về tất cả hợp nhất
    if latest_cookies:
        combined = "\n\n".join(latest_cookies.values())
        return jsonify({"success": True, "cookieData": combined})
        
    # Thử đọc từ file cookies.txt nếu có
    base_dir = os.path.dirname(os.path.abspath(__file__))
    cookie_file_path = os.path.join(base_dir, "cookies.txt")
    if os.path.exists(cookie_file_path):
        try:
            with open(cookie_file_path, "r", encoding="utf-8") as f:
                content = f.read()
            return jsonify({"success": True, "cookieData": content})
        except:
            pass
            
    return jsonify({"success": False, "cookieData": None})

def start_server():
    # Run quietly
    import logging
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    
    app.run(host='127.0.0.1', port=19998, debug=False, use_reloader=False)

if __name__ == '__main__':
    start_server()
