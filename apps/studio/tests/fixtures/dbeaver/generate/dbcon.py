#!/usr/bin/env python3
"""Send DBeaver connection specs (-con syntax) to a running DBeaver instance's REST server."""
import json, os, sys, urllib.request

# Workspace of the DBeaver instance started by start-dbeaver.sh
WS = os.environ.get('DBEAVER_WORKSPACE') or os.path.expanduser('~/.local/share/DBeaverData/workspace6')

def instance():
    props = {}
    with open(os.path.join(WS, '.metadata/dbeaver-instance.properties')) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'): continue
            k, v = line.split('=', 1)
            props[k] = v
    pid = sorted({k.split('.')[1] for k in props if k.startswith('instance.')})[0]
    return props[f'instance.{pid}.port'], props[f'instance.{pid}.password']

def call(mapping, body):
    port, password = instance()
    req = urllib.request.Request(f'http://127.0.0.1:{port}/{mapping}', data=json.dumps(body).encode(),
                                 headers={'Authorization': f'Bearer {password}', 'Content-Type': 'application/json'})
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with opener.open(req, timeout=60) as r:
        return r.status, r.read().decode()

if __name__ == '__main__':
    if sys.argv[1] == '--call':
        print(call(sys.argv[2], json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}))
    else:
        for spec in sys.argv[1:]:
            print(call('openConnection', {'spec': spec}))
