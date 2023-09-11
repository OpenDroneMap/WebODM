import http.server
from http.server import SimpleHTTPRequestHandler
import socketserver
import sys
import threading
from time import sleep
import json

class MyHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type','text/html')
        self.end_headers()
        self.wfile.write(bytes("Simple auth server is running", encoding="utf-8"))


    def send_error(self, code, error):
        self.send_json(code, {"error": error})
    
    def send_json(self, code, data):
        response = bytes(json.dumps(data), encoding="utf-8")
        
        self.send_response(200)
        self.send_header('Content-type','application/json')
        self.send_header('Content-length', len(response))
        self.end_headers()
        self.wfile.write(response)

    def do_POST(self):
        if self.path == '/auth':
            if not 'Content-Length' in self.headers:
                self.send_error(403, "Missing form data")
                return

            content_length = int(self.headers['Content-Length'])
            post_data_str = self.rfile.read(content_length).decode("utf-8")
            post_data = {}
            for item in post_data_str.split('&'):
                k,v = item.split('=')
                post_data[k] = v

            username = post_data.get("username")
            password = post_data.get("password")

            print("Login request for " + username)

            if username == "extuser1" and password == "test1234":
                print("Granted")
                self.send_json(200, {
                        'user_id': 100,
                        'username': 'extuser1',
                        'maxQuota': 500,
                        'node': {
                            'hostname': 'localhost',
                            'port': 4444,
                            'token': 'test'
                        }
                    })
            else:
                print("Unauthorized")
                return self.send_error(401, "unauthorized")
        else:
            self.send_error(404, "not found")

class WebServer(threading.Thread):
    def __init__(self):
        super().__init__()
        self.host = "0.0.0.0"
        self.port = int(sys.argv[1]) if len(sys.argv) >= 2 else 8080
        self.ws = socketserver.TCPServer((self.host, self.port), MyHandler)

    def run(self):
        print("WebServer started at Port:", self.port)
        self.ws.serve_forever()

    def shutdown(self):
        # set the two flags needed to shutdown the HTTP server manually
        # self.ws._BaseServer__is_shut_down.set()
        # self.ws.__shutdown_request = True

        print('Shutting down server.')
        # call it anyway, for good measure...
        self.ws.shutdown()
        print('Closing server.')
        self.ws.server_close()
        self.join()

if __name__=='__main__':
    webServer = WebServer()
    webServer.start()
    while True:
        try:
            sleep(0.5)
        except KeyboardInterrupt:
            print('Keyboard Interrupt sent.')
            webServer.shutdown()
            exit(0)