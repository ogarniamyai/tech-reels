#!/usr/bin/env python3
"""Sterowanie podem RunPod z Blenderem. Klucz: env RUNPOD_API_KEY.
  rp.py create [GPU]        tworzy poda (domyślnie RTX 4090), zapisuje .pod.json w bieżącym katalogu
  rp.py wait                czeka na serwer i instalację Blendera (SETUP_READY)
  rp.py up PLIK [CEL]       wysyła plik do /workspace/job/CEL
  rp.py run 'KOMENDA'       uruchamia komendę w /workspace/job (log: run.log, na końcu JOB_EXIT)
  rp.py status              ostatnie linie logów
  rp.py waitjob [SEK]       czeka na JOB_EXIT w run.log
  rp.py get ZDALNY LOKALNY  pobiera plik
  rp.py delete              usuwa poda i sprawdza, ile podów zostało
  rp.py list                lista podów na koncie
"""
import json, os, sys, time, secrets, base64, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); STATE = os.path.join(os.getcwd(), '.pod.json')
API = 'https://rest.runpod.io/v1'; KEY = os.environ.get('RUNPOD_API_KEY', '')
BLENDER = os.environ.get('BLENDER_URL', 'https://download.blender.org/release/Blender5.2/blender-5.2.3-linux-x64.tar.xz')

def api(method, path, body=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json', 'User-Agent': 'reelpipe/1.0'})
    with urllib.request.urlopen(req, timeout=60) as r:
        t = r.read().decode(); return json.loads(t) if t.strip() else {}

def st(): return json.load(open(STATE))

def pod(method, path, data=None, headers=None, timeout=600):
    s = st(); h = {'X-Token': s['token'], 'User-Agent': 'reelpipe/1.0'}; h.update(headers or {})
    req = urllib.request.Request(f"https://{s['id']}-8000.proxy.runpod.net{path}", method=method, data=data, headers=h)
    return urllib.request.urlopen(req, timeout=timeout)

def create(gpu='NVIDIA GeForce RTX 4090'):
    tok = secrets.token_hex(16)
    script = ('mkdir -p /workspace/job; echo "$SRV_B64" | base64 -d > /srv.py\n'
              '( set -x; apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq libxrender1 libxi6 libxkbcommon0 libsm6 libgl1 libxxf86vm1 libxfixes3 libegl1 xz-utils wget ffmpeg >/dev/null '
              f'&& cd /opt && wget -q {BLENDER} -O b.tar.xz && tar xf b.tar.xz && rm b.tar.xz && ln -sf /opt/blender-*/blender /usr/local/bin/blender '
              '&& blender --version | head -1 && nvidia-smi --query-gpu=name,memory.total --format=csv && echo SETUP_READY ) > /workspace/setup.log 2>&1 &\n'
              'exec python3 /srv.py\n')
    body = {'name': 'blender-reel', 'cloudType': 'SECURE', 'gpuTypeIds': [gpu], 'gpuCount': 1,
            'imageName': 'runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04', 'containerDiskInGb': 30, 'volumeInGb': 0,
            'ports': ['8000/http'], 'dockerEntrypoint': ['bash', '-c'], 'dockerStartCmd': [script],
            'env': {'JOB_TOKEN': tok, 'NVIDIA_DRIVER_CAPABILITIES': 'all',
                    'SRV_B64': base64.b64encode(open(os.path.join(HERE, 'srv.py'), 'rb').read()).decode()}}
    r = api('POST', '/pods', body)
    json.dump({'id': r['id'], 'token': tok, 'created': time.time(), 'cost': r.get('costPerHr')}, open(STATE, 'w'))
    print('POD', r['id'], 'costPerHr', r.get('costPerHr'))

def wait():
    t0 = time.time()
    while time.time() - t0 < 1200:
        try:
            s = pod('GET', '/status', timeout=20).read().decode()
            if 'SETUP_READY' in s: print(s[-600:]); print('READY after', int(time.time() - t0), 's'); return
        except Exception as e: s = str(e)
        time.sleep(10)
    sys.exit('timeout')

def up(src, dst=None):
    data = open(src, 'rb').read(); print(pod('PUT', '/up/' + (dst or os.path.basename(src)), data, {'Content-Length': str(len(data))}).read().decode())

def waitjob(every=30):
    while True:
        s = pod('GET', '/status', timeout=30).read().decode().split('/run.log\n')[-1]
        last = [l for l in s.splitlines() if l.strip()][-1:]
        print(time.strftime('%H:%M:%S'), last[0][:160] if last else '', flush=True)
        if 'JOB_EXIT' in s: print(s[-1500:]); return
        time.sleep(int(every))

def get(remote, local):
    with pod('GET', '/get/' + remote, timeout=1800) as r, open(local, 'wb') as f:
        while True:
            b = r.read(1 << 20)
            if not b: break
            f.write(b)
    print('got', local, os.path.getsize(local))

def delete():
    s = st(); api('DELETE', '/pods/' + s['id']); time.sleep(3)
    left = api('GET', '/pods'); print('deleted', s['id'], '| pods left:', len(left), '| hours', round((time.time() - s['created']) / 3600, 2))

if __name__ == '__main__':
    c, a = sys.argv[1], sys.argv[2:]
    {'create': create, 'wait': wait, 'up': up, 'run': lambda cmd: print(pod('POST', '/run', cmd.encode()).read().decode()),
     'status': lambda: print(pod('GET', '/status').read().decode()), 'waitjob': waitjob, 'get': get, 'delete': delete,
     'list': lambda: print(json.dumps(api('GET', '/pods'), indent=1)[:2000])}[c](*a)
