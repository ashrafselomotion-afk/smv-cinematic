#!/usr/bin/env python3
"""Static server that gzips text assets, mirroring GitHub Pages, so local
Lighthouse numbers are representative. Test/measurement helper only."""
import gzip, io, os, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

GZIP_TYPES = ('text/', 'application/javascript', 'application/json',
              'image/svg+xml', 'application/manifest+json', 'application/xml')

class H(SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            for idx in ('index.html',):
                if os.path.exists(os.path.join(path, idx)):
                    self.path = self.path.rstrip('/') + '/' + idx
                    break
            else:
                return super().send_head()
            path = self.translate_path(self.path)
        if not os.path.exists(path):
            self.send_error(404); return None
        ctype = self.guess_type(path)
        accepts = 'gzip' in self.headers.get('Accept-Encoding', '')
        with open(path, 'rb') as f:
            body = f.read()
        if accepts and any(ctype.startswith(t) for t in GZIP_TYPES):
            buf = io.BytesIO()
            with gzip.GzipFile(fileobj=buf, mode='wb', compresslevel=6, mtime=0) as g:
                g.write(body)
            body = buf.getvalue()
            enc = True
        else:
            enc = False
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        if enc: self.send_header('Content-Encoding', 'gzip')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        return io.BytesIO(body)

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8743
    ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
