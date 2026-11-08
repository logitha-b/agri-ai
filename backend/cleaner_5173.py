import http.server
import socketserver

HTML = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Resetting & Redirecting...</title>
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        for (let r of regs) {
          r.unregister();
        }
      });
    }
    if ('caches' in window) {
      caches.keys().then(function(keys) {
        for (let k of keys) caches.delete(k);
      });
    }
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace("http://localhost:5174");
  </script>
</head>
<body style="font-family:sans-serif;text-align:center;padding:40px;color:#2e7d32;">
  <h2>Clearing previous project cache...</h2>
  <p>Redirecting to Agri-Economic Intelligence at <a href="http://localhost:5174">http://localhost:5174</a></p>
  <script>
    setTimeout(function() {
      window.location.replace("http://localhost:5174");
    }, 100);
  </script>
</body>
</html>
"""

class ClearDataHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Clear-Site-Data", '"cache", "cookies", "storage", "executionContexts"')
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.end_headers()
        self.wfile.write(HTML.encode("utf-8"))

    def log_message(self, format, *args):
        pass

if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", 5173), ClearDataHandler) as httpd:
        httpd.serve_forever()
