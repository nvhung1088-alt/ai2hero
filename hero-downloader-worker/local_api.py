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
    if not path or not os.path.exists(path):
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

def start_server():
    # Run quietly
    import logging
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    
    app.run(host='127.0.0.1', port=19998, debug=False, use_reloader=False)

if __name__ == '__main__':
    start_server()
