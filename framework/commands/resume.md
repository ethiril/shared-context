---
description: Quick resume on a shared-context feature (after /clear or similar)
argument-hint: <feature-slug>
model: claude-opus-4-7
---

Quick resume on feature **$ARGUMENTS**. Protocol: `framework/README.md` §2 → Quick resume.

**Once-per-session (skip if already loaded):** `framework/README.md` (especially §7 — artefact formats), `AGENTS.md` → identify yourself from CWD.

**Format note (see README §7):** Logs are append-only DSL lines in `log/log.dsl` (`from > to [kind] @at: summary | refs | body`). Repo statuses are single-line `<iso>.positional` records. Contracts are `<iso>-<repo>-v<X.Y.Z>.dsl`. Legacy `*.md`+YAML files in the same folders still parse — read both shapes; filter on the same fields (`to`, `at`, kind).

**For `$ARGUMENTS`, read in order:**

1. `features/$ARGUMENTS/MISSION.md` — feature identity.
2. Latest file in `features/$ARGUMENTS/orchestrator/` (lexically last). **Your checkpoint** — treat as having absorbed every log/decision/digest older than its `at:`. Fall back to latest `digest/` if no snapshot exists.
3. `features/$ARGUMENTS/log/log.dsl` (+ legacy `log/*.md`) — entries newer than the checkpoint with kind `[pv]` (pivot). Pivots override what they `supersedes:` — apply first.
4. `features/$ARGUMENTS/repos/<your-repo>/` latest file (newest `.positional`, falling back to legacy `.md`) — your task brief.
5. `features/$ARGUMENTS/log/log.dsl` (+ legacy `log/*.md`) — entries newer than the checkpoint with `to` including your repo (or `all`).

**Skip** files with `status: superseded` or a sibling `*.superseded.md` tombstone (use `/audit` if you need them). DSL log lines are retired via a later `[pv]` line's `supersedes:` — skip those too.

Budget ≤ 5k tokens. Report state found + next action in one paragraph.
