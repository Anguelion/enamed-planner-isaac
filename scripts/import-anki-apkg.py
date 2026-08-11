#!/usr/bin/env python3
"""Importa questões objetivas de um APKG moderno para o banco estático do planner."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import shutil
import sqlite3
import subprocess
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BANK_ROOT = ROOT / "question_bank"
MEDIA_ROOT = BANK_ROOT / "media"


def slugify(value: str) -> str:
    import unicodedata

    clean = unicodedata.normalize("NFD", value).encode("ascii", "ignore").decode()
    clean = re.sub(r"[^a-zA-Z0-9]+", "-", clean).strip("-").lower()
    return clean or "anki-import"


def zstd_path() -> str:
    found = shutil.which("zstd")
    if not found:
        raise RuntimeError("zstd não foi encontrado no PATH; ele é necessário para APKGs modernos.")
    return found


def decompress(source: Path, target: Path) -> None:
    subprocess.run(
        [zstd_path(), "-d", "-f", str(source), "-o", str(target)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def read_varint(data: bytes, offset: int) -> tuple[int, int]:
    value = 0
    shift = 0
    while offset < len(data):
        byte = data[offset]
        offset += 1
        value |= (byte & 0x7F) << shift
        if not byte & 0x80:
            return value, offset
        shift += 7
    raise ValueError("Varint truncado no manifesto de mídia do APKG.")


def protobuf_fields(data: bytes):
    offset = 0
    while offset < len(data):
        tag, offset = read_varint(data, offset)
        field = tag >> 3
        wire = tag & 7
        if wire == 0:
            value, offset = read_varint(data, offset)
        elif wire == 2:
            length, offset = read_varint(data, offset)
            value = data[offset : offset + length]
            offset += length
        elif wire == 1:
            value = data[offset : offset + 8]
            offset += 8
        elif wire == 5:
            value = data[offset : offset + 4]
            offset += 4
        else:
            raise ValueError(f"Wire type protobuf não suportado: {wire}")
        yield field, wire, value


def media_manifest(path: Path) -> list[dict]:
    entries = []
    for field, wire, payload in protobuf_fields(path.read_bytes()):
        if field != 1 or wire != 2:
            continue
        entry = {}
        for inner_field, inner_wire, value in protobuf_fields(payload):
            if inner_field == 1 and inner_wire == 2:
                entry["name"] = value.decode("utf-8")
            elif inner_field == 2 and inner_wire == 0:
                entry["size"] = value
            elif inner_field == 3 and inner_wire == 2:
                entry["sha1"] = value.hex()
        if entry.get("name"):
            entries.append(entry)
    return entries


def clean_html(value: str) -> str:
    value = re.sub(r"<img\b[^>]*>", "", value, flags=re.I)
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.I)
    value = re.sub(r"</?(?:p|div|li|ul|ol|table|tr|td|blockquote)\b[^>]*>", "\n", value, flags=re.I)
    value = re.sub(r"<[^>]+>", "", value)
    value = html.unescape(value).replace("\xa0", " ")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r" *\n *", "\n", value)
    return re.sub(r"\n{3,}", "\n\n", value).strip()


def image_names(value: str) -> list[str]:
    return re.findall(r"<img\b[^>]*\bsrc=[\"']([^\"']+)", value, flags=re.I)


def choose_collection(extracted: Path) -> Path:
    candidates = []
    modern = extracted / "collection.anki21b"
    if modern.exists():
        decoded = extracted / "collection-modern.anki2"
        decompress(modern, decoded)
        candidates.append(decoded)
    legacy = extracted / "collection.anki2"
    if legacy.exists():
        candidates.append(legacy)
    scored = []
    for candidate in candidates:
        connection = None
        try:
            connection = sqlite3.connect(candidate)
            scored.append((connection.execute("select count(*) from notes").fetchone()[0], candidate))
        except sqlite3.DatabaseError:
            pass
        finally:
            if connection is not None:
                connection.close()
    if not scored:
        raise RuntimeError("Nenhuma coleção Anki válida foi encontrada no APKG.")
    return max(scored, key=lambda item: item[0])[1]


def deck_name(connection: sqlite3.Connection, deck_id: int) -> str:
    tables = {row[0] for row in connection.execute("select name from sqlite_master where type='table'")}
    if "decks" in tables:
        row = connection.execute("select name from decks where id=?", (deck_id,)).fetchone()
        if row:
            return row[0].replace("\x1f", "::")
    row = connection.execute("select decks from col").fetchone()
    if row and row[0]:
        decks = json.loads(row[0])
        return decks.get(str(deck_id), {}).get("name", "Importado do Anki")
    return "Importado do Anki"


def field_names(connection: sqlite3.Connection, note_type_id: int) -> list[str]:
    tables = {row[0] for row in connection.execute("select name from sqlite_master where type='table'")}
    if "fields" in tables:
        return [row[0] for row in connection.execute("select name from fields where ntid=? order by ord", (note_type_id,))]
    models = json.loads(connection.execute("select models from col").fetchone()[0])
    return [field["name"] for field in models[str(note_type_id)]["flds"]]


def extract_media(extracted: Path, slug: str) -> dict[str, str]:
    compressed_manifest = extracted / "media"
    if not compressed_manifest.exists():
        return {}
    decoded_manifest = extracted / "media.decoded"
    try:
        decompress(compressed_manifest, decoded_manifest)
        entries = media_manifest(decoded_manifest)
        compressed_files = True
    except (subprocess.CalledProcessError, ValueError):
        raw = json.loads(compressed_manifest.read_text(encoding="utf-8"))
        entries = [{"name": name, "archive": archive_name} for archive_name, name in raw.items()]
        compressed_files = False

    output_dir = MEDIA_ROOT / slug
    output_dir.mkdir(parents=True, exist_ok=True)
    urls = {}
    for index, entry in enumerate(entries):
        archive_name = str(entry.get("archive", index))
        source = extracted / archive_name
        if not source.exists():
            continue
        safe_name = Path(entry["name"]).name
        target = output_dir / safe_name
        if compressed_files:
            decompress(source, target)
        else:
            shutil.copy2(source, target)
        if entry.get("sha1") and hashlib.sha1(target.read_bytes()).hexdigest() != entry["sha1"]:
            raise RuntimeError(f"Falha de integridade ao extrair {safe_name}.")
        urls[entry["name"]] = f"question_bank/media/{slug}/{safe_name}"
    return urls


def update_index(entry: dict) -> None:
    index_path = BANK_ROOT / "index.json"
    index = json.loads(index_path.read_text(encoding="utf-8"))
    blocks = [item for item in index["blocks"] if item.get("block") != entry["block"]]
    blocks.append(entry)
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
    parser.add_argument("apkg", type=Path)
    parser.add_argument("--slug")
    parser.add_argument("--area")
    parser.add_argument("--specialty")
    parser.add_argument("--topic")
    parser.add_argument("--block")
    args = parser.parse_args()
    apkg = args.apkg.resolve()
    if not apkg.is_file():
        parser.error(f"Arquivo não encontrado: {apkg}")

    with tempfile.TemporaryDirectory(prefix="enamed-apkg-") as temp_name:
        extracted = Path(temp_name)
        with zipfile.ZipFile(apkg) as package:
            package.extractall(extracted)
        collection = choose_collection(extracted)
        connection = sqlite3.connect(collection)
        first_card = connection.execute("select did from cards order by id limit 1").fetchone()
        full_deck = deck_name(connection, first_card[0] if first_card else 1)
        deck_parts = full_deck.split("::")
        leaf = deck_parts[-1]
        label = re.sub(r"^\d+\s*-\s*", "", leaf).strip() or apkg.stem
        topic = args.topic or label
        inferred_specialty = re.sub(r"^\d+\s*-\s*", "", deck_parts[-2]).strip() if len(deck_parts) > 1 else "Importado do Anki"
        specialty = args.specialty or inferred_specialty
        area = args.area or specialty
        slug = slugify(args.slug or f"{specialty}-{topic}")
        block = args.block or f"anki:{slug}"
        media_urls = extract_media(extracted, slug)

        notes = connection.execute("select id,guid,mid,tags,flds from notes order by id").fetchall()
        names_by_model = {}
        questions = []
        skipped = []
        for note_id, guid, model_id, raw_tags, fields in notes:
            names = names_by_model.setdefault(model_id, field_names(connection, model_id))
            values = fields.split("\x1f")
            record = {name.lower(): values[index] if index < len(values) else "" for index, name in enumerate(names)}
            stem_raw = record.get("question", record.get("front", ""))
            options = {}
            for letter in "abcdefghij":
                if clean_html(record.get(letter, "")):
                    options[letter.upper()] = clean_html(record[letter])
            answers = [item.strip().upper() for item in record.get("answers", "").split(",") if item.strip()]
            reason = ""
            if not clean_html(stem_raw):
                reason = "enunciado ausente"
            elif len(options) < 2:
                reason = "questão discursiva ou com menos de duas alternativas"
            elif len(answers) != 1 or answers[0] not in options:
                reason = "gabarito ausente, múltiplo ou incompatível"
            if reason:
                skipped.append({"noteId": note_id, "number": clean_html(record.get("number", "")), "reason": reason})
                continue

            refs = image_names(stem_raw)
            images = [media_urls[name] for name in refs if name in media_urls]
            explanation = clean_html(record.get("explanation", ""))
            reference = clean_html(record.get("ref", ""))
            comment = explanation
            if reference:
                comment = f"{comment}\n\nFonte: {reference}".strip()
            number = clean_html(record.get("number", "")) or str(len(questions) + 1)
            tags = [tag for tag in raw_tags.strip().split() if tag]
            tags.extend([specialty, topic, "Anki"])
            stable_id = hashlib.sha1(str(guid or note_id).encode("utf-8")).hexdigest()[:16]
            questions.append({
                "id": f"anki-{slug}-{stable_id}",
                "number": number,
                "sourceNumber": number,
                "collectionBlock": block,
                "collectionLabel": f"Anki · {label}",
                "documentBlock": "",
                "area": area,
                "specialty": specialty,
                "topic": topic,
                "subtopic": "",
                "stem": clean_html(stem_raw),
                "options": options,
                "answer": answers[0],
                "source": apkg.name,
                "sourceLabel": f"Anki · {label}",
                "images": images,
                "comment": comment,
                "tags": list(dict.fromkeys(tags)),
                "ankiNoteId": str(note_id),
                "ankiGuid": guid,
            })

        connection.close()
        payload = {"block": block, "label": f"Anki · {label}", "count": len(questions), "questions": questions}
        json_name = f"{slug}.json"
        js_name = f"{slug}.js"
        pretty = json.dumps(payload, ensure_ascii=False, indent=2)
        compact = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        (BANK_ROOT / json_name).write_text(pretty + "\n", encoding="utf-8")
        (BANK_ROOT / js_name).write_text(
            f"window.ENAMED_LOCAL_QUESTION_BANK=window.ENAMED_LOCAL_QUESTION_BANK||{{}};window.ENAMED_LOCAL_QUESTION_BANK[{json.dumps(block)}]={compact};\n",
            encoding="utf-8",
        )
        report = {
            "source": apkg.name,
            "deck": full_deck,
            "notes": len(notes),
            "imported": len(questions),
            "skipped": skipped,
            "mediaReferenced": sum(len(question["images"]) for question in questions),
            "mediaExtracted": len(media_urls),
        }
        report_name = f"{slug}.import-report.json"
        (BANK_ROOT / report_name).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        update_index({
            "block": block,
            "label": f"Anki · {label}",
            "file": json_name,
            "script": js_name,
            "count": len(questions),
            "special": True,
            "sourceType": "anki",
            "report": report_name,
        })
        print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
