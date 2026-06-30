import re
import urllib.parse
import json

html = open('douyin_debug.html', encoding='utf-8').read()

# Pattern tìm chuỗi decodeURIComponent của RENDER_DATA
match = re.search(r'window\[[\'"]RENDER_DATA[\'"]\]\s*=\s*decodeURIComponent\(([\'"])(.*?)\1\)', html)
if match:
    encoded_data = match.group(2)
    decoded_data = urllib.parse.unquote(encoded_data)
    print("Decoded length:", len(decoded_data))
    
    # Decoded data is JSON
    try:
        data = json.loads(decoded_data)
        print("Keys at root:", list(data.keys()))
        
        # Traverse JSON recursively to find URLs
        def find_urls(obj):
            urls = set()
            if isinstance(obj, dict):
                for k, v in obj.items():
                    if k in ['url_list', 'play_addr', 'play_addr_265']:
                        urls.update(find_urls(v))
                    elif isinstance(v, str) and v.startswith('http') and ('.mp4' in v or 'douyinvod' in v):
                        urls.add(v)
                    else:
                        urls.update(find_urls(v))
            elif isinstance(obj, list):
                for item in obj:
                    urls.update(find_urls(item))
            elif isinstance(obj, str) and obj.startswith('http') and ('.mp4' in obj or 'douyinvod' in obj):
                urls.add(obj)
            return urls
            
        found = find_urls(data)
        print("Found media URLs in RENDER_DATA:", len(found))
        for u in found:
            print(" -", u[:150])
            
    except Exception as e:
        print("Error parsing decoded JSON:", e)
else:
    print("RENDER_DATA decodeURIComponent not found")
