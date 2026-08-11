#!/usr/bin/env python3
"""Interface visual para aplicar um gabarito externo a um APKG e reimportá-lo."""

from __future__ import annotations

import subprocess
import sys
import tempfile
import threading
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk


ROOT = Path(__file__).resolve().parents[1]
IMPORTER = ROOT / "scripts" / "import-anki-apkg.py"


class AnswerKeyApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Corrigir gabarito de questões Anki")
        self.root.geometry("820x690")
        self.root.minsize(680, 560)
        self.apkg_path = tk.StringVar()
        self.status = tk.StringVar(value="Escolha um APKG e cole o gabarito.")

        container = ttk.Frame(root, padding=22)
        container.pack(fill="both", expand=True)
        ttk.Label(container, text="Corrigir gabarito do APKG", font=("Segoe UI", 18, "bold")).pack(anchor="w")
        ttk.Label(
            container,
            text="Cole uma letra por linha, seguindo a ordem das questões objetivas no Anki. Questões discursivas são ignoradas automaticamente.",
            wraplength=750,
        ).pack(anchor="w", pady=(6, 18))

        file_row = ttk.Frame(container)
        file_row.pack(fill="x")
        ttk.Entry(file_row, textvariable=self.apkg_path).pack(side="left", fill="x", expand=True)
        ttk.Button(file_row, text="Escolher APKG", command=self.choose_file).pack(side="left", padx=(8, 0))

        ttk.Label(container, text="Gabarito correto — uma letra por linha", font=("Segoe UI", 10, "bold")).pack(anchor="w", pady=(18, 7))
        text_frame = ttk.Frame(container)
        text_frame.pack(fill="both", expand=True)
        self.answer_text = tk.Text(text_frame, font=("Consolas", 13), wrap="none", undo=True, padx=12, pady=10)
        scrollbar = ttk.Scrollbar(text_frame, orient="vertical", command=self.answer_text.yview)
        self.answer_text.configure(yscrollcommand=scrollbar.set)
        self.answer_text.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        example = ttk.Label(container, text="Aceita: A  ·  1. A  ·  1 A  ·  1 - A  ·  Questão 1: A", foreground="#5b6472")
        example.pack(anchor="w", pady=(7, 12))
        self.run_button = ttk.Button(container, text="Conferir, corrigir e importar", command=self.start_import)
        self.run_button.pack(anchor="e")
        ttk.Label(container, textvariable=self.status, wraplength=750).pack(anchor="w", pady=(14, 0))

    def choose_file(self) -> None:
        selected = filedialog.askopenfilename(title="Escolha o arquivo APKG", filetypes=[("Pacote Anki", "*.apkg"), ("Todos os arquivos", "*.*")])
        if selected:
            self.apkg_path.set(selected)

    def start_import(self) -> None:
        apkg = Path(self.apkg_path.get().strip())
        raw_answers = self.answer_text.get("1.0", "end").strip()
        if not apkg.is_file() or apkg.suffix.lower() != ".apkg":
            messagebox.showerror("Arquivo inválido", "Escolha um arquivo .apkg válido.")
            return
        if not raw_answers:
            messagebox.showerror("Gabarito vazio", "Cole pelo menos uma letra no retângulo.")
            return
        self.run_button.configure(state="disabled")
        self.status.set("Conferindo o gabarito e importando o APKG…")
        threading.Thread(target=self.run_import, args=(apkg, raw_answers), daemon=True).start()

    def run_import(self, apkg: Path, raw_answers: str) -> None:
        key_path = None
        try:
            with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".txt", delete=False) as key_file:
                key_file.write(raw_answers + "\n")
                key_path = Path(key_file.name)
            result = subprocess.run(
                [sys.executable, str(IMPORTER), str(apkg), "--answer-key", str(key_path)],
                cwd=ROOT,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
            if result.returncode:
                detail = (result.stderr or result.stdout or "Erro desconhecido").strip()
                self.root.after(0, self.finish_error, detail)
            else:
                self.root.after(0, self.finish_success)
        except Exception as error:
            self.root.after(0, self.finish_error, str(error))
        finally:
            if key_path:
                key_path.unlink(missing_ok=True)

    def finish_success(self) -> None:
        self.run_button.configure(state="normal")
        self.status.set("Gabarito aplicado e APKG importado com sucesso.")
        messagebox.showinfo("Concluído", "O gabarito foi conferido, aplicado e importado. Abra novamente o planner para ver a atualização.")

    def finish_error(self, detail: str) -> None:
        self.run_button.configure(state="normal")
        self.status.set("A correção não foi aplicada. Confira a mensagem exibida.")
        messagebox.showerror("Não foi possível aplicar", detail[-1800:])


if __name__ == "__main__":
    window = tk.Tk()
    try:
        ttk.Style(window).theme_use("vista")
    except tk.TclError:
        pass
    AnswerKeyApp(window)
    window.mainloop()
