import http.client
import json
from pathlib import Path
import sys
import threading
import unittest
from http.server import ThreadingHTTPServer

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from serve_planner import PlannerRequestHandler
from windows_focus import WindowsFocus


class FakeFocus:
    token = "test-only-token"
    def capabilities(self):
        return {"available": True, "token": self.token}
    def start(self, mode):
        return {"session": "test-session", "mode": mode}
    def update(self, session, stop=False):
        return {"active": session == "test-session" and not stop}


class FocusHTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), PlannerRequestHandler)
        cls.server.windows_focus = FakeFocus()
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def request(self, path, headers=None, body=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port)
        connection.request("POST" if body is not None else "GET", path, body, headers or {})
        response = connection.getresponse()
        result = response.status, json.loads(response.read())
        connection.close()
        return result

    def test_capabilities_not_cached(self):
        status, data = self.request('/__focus/capabilities')
        self.assertEqual(status, 200)
        self.assertTrue(data['available'])

    def test_cross_origin_and_dns_rebinding_rejected(self):
        for headers in ({'Origin': 'https://evil.example'}, {'Host': 'evil.example'}, {'Sec-Fetch-Site': 'cross-site'}):
            self.assertEqual(self.request('/__focus/capabilities', headers)[0], 403)

    def test_mutations_need_token_and_browser_session(self):
        self.assertEqual(self.request('/__focus/start', body='{"mode":"screen"}')[0], 403)
        headers = {'X-Focus-Token': FakeFocus.token, 'Content-Type': 'application/json'}
        status, data = self.request('/__focus/start', headers, '{"mode":"screen"}')
        self.assertEqual(status, 200)
        self.assertEqual(data['session'], 'test-session')
        self.assertFalse(self.request('/__focus/heartbeat', headers, '{"session":"wrong"}')[1]['active'])
        self.assertFalse(self.request('/__focus/stop', headers, '{"session":"test-session"}')[1]['active'])

    def test_no_focus_starts_without_valid_mode(self):
        with self.assertRaises(ValueError):
            WindowsFocus().start('invalid')


if __name__ == '__main__':
    unittest.main()
