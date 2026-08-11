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
import sys
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BANK_ROOT = ROOT / "question_bank"
MEDIA_ROOT = BANK_ROOT / "media"
NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)


def slugify(value: str) -> str:
    import unicodedata

    clean = unicodedata.normalize("NFD", value).encode("ascii", "ignore").decode()
    clean = re.sub(r"[^a-zA-Z0-9]+", "-", clean).strip("-").lower()
    return clean or "anki-import"


def clean_deck_label(value: str) -> str:
    return re.sub(r"^\d+(?:\.\d+)?\s*-\s*", "", value).strip()


def canonical_specialty(value: str) -> str:
    """Une nomes que devem aparecer como uma única especialidade no planner."""
    if slugify(value) in {"ginecologia", "obstetricia", "ginecologia-e-obstetricia"}:
        return "Ginecologia e Obstetrícia"
    return value


def infer_deck_specialty(parts: list[str]) -> tuple[str, str, int]:
    """Encontra a especialidade mesmo quando há subbaralhos dentro do tema."""
    for index, part in enumerate(parts):
        candidate = clean_deck_label(part)
        if slugify(candidate) in {"ginecologia", "obstetricia", "ginecologia-e-obstetricia"}:
            return candidate, canonical_specialty(candidate), index
    fallback_index = max(0, len(parts) - 2)
    raw = clean_deck_label(parts[fallback_index]) or "Importado do Anki"
    return raw, canonical_specialty(raw), fallback_index


def inferred_group_slug(full_deck: str, storage_specialty: str, topic: str, specialty_index: int) -> str:
    parts = full_deck.split("::")
    if specialty_index < len(parts) - 2:
        # Inclui a numeração do último nível para não sobrescrever aulas irmãs
        # que possuem o mesmo título dentro de um tema-pai.
        return slugify(f"{storage_specialty}-{topic}-{parts[-1]}")
    return slugify(f"{storage_specialty}-{topic}")


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
        creationflags=NO_WINDOW,
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


