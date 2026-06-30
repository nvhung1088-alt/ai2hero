import re
import urllib.parse

html = open('douyin_debug.html', encoding='utf-8').read()
print("HTML length:", len(html))

# Tìm vị trí douyinvod trong HTML
idx = html.find('douyinvod')
print("douyinvod at index:", idx)
if idx >= 0:
    # In ra 500 ký tự xung quanh
    start = max(0, idx - 200)
    end = min(len(html), idx + 300)
    context = html[start:end]
    print("\n=== Context xung quanh douyinvod (500 chars) ===")
    print(repr(context))

# Tìm tất cả chỗ xuất hiện
all_idxs = [m.start() for m in re.finditer('douyinvod', html)]
print(f"\nTotal 'douyinvod' occurrences: {len(all_idxs)}")
for i in all_idxs[:3]:
    print(f"\n--- Occurrence at {i} ---")
    print(repr(html[max(0,i-100):i+200]))
