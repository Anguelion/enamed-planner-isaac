"""Opt-in Windows focus companion, owned by a single browser session."""
import os
from pathlib import Path
import queue
import secrets
import subprocess
import threading


class WindowsFocus:
    def __init__(self):
        self.token = secrets.token_urlsafe(32)
        self.session = None
        self.process = None
        self.lock = threading.RLock()
        self.source = Path(__file__).with_name("windows-focus.cs")
        self.executable = Path(__file__).resolve().parent.parent / "tmp" / "windows-focus.exe"

    def prepare(self):
        if os.name != "nt":
            return False
        if not self.executable.exists() or self.source.stat().st_mtime > self.executable.stat().st_mtime:
            compiler = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Microsoft.NET/Framework64/v4.0.30319/csc.exe"
            self.executable.parent.mkdir(exist_ok=True)
            subprocess.run([str(compiler), "/nologo", "/target:exe", "/reference:System.Windows.Forms.dll", "/out:" + str(self.executable), str(self.source)],
                           check=True, capture_output=True, timeout=30, creationflags=subprocess.CREATE_NO_WINDOW)
        return True

    def capabilities(self):
        try:
            available = self.prepare()
        except (OSError, subprocess.SubprocessError):
            available = False
        return {"available": available, "token": self.token,
                "message": "Fixação do Windows disponível." if available else "Fixação disponível somente no Windows com o componente local."}

    def start(self, mode):
        if mode not in ("screen", "app"):
            raise ValueError("Escolha fixar tela ou fixar aplicativo.")
        with self.lock:
            if self.process and self.process.poll() is None:
                raise ValueError("Já existe uma fixação ativa. Pause o ciclo anterior.")
            if not self.prepare():
                raise ValueError("Fixação disponível somente no Windows.")
            process = subprocess.Popen([str(self.executable)], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                       stderr=subprocess.DEVNULL, text=True, encoding="utf-8", creationflags=subprocess.CREATE_NO_WINDOW)
            result = queue.Queue()
            threading.Thread(target=lambda: result.put(process.stdout.readline().strip()), daemon=True).start()
            try:
                response = result.get(timeout=5)
                if response != "READY":
                    raise ValueError(response.removeprefix("ERROR:") or "Não foi possível fixar esta janela.")
            except (queue.Empty, ValueError):
                process.stdin.close()  # EOF libera os hooks no finally do companion.
                try:
                    process.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    process.kill()
                raise ValueError("Clique na janela do SÓqueroMed e tente novamente.")
            self.process = process
            self.session = secrets.token_urlsafe(24)
            return {"session": self.session, "active": True}

    def update(self, session, stop=False):
        with self.lock:
            if session != self.session:
                return {"active": False}
            active = self.process is not None and self.process.poll() is None
            if active:
                try:
                    self.process.stdin.write("stop\n" if stop else "keepalive\n")
                    self.process.stdin.flush()
                    if stop:
                        self.process.wait(timeout=2)
                except (OSError, subprocess.SubprocessError):
                    active = False
            if stop:
                self.session = None
            return {"active": active and not stop}

    def close(self):
        if self.session:
            self.update(self.session, stop=True)
