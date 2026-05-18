---
description: Catch-up resume on a shared-context feature (new session or after a break)
argument-hint: <feature-slug>
model: claude-haiku-4-5-20251001
---

Catch-up on feature **$ARGUMENTS**. Protocol: `framework/README.md` §2 → Catch up.

**Read in order:**

1. Quick resume list (see `/resume`): `MISSION.md`, latest orchestrator snapshot, post-snapshot pivots, your repo's latest status, asks `to:` you.
2. `features/$ARGUMENTS/_index.md` — generated entry index. Skim instead of opening each file.
3. `features/$ARGUMENTS/cursors/<your-repo>/current.md` (rolling). Fall back to latest timestamped file if `current.md` is missing (legacy).
4. For each API surface you'll touch: `features/$ARGUMENTS/contracts/<api>/` latest file.
5. `features/$ARGUMENTS/decisions/` newer than cursor's `last_decision_read` with `status: accepted`.
6. `features/$ARGUMENTS/log/` newer than `max(snapshot.at, cursor.last_log_read)`.

**Skip** `status: superseded` and tombstoned files (use `/audit $ARGUMENTS` for full history).

Budget ≤ 5k tokens. Report state + next action.
