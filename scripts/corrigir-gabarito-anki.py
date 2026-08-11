#!/usr/bin/env python3
"""Interface visual para aplicar um gabarito externo a um APKG e reimportá-lo."""

from __future__ import annotations

import subprocess
import sys
import tempfile
import threading
import os
import json
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk


ROOT = Path(__file__).resolve().parents[1]
IMPORTER = ROOT / "scripts" / "import-anki-apkg.py"


class AnswerKeyApp:
    def __init__(self, root: tk.Tk, initial_apkg: str = "") -> None:
        self.root = root
        self.root.title("Corrigir gabarito de questões Anki")
        self.root.geometry("820x690")
        self.root.minsize(680, 560)
        self.apkg_path = tk.StringVar(value=initial_apkg)
        self.deck_display = tk.StringVar()
        self.deck_lookup = {}
        self.status = tk.StringVar(value="Cole o gabarito no retângulo abaixo." if initial_apkg else "Escolha um APKG e cole o gabarito.")

        container = ttk.Frame(root, padding=22)
        container.pack(fill="both", expand=True)
        ttk.Label(container, text="Corrigir gabarito do APKG", font=("Segoe UI", 18, "bold")).pack(anchor="w")
        ttk.Label(
            container,
            text="Cole uma resposta por linha. Se todas as linhas estiverem numeradas, elas serão ordenadas automaticamente e repetições idênticas serão removidas. Questões discursivas são ignoradas.",
            wraplength=750,
        ).pack(anchor="w", pady=(6, 18))

        file_row = ttk.Frame(container)
        file_row.pack(fill="x")
        ttk.Entry(file_row, textvariable=self.apkg_path).pack(side="left", fill="x", expand=True)
        ttk.Button(file_row, text="Escolher APKG", command=self.choose_file).pack(side="left", padx=(8, 0))

        deck_row = ttk.Frame(container)
        deck_row.pack(fill="x", pady=(14, 0))
        ttk.Label(deck_row, text="Aula:", font=("Segoe UI", 10, "bold")).pack(side="left")
        self.deck_combo = ttk.Combobox(deck_row, textvariable=self.deck_display, state="readonly")
        self.deck_combo.pack(side="left", fill="x", expand=True, padx=(8, 0))
        self.deck_combo.bind("<<ComboboxSelected>>", self.deck_selected)

        self.answer_label = ttk.Label(container, text="Gabarito da aula escolhida — uma letra por linha", font=("Segoe UI", 10, "bold"))
        self.answer_label.pack(anchor="w", pady=(14, 7))
        text_frame = ttk.Frame(container)
        text_frame.pack(fill="both", expand=True)
        self.answer_text = tk.Text(text_frame, font=("Consolas", 13), height=14, wrap="none", undo=True, padx=12, pady=10)
        scrollbar = ttk.Scrollbar(text_frame, orient="vertical", command=self.answer_text.yview)
        self.answer_text.configure(yscrollcommand=scrollbar.set)
        self.answer_text.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        example = ttk.Label(
            container,
            text="Aceita: 1. A  ·  1 A  ·  1 - A  ·  Questão 1: A  ·  Para ignorar: 15 - anulada",
            foreground="#5b6472",
        )
        example.pack(anchor="w", pady=(7, 12))
        self.run_button = ttk.Button(container, text="Conferir, corrigir e importar", command=self.start_import)
        self.run_button.pack(anchor="e")
        ttk.Label(container, textvariable=self.status, wraplength=750).pack(anchor="w", pady=(14, 0))
        self.run_button.configure(state="disabled")
        if initial_apkg:
            self.root.after(100, self.start_analysis)

    def choose_file(self) -> None:
        selected = filedialog.askopenfilename(title="Escolha o arquivo APKG", filetypes=[("Pacote Anki", "*.apkg"), ("Todos os arquivos", "*.*")])
        if selected:
            self.apkg_path.set(selected)
            self.start_analysis()

    def start_analysis(self) -> None:
        apkg = Path(self.apkg_path.get().strip())
        if not apkg.is_file() or apkg.suffix.lower() != ".apkg":
            messagebox.showerror("Arquivo inválido", "Escolha um arquivo .apkg válido.")
            return
        self.deck_combo.configure(values=[])
        self.deck_display.set("")
        self.deck_lookup = {}
        self.run_button.configure(state="disabled")
        self.status.set("Analisando as aulas e os gabaritos do APKG…")
        threading.Thread(target=self.analyze_decks, args=(apkg,), daemon=True).start()

    def analyze_decks(self, apkg: Path) -> None:
        try:
            result = subprocess.run(
                [sys.executable, str(IMPORTER), str(apkg), "--list-decks"],
                cwd=ROOT,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                env={**os.environ, "PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8"},
            )
            if result.returncode:
                raise RuntimeError((result.stderr or result.stdout or "Erro desconhecido").strip())
            decks = json.loads(result.stdout)["decks"]
            self.root.after(0, self.finish_analysis, decks)
        except Exception as error:
            self.root.after(0, self.finish_error, str(error))

    def finish_analysis(self, decks: list[dict]) -> None:
        displays = []
        self.deck_lookup = {}
        for deck in decks:
            lesson = deck["name"].split("::")[-1]
            missing = deck["missingAnswer"]
            situation = f"{missing} sem gabarito" if missing else "gabarito detectado"
            composition = f"{deck['objective']} objetivas"
            if deck.get("nonObjective"):
                composition += f" + {deck['nonObjective']} subjetivas"
            display = f"{lesson} — {composition} · {situation}"
            displays.append(display)
            self.deck_lookup[display] = deck
        self.deck_combo.configure(values=displays)
        if displays:
            first_missing = next((display for display in displays if self.deck_lookup[display]["missingAnswer"]), displays[0])
            self.deck_display.set(first_missing)
            self.deck_selected()
        else:
            self.status.set("Nenhuma aula com questões objetivas foi encontrada.")

    def deck_selected(self, _event=None) -> None:
        deck = self.deck_lookup.get(self.deck_display.get())
        if not deck:
            self.run_button.configure(state="disabled")
            return
        self.answer_label.configure(text=f"Gabarito de {deck['label']} — mantenha a numeração original")
        self.status.set(
            f"Aula escolhida: {deck['label']}. São {deck['objective']} objetivas e "
            f"{deck.get('nonObjective', 0)} subjetivas; deixe as subjetivas numeradas, mas sem letra."
        )
        self.run_button.configure(state="normal")

    def start_import(self) -> None:
        apkg = Path(self.apkg_path.get().strip())
        raw_answers = self.answer_text.get("1.0", "end").strip()
        deck = self.deck_lookup.get(self.deck_display.get())
        if not apkg.is_file() or apkg.suffix.lower() != ".apkg":
            messagebox.showerror("Arquivo inválido", "Escolha um arquivo .apkg válido.")
            return
        if not raw_answers:
            messagebox.showerror("Gabarito vazio", "Cole pelo menos uma letra no retângulo.")
            return
        if not deck:
            messagebox.showerror("Aula não selecionada", "Escolha a aula correspondente ao gabarito.")
            return
        self.run_button.configure(state="disabled")
        self.status.set("Conferindo o gabarito e importando o APKG…")
        threading.Thread(target=self.run_import, args=(apkg, raw_answers, deck["name"]), daemon=True).start()

    def run_import(self, apkg: Path, raw_answers: str, deck_name: str) -> None:
        key_path = None
        try:
            with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".txt", delete=False) as key_file:
                key_file.write(raw_answers + "\n")
                key_path = Path(key_file.name)
            result = subprocess.run(
                [sys.executable, str(IMPORTER), str(apkg), "--deck", deck_name, "--answer-key", str(key_path)],
                cwd=ROOT,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                env={**os.environ, "PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8"},
            )
            if result.returncode:
                detail = (result.stderr or result.stdout or "Erro desconhecido").strip()
                self.root.after(0, self.finish_error, detail)
            else:
                report = json.loads(result.stdout)
                self.root.after(0, self.finish_success, report)
        except Exception as error:
            self.root.after(0, self.finish_error, str(error))
        finally:
            if key_path:
                key_path.unlink(missing_ok=True)

    def finish_success(self, report: dict) -> None:
        self.run_button.configure(state="normal")
        imported = report.get("imported", 0)
        topic = (report.get("topics") or [{}])[0].get("topic", "aula escolhida")
        self.status.set(f"{topic}: {imported} questões importadas com sucesso.")
        messagebox.showinfo(
            "Concluído",
            f"{topic}: {imported} questões importadas.\n\n"
            "Atualize o Planner com Ctrl+R ou feche e abra o aplicativo para carregar a nova aula.",
        )

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
    AnswerKeyApp(window, sys.argv[1] if len(sys.argv) > 1 else "")
    window.mainloop()
