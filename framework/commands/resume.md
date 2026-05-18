---
description: Quick resume on a shared-context feature (after /clear or similar)
argument-hint: <feature-slug>
model: claude-haiku-4-5-20251001
---

Quick resume on feature **$ARGUMENTS**. Protocol: `framework/README.md` §2 → Quick resume.

**Once-per-session (skip if already loaded):** `framework/README.md`, `AGENTS.md` → identify yourself from CWD.

**For `$ARGUMENTS`, read in order:**

1. `features/$ARGUMENTS/MISSION.md` — feature identity.
2. Latest file in `features/$ARGUMENTS/orchestrator/` (lexically last). **Your checkpoint** — treat as having absorbed every log/decision/digest older than its `at:`. Fall back to latest `digest/` if no snapshot exists.
3. `features/$ARGUMENTS/log/` entries newer than the checkpoint with `kind: pivot`. Pivots override what they `supersedes`.
4. `features/$ARGUMENTS/repos/<your-repo>/` latest file — your task brief.
5. `features/$ARGUMENTS/log/` entries newer than the checkpoint with `to:` including your repo.

**Skip** files with `status: superseded` or a sibling `*.superseded.md` tombstone (use `/audit` if you need them).

Budget ≤ 5k tokens. Report state found + next action in one paragraph.
