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
            # Cung cấp tín hiệu lỗi (dùng URL 'ERROR')
            if video_id:
                extension_results[video_id] = "ERROR:" + str(data.get('error'))
            return jsonify({"success": True})
            
        return jsonify({"success": False, "error": "Missing videoId or mp4Url"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

def start_server():
    # Run quietly
    import logging
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    
    app.run(host='127.0.0.1', port=19998, debug=False, use_reloader=False)

if __name__ == '__main__':
    start_server()
