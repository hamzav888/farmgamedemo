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
        # never cache during development so edits show up on refresh
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        super().end_headers()
    def log_message(self, fmt, *args):
        pass  # keep the console quiet
    def do_POST(self):
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
