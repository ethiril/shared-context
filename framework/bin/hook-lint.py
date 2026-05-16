#!/usr/bin/env python3
"""PreToolUse hook implementation for shared-context.

Lints Write tool calls under features/<slug>/ for:
1. Body word counts vs the targets in CONVENTIONS.md "Writing for agents".
2. Log-entry `from:` field membership in AGENTS.md.

Modes (env var SHARED_CONTEXT_LINT_MODE):
  warn   — emit a stderr warning, allow the write (default)
  block  — print to stderr and exit 2 so Claude Code blocks the tool call
           and the message lands as a system reminder for the agent

Opt-out: include `# allow-oversize: <reason>` as the first non-blank body
line (after any frontmatter) of the file being written.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

BUDGETS = {
    "log":          200,
    "decision":     300,
    "repo-status":  250,
    "digest":       800,
    "cursor":        80,
    "orchestrator": 500,
}


def classify(path: Path, features_root: Path) -> str | None:
    """Return the artifact type for paths we lint; None otherwise."""
    try:
        rel = path.relative_to(features_root)
    except ValueError:
        return None
    parts = rel.parts
    # features/<slug>/<bucket>/...
    if len(parts) < 3:
        return None
    bucket = parts[1]
    if bucket == "log" and rel.suffix == ".md":
        return "log"
    if bucket == "decisions" and rel.suffix == ".md":
        return "decision"
    if bucket == "repos" and len(parts) >= 4 and rel.suffix == ".md":
        return "repo-status"
    if bucket == "digest" and rel.suffix == ".md":
        return "digest"
    if bucket == "cursors" and len(parts) >= 4 and rel.suffix == ".md":
        return "cursor"
    if bucket == "orchestrator" and rel.suffix == ".md":
        return "orchestrator"
    # contracts/, overview/, MISSION.md, _index.md → schema-shaped or human-edited, skip
    return None


def strip_frontmatter(text: str) -> tuple[str, str]:
    """Return (frontmatter, body). Frontmatter is empty if not present."""
    if not text.startswith("---\n") and not text.startswith("---\r\n"):
        return "", text
    # find the closing ---
    rest = text.split("\n", 1)[1] if "\n" in text else ""
    close = re.search(r"^---\s*$", rest, flags=re.MULTILINE)
    if not close:
        return "", text
    fm_end = close.end()
    frontmatter = rest[: close.start()]
    body = rest[fm_end:].lstrip("\n")
    return frontmatter, body


def first_nonblank_line(s: str) -> str:
    for line in s.splitlines():
        if line.strip():
            return line
    return ""


def extract_from_field(frontmatter: str) -> str | None:
    for line in frontmatter.splitlines():
        m = re.match(r"^from:\s*(.+?)\s*$", line)
        if m:
            return m.group(1)
    return None


def emit(msg: str, mode: str) -> int:
    label = "shared-context lint (block):" if mode == "block" else "shared-context lint (warn): "
    sys.stderr.write(f"{label} {msg}\n")
    return 2 if mode == "block" else 0


def main() -> int:
    mode = os.environ.get("SHARED_CONTEXT_LINT_MODE", "warn").lower()
    if mode not in ("warn", "block"):
        mode = "warn"

    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0

    if payload.get("tool_name") != "Write":
        return 0

    ti = payload.get("tool_input") or {}
    file_path = ti.get("file_path") or ""
    content = ti.get("content") or ""

    if not file_path or not content:
        return 0

    path = Path(file_path)

    # Locate shared-context root from this script's location: <root>/framework/bin/hook-lint.py
    here = Path(__file__).resolve()
    shared_root = here.parent.parent.parent
    features_root = shared_root / "features"

    artifact = classify(path, features_root)
    if artifact is None:
        return 0

    budget = BUDGETS[artifact]
    frontmatter, body = strip_frontmatter(content)

    # Opt-out: # allow-oversize: <reason> as first non-blank body line
    opt_out = first_nonblank_line(body).startswith("# allow-oversize:")

    words = len(body.split())
    exit_codes: list[int] = []

    if not opt_out and words > budget:
        relpath = path.relative_to(shared_root) if shared_root in path.parents else path
        exit_codes.append(emit(
            f"{relpath} is {words} words; {artifact} budget per CONVENTIONS.md is {budget}. "
            "Trim the body, or add '# allow-oversize: <one-line reason>' as the first body "
            "line to opt out (and explain why).",
            mode,
        ))

    # Identity-roster check (log entries only)
    if artifact == "log":
        agents_md = shared_root / "AGENTS.md"
        if agents_md.is_file():
            who = extract_from_field(frontmatter)
            if who:
                agents_text = agents_md.read_text()
                # AGENTS.md rows wrap identities in backticks: `subs-gateway`
                if f"`{who}`" not in agents_text:
                    relpath = path.relative_to(shared_root) if shared_root in path.parents else path
                    exit_codes.append(emit(
                        f"{relpath} declares 'from: {who}' but that identity is not listed in "
                        f"AGENTS.md. Add the row first (path + role), or correct the from: field.",
                        mode,
                    ))

    return max(exit_codes) if exit_codes else 0


if __name__ == "__main__":
    sys.exit(main())
