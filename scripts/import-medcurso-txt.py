#!/usr/bin/env python3
"""Importa a coleção Medcurso em TXT, com comentários, gabaritos e imagens."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import unicodedata
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BANK_ROOT = ROOT / "question_bank"
MEDIA_ROOT = BANK_ROOT / "media" / "medcurso"
QUESTION_HEADER = re.compile(r"(?m)^\s*(\d{3,})\)\s*$")
COMMENT_HEADER = re.compile(r"(?m)^\s*(\d{3,})\.\s*$")
OPTION_HEADER = re.compile(r"(?m)^\s*([A-J])\)\s*")
WATERMARK = re.compile(r"(?i)Medicina livre, venda proibida\. Twitter @livremedicina")

SPECIALTIES = {
    "Cardiologia": "Cardiologia",
    "Cirurgia": "Cirurgia",
    "Dermatologia": "Dermatologia",
    "Endocrinologia": "Endocrinologia",
    "Especiais": "Especialidades Médicas",
    "Gastrologia": "Gastroenterologia",
    "Gineco": "Ginecologia e Obstetrícia",
    "Hemato": "Hematologia",
    "Hepato": "Hepatologia",
    "Infectologia": "Infectologia",
    "Nefrologia": "Nefrologia",
    "Neurologia": "Neurologia",
    "Obstetricia": "Ginecologia e Obstetrícia",
    "Oftalmologia": "Oftalmologia",
    "Ortopedia": "Ortopedia",
    "Pediatria": "Pediatria",
    "Pneumo": "Pneumologia",
    "Preventiva": "Medicina Preventiva",
    "Psiquiatria": "Psiquiatria",
    "Reumatologia": "Reumatologia",
}


def slugify(value: str) -> str:
    clean = unicodedata.normalize("NFD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-zA-Z0-9]+", "-", clean).strip("-").lower() or "medcurso"


def sections(text: str, pattern: re.Pattern) -> dict[str, str]:
    matches = list(pattern.finditer(text))
    return {
        match.group(1): text[match.end() : matches[index + 1].start() if index + 1 < len(matches) else len(text)]
        for index, match in enumerate(matches)
    }


def clean_text(value: str) -> str:
    value = WATERMARK.sub(" ", value).replace("\f", " ").replace("\xa0", " ")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r" *\n *", "\n", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def clean_comment(value: str) -> str:
    """Remove a quebra visual de linhas do PDF e mantém um parágrafo por questão."""
    value = clean_text(value)
    value = re.sub(r"^\s*Comentário:\s*", "", value, flags=re.I)
    return re.sub(r"\s+", " ", value).strip()


def parse_question(body: str) -> tuple[str, dict[str, str]]:
    matches = list(OPTION_HEADER.finditer(body))
    if len(matches) < 2:
        return clean_text(re.sub(r"^\s*Enunciado:\s*", "", body, flags=re.I)), {}
    stem = clean_text(re.sub(r"^\s*Enunciado:\s*", "", body[: matches[0].start()], flags=re.I))
    options = {}
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(body)
        value = clean_text(body[match.end() : end])
        if value:
            options[match.group(1).upper()] = value
    return stem, options


def extract_answer(question: str, comment: str, options: dict[str, str]) -> tuple[str, str]:
    text = " ".join(clean_text(comment).split())
    annulled = bool(re.search(
        r"(?i)(?:quest[aã]o|banca|resposta)\s+(?:foi\s+)?(?:está\s+)?anulad[ao]|"
        r"quest[aã]o\s+anulável|(?:banca\s+)?anulou\s+(?:a\s+)?quest[aã]o|"
        r"anulaç[aã]o\s+(?:da\s+)?quest[aã]o|sem\s+gabarito",
        text,
    ))
    patterns = [
        r"(?i)(?:gabarito|resposta(?:\s+(?:correta|certa|da\s+quest[aã]o))?)\s*(?:da\s+quest[aã]o\s*)?(?:oficial\s*)?(?:liberado\s*)?(?:foi|é|seria|:|,|-)?\s*(?:a\s+)?(?:opção|alternativa|letra)?\s*\(?([A-J])\)?\b",
        r"(?i)(?:gabarito\s+oficial|resposta\s+da\s+quest[aã]o).{0,120}?(?:opção|alternativa|letra)\s*\(?([A-J])\)?\b",
        r"(?i)(?:opção|alternativa|resposta)\s+(?:correta|incorreta|certa|errada)\s*(?:é|:|,|-)?\s*(?:a\s+)?(?:opção|alternativa|letra)?\s*\(?([A-J])\)?\b",
        r"(?i)(?:única|apenas\s+a?)\s*(?:alternativa|assertiva|afirmativa|opção|letra)?\s*\(?([A-J])\)?\s*(?:está|é)?\s*(?:a\s+)?(?:correta|incorreta|certa|errada)\b",
        r"(?i)(?:alternativa|assertiva|afirmativa|opção|letra)\s*\(?([A-J])\)?\s*(?:está|é|foi)?\s*(?:a\s+)?(?:única\s+)?(?:correta|incorreta|certa|errada|resposta)\b",
        r"(?i)(?:alternativa|assertiva|afirmativa|opção|letra)\s*\(?([A-J])\)?\s*(?:está|é|foi)?\s*(?:o\s+|a\s+)?(?:gabarito|resposta\s+da\s+quest[aã]o)\b",
        r"(?i)(?:afirmativa|assertiva)\s+presente\s+na\s+(?:alternativa|letra)\s*\(?([A-J])\)?",
        r"(?i)(?:ficamos|conclu[ií]mos|portanto|dessa\s+forma).{0,100}?(?:com\s+)?(?:a\s+)?(?:opção|alternativa|letra)\s*\(?([A-J])\)?",
        r"(?i)(?:única|somente|apenas|melhor|mais\s+apropriada).{0,100}?(?:opção|alternativa|assertiva|afirmativa|resposta|letra)\s*\(?([A-J])\)?",
        r"(?i)(?:resposta|gabarito|gabari[ot])\s+(?:mais\s+)?(?:apropriada|possível|correta|certa|realmente)?\s*(?:é|seria|:)?\s*(?:a\s+)?(?:opção|alternativa|letra)?\s*\(?([A-J])\)?\b",
        r"(?i)(?:opção|alternativa|letra)\s*\(?([A-J])\)?\s*(?:,|-)?\s*(?:responde|resposta|gabarito)\b",
    ]
    hits = []
    for pattern in patterns:
        for match in re.finditer(pattern, text):
            letter = match.group(1).upper()
            if letter in options:
                hits.append((match.start(), letter))
    if hits:
        return max(hits)[1], "explicit"
    if annulled:
        return "", "annulled"

    negative_prompt = bool(re.search(
        r"(?i)\b(?:incorreta|errada|exceto|n[aã]o\s+(?:é|está|faz|corresponde|constitui))\b",
        question,
    ))
    evaluations = {}
    for match in re.finditer(
        r"(?i)(?:letra|alternativa|opção)?\s*\(?([A-J])\)?\s*(?:-|:|–)?\s*(?:está|é)?\s*(correta|incorreta|certa|errada)\b",
        text,
    ):
        evaluations[match.group(1).upper()] = match.group(2).lower() in {"correta", "certa"}
    candidates = [letter for letter, correct in evaluations.items() if correct != negative_prompt and letter in options]
    if len(candidates) == 1:
        return candidates[0], "inferred"
    return "", "missing"


def linked_images(txt_path: Path, question_id: str, image_index: dict[str, list[Path]]) -> list[Path]:
    image_dir = txt_path.parent / "Imagens"
    matcher = re.compile(rf"^{re.escape(question_id)}(?:$|[-_ (])", re.I)
    local = sorted(path for path in image_dir.iterdir() if path.is_file() and matcher.match(path.stem)) if image_dir.is_dir() else []
    if local:
        return local
    # Algumas imagens foram guardadas no módulo errado. O ID continua sendo
    # confiável, então procure em toda a coleção antes de considerar ausente.
    return image_index.get(question_id, [])


def update_index(entries: list[dict]) -> None:
    index_path = BANK_ROOT / "index.json"
    index = json.loads(index_path.read_text(encoding="utf-8"))
    replaced = {entry["block"] for entry in entries}
    blocks = [item for item in index["blocks"] if item.get("block") not in replaced]
    blocks.extend(entries)
    index["blocks"] = blocks
    index["total"] = sum(int(item.get("count", 0)) for item in blocks)
    index["generatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    compact = json.dumps(index, ensure_ascii=False, separators=(",", ":"))
    index_path.write_text(compact + "\n", encoding="utf-8")
    (BANK_ROOT / "index.js").write_text(f"window.ENAMED_LOCAL_QUESTION_INDEX={compact};\n", encoding="utf-8")
    version = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    for path in (ROOT / "index.html", ROOT / "service-worker.js"):
        source = path.read_text(encoding="utf-8")
        source = re.sub(r"question_bank/index\.js\?v=[^'\"]+", f"question_bank/index.js?v={version}", source)
        if path.name == "service-worker.js":
            source = re.sub(
                r"soqueromed-shell-v(\d+)",
                lambda match: f"soqueromed-shell-v{int(match.group(1)) + 1}",
                source,
                count=1,
            )
        path.write_text(source, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path)
    args = parser.parse_args()
    source_root = args.folder.resolve()
    if not source_root.is_dir():
        parser.error(f"Pasta não encontrada: {source_root}")

    txt_files = sorted(source_root.rglob("*.txt"), key=lambda path: (-len(path.relative_to(source_root).parts), str(path)))
    image_extensions = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}
    image_index: dict[str, list[Path]] = {}
    for image_path in source_root.rglob("*"):
        if image_path.is_file() and image_path.suffix.lower() in image_extensions:
            image_index.setdefault(image_path.stem, []).append(image_path)
    seen_by_specialty: dict[str, set[str]] = {}
    entries = []
    reports = []
    totals = {"found": 0, "imported": 0, "duplicates": 0, "nonObjective": 0, "annulled": 0, "missingAnswer": 0, "images": 0}

    for txt_path in txt_files:
        relative = txt_path.relative_to(source_root)
        folder_name = relative.parts[0]
        specialty = SPECIALTIES.get(folder_name, folder_name)
        topic = txt_path.stem
        if txt_path.parent == source_root / folder_name and topic.upper() == "PED":
            topic = "PED — questões adicionais"
        slug = slugify(f"medcurso-{folder_name}-{topic}")
        block = f"medcurso:{slug}"
        text = txt_path.read_text(encoding="utf-8-sig", errors="replace")
        split = re.split(r"(?im)^\s*Gabarito\s*$", text, maxsplit=1)
        if len(split) != 2:
            reports.append({"file": str(relative), "error": "seção Gabarito não encontrada"})
            continue
        questions = sections(split[0], QUESTION_HEADER)
        comments = sections(split[1], COMMENT_HEADER)
        seen = seen_by_specialty.setdefault(specialty, set())
        imported = []
        skipped = []
        media_dir = MEDIA_ROOT / slug
        for question_id, raw_question in questions.items():
            totals["found"] += 1
            if question_id in seen:
                totals["duplicates"] += 1
                skipped.append({"id": question_id, "reason": "duplicada na mesma especialidade"})
                continue
            seen.add(question_id)
            stem, options = parse_question(raw_question)
            if not stem or len(options) < 2:
                totals["nonObjective"] += 1
                skipped.append({"id": question_id, "reason": "não objetiva"})
                continue
            answer, answer_source = extract_answer(stem, comments.get(question_id, ""), options)
            if not answer:
                totals["annulled" if answer_source == "annulled" else "missingAnswer"] += 1
                skipped.append({"id": question_id, "reason": "anulada" if answer_source == "annulled" else "gabarito não identificado com segurança"})
                continue
            images = []
            for source_image in linked_images(txt_path, question_id, image_index):
                media_dir.mkdir(parents=True, exist_ok=True)
                target = media_dir / source_image.name
                shutil.copy2(source_image, target)
                images.append(f"question_bank/media/medcurso/{slug}/{source_image.name}")
            totals["images"] += len(images)
            imported.append({
                "id": f"medcurso-{slugify(folder_name)}-{slugify(topic)}-{question_id}",
                "number": question_id,
                "sourceNumber": question_id,
                "collectionBlock": block,
                "collectionLabel": f"Medcurso · {topic}",
                "documentBlock": "",
                "area": specialty,
                "specialty": specialty,
                "topic": topic,
                "subtopic": "",
                "stem": stem,
                "options": options,
                "answer": answer,
                "source": str(relative).replace("\\", "/"),
                "sourceLabel": f"Medcurso · {topic}",
                "images": images,
                "optionImages": {},
                "commentImages": [],
                "comment": clean_comment(comments.get(question_id, "")),
                "tags": [specialty, topic, "Medcurso"],
                "answerSource": answer_source,
            })
        if not imported:
            reports.append({"file": str(relative), "topic": topic, "imported": 0, "skipped": skipped})
            continue
        payload = {"block": block, "label": f"Medcurso · {topic}", "count": len(imported), "questions": imported}
        pretty = json.dumps(payload, ensure_ascii=False, indent=2)
        compact = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        (BANK_ROOT / f"{slug}.json").write_text(pretty + "\n", encoding="utf-8")
        (BANK_ROOT / f"{slug}.js").write_text(
            "window.ENAMED_LOCAL_QUESTION_BANK=window.ENAMED_LOCAL_QUESTION_BANK||{};"
            f"window.ENAMED_LOCAL_QUESTION_BANK[{json.dumps(block)}]={compact};\n",
            encoding="utf-8",
        )
        report_name = f"{slug}.import-report.json"
        report = {"file": str(relative), "specialty": specialty, "topic": topic, "found": len(questions), "imported": len(imported), "skipped": skipped}
        (BANK_ROOT / report_name).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        reports.append(report)
        totals["imported"] += len(imported)
        entries.append({
            "block": block,
            "label": f"Medcurso · {topic}",
            "file": f"{slug}.json",
            "script": f"{slug}.js",
            "count": len(imported),
            "special": True,
            "sourceType": "medcurso",
            "report": report_name,
        })

    update_index(entries)
    question_ids_in_text = set()
    for txt_path in txt_files:
        raw = txt_path.read_text(encoding="utf-8-sig", errors="replace")
        question_part = re.split(r"(?im)^\s*Gabarito\s*$", raw, maxsplit=1)[0]
        question_ids_in_text.update(QUESTION_HEADER.findall(question_part))
    summary = {
        "source": str(source_root),
        "files": len(txt_files),
        "blocks": len(entries),
        "sourceImages": sum(len(paths) for paths in image_index.values()),
        "sourceImagesWithoutQuestion": sum(len(paths) for image_id, paths in image_index.items() if image_id not in question_ids_in_text),
        **totals,
        "reports": reports,
    }
    (BANK_ROOT / "medcurso.import-report.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in summary.items() if key != "reports"}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
