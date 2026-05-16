#!/usr/bin/env bash
# PreToolUse hook entrypoint: dispatches to the Python implementation,
# which lints shared-context writes for word-count budgets and the
# AGENTS.md identity roster.
#
# Reads the hook JSON payload from stdin; passes it through unchanged.
# Errors in the lint are non-fatal in warn mode (default); in block mode
# the Python exits 2 to block the write.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec python3 "$SCRIPT_DIR/hook-lint.py"