def parse_answer_key_text(text: str) -> tuple[list[str | None], bool]:
    rows = []
    for line_number, raw_line in enumerate(text.splitlines(), 1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        numbered = re.match(r"^(?:quest(?:ão|ao)?\s*)?(\d+)(?:\s*(?:[.)\-–—:]|\s)|$)", line, flags=re.I)
        letters = re.findall(r"(?<![A-Za-zÀ-ÿ])([A-J])(?![A-Za-zÀ-ÿ])", line, flags=re.I)
        if not letters and not numbered:
            continue
        rows.append({
            "line": line_number,
            "number": int(numbered.group(1)) if numbered else None,
            "answer": letters[-1].upper() if letters else None,
        })
    if not rows:
        raise ValueError("Nenhuma questão numerada ou letra de gabarito foi encontrada.")
    if all(row["number"] is not None for row in rows):
        by_number = {}
        for row in rows:
            previous = by_number.get(row["number"])
            if previous and previous["answer"] and row["answer"] and previous["answer"] != row["answer"]:
                raise ValueError(
                    f"O número {row['number']} aparece com respostas diferentes: "
                    f"{previous['answer']} e {row['answer']}."
                )
            if not previous or (not previous["answer"] and row["answer"]):
                by_number[row["number"]] = row
        highest = max(by_number)
        return ([by_number.get(number, {}).get("answer") for number in range(1, highest + 1)], True)
    return ([row["answer"] for row in rows if row["answer"]], False)


def load_answer_key(path: Path | None) -> tuple[list[str | None], bool]:
    if path is None:
        return ([], False)
    return parse_answer_key_text(path.read_text(encoding="utf-8-sig"))


def image_names(value: str) -> list[str]:
    return re.findall(r"<img\b[^>]*\bsrc=[\"']([^\"']+)", value, flags=re.I)


def multiple_choice_data(record: dict) -> tuple[dict[str, str], list[str]]:
    answers = [item.strip().upper() for item in record.get("answers", "").split(",") if item.strip()]
    populated = [
        (letter, clean_html(record.get(letter, "")))
        for letter in "abcdefghij"
        if clean_html(record.get(letter, ""))
    ]
    embedded_answer = ""
    if not answers and len(populated) >= 3 and re.fullmatch(r"[A-J]", populated[-1][1], flags=re.I):
        embedded_answer = populated[-1][1].upper()
        populated = populated[:-1]
    options = {letter.upper(): value for letter, value in populated}
    if not answers and embedded_answer:
        answers = [embedded_answer]
    return options, answers


def is_objective_question(stem: str, options: dict[str, str]) -> bool:
    if not stem or len(options) < 2:
        return False
    option_markers = {slugify(value) for value in options.values()}
    if any(
        marker in option_markers
        for marker in {
            "questao-nao-segue-formato-de-multipla-escolha",
            "questao-nao-e-de-multipla-escolha",
        }
    ):
        return False
    return True


def preserve_existing_images(group: dict) -> None:
    existing_path = BANK_ROOT / f"{group['slug']}.json"
    if not existing_path.exists():
        return
    try:
        existing_payload = json.loads(existing_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return
    existing_by_note = {
        str(question.get("ankiNoteId", "")): question
        for question in existing_payload.get("questions", [])
        if question.get("ankiNoteId")
    }
    for question in group["questions"]:
        previous = existing_by_note.get(str(question.get("ankiNoteId", "")))
        if not previous:
            continue
        for field in ("images", "commentImages"):
            if not question.get(field) and previous.get(field):
                question[field] = previous[field]
        if not question.get("optionImages") and previous.get("optionImages"):
            question["optionImages"] = previous["optionImages"]


def choose_collection(extracted: Path) -> Path:
    candidates = []
    modern = extracted / "collection.anki21b"
    if modern.exists():
        decoded = extracted / "collection-modern.anki2"
        decompress(modern, decoded)
        candidates.append(decoded)
    version_21 = extracted / "collection.anki21"
    if version_21.exists():
        candidates.append(version_21)
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
    parser.add_argument("apkg", type=Path)
    parser.add_argument("--slug")
    parser.add_argument("--area")
    parser.add_argument("--specialty")
    parser.add_argument("--topic")
    parser.add_argument("--block")
    parser.add_argument("--answer-key", type=Path, help="TXT com uma letra por linha, na ordem das questões objetivas")
    parser.add_argument("--deck", help="Nome completo do subbaralho que deve ser importado")
    parser.add_argument("--list-decks", action="store_true", help="Lista as aulas e a situação dos gabaritos sem importar")
    args = parser.parse_args()
    apkg = args.apkg.resolve()
    if not apkg.is_file():
        parser.error(f"Arquivo não encontrado: {apkg}")

    # No Windows, o SQLite pode manter o arquivo extraído bloqueado por alguns
    # instantes durante a propagação de um erro de validação. Não deixe essa
    # limpeza temporária esconder a mensagem útil sobre o gabarito.
    with tempfile.TemporaryDirectory(prefix="enamed-apkg-", ignore_cleanup_errors=True) as temp_name:
        extracted = Path(temp_name)
        with zipfile.ZipFile(apkg) as package:
            package.extractall(extracted)
        collection = choose_collection(extracted)
        connection = sqlite3.connect(collection)
        notes = connection.execute(
            "select n.id,n.guid,n.mid,n.tags,n.flds,min(c.did) "
            "from notes n join cards c on c.nid=n.id group by n.id,n.guid,n.mid,n.tags,n.flds order by n.id"
        ).fetchall()
        deck_cache = {did: deck_name(connection, did) for did in {row[5] for row in notes}}
        if args.list_decks:
            names_by_model = {}
            summaries = {}
            for _, _, model_id, _, fields, deck_id in notes:
                names = names_by_model.setdefault(model_id, field_names(connection, model_id))
                values = fields.split("\x1f")
                record = {name.lower(): values[index] if index < len(values) else "" for index, name in enumerate(names)}
                stem = clean_html(record.get("question", record.get("front", "")))
                options, answers = multiple_choice_data(record)
                full_deck = deck_cache[deck_id]
                summary = summaries.setdefault(full_deck, {"name": full_deck, "total": 0, "objective": 0, "withAnswer": 0})
                summary["total"] += 1
                if not is_objective_question(stem, options):
                    continue
                summary["objective"] += 1
                if len(answers) == 1 and answers[0] in options:
                    summary["withAnswer"] += 1
            result = []
            for name in sorted(summaries):
                summary = summaries[name]
                summary["nonObjective"] = summary["total"] - summary["objective"]
                summary["missingAnswer"] = summary["objective"] - summary["withAnswer"]
                summary["label"] = clean_deck_label(name.split("::")[-1])
                parts = name.split("::")
                listed_specialty, display_specialty, specialty_index = infer_deck_specialty(parts)
                summary["specialty"] = display_specialty
                summary["slug"] = inferred_group_slug(name, listed_specialty, summary["label"], specialty_index)
                summary["block"] = f"anki:{summary['slug']}"
                existing_path = BANK_ROOT / f"{summary['slug']}.json"
                summary["alreadyImported"] = existing_path.exists()
                summary["importedCount"] = 0
                if existing_path.exists():
                    try:
                        summary["importedCount"] = int(json.loads(existing_path.read_text(encoding="utf-8")).get("count", 0))
                    except (OSError, ValueError):
                        pass
                report_path = BANK_ROOT / f"{summary['slug']}.import-report.json"
                if summary["missingAnswer"] and report_path.exists():
                    try:
                        previous_report = json.loads(report_path.read_text(encoding="utf-8"))
                        correction_applied = (
                            previous_report.get("deck") == name
                            and int(previous_report.get("answerKeyOverrides", 0)) > 0
                            and int(previous_report.get("imported", 0)) == summary["objective"]
                            and summary["importedCount"] == summary["objective"]
                        )
                        if correction_applied:
                            summary["originalMissingAnswer"] = summary["missingAnswer"]
                            summary["missingAnswer"] = 0
                            summary["correctedAnswerKey"] = True
                    except (OSError, ValueError, TypeError):
                        pass
                result.append(summary)
            connection.close()
            print(json.dumps({"decks": result}, ensure_ascii=False, indent=2))
            return
        if args.deck:
            if args.deck not in deck_cache.values():
                connection.close()
                raise ValueError(f"A aula selecionada não foi encontrada no APKG: {args.deck}")
            notes = [row for row in notes if deck_cache[row[5]] == args.deck]
            deck_cache = {did: name for did, name in deck_cache.items() if name == args.deck}
        first_full_deck = deck_cache[notes[0][5]] if notes else "Importado do Anki"
        first_parts = first_full_deck.split("::")
        storage_specialty, inferred_specialty, first_specialty_index = infer_deck_specialty(first_parts)
        specialty = canonical_specialty(args.specialty) if args.specialty else inferred_specialty
        if args.specialty:
            storage_specialty = args.specialty
        multiple_decks = len(deck_cache) > 1 and not args.topic
        if multiple_decks and args.block:
            parser.error("--block só pode ser usado com um único tema; remova a opção para preservar os subbaralhos.")
        first_label = clean_deck_label(first_parts[-1]) or apkg.stem
        if args.slug:
            media_slug = slugify(args.slug)
        elif multiple_decks:
            media_slug = slugify(storage_specialty)
        else:
            media_slug = inferred_group_slug(
                first_full_deck,
                storage_specialty,
                args.topic or first_label,
                first_specialty_index,
            )
        media_urls = extract_media(extracted, media_slug)

        names_by_model = {}
        groups = {}
        skipped = []
        answer_key, numbered_answer_key = load_answer_key(args.answer_key)
        if answer_key:
            objective_count = 0
            for _, _, model_id, _, fields, _ in notes:
                names = names_by_model.setdefault(model_id, field_names(connection, model_id))
                values = fields.split("\x1f")
                record = {name.lower(): values[index] if index < len(values) else "" for index, name in enumerate(names)}
                stem = clean_html(record.get("question", record.get("front", "")))
                options, _ = multiple_choice_data(record)
                if is_objective_question(stem, options):
                    objective_count += 1
            expected_count = len(notes) if numbered_answer_key else objective_count
            if numbered_answer_key and len(answer_key) < expected_count:
                answer_key.extend([None] * (expected_count - len(answer_key)))
            elif len(answer_key) != expected_count:
                connection.close()
                target = f'a aula "{first_label}"' if args.deck else "o APKG"
                supplied = sum(answer is not None for answer in answer_key)
                answer_word = "resposta" if supplied == 1 else "respostas"
                expected_description = (
                    f"{expected_count} posições contando objetivas e subjetivas"
                    if numbered_answer_key
                    else f"{objective_count} questões objetivas"
                )
                raise ValueError(
                    f"O gabarito possui {supplied} {answer_word}, mas {target} tem {expected_description}. "
                    "Mantenha a numeração original, inclusive nas questões subjetivas sem letra."
                )
        answer_key_index = 0
        answer_key_overrides = 0
        answer_key_ignored = 0
        for note_position, (note_id, guid, model_id, raw_tags, fields, deck_id) in enumerate(notes):
            full_deck = deck_cache[deck_id]
            parts = full_deck.split("::")
            label = clean_deck_label(parts[-1]) or apkg.stem
            topic = args.topic or label
            deck_storage_specialty, deck_specialty, specialty_index = infer_deck_specialty(parts)
            if args.specialty:
                deck_storage_specialty = args.specialty
                deck_specialty = canonical_specialty(args.specialty)
            question_specialty = deck_specialty if multiple_decks else specialty
            if args.slug:
                group_slug = slugify(args.slug if not multiple_decks else f"{args.slug}-{topic}")
            else:
                group_slug = inferred_group_slug(full_deck, deck_storage_specialty, topic, specialty_index)
            block = args.block or f"anki:{group_slug}"
            group = groups.setdefault(block, {"slug": group_slug, "label": label, "topic": topic, "questions": []})
            names = names_by_model.setdefault(model_id, field_names(connection, model_id))
            values = fields.split("\x1f")
            record = {name.lower(): values[index] if index < len(values) else "" for index, name in enumerate(names)}
            stem_raw = record.get("question", record.get("front", ""))
            options, answers = multiple_choice_data(record)
            objective = is_objective_question(clean_html(stem_raw), options)
            if answer_key and objective:
                if numbered_answer_key:
                    supplied_answer = answer_key[note_position]
                else:
                    supplied_answer = answer_key[answer_key_index]
                    answer_key_index += 1
                if supplied_answer is None:
                    answer_key_ignored += 1
                    skipped.append({
                        "noteId": note_id,
                        "number": clean_html(record.get("number", "")),
                        "topic": topic,
                        "reason": "questão ignorada por não possuir letra no gabarito fornecido",
                    })
                    continue
                answers = [supplied_answer]
                answer_key_overrides += 1
            reason = ""
            if not clean_html(stem_raw):
                reason = "enunciado ausente"
            elif not objective:
                reason = "questão discursiva ou com menos de duas alternativas"
            elif len(answers) != 1 or answers[0] not in options:
                reason = "gabarito ausente, múltiplo ou incompatível"
            if reason:
                skipped.append({"noteId": note_id, "number": clean_html(record.get("number", "")), "topic": topic, "reason": reason})
                continue

            refs = image_names(stem_raw)
            images = [media_urls[name] for name in refs if name in media_urls]
            option_images = {
                letter.upper(): [media_urls[name] for name in image_names(record.get(letter, "")) if name in media_urls]
                for letter in "abcdefghij"
                if image_names(record.get(letter, ""))
            }
            explanation = clean_html(record.get("explanation", ""))
            reference = clean_html(record.get("ref", ""))
            comment_image_names = image_names(record.get("explanation", "")) + image_names(record.get("ref", ""))
            comment_images = [media_urls[name] for name in comment_image_names if name in media_urls]
            comment = explanation
            if reference:
                comment = f"{comment}\n\nFonte: {reference}".strip()
            number = clean_html(record.get("number", "")) or str(len(group["questions"]) + 1)
            tags = [tag for tag in raw_tags.strip().split() if tag]
            tags.extend([question_specialty, topic, "Anki"])
            stable_id = hashlib.sha1(str(guid or note_id).encode("utf-8")).hexdigest()[:16]
            group["questions"].append({
                "id": f"anki-{group_slug}-{stable_id}",
                "number": number,
                "sourceNumber": number,
                "collectionBlock": block,
                "collectionLabel": f"Anki · {label}",
                "documentBlock": "",
                "area": args.area or question_specialty,
                "specialty": question_specialty,
                "topic": topic,
                "subtopic": "",
                "stem": clean_html(stem_raw),
                "options": options,
                "answer": answers[0],
                "source": apkg.name,
                "sourceLabel": f"Anki · {label}",
                "images": images,
                "optionImages": option_images,
                "commentImages": comment_images,
                "comment": comment,
                "tags": list(dict.fromkeys(tags)),
                "ankiNoteId": str(note_id),
                "ankiGuid": guid,
            })

        connection.close()
        for group in groups.values():
            preserve_existing_images(group)
        imported = sum(len(group["questions"]) for group in groups.values())
        report = {
            "source": apkg.name,
            "deck": "::".join(first_parts[:-1]) if multiple_decks else first_full_deck,
            "notes": len(notes),
            "imported": imported,
            "skipped": skipped,
            "topics": [
                {"topic": group["topic"], "imported": len(group["questions"]), "block": block}
                for block, group in groups.items()
            ],
            "mediaReferenced": sum(
                len(question["images"])
                + sum(len(images) for images in question["optionImages"].values())
                + len(question["commentImages"])
                for group in groups.values()
                for question in group["questions"]
            ),
            "mediaExtracted": len(media_urls),
            "answerKeyOverrides": answer_key_overrides,
            "answerKeyIgnored": answer_key_ignored,
        }
        report_name = f"{media_slug}.import-report.json"
        (BANK_ROOT / report_name).write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        entries = []
        for block, group in groups.items():
            questions = group["questions"]
            slug = group["slug"]
            payload = {"block": block, "label": f"Anki · {group['label']}", "count": len(questions), "questions": questions}
            json_name = f"{slug}.json"
            js_name = f"{slug}.js"
            pretty = json.dumps(payload, ensure_ascii=False, indent=2)
            compact = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
            (BANK_ROOT / json_name).write_text(pretty + "\n", encoding="utf-8")
            (BANK_ROOT / js_name).write_text(
                f"window.ENAMED_LOCAL_QUESTION_BANK=window.ENAMED_LOCAL_QUESTION_BANK||{{}};window.ENAMED_LOCAL_QUESTION_BANK[{json.dumps(block)}]={compact};\n",
                encoding="utf-8",
            )
            entries.append({
                "block": block,
                "label": f"Anki · {group['label']}",
                "file": json_name,
                "script": js_name,
                "count": len(questions),
                "special": True,
                "sourceType": "anki",
                "report": report_name,
            })
        update_index(entries)
        print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, RuntimeError) as error:
        print(f"Erro: {error}", file=sys.stderr)
        raise SystemExit(2)
