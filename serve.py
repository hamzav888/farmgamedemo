"""Tiny static server for Sunny Barn Farm.
Run:  python serve.py   ->  http://localhost:8080
"""
import http.server, os, sys, webbrowser

PORT = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 8080
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    timeout = 10  # drop idle keep-alive connections
    def end_headers(self):
        # never cache during development so edits show up on refresh.
        # Exception: Chrome refuses to install a service worker whose script was
        # served with "no-store", so sw.js gets the milder no-cache.
        if self.path.rsplit("?", 1)[0].endswith("sw.js"):
            self.send_header("Cache-Control", "no-cache")
        else:
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        super().end_headers()
    def log_message(self, fmt, *args):
        pass  # keep the console quiet
    def do_POST(self):
        # dev helper: POST /__save?name=icon-512.png with a data-URL body writes icons/<name>
        # (used by tools/make-icons.html so generated art lands straight in the repo)
        if self.path.startswith("/__save"):
            import base64, urllib.parse
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            raw = qs.get("name", [""])[0]
            name = os.path.basename(raw)
            if not name or not name.endswith(".png") or not all(c.isalnum() or c in "-_." for c in name):
                self.send_error(400); return
            n = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(n).decode("utf-8", "ignore")
            if "," in body: body = body.split(",", 1)[1]
            os.makedirs("icons", exist_ok=True)
            with open(os.path.join("icons", name), "wb") as f:
                f.write(base64.b64decode(body))
            self.send_response(200); self.send_header("Content-Length", "2"); self.end_headers(); self.wfile.write(b"ok")
            return
        # dev helper: POST /__wav?name=foo with raw WAV bytes saves .tmp/foo.wav (audio A/B renders)
        if self.path.startswith("/__wav"):
            import urllib.parse
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            name = "".join(ch for ch in qs.get("name", ["render"])[0] if ch.isalnum() or ch in "-_") or "render"
            n = int(self.headers.get("Content-Length", 0))
            os.makedirs(".tmp", exist_ok=True)
            with open(os.path.join(".tmp", name + ".wav"), "wb") as f:
                f.write(self.rfile.read(n))
            self.send_response(200); self.send_header("Content-Length", "2"); self.end_headers(); self.wfile.write(b"ok")
            return
        # dev helper: POST /__snap?name=foo with a data-URL body saves .tmp/foo.jpg (used for visual testing)
        if self.path.startswith("/__snap"):
            import base64, urllib.parse
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            name = "".join(ch for ch in qs.get("name", ["snap"])[0] if ch.isalnum() or ch in "-_") or "snap"
            n = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(n).decode("utf-8", "ignore")
            if "," in body: body = body.split(",", 1)[1]
            os.makedirs(".tmp", exist_ok=True)
            with open(os.path.join(".tmp", name + ".jpg"), "wb") as f:
                f.write(base64.b64decode(body))
            self.send_response(200); self.send_header("Content-Length", "2"); self.end_headers(); self.wfile.write(b"ok")
            return
        self.send_error(404)

class Server(http.server.ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True

if __name__ == "__main__":
    with Server(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}/"
        print(f"Sunny Barn Farm is running at {url}  (Ctrl+C to stop)", flush=True)
        if "--no-open" not in sys.argv:
            try: webbrowser.open(url)
            except Exception: pass
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
