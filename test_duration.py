import imageio_ffmpeg, subprocess, re
ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
cmd = [ffmpeg_exe, '-i', r'C:\Users\ADMIN\OneDrive\Desktop\videotest\123.mp4']
res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8', errors='ignore')
output = res.stderr
match = re.search(r'Duration:\s*(\d+):(\d+):(\d+)\.(\d+)', output)
print(match.group(0)) if match else print('No match')
