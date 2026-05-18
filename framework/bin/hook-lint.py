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
    "log":                     200,
    "log-dsl":                 200,  # applied to the last appended line of log.dsl
    "decision":                300,
    "repo-status":             250,
    "repo-status-positional":  250,
    "digest":                  800,
    "cursor":                   80,
    "orchestrator":            500,
}


def classify(path: Path, features_root: Path) -> str | None:
    """Return the artifact type for paths we lint; None otherwise.

    Returned types map 1:1 to BUDGETS. Compact formats are distinguished from
    YAML by a suffix: `log-dsl` (rolling .dsl file), `repo-status-positional`
    (one .positional line per file). Contracts (.dsl) have unlimited budget so
    they're not classified.
    """
    try:
        rel = path.relative_to(features_root)
    except ValueError:
        return None
    parts = rel.parts
    # features/<slug>/<bucket>/...
    if len(parts) < 3:
        return None
    bucket = parts[1]
    if bucket == "log":
        if rel.name == "log.dsl":
            return "log-dsl"
        if rel.suffix == ".md":
            return "log"
    if bucket == "decisions" and rel.suffix == ".md":
        return "decision"
    if bucket == "repos" and len(parts) >= 4:
        if rel.suffix == ".positional":
            return "repo-status-positional"
        if rel.suffix == ".md":
            return "repo-status"
    if bucket == "digest" and rel.suffix == ".md":
        return "digest"
    if bucket == "cursors" and len(parts) >= 4 and rel.suffix == ".md":
        return "cursor"
    if bucket == "orchestrator" and rel.suffix == ".md":
        return "orchestrator"
    # contracts/ (DSL or md), overview/, MISSION.md, _index.md → unlimited or human-edited, skip
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


# DSL helpers — minimal parsing, just enough to extract the body for budget
# checks. The renderer's parsers.mjs is the authoritative format spec; this
# only needs to count words.

def last_nonblank_line(text: str) -> str:
    for line in reversed(text.splitlines()):
        if line.strip():
            return line
    return ""


def dsl_log_line_from(line: str) -> str | None:
    """Extract the `from` field of a DSL log line, or None if unparseable."""
    m = re.match(r"^(?:\[[^\]]+\]\s*)?(\S+)\s*>", line.strip())
    return m.group(1) if m else None


def dsl_log_body_words(line: str) -> int:
    """Count words in the body portion of a DSL log line.

    Body is whatever follows the final `|` after the summary, refs, and any
    supersedes labelled segments. If no `|` separator is present at all, the
    summary itself counts as the body.
    """
    stripped = line.strip()
    if not stripped:
        return 0
    # Drop everything up to and including the first colon (header section).
    colon = stripped.find(":")
    after_colon = stripped[colon + 1:] if colon != -1 else stripped
    segments = [s.strip() for s in re.split(r"\s*\|\s*", after_colon)]
    if not segments:
        return 0
    # Drop labelled refs:/supersedes: segments; keep the first (summary) and
    # any trailing non-labelled segments as body candidates.
    body_segments = []
    for idx, seg in enumerate(segments):
        if idx == 0:
            continue  # summary doesn't count toward body budget
        if re.match(r"^(refs|supersedes):", seg, re.IGNORECASE):
            continue
        body_segments.append(seg)
    if not body_segments:
        return 0
    return len(" ".join(body_segments).split())


def positional_repo_body_words(line: str) -> int:
    """Count words across the prose fields of a positional repo-status line.

    Schema: repo|at|summary|current_goal|done|next|blocked_on|contracts_in_play|open_questions
    Word-count target: summary + current_goal + done + next + blocked_on.
    contracts_in_play and open_questions are structured JSON, not prose; skip.
    """
    stripped = line.strip()
    if not stripped:
        return 0
    parts = stripped.split("|")
    # repo at the start, two JSON fields at the end; counted prose is parts 2..7.
    prose_parts = parts[2:7] if len(parts) >= 7 else parts[2:]
    return sum(len(p.replace("~", " ").split()) for p in prose_parts)


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
    exit_codes: list[int] = []

    # Per-format body extraction + opt-out + identity check.
    if artifact == "log-dsl":
        # Lint the last appended line only (the most-recently-written event).
        last_line = last_nonblank_line(content)
        opt_out = "# allow-oversize:" in last_line
        words = dsl_log_body_words(last_line)
        from_field = dsl_log_line_from(last_line)
        identity_text = from_field or ""
        check_identity_in_agents_md = bool(from_field)
    elif artifact == "repo-status-positional":
        line = content.strip().splitlines()[-1] if content.strip() else ""
        opt_out = "# allow-oversize:" in line
        words = positional_repo_body_words(line)
        identity_text = ""
        check_identity_in_agents_md = False
    else:
        # YAML-frontmatter artefacts (legacy + denser-md + yaml-only).
        frontmatter, body = strip_frontmatter(content)
        opt_out = first_nonblank_line(body).startswith("# allow-oversize:")
        words = len(body.split())
        identity_text = extract_from_field(frontmatter) or ""
        check_identity_in_agents_md = artifact == "log"

    if not opt_out and words > budget:
        relpath = path.relative_to(shared_root) if shared_root in path.parents else path
        exit_codes.append(emit(
            f"{relpath} is {words} words; {artifact} budget per CONVENTIONS.md is {budget}. "
            "Trim the body, or add '# allow-oversize: <one-line reason>' to opt out (and explain why).",
            mode,
        ))

    # Identity-roster check (log entries — md+YAML and DSL alike).
    if check_identity_in_agents_md and identity_text:
        agents_md = shared_root / "AGENTS.md"
        if agents_md.is_file():
            agents_text = agents_md.read_text()
            if f"`{identity_text}`" not in agents_text:
                relpath = path.relative_to(shared_root) if shared_root in path.parents else path
                exit_codes.append(emit(
                    f"{relpath} declares from = {identity_text!r} but that identity is not listed "
                    f"in AGENTS.md. Add the row first (path + role), or correct the from: field.",
                    mode,
                ))

    return max(exit_codes) if exit_codes else 0


if __name__ == "__main__":
    sys.exit(main())
