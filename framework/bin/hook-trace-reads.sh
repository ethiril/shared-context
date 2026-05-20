#!/usr/bin/env bash
# PreToolUse hook: log every Read and Bash invocation to a trace file.
#
# Wire in .claude/settings.local.json of the repo you'll run /catch-up from:
#   {
#     "hooks": {
#       "PreToolUse": [
#         {
#           "matcher": "Read|Bash",
#           "hooks": [
#             { "type": "command", "command": "/Users/michaelstachowicz/MSN/shared-context/framework/bin/hook-trace-reads.sh" }
#           ]
#         }
#       ]
#     }
#   }
#
# Output: /tmp/sc-trace.log (override with SC_TRACE_LOG env var).
# Format: <iso> | <tool> | <path-or-command>
#
# To stop tracing: remove the hook entry. `rm /tmp/sc-trace.log` to clear history.

LOG_FILE="${SC_TRACE_LOG:-/tmp/sc-trace.log}"
INPUT=$(cat)
ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Parse JSON via python3 (preinstalled on macOS). Swallow any error — hook
# must never block tool execution.
PARSED=$(python3 - "$INPUT" <<'PY' 2>/dev/null
import json, sys
try:
    d = json.loads(sys.argv[1])
    tool = d.get("tool_name", "?")
    ti = d.get("tool_input", {}) or {}
    payload = ti.get("file_path") or ti.get("command") or ""
    # Truncate very long commands so the log stays readable
    if len(payload) > 400:
        payload = payload[:397] + "..."
    print(f"{tool}\t{payload}")
except Exception:
    print("?\t?")
PY
)

if [ -z "$PARSED" ]; then
    PARSED="?	?"
fi

# tab-separated, easy to cut
printf '%s\t%s\n' "$ISO" "$PARSED" >> "$LOG_FILE"

exit 0
