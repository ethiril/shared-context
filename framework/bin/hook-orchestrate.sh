#!/usr/bin/env bash
# PostToolUse hook entrypoint: when a repo agent writes a new file to
# features/<slug>/digest/, invoke the orchestrator agent headlessly to
# write a fresh orchestrator/ snapshot for that feature, then re-render
# the dashboard.
#
# Reads the hook JSON payload from stdin. Exits 0 if the write didn't
# touch a digest/ directory.

set -euo pipefail

# Derive the shared-context repo root from this script's location.
# Layout: <repo-root>/framework/bin/hook-orchestrate.sh
SHARED_CONTEXT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BRIEF="$SHARED_CONTEXT_ROOT/framework/orchestrator/brief.md"

PAYLOAD="$(cat || true)"

FILE_PATH="$(printf '%s' "$PAYLOAD" \
  | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -1 \
  | sed -E 's/.*"file_path"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/')"

[ -z "${FILE_PATH:-}" ] && exit 0

# Match features/<slug>/digest/<filename> only.
FEATURE_SLUG="$(printf '%s' "$FILE_PATH" \
  | sed -nE "s|^$SHARED_CONTEXT_ROOT/features/([^/]+)/digest/[^/]+\$|\1|p")"

if [ -z "$FEATURE_SLUG" ]; then
  exit 0
fi

DIGEST_FILENAME="$(basename "$FILE_PATH")"
RELATIVE_DIGEST="features/$FEATURE_SLUG/digest/$DIGEST_FILENAME"

# Compose the orchestrator prompt: brief.md + the specific instructions
# for this invocation.
PROMPT="$(cat "$BRIEF")

---

# This invocation

trigger: digest-hook
feature: $FEATURE_SLUG
trigger_digest: $RELATIVE_DIGEST

A new digest was just written. Read the inputs listed in your brief for
this feature, then write exactly one new orchestrator snapshot under
\`features/$FEATURE_SLUG/orchestrator/\`. Use the trigger metadata above
in the snapshot frontmatter. Finally, run the render script.

Do not write any other files. Do not write snapshots for other features."

# Run claude headlessly. Errors are logged but never block the user.
if ! cd "$SHARED_CONTEXT_ROOT" && claude -p "$PROMPT" >>"$SHARED_CONTEXT_ROOT/framework/orchestrator/.last-run.log" 2>&1; then
  echo "orchestrator invocation failed (non-blocking); see framework/orchestrator/.last-run.log" >&2
fi

# Always run the render after, even if claude failed — the dashboard
# should reflect whatever state we have.
if ! node "$SHARED_CONTEXT_ROOT/framework/bin/render-dashboard.mjs" >/dev/null 2>&1; then
  echo "render-dashboard failed (non-blocking)" >&2
fi

exit 0
