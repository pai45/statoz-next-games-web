"""Disable the Neo Geo eyecatcher in an authorized local cartridge copy.
Usage: python scripts/patch-retro-football-2-logo.py ORIGINAL.zip PATCHED.zip
The source is never modified; no game bytes are included in this script.
"""
import hashlib
import io
import sys
import zipfile
from pathlib import Path

SOURCE_SHA256 = "047e761b5dc408b835fb1fdbd811fe33874c7d52e898cf20925a4b4bdaba9cdc"
PATCHED_SHA256 = "c32bdba861532f8f5d4199a9b989b47c79f4929cc9a6984cc57e3a28b0d9a5b4"

def patch(source, destination):
    if source.resolve() == destination.resolve():
        raise ValueError("Use a separate destination to preserve the original")
    original = source.read_bytes()
    if hashlib.sha256(original).hexdigest() != SOURCE_SHA256:
        raise ValueError("Unrecognized source archive; refusing to patch")
    result = io.BytesIO()
    changed = False
    with zipfile.ZipFile(io.BytesIO(original)) as src, zipfile.ZipFile(result, "w") as dst:
        for info in src.infolist():
            data = src.read(info.filename)
            if info.filename == "061-p1.p1":
                data = bytearray(data)
                if data[0x115] != 0:
                    raise ValueError("Unexpected eyecatcher flag")
                # P-ROM word swapping maps CPU address 0x114 to file offset 0x115.
                # Header flag 2 tells the BIOS not to run the eyecatcher.
                data[0x115] = 2
                changed = True
            dst.writestr(info, data)
    if not changed or hashlib.sha256(result.getvalue()).hexdigest() != PATCHED_SHA256:
        raise ValueError("Patched archive did not match the reviewed identity")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(result.getvalue())
    print("Patched cartridge eyecatcher flag: 0 -> 2; BIOS bytes unchanged")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    patch(Path(sys.argv[1]), Path(sys.argv[2]))
