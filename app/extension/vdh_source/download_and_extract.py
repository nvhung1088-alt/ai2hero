import urllib.request
import sys, struct, zipfile, os

url = "https://clients2.google.com/service/update2/crx?response=redirect&prodversion=114.0.0.0&acceptformat=crx2,crx3&x=id%3Dlmjnegcaeklhafolokijcfjliaokphfk%26uc"
crx_path = sys.argv[1]
zip_path = sys.argv[2]
extract_dir = sys.argv[3]

print("Downloading CRX...")
urllib.request.urlretrieve(url, crx_path)
print("Downloaded. Extracting...")

with open(crx_path, 'rb') as f:
    magic = f.read(4)
    if magic != b'Cr24':
        print("Not a CRX file")
        sys.exit(1)
    version = struct.unpack('<I', f.read(4))[0]
    if version == 2:
        pub_key_len = struct.unpack('<I', f.read(4))[0]
        sig_len = struct.unpack('<I', f.read(4))[0]
        f.seek(16 + pub_key_len + sig_len)
    elif version == 3:
        header_size = struct.unpack('<I', f.read(4))[0]
        f.seek(12 + header_size)
    else:
        print("Unknown CRX version")
        sys.exit(1)
    
    with open(zip_path, 'wb') as out:
        out.write(f.read())

os.makedirs(extract_dir, exist_ok=True)
with zipfile.ZipFile(zip_path, 'r') as z:
    z.extractall(extract_dir)
print("Extraction complete")
