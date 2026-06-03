import sys, struct, zipfile, os

crx_path = sys.argv[1]
zip_path = sys.argv[2]
extract_dir = sys.argv[3]

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
