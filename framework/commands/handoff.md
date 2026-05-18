---
description: Write a digest + cursor before /clear so the next session resumes cheaply
argument-hint: <feature-slug>
model: claude-opus-4-7
---

Handoff on feature **$ARGUMENTS** before `/clear` or session end. Protocol: `framework/README.md` §2 → Session end.

**Format note (see README §7):** Digest and cursor stay YAML+body — no DSL writes in this command. But the **count** in step 1 spans both DSL entries (`log/*.dsl`) and legacy `log/*.md`.

**Two writes, in order.**

### 1. Digest (conditional)

Count log entries newer than the latest `digest/<file>.md` (or all logs if no digest). Sum across formats:
- `.dsl` files in `features/$ARGUMENTS/log/` whose filename timestamp (or `@at:`) is after the digest's `at:`.
- Files matching `features/$ARGUMENTS/log/*.md` whose frontmatter `at:` (or filename timestamp) is after the digest's `at:`.

| logs since last digest | action |
|---|---|
| 0 | skip silently |
| 1–4 | usually skip — tell user "n logs since last digest; not writing." |
| 5–9 | `AskUserQuestion`: write digest? Recommended yes if substantial progress this session, no if mostly acks. |
| ≥10 OR no digest exists | write without asking |
| substantial code progress this session | write without asking |

If writing: `features/$ARGUMENTS/digest/<UTC-ISO-timestamp>-<your-repo>.md`. Cover per repo: current goal, done, next, blocked, contracts in play (with version), open cross-repo questions. Reference (don't restate) contracts and decisions in `refs:`. Frontmatter `summary:` is required (one sentence ≤ 30 words). Body 400–800 words (lint cap 800).

Digest does **not** auto-render the dashboard. Run `/refresh $ARGUMENTS` if you want the synthesised view.

### 2. Cursor (always)

**Overwrite** `features/$ARGUMENTS/cursors/<your-repo>/current.md` (rolling — one per repo per feature, edited in place):

- `at:` — now, ISO with colons (`date -u +"%Y-%m-%dT%H:%M:%SZ"`).
- `last_checkpoint_read` — orchestrator snapshot filename used (or the digest you just wrote if no snapshot yet).
- `last_log_read` — filename of the latest log entry processed (or its `@at:` ISO — both compare correctly against filename timestamps). Works for both `.dsl` and legacy `.md` entries.
- `last_pivot_read` — latest `[pv]` entry filename (or `@at:` ISO) acknowledged (or `null`).
- `contracts_synced` — per-API version file you're synced against (`.dsl` or legacy `.md`).
- `last_decision_read` — latest decision filename read (YAML).

Body: one short line — what next-session-you should remember in ≤ 5 words. Frontmatter does the work.

Legacy timestamped cursor files: leave them. `current.md` is the source of truth.

**Confirm** what you wrote and what you'd resume with. If you skipped the digest, say so explicitly.
