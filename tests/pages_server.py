"""Tiny GitHub-Pages-like static server for tests and local preview.

Serves a built site directory under a base path (default /Rice-Research-Datasets/), returns
index.html for directories and the site's 404.html (status 404) for missing files — the same
behaviour GitHub Pages has for a project site.

    python tests/pages_server.py _site            # http://127.0.0.1:8000/Rice-Research-Datasets/
"""
import functools
import http.server
import os
import pathlib
import posixpath
import sys
import threading
import urllib.parse

DEFAULT_BASE = "/Rice-Research-Datasets/"


class PagesHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, site=None, base=DEFAULT_BASE, **kw):
        self.site, self.base = pathlib.Path(site).resolve(), base
        super().__init__(*a, directory=str(self.site), **kw)

    def log_message(self, *a):  # quiet
        pass

    def _resolve(self):
        path = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
        if path == self.base.rstrip("/"):
            return "redirect", None
        if not path.startswith(self.base):
            return None, None
        rel = posixpath.normpath(path[len(self.base):]).lstrip("/")
        if rel.startswith(".."):
            return None, None
        f = (self.site / rel) if rel not in ("", ".") else self.site
        if f.is_dir():
            f = f / "index.html"
        return ("ok", f) if f.is_file() else (None, None)

    def _send(self, head_only):
        state, f = self._resolve()
        if state == "redirect":
            self.send_response(301)
            self.send_header("Location", self.base)
            self.end_headers()
            return
        if state != "ok":
            body = (self.site / "404.html").read_bytes() if (self.site / "404.html").exists() else b"404"
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if not head_only:
                self.wfile.write(body)
            return
        ctype = self.guess_type(str(f))
        if ctype.startswith("text/") or ctype in ("application/json", "application/javascript"):
            ctype += "; charset=utf-8"
        data = f.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        if not head_only:
            self.wfile.write(data)

    def do_GET(self):
        self._send(False)

    def do_HEAD(self):
        self._send(True)


def start(site, base=DEFAULT_BASE, port=0):
    handler = functools.partial(PagesHandler, site=site, base=base)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}{base}"


if __name__ == "__main__":
    site = sys.argv[1] if len(sys.argv) > 1 else "_site"
    base = os.environ.get("MRRI_BASE_PATH", DEFAULT_BASE)
    srv, url = start(site, base, int(os.environ.get("PORT", "8000")))
    print("serving", pathlib.Path(site).resolve(), "at", url, "(Ctrl+C to stop)")
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        srv.shutdown()
