---
description: Catch-up resume on a shared-context feature (new session or after a break)
argument-hint: <feature-slug>
model: claude-opus-4-7
---

Catch-up on feature **$ARGUMENTS**. Protocol: `framework/README.md` §2 → Catch up.

**Format note (see README §7):** Logs are per-event `.dsl` files in `log/` (one DSL line each). Repo statuses are `<iso>.positional`. Contracts are `<iso>-<repo>-v<X.Y.Z>.dsl`. Legacy `*.md`+YAML still parses — read both shapes.

**Read in order:**

1. Quick resume list (see `/resume`): `MISSION.md`, latest orchestrator snapshot, post-snapshot pivots, your repo's latest status, asks `to:` you.
2. `features/$ARGUMENTS/_index.md` — generated entry index. Skim instead of opening each file.
3. `features/$ARGUMENTS/cursors/<your-repo>/current.md` (rolling). Fall back to latest timestamped file if `current.md` is missing (legacy).
4. For each API surface you'll touch: `features/$ARGUMENTS/contracts/<api>/` latest file (`.dsl` preferred; legacy `.md` parses).
5. `features/$ARGUMENTS/decisions/` newer than cursor's `last_decision_read` with `status: accepted` (decisions stay YAML).
6. `features/$ARGUMENTS/log/*.dsl` (and legacy `log/*.md`) newer than `max(snapshot.at, cursor.last_log_read)`. For DSL: each file is one event; use the filename timestamp (or the line's `@at:`) to compare against the cursor.

**Skip** `status: superseded`, tombstoned files, and DSL entries retired by a later `[pv]`'s `supersedes:` (use `/audit $ARGUMENTS` for full history).

Budget ≤ 5k tokens. Report state + next action.
