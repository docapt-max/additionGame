import http.server
import socketserver
import threading
import webbrowser


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def main():
    socketserver.TCPServer.allow_reuse_address = True
    try:
        server = socketserver.TCPServer(("127.0.0.1", 8765), QuietHandler)
    except OSError:
        server = socketserver.TCPServer(("127.0.0.1", 0), QuietHandler)

    port = server.server_address[1]
    url = f"http://127.0.0.1:{port}/"
    print(f"Swap & Add! is running at {url}")
    print("Close this window (or press Ctrl+C) when finished.")
    threading.Timer(0.4, lambda: webbrowser.open(url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

