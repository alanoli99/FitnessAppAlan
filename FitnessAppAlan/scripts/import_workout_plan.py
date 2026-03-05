#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

from pypdf import PdfReader


PAGE_TITLE_RE = re.compile(
    r"The Week\s+(?P<week>\d+)\s*-?\s*Day\s*(?P<day>\d+)\s+(?P<title>.+?)\s+Workout",
    re.IGNORECASE,
)

CARDIO_RE = re.compile(r"^Cardio:\s*(.+)$", re.IGNORECASE)
EXERCISE_RE = re.compile(r"^(?P<name>[^:]{2,80}):\s*(?P<details>.+)$")

IGNORE_PREFIXES = (
    "Kris Gethin",
    "Bodybuilding.com",
    "DAY:",
    "DATE:",
    "TIME:",
    "CARDIO TODAY?",
    "LENGTH OF WORKOUT:",
    "WEIGHT:",
    "LOCATION:",
    "MOOD WHEN STARTING:",
    "Instructions:",
    "EXERCISE",
    "TRAINING, NUTRITION & SUPPLEMENT NOTES:",
    "Back to the Printable Logs Main Page.",
)


def normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def should_ignore_line(line: str) -> bool:
    if not line:
        return True
    if line in {"1/2", "2/2", "1/3", "2/3", "3/3"}:
        return True
    return line.startswith(IGNORE_PREFIXES)


def clean_lines(raw: str) -> list[str]:
    lines = [normalize_whitespace(line) for line in raw.splitlines()]
    return [line for line in lines if not should_ignore_line(line)]


def parse_exercises(lines: list[str]) -> list[dict[str, Any]]:
    merged: list[str] = []
    for line in lines:
        if not merged:
            merged.append(line)
            continue

        if EXERCISE_RE.match(line) or CARDIO_RE.match(line):
            merged.append(line)
        else:
            merged[-1] = normalize_whitespace(f"{merged[-1]} {line}")

    exercises: list[dict[str, Any]] = []
    for entry in merged:
        cardio_match = CARDIO_RE.match(entry)
        if cardio_match:
            exercises.append(
                {
                    "name": "Cardio",
                    "type": "cardio",
                    "prescription": normalize_whitespace(cardio_match.group(1)),
                }
            )
            continue

        exercise_match = EXERCISE_RE.match(entry)
        if exercise_match:
            exercises.append(
                {
                    "name": normalize_whitespace(exercise_match.group("name")),
                    "type": "strength",
                    "prescription": normalize_whitespace(exercise_match.group("details")),
                }
            )
            continue

        exercises.append(
            {"name": normalize_whitespace(entry), "type": "note", "prescription": ""}
        )

    return exercises


def parse_pdf(path: Path) -> list[dict[str, Any]]:
    reader = PdfReader(str(path))
    full_text = "\n".join((page.extract_text() or "") for page in reader.pages)
    matches = list(PAGE_TITLE_RE.finditer(full_text))
    days: list[dict[str, Any]] = []

    for idx, match in enumerate(matches):
        start = match.start()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(full_text)
        block = full_text[start:end]

        lines = clean_lines(block)
        if lines and PAGE_TITLE_RE.search(lines[0]):
            lines = lines[1:]

        days.append(
            {
                "weekNumber": int(match.group("week")),
                "programDayNumber": int(match.group("day")),
                "title": normalize_whitespace(match.group("title")),
                "sourceFile": path.name,
                "exercises": parse_exercises(lines),
            }
        )

    return days


def build_program(days: list[dict[str, Any]]) -> dict[str, Any]:
    ordered_days = sorted(days, key=lambda d: (d["weekNumber"], d["programDayNumber"]))
    weeks: dict[int, dict[str, Any]] = {}
    for day in ordered_days:
        week_number = day["weekNumber"]
        if week_number not in weeks:
            weeks[week_number] = {
                "weekNumber": week_number,
                "title": f"Week {week_number}",
                "days": [],
            }

        week_days = weeks[week_number]["days"]
        day_number = len(week_days) + 1
        week_days.append(
            {
                "dayNumber": day_number,
                "programDayNumber": day["programDayNumber"],
                "name": f"Day {day_number} - {day['title']}",
                "focus": day["title"],
                "sourceFile": day["sourceFile"],
                "exercises": day["exercises"],
            }
        )

    return {
        "programName": "Kris Gethin 12 Week Daily Trainer",
        "source": "Bodybuilding.com workout PDFs",
        "weeks": [weeks[w] for w in sorted(weeks.keys())],
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Parse workout PDF files into normalized JSON for app seeding."
    )
    parser.add_argument(
        "--input-dir",
        required=True,
        help="Directory containing Week N Workouts.pdf files",
    )
    parser.add_argument(
        "--output",
        default="src/data/program.json",
        help="Output JSON file path",
    )
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    if not input_dir.exists():
        raise FileNotFoundError(f"Input directory not found: {input_dir}")

    pdf_paths = sorted(input_dir.glob("Week * Workouts.pdf"))
    if not pdf_paths:
        raise FileNotFoundError(f"No workout PDFs found in {input_dir}")

    all_days: list[dict[str, Any]] = []
    for pdf in pdf_paths:
        all_days.extend(parse_pdf(pdf))

    program = build_program(all_days)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(program, indent=2), encoding="utf-8")
    print(f"Wrote {output_path} with {len(all_days)} days.")


if __name__ == "__main__":
    main()
