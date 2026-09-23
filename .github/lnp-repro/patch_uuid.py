#!/usr/bin/env python3
"""Replace the LC_UUID of every slice in a Mach-O file with a deterministic UUIDv5.

Usage: patch_uuid.py <mach-o path> <seed>
"""
import struct
import sys
import uuid

LC_UUID = 0x1B

path, seed = sys.argv[1], sys.argv[2]
data = bytearray(open(path, 'rb').read())


def patch_slice(off):
    magic, cpu = struct.unpack_from('<Ii', data, off)
    if magic != 0xFEEDFACF:
        raise SystemExit(f'unsupported Mach-O magic {magic:#x} at {off}')
    ncmds = struct.unpack_from('<I', data, off + 16)[0]
    p = off + 32
    for _ in range(ncmds):
        cmd, size = struct.unpack_from('<II', data, p)
        if cmd == LC_UUID:
            old = uuid.UUID(bytes=bytes(data[p + 8:p + 24]))
            new = uuid.uuid5(uuid.NAMESPACE_URL, f'{seed}/{cpu:#x}')
            data[p + 8:p + 24] = new.bytes
            print(f'cpu {cpu:#x}: {old} -> {new}')
            return
        p += size
    raise SystemExit('no LC_UUID load command')


if struct.unpack_from('>I', data, 0)[0] == 0xCAFEBABE:
    for i in range(struct.unpack_from('>I', data, 4)[0]):
        patch_slice(struct.unpack_from('>iiIII', data, 8 + i * 20)[2])
else:
    patch_slice(0)

open(path, 'wb').write(data)
