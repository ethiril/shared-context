#!/usr/bin/env bash
# PostToolUse hook entrypoint: re-render the dashboard whenever a write
# happens under shared-context/features/. Cheap, no LLM.
#
# Reads the hook JSON payload from stdin and exits 0 silently if the
# write doesn't touch our features tree.

set -euo pipefail

# Derive the shared-context repo root from this script's location.
# Layout: <repo-root>/framework/bin/hook-render.sh
SHARED_CONTEXT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FEATURES_PREFIX="${SHARED_CONTEXT_ROOT}/features/"

# Read the hook payload. Claude Code passes tool input as JSON on stdin.
PAYLOAD="$(cat || true)"

# Extract file_path with grep + sed (no jq dependency). Both Write and Edit
# tools use the `file_path` parameter. We look at tool_input.file_path.
FILE_PATH="$(printf '%s' "$PAYLOAD" \
  | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -1 \
  | sed -E 's/.*"file_path"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/')"

# If we can't parse, bail silently — never block the user's work.
[ -z "${FILE_PATH:-}" ] && exit 0

# Only fire for writes inside shared-context/features/.
case "$FILE_PATH" in
  "$FEATURES_PREFIX"*) : ;;
  *) exit 0 ;;
esac

# Don't react to writes the render script itself produces (would loop):
# the root dashboard, per-feature _index.md, the standalone feature pages,
# and the lazy-loaded fragment files.
case "$FILE_PATH" in
  "$SHARED_CONTEXT_ROOT/dashboard.html") exit 0 ;;
  "$FEATURES_PREFIX"*/_index.md) exit 0 ;;
  "$FEATURES_PREFIX"*/dashboard.html) exit 0 ;;
  "$FEATURES_PREFIX"*/dashboard-fragment.html) exit 0 ;;
  "$FEATURES_PREFIX"*/browse-fragment.html) exit 0 ;;
esac

# Render. Errors go to stderr but never fail the hook.
if ! node "$SHARED_CONTEXT_ROOT/framework/bin/render-dashboard.mjs" >/dev/null 2>&1; then
  echo "render-dashboard failed (non-blocking)" >&2
fi

exit 0
