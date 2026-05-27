#!/usr/bin/env python3
"""One-shot repo wiring for shared-context participation.

Wires a single repo so its agents can write into the shared-context features
tree without per-file approval prompts and so the orchestrator dashboard sees
the repo. Idempotent — re-running is safe and prints what it would (re)do.

Performs four edits, in order, against an already-checked-out repo:

  1. <repo>/.claude/settings.local.json
       permissions.allow + hooks (PreToolUse Write → hook-lint.sh;
       PostToolUse Write|Edit → hook-render.sh) + framework version marker.
  2. <repo>/CLAUDE.md
       Appends a one-line pointer at "Cross-repo coordination lives at …"
       if not already present. Creates the file if it doesn't exist.
  3. <shared-context-root>/AGENTS.md
       Appends a roster row for the new identity if not already present.

Run from anywhere; the shared-context root is derived from this script's
location. Pass the repo CWD as an absolute path.

Usage:
  wire-repo.py <repo-cwd> <identity> [<one-line role>]

Examples:
  wire-repo.py /Users/me/MSN/app-gateway app-gateway "Flutter-facing BFF"
  wire-repo.py "$(pwd)" my-service "Owns thing X"

Exit codes:
  0  success (something was changed, or all four already in sync)
  1  argument or path error
  2  filesystem / parse error
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from typing import Any

# Resolved once. Layout assumption: framework/bin/wire-repo.py.
SCRIPT_PATH = Path(__file__).resolve()
SHARED_CONTEXT_ROOT = SCRIPT_PATH.parent.parent.parent
FRAMEWORK_VERSION = 3

# Hook payloads applied to a repo's settings.local.json. The matcher / command
# pairs are stable across repos; only SHARED_CONTEXT_ROOT varies.
LINT_HOOK_RELATIVE = "framework/bin/hook-lint.sh"
RENDER_HOOK_RELATIVE = "framework/bin/hook-render.sh"


def info(msg: str) -> None:
    print(f"  {msg}")


def step(msg: str) -> None:
    print(f"\n→ {msg}")


def fail(msg: str, code: int = 2) -> None:
    sys.stderr.write(f"wire-repo: {msg}\n")
    sys.exit(code)


def load_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text() or "{}")
    except json.JSONDecodeError as exc:
        fail(f"could not parse {path}: {exc}")
    return {}  # unreachable


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def has_broader_perm(allow_list: list[str], pattern: str) -> bool:
    """Treat a bare `*` (or the exact pattern) as already covering this need."""
    if pattern in allow_list:
        return True
    return "*" in allow_list


def patch_settings_local(repo_dir: Path) -> bool:
    """Update permissions, hooks, and version marker. Returns True if mutated."""
    settings_path = repo_dir / ".claude" / "settings.local.json"
    data = load_json(settings_path)
    mutated = False

    # ---- permissions ----
    permissions = data.setdefault("permissions", {})
    allow = permissions.setdefault("allow", [])
    permissions.setdefault("deny", [])

    needed_perms = [
        f"Read({SHARED_CONTEXT_ROOT}/**)",
        f"Write({SHARED_CONTEXT_ROOT}/features/**)",
    ]
    for pattern in needed_perms:
        if has_broader_perm(allow, pattern):
            info(f"permission already present: {pattern}")
        else:
            allow.append(pattern)
            info(f"added permission: {pattern}")
            mutated = True

    # ---- hooks ----
    hooks = data.setdefault("hooks", {})
    lint_cmd = f"{SHARED_CONTEXT_ROOT}/{LINT_HOOK_RELATIVE}"
    render_cmd = f"{SHARED_CONTEXT_ROOT}/{RENDER_HOOK_RELATIVE}"

    if upsert_hook(hooks, "PreToolUse", matcher="Write", command=lint_cmd):
        info("added PreToolUse(Write) → hook-lint.sh")
        mutated = True
    else:
        info("PreToolUse(Write) → hook-lint.sh already wired")

    if upsert_hook(hooks, "PostToolUse", matcher="Write|Edit", command=render_cmd):
        info("added PostToolUse(Write|Edit) → hook-render.sh")
        mutated = True
    else:
        info("PostToolUse(Write|Edit) → hook-render.sh already wired")

    # ---- framework version marker ----
    if data.get("shared_context_framework_version") == FRAMEWORK_VERSION:
        info(f"framework version marker already = {FRAMEWORK_VERSION}")
    else:
        data["shared_context_framework_version"] = FRAMEWORK_VERSION
        info(f"set shared_context_framework_version = {FRAMEWORK_VERSION}")
        mutated = True

    if mutated:
        write_json(settings_path, data)
        info(f"wrote {settings_path}")
    else:
        info("no changes to settings.local.json")

    return mutated


def upsert_hook(hooks: dict, event: str, *, matcher: str, command: str) -> bool:
    """Ensure `hooks[event]` has an entry with the given matcher+command. Adds
    a new command to an existing matcher entry, or a fresh entry if no
    matcher matches. Returns True if mutated."""
    entries = hooks.setdefault(event, [])
    for entry in entries:
        if entry.get("matcher") != matcher:
            continue
        commands_list = entry.setdefault("hooks", [])
        if any(h.get("command") == command for h in commands_list):
            return False
        commands_list.append({"type": "command", "command": command})
        return True
    entries.append({
        "matcher": matcher,
        "hooks": [{"type": "command", "command": command}],
    })
    return True


def patch_claude_md(repo_dir: Path) -> bool:
    """Add the cross-repo pointer line to <repo>/CLAUDE.md. Returns True if mutated."""
    claude_md = repo_dir / "CLAUDE.md"
    pointer = (
        f"Cross-repo coordination lives at `{SHARED_CONTEXT_ROOT}`. "
        f"For any multi-repo feature, read its `framework/README.md` and root `AGENTS.md` before starting."
    )

    if claude_md.is_file():
        text = claude_md.read_text()
        if f"Cross-repo coordination lives at `{SHARED_CONTEXT_ROOT}`" in text:
            info(f"CLAUDE.md already points at {SHARED_CONTEXT_ROOT}")
            return False
        if not text.endswith("\n"):
            text += "\n"
        text += "\n" + pointer + "\n"
        claude_md.write_text(text)
        info(f"appended pointer line to {claude_md}")
        return True

    claude_md.write_text(pointer + "\n")
    info(f"created {claude_md} with pointer line")
    return True


# AGENTS.md roster table rows are pipe-separated. We append a new row before
# the closing `---` that terminates the table section.
AGENTS_TABLE_ROW = "| `{identity}`{pad_identity} | `{cwd}`{pad_cwd} | {role} |"


def patch_agents_md(repo_dir: Path, identity: str, role: str) -> bool:
    agents_md = SHARED_CONTEXT_ROOT / "AGENTS.md"
    if not agents_md.is_file():
        fail(f"AGENTS.md not found at {agents_md}")

    text = agents_md.read_text()
    if re.search(rf"^\|\s*`{re.escape(identity)}`\s*\|", text, re.MULTILINE):
        info(f"AGENTS.md already lists `{identity}`")
        return False

    # Find the roster table by locating the header line, then walk down until
    # we hit a non-row line. The first non-`|` line after the header is where
    # the row should land (we insert right before it to keep grouping tidy).
    lines = text.splitlines(keepends=True)
    insert_index = None
    in_table = False
    for index, line in enumerate(lines):
        if line.lstrip().startswith("| Repo identity"):
            in_table = True
            continue
        if in_table:
            if not line.lstrip().startswith("|"):
                insert_index = index
                break
    if insert_index is None:
        fail("could not locate roster table in AGENTS.md (expected header line `| Repo identity …`)")

    cwd = str(repo_dir)
    new_row = f"| `{identity}` | `{cwd}` | {role} |\n"
    lines.insert(insert_index, new_row)  # type: ignore[arg-type]
    agents_md.write_text("".join(lines))
    info(f"appended roster row for `{identity}` → {cwd}")
    return True


def parse_args(argv: list[str]) -> tuple[Path, str, str]:
    if len(argv) < 3 or argv[1] in ("-h", "--help"):
        sys.stderr.write(__doc__ or "")
        sys.exit(0 if argv[1:] == ["-h"] or argv[1:] == ["--help"] else 1)

    repo_cwd = Path(argv[1]).expanduser()
    if not repo_cwd.is_absolute():
        repo_cwd = repo_cwd.resolve()
    if not repo_cwd.is_dir():
        fail(f"repo CWD does not exist or is not a directory: {repo_cwd}", code=1)

    identity = argv[2]
    if not re.fullmatch(r"[a-z0-9-]+", identity):
        fail(f"identity must match [a-z0-9-]+ (got {identity!r})", code=1)

    role = argv[3] if len(argv) >= 4 else f"Owns the {identity} repo."
    return repo_cwd, identity, role


def main(argv: list[str]) -> int:
    repo_cwd, identity, role = parse_args(argv)

    print(f"Wiring repo: {repo_cwd}")
    print(f"  identity:  {identity}")
    print(f"  role:      {role}")
    print(f"  root:      {SHARED_CONTEXT_ROOT}")

    step("1. .claude/settings.local.json (permissions + hooks + version marker)")
    patch_settings_local(repo_cwd)

    step("2. CLAUDE.md (cross-repo pointer)")
    patch_claude_md(repo_cwd)

    step(f"3. AGENTS.md roster row at {SHARED_CONTEXT_ROOT}/AGENTS.md")
    patch_agents_md(repo_cwd, identity, role)

    print("\nDone. Restart any open Claude Code sessions in this repo so hooks reload.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
