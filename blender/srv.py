# Serwer zadań na podzie RunPod: upload plików, uruchomienie komendy, log, pobieranie plików.
import http.server, os, subprocess
TOKEN = os.environ['JOB_TOKEN']; W = '/workspace/job'; os.makedirs(W, exist_ok=True)
class H(http.server.BaseHTTPRequestHandler):
    def ok(self):
        if self.headers.get('X-Token') != TOKEN:
            self.send_response(403); self.end_headers(); return False
        return True
    def reply(self, body, code=200, ctype='text/plain'):
        if isinstance(body, str): body = body.encode()
        self.send_response(code); self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_PUT(self):
        if not self.ok(): return
        rel = self.path.split('/up/', 1)[1].lstrip('/'); dst = os.path.normpath(os.path.join(W, rel))
        if not dst.startswith(W): return self.reply('bad path', 400)
        os.makedirs(os.path.dirname(dst), exist_ok=True); n = int(self.headers['Content-Length'])
        with open(dst, 'wb') as f:
            while n > 0:
                b = self.rfile.read(min(n, 1 << 20)); f.write(b); n -= len(b)
        self.reply('saved ' + rel)
    def do_POST(self):
        if not self.ok(): return
        cmd = self.rfile.read(int(self.headers['Content-Length'])).decode()
        subprocess.Popen(['bash', '-c', '(' + cmd + ') > run.log 2>&1; echo "JOB_EXIT $?" >> run.log'], cwd=W); self.reply('started')
    def do_GET(self):
        if self.path == '/health': return self.reply('ok')
        if not self.ok(): return
        if self.path.startswith('/status'):
            out = ''
            for f in ('/workspace/setup.log', W + '/run.log'):
                if os.path.exists(f): out += f'== {f}\n' + open(f, errors='replace').read()[-2500:] + '\n'
            return self.reply(out)
        if self.path.startswith('/get/'):
            p = os.path.normpath(os.path.join(W, self.path[5:]))
            if not p.startswith(W) or not os.path.isfile(p): return self.reply('nope', 404)
            self.send_response(200); self.send_header('Content-Length', str(os.path.getsize(p))); self.end_headers()
            with open(p, 'rb') as f:
                while True:
                    b = f.read(1 << 20)
                    if not b: break
                    self.wfile.write(b)
            return
        self.reply('?', 404)
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('0.0.0.0', 8000), H).serve_forever()
