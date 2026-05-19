#!/usr/bin/env bash
# Thin dispatcher for wire-repo.py. Lets users run a familiar bash command
# while keeping the JSON/markdown mutation logic in Python (more reliable
# than shell for nested settings.local.json edits).
#
# Usage:
#   wire-repo.sh <repo-cwd> <identity> [<one-line role>]
#
# See wire-repo.py for the full description and exit codes.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec python3 "$SCRIPT_DIR/wire-repo.py" "$@"
