"""Python wrapper around the TJA note-gap analyzer.

Example:
    from note_gaps import get_note_gaps

    with open("chart.tja", encoding="utf-8") as f:
        result = get_note_gaps(f.read())          # gaps in measures
    result_ms = get_note_gaps(tja_text, unit="ms")  # gaps in milliseconds

The returned dict mirrors the TJAAnalysis shape:
    {
      "courses": {
        "<course>": {
          # unbranched chart:        {"unbranched": [[gap, ...], ...]}
          # branched chart:          {"normal": [...], "expert": [...], "master": [...]}
          # STYLE:Double course:     {"p1": {...}, "p2": {...}}
        }
      }
    }
Each innermost list is one bar; each value is the gap to the previous renderable
note (rounded to 3 decimals) or None when there is no measurable previous note.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Literal

GapUnit = Literal["measures", "ms"]

# offline-analysis/note_gaps.py -> project root is one level up.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_BRIDGE = _PROJECT_ROOT / "offline-analysis" / "gap-bridge.ts"


class NoteGapError(RuntimeError):
    """Raised when the Node bridge fails to analyze the TJA input."""


def get_note_gaps(tja: str, unit: GapUnit = "measures", *, node: str = "node") -> dict[str, Any]:
    """Return the note-gap analysis for a TJA string.

    Args:
        tja: The full TJA chart as a string.
        unit: "measures" (default) for gaps in measure fractions, or "ms" for
            milliseconds computed from per-bar BPM.
        node: Path/name of the Node.js executable to invoke.

    Returns:
        The parsed TJAAnalysis dict (see module docstring).

    Raises:
        NoteGapError: If the Node bridge exits non-zero or emits invalid JSON.
    """
    if unit not in ("measures", "ms"):
        raise ValueError(f'unit must be "measures" or "ms", got {unit!r}')

    cmd = [node, "--loader", "ts-node/esm", str(_BRIDGE), "--unit", unit]
    proc = subprocess.run(
        cmd,
        input=tja.encode("utf-8"),
        capture_output=True,
        cwd=_PROJECT_ROOT,
    )

    if proc.returncode != 0:
        stderr = proc.stderr.decode("utf-8", errors="replace").strip()
        raise NoteGapError(f"gap-bridge exited with code {proc.returncode}: {stderr}")

    try:
        return json.loads(proc.stdout.decode("utf-8"))
    except json.JSONDecodeError as exc:
        stderr = proc.stderr.decode("utf-8", errors="replace").strip()
        raise NoteGapError(f"gap-bridge produced invalid JSON: {exc}\nstderr: {stderr}") from exc


def _main(argv: list[str]) -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Return note gaps from a TJA string.")
    parser.add_argument("tja", nargs="?", help="Path to a .tja file. Reads stdin when omitted.")
    parser.add_argument("--unit", choices=("measures", "ms"), default="measures")
    parser.add_argument("--indent", type=int, default=2, help="JSON indent (use 0 for compact).")
    args = parser.parse_args(argv)

    if args.tja:
        content = Path(args.tja).read_text(encoding="utf-8")
    elif not sys.stdin.isatty():
        content = sys.stdin.read()
    else:
        # Invoked bare in a terminal with no file and nothing piped in: show usage
        # instead of silently blocking on stdin.
        parser.print_help()
        return 0

    try:
        result = get_note_gaps(content, unit=args.unit)
    except NoteGapError as exc:
        print(exc, file=sys.stderr)
        return 1

    json.dump(result, sys.stdout, ensure_ascii=False, indent=args.indent or None)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(_main(sys.argv[1:]))
