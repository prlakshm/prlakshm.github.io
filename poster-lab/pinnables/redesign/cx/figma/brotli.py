# Minimal brotli shim for fontTools' WOFF2 reader: decompression via Node's zlib.
import subprocess
def decompress(data):
    r = subprocess.run(['node', '-e', "process.stdout.write(require('zlib').brotliDecompressSync(require('fs').readFileSync(0)))"],
                       input=data, capture_output=True, check=True)
    return r.stdout
def compress(*a, **k):
    raise NotImplementedError('shim is decompress-only')
