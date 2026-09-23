"""DBeaver credentials-config.json codec: AES-128-CBC/PKCS5, static key, 16-byte IV prefix (via openssl CLI)."""
import json, os, subprocess

KEY = 'babb4a9f774ab853c96c2d653dfe544a'

def decrypt(path):
    raw = open(path, 'rb').read()
    iv, body = raw[:16], raw[16:]
    out = subprocess.run(['openssl', 'aes-128-cbc', '-d', '-K', KEY, '-iv', iv.hex()], input=body,
                         capture_output=True, check=True).stdout
    return json.loads(out)

def encrypt(path, obj):
    iv = os.urandom(16)
    data = json.dumps(obj, separators=(',', ':')).encode()
    out = subprocess.run(['openssl', 'aes-128-cbc', '-e', '-K', KEY, '-iv', iv.hex()], input=data,
                         capture_output=True, check=True).stdout
    open(path, 'wb').write(iv + out)
