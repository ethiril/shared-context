---
description: Write a digest + cursor before /clear so the next session resumes cheaply
argument-hint: <feature-slug>
---

You are handing off shared-context feature **$ARGUMENTS** before a `/clear` or session end.

Follow the End-of-session protocol from your shared-context folder's `framework/README.md` §4.3. (Your repo's `CLAUDE.md` declares where shared-context lives.)

Two writes, **in this order**:

### 1. Digest

Write `features/$ARGUMENTS/digest/<UTC-ISO-timestamp>-<your-repo>.md` if any of these is true:
- No digest exists yet for this feature.
- More than ~10 log entries have accrued since the latest digest.
- You made substantial progress this session and don't want the next agent to replay every log entry.

The digest is a deep-audit checkpoint. Cover, per repo: current goal, what's done, what's next, what's blocked, contracts in play (by version), open cross-repo questions. Reference (don't restate) contracts and decisions in `refs:`. **Include a `summary:` field in frontmatter** — one sentence, ≤ 30 words.

The digest write triggers the orchestrator hook → fresh snapshot → fresh `dashboard.html` and `_index.md`. **Skipping the digest skips all downstream regeneration.**

### 2. Cursor

Write `features/$ARGUMENTS/cursors/<your-repo>/<UTC-ISO-timestamp>.md`:
- `last_checkpoint_read` — the orchestrator snapshot filename you used (or the digest you just wrote, if no snapshot yet).
- `last_log_read` — latest log entry filename you processed.
- `last_pivot_read` — latest pivot you acknowledged (or `null`).
- `contracts_synced` — per-API version file you're synced against.
- `last_decision_read` — latest decision file you've read.

Get the timestamp with `date -u +"%Y-%m-%dT%H-%M-%S"`. Use that for filenames; in frontmatter `at:` use the ISO with colons.

After writing both, confirm to me what you wrote and what you'd resume with on next start.
