"""Servidor local do SÓqueroMed com suporte a busca em arquivos de vídeo."""

from __future__ import annotations

import argparse
import os
import re
import shutil
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class PlannerRequestHandler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    _byte_range: tuple[int, int] | None = None

    def end_headers(self) -> None:
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def send_head(self):
        range_header = self.headers.get("Range", "").strip()
        if not range_header:
            self._byte_range = None
            return super().send_head()

        path = self.translate_path(self.path)
        if os.path.isdir(path):
            self._byte_range = None
            return super().send_head()

        try:
            file = open(path, "rb")
        except OSError:
            self.send_error(404, "File not found")
            return None

        try:
            stat = os.fstat(file.fileno())
            size = stat.st_size
            match = re.fullmatch(r"bytes=(\d*)-(\d*)", range_header)
            if not match or not size:
                raise ValueError

            start_text, end_text = match.groups()
            if not start_text:
                suffix = int(end_text)
                if suffix <= 0:
                    raise ValueError
                start = max(0, size - suffix)
                end = size - 1
            else:
                start = int(start_text)
                end = int(end_text) if end_text else size - 1
                if start >= size or end < start:
                    raise ValueError
                end = min(end, size - 1)

            self._byte_range = (start, end)
            self.send_response(206)
            self.send_header("Content-Type", self.guess_type(path))
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.send_header("Content-Length", str(end - start + 1))
            self.send_header("Last-Modified", self.date_time_string(stat.st_mtime))
            self.end_headers()
            return file
        except (TypeError, ValueError):
            file.close()
            self._byte_range = None
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{os.path.getsize(path)}")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None

    def copyfile(self, source, outputfile) -> None:
        if not self._byte_range:
            shutil.copyfileobj(source, outputfile)
            return

        start, end = self._byte_range
        source.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            chunk = source.read(min(256 * 1024, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve o planner local com suporte a vídeos.")
    parser.add_argument("--port", type=int, default=8794)
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--directory", default=os.getcwd())
    args = parser.parse_args()

    handler = lambda *handler_args, **handler_kwargs: PlannerRequestHandler(
        *handler_args, directory=args.directory, **handler_kwargs
    )
    with ThreadingHTTPServer((args.bind, args.port), handler) as server:
        print(f"SÓqueroMed disponível em http://localhost:{args.port}/index.html")
        server.serve_forever()


if __name__ == "__main__":
    main()
