#!/usr/bin/env bash
# PreToolUse diagnostics hook — the opt-in "diagnostics mode".
#
# Zero agent-token cost: it observes tool calls from *outside* the model's
# context and appends one trace line per call. An analyzer
# (framework/bin/analyze-trace.py) later reconstructs index hit/miss,
# resume fast-exit, and protocol deviations from the trace alone — the agent
# never spends tokens reporting on itself.
#
# Enable the mode by wiring this into the worked repo's
# .claude/settings.local.json (absent = off):
#   {
#     "hooks": {
#       "PreToolUse": [
#         { "matcher": "Read|Write|Edit|Bash",
#           "hooks": [ { "type": "command",
#             "command": "<shared-context-root>/framework/bin/hook-diagnostics.sh" } ] } ]
#     }
#   }
# Disable: remove that entry.
#
# Output: features/<slug>/.diagnostics/<session>.trace (gitignored), one TSV
# line per call: <iso>\t<tool>\t<cwd>\t<path-or-command>. The feature slug is
# inferred from features/<slug>/ paths and cached per session so that source
# reads in the worked repo (which carry no feature path) attribute correctly.
#
# Never blocks tool execution — always exits 0.

set +e

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SHARED_CONTEXT_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
INPUT="$(cat)"

python3 - "$INPUT" "$SHARED_CONTEXT_ROOT" <<'PY' 2>/dev/null
import json, sys, os, re, time

raw, root = sys.argv[1], sys.argv[2]
try:
    payload_obj = json.loads(raw)
except Exception:
    sys.exit(0)

tool = payload_obj.get("tool_name", "?")
tool_input = payload_obj.get("tool_input", {}) or {}
session = payload_obj.get("session_id") or "nosession"
cwd = payload_obj.get("cwd", "") or ""
detail = tool_input.get("file_path") or tool_input.get("command") or tool_input.get("path") or ""

iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

staging = os.path.join(root, ".diagnostics", "sessions")
try:
    os.makedirs(staging, exist_ok=True)
except Exception:
    sys.exit(0)
slug_cache = os.path.join(staging, session + ".slug")

# Infer feature slug from any features/<slug>/ path; cache per session so that
# later source reads (no feature path) route to the same feature.
slug = None
match = re.search(r"features/([a-z0-9][a-z0-9-]*)/", detail)
if match:
    slug = match.group(1)
    try:
        with open(slug_cache, "w") as handle:
            handle.write(slug)
    except Exception:
        pass
else:
    try:
        with open(slug_cache) as handle:
            slug = handle.read().strip() or None
    except Exception:
        slug = None

if slug:
    target_dir = os.path.join(root, "features", slug, ".diagnostics")
    target = os.path.join(target_dir, session + ".trace")
else:
    # No feature established yet — stage so nothing is lost.
    target_dir = staging
    target = os.path.join(target_dir, session + ".unattributed.trace")

try:
    os.makedirs(target_dir, exist_ok=True)
except Exception:
    sys.exit(0)

if len(detail) > 400:
    detail = detail[:397] + "..."
detail = detail.replace("\t", " ").replace("\n", " ").replace("\r", " ")
cwd = cwd.replace("\t", " ")

try:
    with open(target, "a") as handle:
        handle.write(f"{iso}\t{tool}\t{cwd}\t{detail}\n")
except Exception:
    pass
PY

exit 0
